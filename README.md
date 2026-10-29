# MashtreeWebX

> Browser-based phylogenetic tree builder from Mash MinHash distances — no server required.

MashtreeWebX is a WebAssembly implementation of [mashtree](https://github.com/lskatz/mashtree) by Lee Katz. Upload genome assemblies in FASTA format and get a neighbour-joining tree from Mash distances in seconds, with bootstrap or jackknife support values — all processing in-browser.

[Open MashtreeWebX](https://mashtreex.genomicx.org) · [Source code](https://github.com/genomicx/mashtreewebx)

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
# Node.js 24
npm install
npm run dev
```

Open http://localhost:5173

## Running Tests

```bash
npm test           # unit tests
npm run test:e2e   # end-to-end tests (requires build first)
```

## Hosting and interface

The live application runs on Cloudflare Pages at https://mashtreex.genomicx.org. Pushes to `main` deploy automatically with Node.js 24, `npm run build` and the `dist` output directory. Both production and preview builds use the same Node version.

Shared `@genomicx/ui` tokens provide neutral light and dark themes, IBM Plex Sans interface text and IBM Plex Mono data and console text. Fonts are bundled with the application.

## Contributing

Contributions welcome. Please open an issue first to discuss changes.

## License

GPL-3.0-only — see [LICENSE](LICENSE)
