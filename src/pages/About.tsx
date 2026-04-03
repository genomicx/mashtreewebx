import { Link } from 'react-router-dom'

export function About() {
  return (
    <div className="about-page">
      <section>
        <h2>About MashtreeWebX</h2>
        <p>
          MashtreeWebX is a browser-based phylogenetic tree builder — a WebAssembly
          implementation of{' '}
          <a href="https://github.com/lskatz/mashtree" target="_blank" rel="noopener noreferrer">
            mashtree
          </a>{' '}
          by Lee Katz. Upload genome assemblies in FASTA format and get a neighbour-joining
          tree from Mash distances in seconds, with no server required.
        </p>
        <div className="privacy-note">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens client-side using WebAssembly.
            Upload your genome assemblies and get a phylogenetic tree in seconds.
          </p>
        </div>
      </section>

      <section>
        <h2>Features</h2>
        <ul>
          <li>Neighbour-joining tree from pairwise Mash distances</li>
          <li>Bootstrap and jackknife support values</li>
          <li>Configurable k-mer length, sketch size, and hash seed</li>
          <li>Interactive tree visualisation with Newick export</li>
          <li>Scales to dozens of genomes in the browser</li>
          <li>All processing in-browser — no upload, no server</li>
        </ul>
      </section>

      <section>
        <h2>How it works</h2>
        <p>
          MashtreeWebX sketches each uploaded genome with Mash (compiled to WebAssembly),
          then computes all pairwise MinHash distances. The distance matrix is passed to the{' '}
          <a href="https://github.com/CDCgov/patristic" target="_blank" rel="noopener noreferrer">
            patristic
          </a>{' '}
          library (a JavaScript phylogenetics toolkit from the CDC) to build a
          neighbour-joining tree.
        </p>
        <p>
          Bootstrap support values are estimated by re-running the pipeline with different
          hash seeds; jackknife support by re-running with a reduced sketch size.
        </p>
      </section>

      <section>
        <h2>Parameters</h2>
        <p>
          <strong>K-mer length</strong> (default 21): Size of k-mers used for MinHash
          sketching. Larger values increase specificity but may miss divergent sequences.
        </p>
        <p>
          <strong>Sketch size</strong> (default 10,000): Number of non-redundant min-hashes
          per genome. Larger values give more accurate distance estimates.
        </p>
        <p>
          <strong>Seed</strong> (default 42): Hash function seed. Different seeds produce
          different sketches, used for bootstrap replicates.
        </p>
        <p>
          <strong>Sort order</strong>: How genome names are ordered in the distance matrix —
          alphabetical, input file order, or random.
        </p>
        <p>
          <strong>Bootstrap / Jackknife</strong>: Re-run the pipeline with different seeds
          (bootstrap) or reduced sketch size (jackknife) to estimate branch support values.
        </p>
      </section>

      <section>
        <h2>Technology</h2>
        <ul>
          <li><strong>Mash</strong> — MinHash distance estimation (via Aioli/biowasm WebAssembly)</li>
          <li><strong>patristic</strong> — neighbour-joining tree inference (JavaScript, CDC)</li>
          <li><strong>React + Vite</strong> — frontend framework</li>
          <li><strong>Cloudflare Pages</strong> — global CDN hosting</li>
        </ul>
      </section>

      <section>
        <h2>Citation</h2>
        <p>If you use MashtreeWebX in your research, please cite:</p>
        <blockquote style={{ borderLeft: '4px solid var(--gx-accent)', paddingLeft: '1rem', color: 'var(--gx-text-muted)', fontStyle: 'italic', margin: '0.75rem 0' }}>
          Ondov BD et al. Mash: fast genome and metagenome distance estimation using MinHash.{' '}
          <em>Genome Biol.</em> 2016;17:132.
        </blockquote>
        <blockquote style={{ borderLeft: '4px solid var(--gx-accent)', paddingLeft: '1rem', color: 'var(--gx-text-muted)', fontStyle: 'italic', margin: '0.75rem 0' }}>
          Katz LS et al. Mashtree: a rapid comparison of whole genome sequence files.{' '}
          <em>J Open Source Softw.</em> 2019;4(44):1762.
        </blockquote>
      </section>

      <section>
        <h2>Source Code</h2>
        <p>
          MashtreeWebX is open-source software. Contributions and issues welcome on{' '}
          <a href="https://github.com/genomicx/mashtreewebx" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>.
        </p>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance, University of Oxford
        </p>
        <p>
          Bioinformatics researcher and software developer specialising in microbial genomics.
          Builder of widely used open-source tools, peer-reviewed researcher, and co-host of
          the MicroBinfie podcast.
        </p>
        <div className="about-links">
          <a href="https://www.happykhan.com" target="_blank" rel="noopener noreferrer">happykhan.com</a>
          <a href="https://orcid.org/0000-0002-1243-0767" target="_blank" rel="noopener noreferrer">ORCID: 0000-0002-1243-0767</a>
          <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
          <a href="https://twitter.com/happy_khan" target="_blank" rel="noopener noreferrer">@happy_khan</a>
          <a href="https://mstdn.science/@happykhan" target="_blank" rel="noopener noreferrer">@happykhan@mstdn.science</a>
        </div>
      </section>

      <div style={{ marginTop: '1rem' }}>
        <Link to="/" style={{ color: 'var(--gx-accent)', textDecoration: 'none', fontWeight: 500 }}>
          ← Back to Application
        </Link>
      </div>
    </div>
  )
}
