/** A single contig from a parsed FASTA file */
export interface Contig {
  name: string
  sequence: string
}

/** A parsed FASTA file with its contigs */
export interface ParsedFasta {
  filename: string
  contigs: Contig[]
}

/** Mash sketch/distance options */
export interface MashOptions {
  kmerLength: number // default 21
  sketchSize: number // default 10000
  genomeSize: number // default 5000000
  minDepth: number // default 5
  seed: number // default 42
  sortOrder: 'ABC' | 'random' | 'input-order'
}

/** Bootstrap/jackknife options */
export interface BootstrapOptions {
  enabled: boolean
  method: 'bootstrap' | 'jackknife'
  replicates: number // default 100
}

/** Result from the mashtree pipeline */
export interface MashtreeResult {
  newick: string
  distanceMatrix: number[][]
  genomeNames: string[]
}

export const DEFAULT_MASH_OPTIONS: MashOptions = {
  kmerLength: 21,
  sketchSize: 10000,
  genomeSize: 5000000,
  minDepth: 5,
  seed: 42,
  sortOrder: 'ABC',
}

export const DEFAULT_BOOTSTRAP_OPTIONS: BootstrapOptions = {
  enabled: false,
  method: 'bootstrap',
  replicates: 100,
}
