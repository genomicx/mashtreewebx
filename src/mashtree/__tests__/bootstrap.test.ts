import {
  bipartitionKey,
  extractBipartitions,
  addSupportValues,
  annotateNewick,
} from '../../mashtree/bootstrap'

describe('bipartitionKey', () => {
  it('sorts elements and joins with tab', () => {
    const result = bipartitionKey(new Set(['C', 'A', 'B']))
    expect(result).toBe('A\tB\tC')
  })

  it('returns the single element for a one-element set', () => {
    const result = bipartitionKey(new Set(['X']))
    expect(result).toBe('X')
  })

  it('returns an empty string for an empty set', () => {
    const result = bipartitionKey(new Set())
    expect(result).toBe('')
  })
})

describe('extractBipartitions', () => {
  it('extracts bipartitions from a symmetric four-leaf tree', () => {
    // Tree: ((A,B),(C,D));
    // Internal nodes: {A,B} (size 2 <= 4/2=2 -> use subtree) and {C,D} (size 2 <= 2 -> use subtree)
    const newick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const bps = extractBipartitions(newick, allLeaves)

    const keys = bps.map(bipartitionKey).sort()
    expect(keys).toHaveLength(2)
    expect(keys).toContain('A\tB')
    expect(keys).toContain('C\tD')
  })

  it('extracts bipartitions from an asymmetric four-leaf tree using complement when needed', () => {
    // Tree: (A,(B,(C,D)));
    // Internal node (C,D): leaves={C,D}, size 2 <= 2 -> use subtree -> {C,D}
    // Internal node (B,(C,D)): leaves={B,C,D}, size 3 > 4/2=2 -> use complement -> {A}
    const newick = '(A:0.1,(B:0.2,(C:0.3,D:0.4):0.5):0.6);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const bps = extractBipartitions(newick, allLeaves)

    const keys = bps.map(bipartitionKey).sort()
    expect(keys).toHaveLength(2)
    expect(keys).toContain('C\tD')
    expect(keys).toContain('A')
  })

  it('correctly handles branch lengths in leaf and internal nodes', () => {
    // Ensure branch lengths do not interfere with leaf label extraction
    const newick = '((Alpha:0.00123,Beta:0.00456):0.00789,(Gamma:0.01,Delta:0.02):0.03);'
    const allLeaves = ['Alpha', 'Beta', 'Gamma', 'Delta']
    const bps = extractBipartitions(newick, allLeaves)

    const keys = bps.map(bipartitionKey).sort()
    expect(keys).toHaveLength(2)
    expect(keys).toContain('Alpha\tBeta')
    expect(keys).toContain('Delta\tGamma')
  })

  it('does not include the root split (full leaf set)', () => {
    // The root encompasses all leaves; it should be excluded as trivial
    const newick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const bps = extractBipartitions(newick, allLeaves)

    // No bipartition should contain all 4 leaves
    for (const bp of bps) {
      expect(bp.size).toBeLessThan(allLeaves.length)
    }
  })

  it('canonicalizes equivalent splits from different topologies to the same key', () => {
    // ((A,B),(C,D)) and ((C,D),(A,B)) should yield the same bipartition keys
    const newick1 = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
    const newick2 = '((C:0.4,D:0.5):0.6,(A:0.1,B:0.2):0.3);'
    const allLeaves = ['A', 'B', 'C', 'D']

    const keys1 = extractBipartitions(newick1, allLeaves).map(bipartitionKey).sort()
    const keys2 = extractBipartitions(newick2, allLeaves).map(bipartitionKey).sort()

    expect(keys1).toEqual(keys2)
  })
})

