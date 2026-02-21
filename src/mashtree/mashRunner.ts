import type { MashOptions } from './types'

/**
 * Represents a Mash WASM module instance.
 * Each instance has its own virtual filesystem and global state.
 */
export interface MashInstance {
  callMain: (args: string[]) => void
  FS: {
    mkdirTree: (path: string) => void
    writeFile: (path: string, data: Uint8Array | string) => void
    readFile: (path: string) => Uint8Array
    unlink: (path: string) => void
  }
}

interface MashRunResult {
  stdout: string
  stderr: string
}

// Cache the WASM binary so we only fetch once
let wasmBinaryCache: ArrayBuffer | null = null

/**
 * Load the Mash WASM binary (cached after first fetch).
 */
async function loadWasmBinary(): Promise<ArrayBuffer> {
  if (wasmBinaryCache) return wasmBinaryCache
  const response = await fetch('/wasm/mash.wasm')
  if (!response.ok) throw new Error(`Failed to fetch mash.wasm: ${response.status}`)
  wasmBinaryCache = await response.arrayBuffer()
  return wasmBinaryCache
}

/**
 * Create a fresh Mash WASM instance.
 * Each call returns an independent module with its own filesystem.
 * This is necessary because Emscripten modules have global state
 * that doesn't reset between callMain() invocations.
 */
export async function createMashInstance(): Promise<{
  instance: MashInstance
  run: (args: string[]) => MashRunResult
}> {
  const wasmBinary = await loadWasmBinary()

  // The mash.js file uses Emscripten's module pattern.
  // When loaded as a <script> tag, it creates a global `Module` factory function.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mashFactory = (window as any).Module

  if (!mashFactory) {
    throw new Error(
      'Mash Module not found on window. Ensure /wasm/mash.js is loaded via <script> tag.',
    )
  }

  let stdout = ''
  let stderr = ''

  const instance: MashInstance = await mashFactory({
    wasmBinary: new Uint8Array(wasmBinary),
    print: (text: string) => {
      stdout += text + '\n'
    },
    printErr: (text: string) => {
      stderr += text + '\n'
    },
    noInitialRun: true,
  })

  const run = (args: string[]): MashRunResult => {
    stdout = ''
    stderr = ''
    try {
      instance.callMain(args)
    } catch {
      // Mash may call exit() which throws in Emscripten
    }
    return { stdout: stdout.trim(), stderr: stderr.trim() }
  }

  return { instance, run }
}

/**
 * Write a file to the Mash instance's virtual filesystem.
 */
export function writeFileToMash(
  instance: MashInstance,
  path: string,
  data: Uint8Array,
): void {
  const dir = path.substring(0, path.lastIndexOf('/'))
  if (dir) {
    try {
      instance.FS.mkdirTree(dir)
    } catch {
      // Directory may already exist
    }
  }
  instance.FS.writeFile(path, data)
}

/**
 * Sketch a genome and compute distances using a single Mash instance.
 * Returns the distance matrix parsed from mash triangle output.
 */
export async function computeDistanceMatrix(
  files: { name: string; data: Uint8Array }[],
  options: MashOptions,
  onProgress?: (msg: string, pct: number) => void,
  onLog?: (msg: string) => void,
): Promise<{ matrix: number[][]; names: string[] }> {
  const log = (msg: string) => onLog?.(msg)

  log('Initializing Mash WASM...')
  onProgress?.('Initializing Mash WASM...', 5)
  const { instance, run } = await createMashInstance()

  // Write all genome files to virtual filesystem
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const path = `/data/${f.name}`
    writeFileToMash(instance, path, f.data)
    paths.push(path)
    log(`Loaded ${f.name} (${f.data.length} bytes)`)
  }

  // Sketch all genomes
  const sketchArgs = [
    'sketch',
    '-o',
    '/data/all',
    '-k',
    String(options.kmerLength),
    '-s',
    String(options.sketchSize),
    '-S',
    String(options.seed),
    ...paths,
  ]

  onProgress?.('Sketching genomes...', 20)
  log(`Running: mash ${sketchArgs.join(' ')}`)
  const sketchResult = run(sketchArgs)
  if (sketchResult.stderr) log(sketchResult.stderr)

  // Run triangle to get distance matrix
  onProgress?.('Computing pairwise distances...', 60)
  log('Running: mash triangle /data/all.msh')
  const triResult = run(['triangle', '/data/all.msh'])
  if (triResult.stderr) log(triResult.stderr)

  // Parse triangle output (Phylip lower-triangle format)
  return parseTriangleOutput(triResult.stdout, log)
}

/**
 * Parse mash triangle output into a symmetric distance matrix.
 *
 * Format:
 *   N
 *   name1
 *   name2\tdist
 *   name3\tdist\tdist
 *   ...
 */
export function parseTriangleOutput(
  output: string,
  log?: (msg: string) => void,
): { matrix: number[][]; names: string[] } {
  const lines = output.split('\n').filter((l) => l.trim().length > 0)

  if (lines.length < 2) {
    throw new Error('Invalid triangle output: not enough lines')
  }

  const n = parseInt(lines[0].trim(), 10)
  if (isNaN(n) || n < 2) {
    throw new Error(`Invalid triangle output: expected N >= 2, got "${lines[0]}"`)
  }

  const names: string[] = []
  const matrix: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0),
  )

  for (let i = 0; i < n; i++) {
    const line = lines[i + 1]
    if (!line) throw new Error(`Missing line ${i + 1} in triangle output`)

    const parts = line.split('\t')
    // First part is the name (may be a full path)
    let name = parts[0]
    // Strip path prefixes and common extensions
    name = name.replace(/^.*\//, '')
    name = name.replace(
      /\.(gz|bz2|zip|fastq|fasta|fq|fa|fna|msh|gbk|embl)$/g,
      '',
    )
    names.push(name)

    // Remaining parts are distances (lower triangle)
    for (let j = 1; j < parts.length; j++) {
      const dist = parseFloat(parts[j])
      if (!isNaN(dist)) {
        matrix[i][j - 1] = dist
        matrix[j - 1][i] = dist // Mirror for symmetric matrix
      }
    }
  }

  log?.(`Parsed ${n}x${n} distance matrix for: ${names.join(', ')}`)
  return { matrix, names }
}

/**
 * Compute distance matrix for a single bootstrap/jackknife replicate.
 * Uses a different seed to get different hash function.
 */
export async function computeDistanceMatrixWithSeed(
  files: { name: string; data: Uint8Array }[],
  options: MashOptions,
  seed: number,
): Promise<{ matrix: number[][]; names: string[] }> {
  const { instance, run } = await createMashInstance()

  const paths: string[] = []
  for (const f of files) {
    const path = `/data/${f.name}`
    writeFileToMash(instance, path, f.data)
    paths.push(path)
  }

  const sketchArgs = [
    'sketch',
    '-o',
    '/data/all',
    '-k',
    String(options.kmerLength),
    '-s',
    String(options.sketchSize),
    '-S',
    String(seed),
    ...paths,
  ]
  run(sketchArgs)

  const triResult = run(['triangle', '/data/all.msh'])
  return parseTriangleOutput(triResult.stdout)
}
