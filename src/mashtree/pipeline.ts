import type { MashOptions, BootstrapOptions, MashtreeResult } from './types'
import { computeDistanceMatrix } from './mashRunner'
import { buildNeighborJoiningTree, sortGenomes } from './buildTree'
import { runBootstrap } from './bootstrap'

/**
 * Read a File as raw bytes, decompressing .gz files if needed.
 * We pass raw FASTA bytes straight to Mash — no parsing/re-encoding
 * needed since Mash handles FASTA natively.
 */
async function readFileBytes(file: File): Promise<Uint8Array> {
  if (file.name.endsWith('.gz')) {
    const ds = new DecompressionStream('gzip')
    const decompressed = file.stream().pipeThrough(ds)
    const blob = await new Response(decompressed).blob()
    return new Uint8Array(await blob.arrayBuffer())
  }
  return new Uint8Array(await file.arrayBuffer())
}

/**
 * Run the full mashtree pipeline:
 * 1. Read uploaded FASTA files as raw bytes (decompress .gz)
 * 2. Sort genome names by sortOrder
 * 3. Sketch each genome with Mash WASM
 * 4. Compute pairwise distance matrix via mash triangle
 * 5. Build neighbor-joining tree via patristic
 * 6. Optionally run bootstrap/jackknife replicates
 */
export async function runMashtree(
  inputFiles: File[],
  options: MashOptions,
  bootstrapOptions: BootstrapOptions,
  onProgress: (msg: string, pct: number) => void,
  onLog: (msg: string) => void,
): Promise<MashtreeResult> {
  if (inputFiles.length < 2) {
    throw new Error('At least 2 genome files are required')
  }

  // Step 1: Read raw file bytes (Mash handles FASTA natively)
  onProgress('Reading files...', 2)
  onLog('Reading genome files...')

  const files = await Promise.all(
    inputFiles.map(async (f) => {
      onLog(`Reading ${f.name}...`)
      const data = await readFileBytes(f)
      onLog(`  ${data.length} bytes`)
      return { name: f.name, data }
    }),
  )
  onProgress(`Reading files... (${files.length}/${inputFiles.length})`, 5)

  // Step 2: Sort by name if requested
  // (Sorting is applied after computing the distance matrix,
  //  since Mash uses filenames and we re-order the matrix)

  // Step 3 & 4: Sketch + compute distance matrix
  onProgress('Computing distances...', 5)
  onLog('Computing pairwise distances with Mash...')

  const distResult = await computeDistanceMatrix(
    files,
    options,
    (msg, pct) => {
      // Scale Mash progress to 5-70% range
      const scaledPct = 5 + (pct / 100) * 65
      onProgress(msg, scaledPct)
    },
    onLog,
  )

  // Sort the matrix/names according to sortOrder
  const sorted = sortGenomes(
    distResult.matrix,
    distResult.names,
    options.sortOrder,
  )

  onLog(
    `Distance matrix: ${sorted.names.length}x${sorted.names.length} (sort: ${options.sortOrder})`,
  )

  // Step 5: Build NJ tree
  onProgress('Building neighbor-joining tree...', 75)
  onLog('Building neighbor-joining tree with patristic...')

  let newick: string
  try {
    newick = buildNeighborJoiningTree(sorted.matrix, sorted.names)
    onLog(`Tree built: ${newick.length} characters`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    onLog(`Tree building failed: ${msg}`)
    throw new Error(`Failed to build tree: ${msg}`)
  }

  // Step 6: Bootstrap/jackknife if enabled
  if (bootstrapOptions.enabled && bootstrapOptions.replicates > 0) {
    onProgress('Running bootstrap analysis...', 80)
    onLog(
      `Running ${bootstrapOptions.replicates} ${bootstrapOptions.method} replicates...`,
    )

    newick = await runBootstrap(
      files,
      options,
      bootstrapOptions,
      newick,
      (msg, pct) => {
        // Scale bootstrap progress to 80-98% range
        const scaledPct = 80 + (pct / 100) * 18
        onProgress(msg, scaledPct)
      },
      onLog,
    )
  }

  onProgress('Done!', 100)
  onLog('Pipeline complete.')

  return {
    newick,
    distanceMatrix: sorted.matrix,
    genomeNames: sorted.names,
  }
}
