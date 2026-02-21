import {
  buildNeighborJoiningTree,
  sortGenomes,
} from '../../mashtree/buildTree'

// --- Shared test data ---

const matrix3 = [
  [0, 0.1, 0.2],
  [0.1, 0, 0.15],
  [0.2, 0.15, 0],
]
const names3 = ['A', 'B', 'C']

const matrix2 = [
  [0, 0.5],
  [0.5, 0],
]
const names2 = ['X', 'Y']

// ---------- sortGenomes ----------

describe('sortGenomes', () => {
  it('ABC: sorts names alphabetically and reorders matrix rows/columns', () => {
    const unsortedNames = ['Cherry', 'Apple', 'Banana']
    const unsortedMatrix = [
      [0, 0.3, 0.2],
      [0.3, 0, 0.1],
      [0.2, 0.1, 0],
    ]

    const result = sortGenomes(unsortedMatrix, unsortedNames, 'ABC')

    expect(result.names).toEqual(['Apple', 'Banana', 'Cherry'])
    // After sorting, distance(Apple, Banana) should be the original
    // distance(Apple, Banana) = matrix[1][2] = 0.1
    expect(result.matrix[0][1]).toBe(0.1)
    // distance(Apple, Cherry) = matrix[1][0] = 0.3
    expect(result.matrix[0][2]).toBe(0.3)
    // distance(Banana, Cherry) = matrix[2][0] = 0.2
    expect(result.matrix[1][2]).toBe(0.2)
  })

  it('ABC: preserves pairwise distances after reordering', () => {
    const unsortedNames = ['Z', 'M', 'A', 'F']
    const unsortedMatrix = [
      [0, 0.12, 0.34, 0.56],
      [0.12, 0, 0.78, 0.9],
      [0.34, 0.78, 0, 0.23],
      [0.56, 0.9, 0.23, 0],
    ]

    const result = sortGenomes(unsortedMatrix, unsortedNames, 'ABC')

    // Build a lookup from the original by name pairs
    for (let i = 0; i < unsortedNames.length; i++) {
      for (let j = 0; j < unsortedNames.length; j++) {
        const ni = result.names.indexOf(unsortedNames[i])
        const nj = result.names.indexOf(unsortedNames[j])
        expect(result.matrix[ni][nj]).toBe(unsortedMatrix[i][j])
      }
    }
  })

  it('input-order: returns the same references unchanged', () => {
    const result = sortGenomes(matrix3, names3, 'input-order')

    expect(result.matrix).toBe(matrix3)
    expect(result.names).toBe(names3)
  })

  it('random: produces a deterministic result when Math.random is mocked', () => {
    // Mock Math.random to return a fixed sequence
    let callCount = 0
    const mockValues = [0.7, 0.3]
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      return mockValues[callCount++ % mockValues.length]
    })

    const result = sortGenomes(matrix3, names3, 'random')

    // With mocked random, result should be deterministic
    expect(result.names).toHaveLength(3)
    // Every original name should still be present
    expect(result.names).toEqual(expect.arrayContaining(names3))
    // The matrix dimensions should be preserved
    expect(result.matrix).toHaveLength(3)
    expect(result.matrix[0]).toHaveLength(3)

    spy.mockRestore()
  })

  it('ABC: does not mutate the original matrix or names array', () => {
    const originalNames = ['C', 'A', 'B']
    const originalMatrix = [
      [0, 0.5, 0.3],
      [0.5, 0, 0.2],
      [0.3, 0.2, 0],
    ]
    const namesCopy = [...originalNames]
    const matrixCopy = originalMatrix.map((row) => [...row])

    sortGenomes(originalMatrix, originalNames, 'ABC')

    expect(originalNames).toEqual(namesCopy)
    expect(originalMatrix).toEqual(matrixCopy)
  })
})

// ---------- buildNeighborJoiningTree ----------

describe('buildNeighborJoiningTree', () => {
  it('returns a valid Newick string for a 2-taxon tree containing both names', () => {
    const newick = buildNeighborJoiningTree(matrix2, names2)

    expect(newick).toContain('X')
    expect(newick).toContain('Y')
  })

  it('returns a valid Newick string for a 3-taxon tree containing all names', () => {
    const newick = buildNeighborJoiningTree(
      matrix3.map((r) => [...r]),
      [...names3],
    )

    expect(newick).toContain('A')
    expect(newick).toContain('B')
    expect(newick).toContain('C')
  })

  it('does not mutate the original matrix (deep-copy regression)', () => {
    const original = [
      [0, 0.1, 0.2],
      [0.1, 0, 0.15],
      [0.2, 0.15, 0],
    ]
    const snapshot = original.map((row) => [...row])

    buildNeighborJoiningTree(original, ['A', 'B', 'C'])

    // The original matrix must be completely unchanged after the call
    expect(original).toEqual(snapshot)
  })

  it('throws when given fewer than 2 genomes', () => {
    expect(() =>
      buildNeighborJoiningTree([[0]], ['lonely']),
    ).toThrow('Need at least 2 genomes')
  })

  it('throws when matrix size does not match names length', () => {
    const mismatchedMatrix = [
      [0, 0.1, 0.2],
      [0.1, 0, 0.15],
      [0.2, 0.15, 0],
    ]
    expect(() =>
      buildNeighborJoiningTree(mismatchedMatrix, ['A', 'B']),
    ).toThrow('Matrix size (3) does not match number of names (2)')
  })

  it('includes all taxon names in the output Newick string', () => {
    const names = ['Genome1', 'Genome2', 'Genome3', 'Genome4']
    const matrix = [
      [0, 0.1, 0.2, 0.3],
      [0.1, 0, 0.15, 0.25],
      [0.2, 0.15, 0, 0.12],
      [0.3, 0.25, 0.12, 0],
    ]

    const newick = buildNeighborJoiningTree(matrix, names)

    for (const name of names) {
      expect(newick).toContain(name)
    }
  })

  it('produces a Newick string that ends with a semicolon', () => {
    const newick = buildNeighborJoiningTree(
      matrix3.map((r) => [...r]),
      [...names3],
    )

    expect(newick.trimEnd()).toMatch(/;$/)
  })

  it('produces a Newick string that contains branch lengths (colon notation)', () => {
    const newick = buildNeighborJoiningTree(
      matrix3.map((r) => [...r]),
      [...names3],
    )

    // Newick branch lengths appear after a colon, e.g. "A:0.05"
    expect(newick).toContain(':')
  })
})