describe('addSupportValues', () => {
  const refNewick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
  const allLeaves = ['A', 'B', 'C', 'D']

  it('assigns 100% support when all replicates match the reference topology', () => {
    // All 10 replicates have the same topology as the reference
    const replicates = Array(10).fill('((A:0.15,B:0.25):0.35,(C:0.45,D:0.55):0.65);')
    const result = addSupportValues(refNewick, allLeaves, replicates, 10)

    // Both internal nodes should have support value of 100
    expect(result).toContain('100')
  })

  it('assigns 0% support when no replicates match the reference topology', () => {
    // Replicates with a different topology: ((A,C),(B,D)) instead of ((A,B),(C,D))
    const replicates = Array(10).fill('((A:0.1,C:0.2):0.3,(B:0.4,D:0.5):0.6);')
    const result = addSupportValues(refNewick, allLeaves, replicates, 10)

    // The reference has bipartitions {A,B} and {C,D}.
    // The replicates have bipartitions {A,C} and {B,D} -- no overlap.
    expect(result).toContain('0')
    expect(result).not.toContain('100')
  })

  it('assigns partial support proportional to matching replicates', () => {
    // 7 out of 10 replicates match the reference topology
    const matching = Array(7).fill('((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);')
    const nonMatching = Array(3).fill('((A:0.1,C:0.2):0.3,(B:0.4,D:0.5):0.6);')
    const replicates = [...matching, ...nonMatching]
    const result = addSupportValues(refNewick, allLeaves, replicates, 10)

    // Support should be 70 for the matching bipartitions
    expect(result).toContain('70')
  })

  it('rounds fractional support percentages correctly', () => {
    // 3 out of 7 replicates match: 3/7 = 42.857... rounds to 43
    const matching = Array(3).fill('((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);')
    const nonMatching = Array(4).fill('((A:0.1,C:0.2):0.3,(B:0.4,D:0.5):0.6);')
    const replicates = [...matching, ...nonMatching]
    const result = addSupportValues(refNewick, allLeaves, replicates, 7)

    expect(result).toContain('43')
  })
})

describe('annotateNewick', () => {
  it('inserts support values at internal nodes', () => {
    const newick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const supportMap = new Map<string, number>()
    supportMap.set('A\tB', 95)
    supportMap.set('C\tD', 80)

    const result = annotateNewick(newick, allLeaves, supportMap)

    // Should contain both support values as internal node labels
    expect(result).toContain('95')
    expect(result).toContain('80')
    // Support values should appear before the colon (branch length)
    expect(result).toMatch(/\)95:/)
    expect(result).toMatch(/\)80:/)
  })

  it('preserves all branch lengths from the original tree', () => {
    const newick = '((A:0.123,B:0.456):0.789,(C:0.0011,D:0.9999):0.5555);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const supportMap = new Map<string, number>()
    supportMap.set('A\tB', 50)
    supportMap.set('C\tD', 75)

    const result = annotateNewick(newick, allLeaves, supportMap)

    expect(result).toContain('0.123')
    expect(result).toContain('0.456')
    expect(result).toContain('0.789')
    expect(result).toContain('0.0011')
    expect(result).toContain('0.9999')
    expect(result).toContain('0.5555')
  })

  it('preserves all leaf labels in the output', () => {
    const newick = '((SeqA:0.1,SeqB:0.2):0.3,(SeqC:0.4,SeqD:0.5):0.6);'
    const allLeaves = ['SeqA', 'SeqB', 'SeqC', 'SeqD']
    const supportMap = new Map<string, number>()
    supportMap.set('SeqA\tSeqB', 100)
    supportMap.set('SeqC\tSeqD', 100)

    const result = annotateNewick(newick, allLeaves, supportMap)

    expect(result).toContain('SeqA')
    expect(result).toContain('SeqB')
    expect(result).toContain('SeqC')
    expect(result).toContain('SeqD')
  })

  it('terminates output with a semicolon', () => {
    const newick = '((A:0.1,B:0.2):0.3,(C:0.4,D:0.5):0.6);'
    const allLeaves = ['A', 'B', 'C', 'D']
    const supportMap = new Map<string, number>()

    const result = annotateNewick(newick, allLeaves, supportMap)

    expect(result).toMatch(/;$/)
  })
})
