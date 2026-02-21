export function AboutPage() {
  return (
    <div className="about-page">
      <section>
        <h2>About mashtreewebx</h2>
        <p>
          mashtreewebx is a browser-based phylogenetic tree builder for genome
          assemblies. It uses{' '}
          <a
            href="https://github.com/marbl/Mash"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mash
          </a>{' '}
          compiled to WebAssembly to compute MinHash distances, then builds
          neighbor-joining trees using the{' '}
          <a
            href="https://github.com/CDCgov/patristic"
            target="_blank"
            rel="noopener noreferrer"
          >
            patristic
          </a>{' '}
          library — a JavaScript phylogenetics toolkit from the CDC.
        </p>
        <p>
          This tool is a web implementation of{' '}
          <a
            href="https://github.com/lskatz/mashtree"
            target="_blank"
            rel="noopener noreferrer"
          >
            mashtree
          </a>{' '}
          by Lee Katz. The pipeline sketches each genome with Mash, computes
          pairwise MinHash distances, and infers a neighbor-joining
          phylogeny. Bootstrap and jackknife support values are computed by
          re-running with different hash seeds.
        </p>
        <div className="privacy-note">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>
            No data leaves your machine — all processing happens client-side
            using WebAssembly. Upload your genome assemblies, adjust
            parameters, and get a phylogenetic tree in seconds.
          </p>
        </div>
      </section>

      <section>
        <h2>Parameters</h2>
        <p>
          <strong>K-mer length</strong> (default 21): Size of k-mers used for
          MinHash sketching. Larger values increase specificity.
        </p>
        <p>
          <strong>Sketch size</strong> (default 10,000): Number of
          non-redundant min-hashes per genome. Larger values give more accurate
          distance estimates.
        </p>
        <p>
          <strong>Seed</strong> (default 42): Hash function seed. Different
          seeds produce different sketches, which is used for bootstrap
          replicates.
        </p>
        <p>
          <strong>Sort order</strong>: How genome names are ordered in the
          distance matrix. Alphabetical (ABC), input file order, or random.
        </p>
        <p>
          <strong>Bootstrap / Jackknife</strong>: Re-run the pipeline with
          different seeds (bootstrap) or reduced sketch size (jackknife) to
          estimate branch support values.
        </p>
      </section>

      <section>
        <h2>References</h2>
        <p>
          Ondov BD, Treangen TJ, Melsted P, Mallonee AB, Bergman NH, Koren S,
          Phillippy AM. Mash: fast genome and metagenome distance estimation
          using MinHash. <em>Genome Biol.</em> 2016;17:132.
        </p>
        <p>
          Katz LS, Griswold T, Morrison SS, Caravas JA, Zhang S, den Bakker HC,
          Deng X, Carleton HA. Mashtree: a rapid comparison of whole genome
          sequence files. <em>J Open Source Softw.</em> 2019;4(44):1762.
        </p>
      </section>

      <section>
        <h2>About the Author</h2>
        <h3>Nabil-Fareed Alikhan</h3>
        <p className="about-role">
          Senior Bioinformatician, Centre for Genomic Pathogen Surveillance,
          University of Oxford
        </p>
        <p>
          Bioinformatics researcher and software developer specialising in
          microbial genomics. I build widely used open-source tools, publish
          peer-reviewed research, and co-host the MicroBinfie podcast.
        </p>
        <div className="about-links">
          <a
            href="https://www.happykhan.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            happykhan.com
          </a>
          <a
            href="https://orcid.org/0000-0002-1243-0767"
            target="_blank"
            rel="noopener noreferrer"
          >
            ORCID: 0000-0002-1243-0767
          </a>
          <a href="mailto:nabil@happykhan.com">nabil@happykhan.com</a>
          <a
            href="https://twitter.com/happy_khan"
            target="_blank"
            rel="noopener noreferrer"
          >
            Twitter: @happy_khan
          </a>
          <a
            href="https://mstdn.science/@happykhan"
            target="_blank"
            rel="noopener noreferrer"
          >
            Mastodon: @happykhan@mstdn.science
          </a>
        </div>
      </section>
    </div>
  )
}
