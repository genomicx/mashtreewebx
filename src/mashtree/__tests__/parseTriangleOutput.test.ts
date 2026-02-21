import { parseTriangleOutput } from '../../mashtree/mashRunner'
import {
  TRIANGLE_2_TAXA,
  TRIANGLE_3_TAXA,
  TRIANGLE_4_TAXA,
  TRIANGLE_GZ_NAMES,
  TRIANGLE_FNA_NAMES,
  TRIANGLE_INVALID_N,
  TRIANGLE_MISSING_LINES,
  TRIANGLE_NON_NUMERIC_N,
} from '../../test/fixtures/triangle'

describe('parseTriangleOutput', () => {
  it('parses 2-taxon input into correct names and 2x2 matrix', () => {
    const result = parseTriangleOutput(TRIANGLE_2_TAXA)
    expect(result.names).toEqual(['genome_A', 'genome_B'])
    expect(result.matrix).toEqual([
      [0, 0.1234],
      [0.1234, 0],
    ])
  })

  it('parses 3-taxon input into correct names and 3x3 matrix', () => {
    const result = parseTriangleOutput(TRIANGLE_3_TAXA)
    expect(result.names).toEqual(['genome_A', 'genome_B', 'genome_C'])
    expect(result.matrix).toEqual([
      [0, 0.05, 0.10],
      [0.05, 0, 0.08],
      [0.10, 0.08, 0],
    ])
  })

  it('parses 4-taxon input into correct names and 4x4 matrix', () => {
    const result = parseTriangleOutput(TRIANGLE_4_TAXA)
    expect(result.names).toEqual(['alpha', 'beta', 'gamma', 'delta'])
    expect(result.matrix).toEqual([
      [0, 0.01, 0.05, 0.10],
      [0.01, 0, 0.04, 0.09],
      [0.05, 0.04, 0, 0.06],
      [0.10, 0.09, 0.06, 0],
    ])
  })

  it('strips path prefixes from names', () => {
    const result = parseTriangleOutput(TRIANGLE_2_TAXA)
    // Original names are /data/genome_A.fasta and /data/genome_B.fasta
    // Path prefix /data/ should be removed
    expect(result.names[0]).toBe('genome_A')
    expect(result.names[1]).toBe('genome_B')
    expect(result.names[0]).not.toContain('/')
    expect(result.names[1]).not.toContain('/')
  })

  it('strips .fasta extension from names', () => {
    const result = parseTriangleOutput(TRIANGLE_2_TAXA)
    expect(result.names[0]).toBe('genome_A')
    expect(result.names[1]).toBe('genome_B')
    expect(result.names[0]).not.toContain('.fasta')
  })

  it('strips .gz extension from names but leaves inner .fasta extension', () => {
    // The regex /\.(gz|...)$/g only strips one extension at the end.
    // So sample1.fasta.gz -> .gz is stripped -> sample1.fasta
    const result = parseTriangleOutput(TRIANGLE_GZ_NAMES)
    expect(result.names).toEqual([
      'sample1.fasta',
      'sample2.fasta',
      'sample3.fasta',
    ])
  })

  it('strips .fna extension from names', () => {
    const result = parseTriangleOutput(TRIANGLE_FNA_NAMES)
    expect(result.names).toEqual(['isolate_A', 'isolate_B'])
  })

  it('sets diagonal entries to 0', () => {
    const result = parseTriangleOutput(TRIANGLE_4_TAXA)
    for (let i = 0; i < result.names.length; i++) {
      expect(result.matrix[i][i]).toBe(0)
    }
  })

  it('produces a symmetric matrix where matrix[i][j] === matrix[j][i]', () => {
    const result = parseTriangleOutput(TRIANGLE_4_TAXA)
    const n = result.names.length
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        expect(result.matrix[i][j]).toBe(result.matrix[j][i])
      }
    }
  })

  it('throws an error when N < 2', () => {
    expect(() => parseTriangleOutput(TRIANGLE_INVALID_N)).toThrow(
      'Invalid triangle output: expected N >= 2',
    )
  })

  it('throws an error when there are missing lines', () => {
    expect(() => parseTriangleOutput(TRIANGLE_MISSING_LINES)).toThrow(
      'Missing line',
    )
  })

  it('throws an error when N is non-numeric', () => {
    expect(() => parseTriangleOutput(TRIANGLE_NON_NUMERIC_N)).toThrow(
      'Invalid triangle output: expected N >= 2',
    )
  })

  it('calls the log callback when provided', () => {
    const logMessages: string[] = []
    const log = (msg: string) => logMessages.push(msg)

    parseTriangleOutput(TRIANGLE_3_TAXA, log)

    expect(logMessages.length).toBeGreaterThan(0)
    // Should log the N value
    expect(logMessages.some((m) => m.includes('N=3'))).toBe(true)
    // Should log parsed matrix info
    expect(logMessages.some((m) => m.includes('3x3'))).toBe(true)
    // Should log individual row details
    expect(logMessages.some((m) => m.includes('Row 0'))).toBe(true)
  })

  it('throws an error on empty input', () => {
    expect(() => parseTriangleOutput('')).toThrow(
      'Invalid triangle output: not enough lines',
    )
  })

  it('correctly parses distance values as floats', () => {
    const result = parseTriangleOutput(TRIANGLE_3_TAXA)
    // genome_B -> genome_A distance is 0.05
    expect(result.matrix[1][0]).toBeCloseTo(0.05, 10)
    // genome_C -> genome_A distance is 0.10
    expect(result.matrix[2][0]).toBeCloseTo(0.10, 10)
    // genome_C -> genome_B distance is 0.08
    expect(result.matrix[2][1]).toBeCloseTo(0.08, 10)
    // All values should be typeof number
    for (const row of result.matrix) {
      for (const val of row) {
        expect(typeof val).toBe('number')
        expect(Number.isNaN(val)).toBe(false)
      }
    }
  })
})
