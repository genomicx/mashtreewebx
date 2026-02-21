import type { MashOptions, BootstrapOptions } from './types'
import { computeDistanceMatrixWithSeed } from './mashRunner'
import { buildNeighborJoiningTree, sortGenomes } from './buildTree'

/**
 * Extract bipartitions (splits) from a Newick tree string.
 * Each bipartition is a sorted set of leaf labels on one side of the split.
 *
 * We parse the Newick string to extract the sets of leaves under each
 * internal node and represent each bipartition canonically.
 */
function extractBipartitions(newick: string, allLeaves: string[]): Set<string>[] {
  const bipartitions: Set<string>[] = []
  const leafSet = new Set(allLeaves)

  // Simple recursive Newick parser to extract leaf sets under each internal node
  // Returns the set of leaves in this subtree
  function parseSubtree(tokens: string[], pos: { i: number }): Set<string> {
    const leaves = new Set<string>()

    if (tokens[pos.i] === '(') {
      pos.i++ // consume '('
      const childLeafSets: Set<string>[] = []

      // Parse children
      while (pos.i < tokens.length) {
        const childLeaves = parseSubtree(tokens, pos)
        childLeafSets.push(childLeaves)
        for (const l of childLeaves) leaves.add(l)

        if (tokens[pos.i] === ',') {
          pos.i++ // consume ','
        } else if (tokens[pos.i] === ')') {
          pos.i++ // consume ')'
          break
        }
      }

      // Skip internal node label and branch length
      while (
        pos.i < tokens.length &&
        tokens[pos.i] !== ',' &&
        tokens[pos.i] !== ')' &&
        tokens[pos.i] !== ';'
      ) {
        pos.i++
      }

      // Record this internal bipartition if it's non-trivial
      // (not the full set or a single leaf)
      if (leaves.size > 1 && leaves.size < leafSet.size) {
        // Canonicalize: use the smaller side
        if (leaves.size <= leafSet.size / 2) {
          bipartitions.push(new Set([...leaves].sort()))
        } else {
          const complement = new Set(
            [...leafSet].filter((l) => !leaves.has(l)).sort(),
          )
          bipartitions.push(complement)
        }
      }

      return leaves
    } else {
      // Leaf node: read label (and optional branch length)
      let label = ''
      while (
        pos.i < tokens.length &&
        tokens[pos.i] !== ',' &&
        tokens[pos.i] !== ')' &&
        tokens[pos.i] !== ';'
      ) {
        label += tokens[pos.i]
        pos.i++
      }
      // Strip branch length if present
      const colonIdx = label.indexOf(':')
      if (colonIdx >= 0) label = label.substring(0, colonIdx)
      label = label.trim()
      if (label) leaves.add(label)
      return leaves
    }
  }

  // Tokenize the newick string
  const tokens = newick.split(/([(),;])/).filter((t) => t.length > 0)
  parseSubtree(tokens, { i: 0 })

  return bipartitions
}

/**
 * Convert bipartition set to a canonical string key for comparison.
 */
function bipartitionKey(bp: Set<string>): string {
  return [...bp].sort().join('\t')
}

/**
 * Add bootstrap support values to a Newick tree string.
 *
 * For each internal node in the reference tree, counts how many
 * replicate trees have the same bipartition, and adds the
 * support percentage as the internal node label.
 */
function addSupportValues(
  newick: string,
  allLeaves: string[],
  replicateNewickStrings: string[],
  totalReplicates: number,
): string {
  // Get bipartitions from reference tree
  const refBipartitions = extractBipartitions(newick, allLeaves)

  // Count occurrences in replicates
  const supportCounts = new Map<string, number>()
  for (const bp of refBipartitions) {
    supportCounts.set(bipartitionKey(bp), 0)
  }

  for (const repNewick of replicateNewickStrings) {
    const repBPs = extractBipartitions(repNewick, allLeaves)
    const repKeys = new Set(repBPs.map(bipartitionKey))
    for (const [key, count] of supportCounts) {
      if (repKeys.has(key)) {
        supportCounts.set(key, count + 1)
      }
    }
  }

  // Build support map: bipartition key → support percentage
  const supportMap = new Map<string, number>()
  for (const [key, count] of supportCounts) {
    supportMap.set(key, Math.round((count / totalReplicates) * 100))
  }

  // Now annotate the newick string with support values at internal nodes.
  // We re-parse to find internal nodes and insert labels.
  return annotateNewick(newick, allLeaves, supportMap)
}

/**
 * Re-parse newick and annotate internal nodes with support values.
 */
