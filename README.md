# MashtreeWebX

> Browser-based phylogenetic tree builder from Mash MinHash distances — no server required.

MashtreeWebX is a WebAssembly implementation of [mashtree](https://github.com/lskatz/mashtree) by Lee Katz. Upload genome assemblies in FASTA format and get a neighbour-joining tree from Mash distances in seconds, with bootstrap or jackknife support values — all processing in-browser.

## Features

- Neighbour-joining tree from pairwise Mash distances
- Bootstrap and jackknife support values
- Configurable k-mer length, sketch size, and hash seed
- Interactive tree visualisation with Newick export
- Scales to dozens of genomes in the browser
- All processing in-browser — no upload, no server

## Tech Stack

- **Mash** — MinHash distance estimation (via Aioli/biowasm WebAssembly)
- **patristic** — neighbour-joining tree inference (JavaScript, CDC)
- **React + Vite** — frontend framework
- **Cloudflare Pages** — global CDN hosting

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Running Tests

```bash
npm test           # unit tests
npm run test:e2e   # end-to-end tests (requires build first)
```

## Contributing

Contributions welcome. Please open an issue first to discuss changes.

## License

GPL-3.0-only — see [LICENSE](LICENSE)
