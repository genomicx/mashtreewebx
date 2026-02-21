import type { MashOptions, BootstrapOptions, MashtreeResult } from './types'
import { parseFastaFile } from './parseFasta'
import { computeDistanceMatrix } from './mashRunner'
import { buildNeighborJoiningTree, sortGenomes } from './buildTree'
import { runBootstrap } from './bootstrap'

/**
 * Run the full mashtree pipeline:
 * 1. Parse uploaded FASTA files (handles .gz)
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

  // Step 1: Parse FASTA files
  onProgress('Parsing FASTA files...', 2)
  onLog('Parsing FASTA files...')

  const files: { name: string; data: Uint8Array }[] = []
  for (let i = 0; i < inputFiles.length; i++) {
    const f = inputFiles[i]
    onLog(`Reading ${f.name}...`)
    const parsed = await parseFastaFile(f)

    // Re-encode contigs as a single FASTA string → Uint8Array
    let fastaContent = ''
    for (const contig of parsed.contigs) {
      fastaContent += `>${contig.name}\n${contig.sequence}\n`
    }
    const data = new TextEncoder().encode(fastaContent)

    files.push({ name: f.name, data })
    onLog(`  ${parsed.contigs.length} contig(s), ${data.length} bytes`)
    onProgress(
      `Parsing files... (${i + 1}/${inputFiles.length})`,
      2 + (i / inputFiles.length) * 3,
    )
  }

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
