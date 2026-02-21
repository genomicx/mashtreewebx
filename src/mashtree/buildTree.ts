import { parseMatrix } from 'patristic'

/**
 * Build a neighbor-joining tree from a distance matrix using patristic.
 *
 * patristic.parseMatrix(matrix, labels) takes a 2D number[][] distance matrix
 * and a string[] of labels. It returns a Branch object with .toNewick().
 *
 * @param matrix  Symmetric distance matrix (n×n)
 * @param names   Genome names corresponding to rows/columns
 * @returns       Newick string with branch lengths
 */
export function buildNeighborJoiningTree(
  matrix: number[][],
  names: string[],
): string {
  const n = matrix.length
  if (n < 2) {
    throw new Error('Need at least 2 genomes to build a tree')
  }
  if (n !== names.length) {
    throw new Error(
      `Matrix size (${n}) does not match number of names (${names.length})`,
    )
  }

  // Deep copy the matrix because patristic mutates it during NJ
  const matrixCopy = matrix.map((row) => [...row])
  const tree = parseMatrix(matrixCopy, names)
  return tree.toNewick()
}

/**
 * Sort genome names and reorder the distance matrix accordingly.
 */
export function sortGenomes(
  matrix: number[][],
  names: string[],
  order: 'ABC' | 'random' | 'input-order',
): { matrix: number[][]; names: string[] } {
  if (order === 'input-order' || names.length < 2) {
    return { matrix, names }
  }

  // Create index mapping
  const indices = names.map((_, i) => i)

  if (order === 'ABC') {
    indices.sort((a, b) => names[a].localeCompare(names[b]))
  } else if (order === 'random') {
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
  }

  const sortedNames = indices.map((i) => names[i])
  const n = matrix.length
  const sortedMatrix: number[][] = Array.from({ length: n }, () =>
    Array(n).fill(0),
  )

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sortedMatrix[i][j] = matrix[indices[i]][indices[j]]
    }
  }

  return { matrix: sortedMatrix, names: sortedNames }
}
