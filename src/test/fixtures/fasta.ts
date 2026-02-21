/** Single contig FASTA */
export const SINGLE_CONTIG = `>contig1 some description
ATCGATCGATCGATCG
ATCGATCGATCGATCG
`

/** Multi-contig FASTA */
export const MULTI_CONTIG = `>contig1
ATCGATCGATCG
>contig2
GCTAGCTAGCTA
>contig3
TTTTAAAACCCC
`

/** Lowercase sequence (should be uppercased by parser) */
export const LOWERCASE_FASTA = `>seq1
atcgatcg
gctagcta
`

/** Empty input */
export const EMPTY_FASTA = ''

/** No header lines — just sequence */
export const NO_HEADER = `ATCGATCGATCG
GCTAGCTAGCTA
`

/** FASTA with extra whitespace */
export const WHITESPACE_FASTA = `>seq1
  ATCG
  GCTA

>seq2
TTTT
`

/** Header with special characters */
export const SPECIAL_HEADER = `>seq1|organism=E.coli length=100
ATCGATCG
`

/** Trailing newlines */
export const TRAILING_NEWLINE = `>contig1
ATCGATCG

`

/** Minimal synthetic genome for Mash testing (3 files) */
export function makeSyntheticFasta(name: string, seed: number): string {
  const bases = ['A', 'T', 'C', 'G']
  let seq = ''
  let s = seed
  for (let i = 0; i < 1000; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    seq += bases[s % 4]
  }
  return `>${name}\n${seq}\n`
}
