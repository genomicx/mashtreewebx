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
 * Sketch genomes and compute distances.
 *
 * IMPORTANT: Emscripten modules cannot reliably call main() twice —
 * after the first callMain() the global state is corrupted (exit() is
 * called internally). We therefore use a FRESH WASM instance for each
 * command invocation and shuttle .msh files between instances via
 * readFile/writeFile on the virtual FS.
 */
export async function computeDistanceMatrix(
  files: { name: string; data: Uint8Array }[],
  options: MashOptions,
  onProgress?: (msg: string, pct: number) => void,
  onLog?: (msg: string) => void,
): Promise<{ matrix: number[][]; names: string[] }> {
  const log = (msg: string) => onLog?.(msg)

  // Step 1: Sketch all genomes together (fresh instance #1)
  onProgress?.('Sketching genomes...', 10)
  log('Initializing Mash WASM for sketching...')
  const sketchMash = await createMashInstance()

  // Write all genome files to virtual filesystem
  const paths: string[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const path = `/data/${f.name}`
    writeFileToMash(sketchMash.instance, path, f.data)
    paths.push(path)
    log(`Loaded ${f.name} (${f.data.length} bytes)`)
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
    String(options.seed),
    ...paths,
  ]

  log(`Running: mash ${sketchArgs.join(' ')}`)
  const sketchResult = sketchMash.run(sketchArgs)
  if (sketchResult.stderr) log(sketchResult.stderr)

  // Read the .msh file from the sketch instance's virtual FS
  let mshData: Uint8Array
  try {
    mshData = sketchMash.instance.FS.readFile('/data/all.msh')
    log(`Sketch file: ${mshData.length} bytes`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to read sketch file: ${msg}`)
  }

  // Step 2: Run triangle on a FRESH instance (avoids corrupted state)
  onProgress?.('Computing pairwise distances...', 50)
  log('Initializing fresh Mash WASM for triangle...')
  const triMash = await createMashInstance()

  // Write the .msh file to the new instance
  writeFileToMash(triMash.instance, '/data/all.msh', mshData)

  log('Running: mash triangle /data/all.msh')
  const triResult = triMash.run(['triangle', '/data/all.msh'])
  if (triResult.stderr) log(triResult.stderr)

  if (!triResult.stdout.trim()) {
    throw new Error(
      'Mash triangle produced no output. stderr: ' + triResult.stderr,
    )
  }

  // Log raw triangle output for debugging
  log(`Triangle raw output (${triResult.stdout.length} chars):`)
  for (const line of triResult.stdout.split('\n')) {
    log(`  | ${line}`)
  }

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

  log?.(`Triangle has ${lines.length} non-empty lines, N=${n}`)

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

    log?.(`  Row ${i}: "${name}" — ${parts.length - 1} distance(s): [${parts.slice(1).join(', ')}]`)

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
 * Uses two fresh WASM instances (one for sketch, one for triangle).
 */
export async function computeDistanceMatrixWithSeed(
  files: { name: string; data: Uint8Array }[],
  options: MashOptions,
  seed: number,
): Promise<{ matrix: number[][]; names: string[] }> {
  // Instance #1: sketch
  const sketchMash = await createMashInstance()

  const paths: string[] = []
  for (const f of files) {
    const path = `/data/${f.name}`
    writeFileToMash(sketchMash.instance, path, f.data)
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
  sketchMash.run(sketchArgs)

  // Read .msh from sketch instance
  const mshData = sketchMash.instance.FS.readFile('/data/all.msh')

  // Instance #2: triangle (fresh state)
  const triMash = await createMashInstance()
  writeFileToMash(triMash.instance, '/data/all.msh', mshData)

  const triResult = triMash.run(['triangle', '/data/all.msh'])
  return parseTriangleOutput(triResult.stdout)
}
