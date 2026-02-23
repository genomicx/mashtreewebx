import { parseFastaString } from '../../mashtree/parseFasta'
import {
  SINGLE_CONTIG,
  MULTI_CONTIG,
  SPECIAL_HEADER,
  LOWERCASE_FASTA,
  EMPTY_FASTA,
  WHITESPACE_FASTA,
  NO_HEADER,
  TRAILING_NEWLINE,
} from '../../test/fixtures/fasta'

describe('parseFastaString', () => {
  it('parses a single contig with concatenated sequence lines', () => {
    const result = parseFastaString(SINGLE_CONTIG)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('contig1')
    expect(result[0].sequence).toBe('ATCGATCGATCGATCGATCGATCGATCGATCG')
  })

  it('parses multiple contigs with correct names and sequences', () => {
    const result = parseFastaString(MULTI_CONTIG)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ name: 'contig1', sequence: 'ATCGATCGATCG' })
    expect(result[1]).toEqual({ name: 'contig2', sequence: 'GCTAGCTAGCTA' })
    expect(result[2]).toEqual({ name: 'contig3', sequence: 'TTTTAAAACCCC' })
  })

  it('extracts the first word after > as the contig name', () => {
    const result = parseFastaString(SPECIAL_HEADER)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('seq1|organism=E.coli')
    expect(result[0].sequence).toBe('ATCGATCG')
  })

  it('uppercases lowercase sequence characters', () => {
    const result = parseFastaString(LOWERCASE_FASTA)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('seq1')
    expect(result[0].sequence).toBe('ATCGATCGGCTAGCTA')
  })

  it('returns an empty array for empty input', () => {
    const result = parseFastaString(EMPTY_FASTA)
    expect(result).toEqual([])
  })

  it('trims whitespace from sequence lines', () => {
    const result = parseFastaString(WHITESPACE_FASTA)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ name: 'seq1', sequence: 'ATCGGCTA' })
    expect(result[1]).toEqual({ name: 'seq2', sequence: 'TTTT' })
  })

  it('returns an empty array when there are no header lines', () => {
    const result = parseFastaString(NO_HEADER)
    expect(result).toEqual([])
  })

  it('handles trailing newlines without creating empty contigs', () => {
    const result = parseFastaString(TRAILING_NEWLINE)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ name: 'contig1', sequence: 'ATCGATCG' })
  })

  it('handles single base per line and concatenates them', () => {
    const input = '>bases\nA\nT\nC\nG\n'
    const result = parseFastaString(input)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('bases')
    expect(result[0].sequence).toBe('ATCG')
  })

  it('concatenates multi-line sequences into a single string', () => {
    const input = '>genome1\nATCG\nGCTA\nTTTT\nAAAA\n'
    const result = parseFastaString(input)
    expect(result).toHaveLength(1)
    expect(result[0].sequence).toBe('ATCGGCTATTTTAAAA')
  })
})