function annotateNewick(
  newick: string,
  allLeaves: string[],
  supportMap: Map<string, number>,
): string {
  const leafSet = new Set(allLeaves)

  function parseAndAnnotate(
    tokens: string[],
    pos: { i: number },
  ): { text: string; leaves: Set<string> } {
    if (tokens[pos.i] === '(') {
      pos.i++ // consume '('
      const childResults: { text: string; leaves: Set<string> }[] = []

      while (pos.i < tokens.length) {
        const child = parseAndAnnotate(tokens, pos)
        childResults.push(child)
        if (tokens[pos.i] === ',') {
          pos.i++
        } else if (tokens[pos.i] === ')') {
          pos.i++ // consume ')'
          break
        }
      }

      // Collect all leaves in this subtree
      const allChildLeaves = new Set<string>()
      for (const c of childResults) {
        for (const l of c.leaves) allChildLeaves.add(l)
      }

      // Read any existing label and branch length
      let suffix = ''
      while (
        pos.i < tokens.length &&
        tokens[pos.i] !== ',' &&
        tokens[pos.i] !== ')' &&
        tokens[pos.i] !== ';'
      ) {
        suffix += tokens[pos.i]
        pos.i++
      }

      // Find support value for this bipartition
      let supportLabel = ''
      if (
        allChildLeaves.size > 1 &&
        allChildLeaves.size < leafSet.size
      ) {
        let canonicalLeaves: Set<string>
        if (allChildLeaves.size <= leafSet.size / 2) {
          canonicalLeaves = new Set([...allChildLeaves].sort())
        } else {
          canonicalLeaves = new Set(
            [...leafSet].filter((l) => !allChildLeaves.has(l)).sort(),
          )
        }
        const key = bipartitionKey(canonicalLeaves)
        const support = supportMap.get(key)
        if (support !== undefined) {
          supportLabel = String(support)
        }
      }

      // Build the text for this internal node
      const childTexts = childResults.map((c) => c.text).join(',')

      // Parse suffix for existing label vs branch length
      let branchLength = ''
      const colonIdx = suffix.indexOf(':')
      if (colonIdx >= 0) {
        branchLength = suffix.substring(colonIdx)
        // Ignore any existing label before colon
      } else if (suffix.trim()) {
        // suffix is just a label with no branch length
      }

      const text = `(${childTexts})${supportLabel}${branchLength}`
      return { text, leaves: allChildLeaves }
    } else {
      // Leaf node
      let token = ''
      while (
        pos.i < tokens.length &&
        tokens[pos.i] !== ',' &&
        tokens[pos.i] !== ')' &&
        tokens[pos.i] !== ';'
      ) {
        token += tokens[pos.i]
        pos.i++
      }
      const colonIdx = token.indexOf(':')
      const label =
        colonIdx >= 0 ? token.substring(0, colonIdx).trim() : token.trim()
      return { text: token, leaves: new Set(label ? [label] : []) }
    }
  }

  const tokens = newick
    .replace(/;$/, '')
    .split(/([(),;])/)
    .filter((t) => t.length > 0)
  const result = parseAndAnnotate(tokens, { i: 0 })
  return result.text + ';'
}

/**
 * Run bootstrap or jackknife replicates.
 *
 * Bootstrap: Re-run Mash sketch with different seeds → different hash functions
 *            → different sketches → different distances → different trees.
 *
 * Jackknife: Run with half the sketch size and different seeds.
 *
 * Returns annotated Newick string with support values at internal nodes.
 */
export async function runBootstrap(
  files: { name: string; data: Uint8Array }[],
  options: MashOptions,
  bootstrapOptions: BootstrapOptions,
  referenceNewick: string,
  onProgress: (msg: string, pct: number) => void,
  onLog: (msg: string) => void,
): Promise<string> {
  const { method, replicates } = bootstrapOptions
  const replicateNewicks: string[] = []

  const sketchSize =
    method === 'jackknife'
      ? Math.max(100, Math.floor(options.sketchSize / 2))
      : options.sketchSize

  for (let i = 0; i < replicates; i++) {
    const seed = options.seed + i + 1
    const pct = ((i + 1) / replicates) * 100

    onProgress(
      `${method === 'bootstrap' ? 'Bootstrap' : 'Jackknife'} replicate ${i + 1}/${replicates}...`,
      pct,
    )

    try {
      const repOptions = { ...options, sketchSize, seed }
      const distResult = await computeDistanceMatrixWithSeed(
        files,
        repOptions,
        seed,
      )

      const sorted = sortGenomes(
        distResult.matrix,
        distResult.names,
        options.sortOrder,
      )

      const repNewick = buildNeighborJoiningTree(sorted.matrix, sorted.names)
      replicateNewicks.push(repNewick)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      onLog(`Replicate ${i + 1} failed: ${msg}`)
    }

    if ((i + 1) % 10 === 0 || i === replicates - 1) {
      onLog(
        `Completed ${i + 1}/${replicates} ${method} replicates`,
      )
    }
  }

  // Extract all leaf names from the reference newick
  const leafNames = files.map((f) => {
    let name = f.name.replace(/^.*\//, '')
    name = name.replace(
      /\.(gz|bz2|zip|fastq|fasta|fq|fa|fna|msh|gbk|embl)$/g,
      '',
    )
    return name
  })

  // Add support values
  const annotated = addSupportValues(
    referenceNewick,
    leafNames,
    replicateNewicks,
    replicates,
  )

  onLog(`Bootstrap analysis complete: ${replicateNewicks.length}/${replicates} successful replicates`)
  return annotated
}
