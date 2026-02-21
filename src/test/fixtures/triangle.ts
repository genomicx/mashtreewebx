/** 2-taxon Phylip lower-triangle output */
export const TRIANGLE_2_TAXA = `2
/data/genome_A.fasta
/data/genome_B.fasta\t0.1234
`

/** 3-taxon Phylip lower-triangle output */
export const TRIANGLE_3_TAXA = `3
/data/genome_A.fasta
/data/genome_B.fasta\t0.05
/data/genome_C.fasta\t0.10\t0.08
`

/** 4-taxon Phylip lower-triangle output */
export const TRIANGLE_4_TAXA = `4
/data/alpha.fasta
/data/beta.fasta\t0.01
/data/gamma.fasta\t0.05\t0.04
/data/delta.fasta\t0.10\t0.09\t0.06
`

/** Output with .gz extensions (should be stripped) */
export const TRIANGLE_GZ_NAMES = `3
/data/sample1.fasta.gz
/data/sample2.fasta.gz\t0.02
/data/sample3.fasta.gz\t0.07\t0.05
`

/** Output with .fna extensions */
export const TRIANGLE_FNA_NAMES = `2
/data/isolate_A.fna
/data/isolate_B.fna\t0.15
`

/** Invalid output — N < 2 */
export const TRIANGLE_INVALID_N = `1
/data/only_one.fasta
`

/** Invalid output — not enough lines */
export const TRIANGLE_MISSING_LINES = `3
/data/genome_A.fasta
/data/genome_B.fasta\t0.05
`

/** Invalid output — non-numeric first line */
export const TRIANGLE_NON_NUMERIC_N = `abc
/data/genome_A.fasta
`
