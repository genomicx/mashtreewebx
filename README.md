# mashtreewebx

Browser-based phylogenetic tree construction using Mash MinHash distances and neighbor-joining.

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Live Demo](https://img.shields.io/badge/demo-mashtreewebx.vercel.app-brightgreen)](https://mashtreewebx.vercel.app)

## Overview

mashtreewebx computes MinHash distances between genome assemblies entirely in the browser using [Mash](https://github.com/marbl/Mash) compiled to WebAssembly, builds neighbor-joining trees with [patristic](https://github.com/CDCgov/patristic) (CDC), and visualizes results with [phylocanvas.gl](https://www.phylocanvas.gl/).

It is a web reimplementation of [mashtree](https://github.com/lskatz/mashtree) by Lee Katz. The pipeline sketches each genome with Mash, computes pairwise MinHash distances, and infers a neighbor-joining phylogeny. Bootstrap and jackknife support values are computed by re-running with different hash seeds.

**No data leaves your machine** -- all processing happens client-side using WebAssembly. Upload your genome assemblies, adjust parameters, and get a phylogenetic tree in seconds.

**Try it now:** <https://mashtreewebx.vercel.app>

## Features

- Drag-and-drop FASTA file upload with gzip (.gz) support
- MinHash distance computation via Mash WASM
- Neighbor-joining tree construction
- Interactive tree visualization with phylocanvas.gl
- Bootstrap and jackknife branch support estimation
- Newick tree export and TSV distance matrix export
- Configurable k-mer length, sketch size, seed, and sort order
- Light and dark theme
- Fully client-side -- no server, no uploads, complete privacy

## Quick Start

### Use online

Visit <https://mashtreewebx.vercel.app>, drag in your FASTA files, and click **Run**.

### Run locally

Prerequisites: Node.js 18+, a modern browser with WebAssembly support.

```bash
git clone https://github.com/happykhan/mashtreewebx.git
cd mashtreewebx
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

## Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| K-mer length | 21 | 1--32 | Size of k-mers used for MinHash sketching. Larger values increase specificity. |
| Sketch size | 10,000 | 100--1,000,000 | Number of non-redundant min-hashes per genome. Larger values give more accurate distance estimates. |
| Seed | 42 | 0+ | Hash function seed. Different seeds produce different sketches, used for bootstrap replicates. |
| Sort order | ABC | ABC / input-order / random | Ordering of genome names in the distance matrix. |
| Bootstrap method | off | bootstrap / jackknife | Re-run with different seeds (bootstrap) or reduced sketch size (jackknife) to estimate branch support. |
| Replicates | 100 | 10--1,000 | Number of bootstrap or jackknife replicates. |

## Architecture

### Component tree

```
App.tsx (state orchestrator)
├── FileUpload        -- drag-drop FASTA/.gz file selection
├── MashOptions       -- k-mer, sketch size, seed, sort order, bootstrap settings
├── DistanceMatrix    -- distance table display + TSV export
├── PhyloTree         -- phylocanvas.gl tree rendering + Newick export
├── LogConsole        -- scrollable debug log
└── AboutPage         -- references and parameter docs
```

### Pipeline data flow (`src/mashtree/`)

1. **pipeline.ts** -- orchestrator; reads files as raw `Uint8Array`, decompresses `.gz` via `DecompressionStream`, calls downstream steps with progress/log callbacks
2. **mashRunner.ts** -- creates fresh WASM instances, runs `mash sketch` then `mash triangle`, parses Phylip lower-triangle output
3. **buildTree.ts** -- deep-copies matrix, calls `patristic.parseMatrix()` for NJ, outputs Newick; handles genome sort order
4. **bootstrap.ts** -- runs N replicates with different seeds, extracts bipartitions, annotates reference tree with support percentages
5. **types.ts** -- shared interfaces (`MashOptions`, `BootstrapOptions`, `MashtreeResult`) and defaults

### File structure

```
src/
├── App.tsx, App.css, main.tsx
├── components/
│   ├── FileUpload.tsx
│   ├── MashOptions.tsx
│   ├── DistanceMatrix.tsx
│   ├── PhyloTree.tsx
│   ├── LogConsole.tsx
│   └── AboutPage.tsx
├── mashtree/
│   ├── types.ts
│   ├── pipeline.ts
│   ├── mashRunner.ts
│   ├── buildTree.ts
│   ├── bootstrap.ts
│   └── parseFasta.ts
└── __tests__/

public/
├── wasm/
│   ├── mash.js       # Emscripten module factory
│   └── mash.wasm     # WASM binary
└── test.html

e2e/
├── app.spec.ts
└── pipeline.spec.ts
```

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest (single run) |
| `npm run test:watch` | Run Vitest (watch mode) |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run check` | Full CI: vitest + eslint + build |
| `npm run preview` | Preview production build |

### Tech stack

- **React 18** + TypeScript, bundled with **Vite** (target: ES2022)
- **patristic** (CDC) -- neighbor-joining tree construction
- **phylocanvas.gl** -- tree visualization (loaded from CDN)
- **Mash WASM** -- Emscripten-compiled Mash binary
- **Vitest** + Testing Library -- unit tests
- **Playwright** -- end-to-end tests
- CSS custom properties for theming (no CSS framework)

## Deployment

### Vercel

Deployed from the `main` branch. Configuration in `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

### Docker

Multi-stage build using Node 22 Alpine for building and Nginx Alpine for serving:

```bash
docker build -t mashtreewebx .
docker run -p 8080:80 mashtreewebx
```

Then open <http://localhost:8080>.

### Self-hosting

The production build produces a static site in `dist/`. Serve it with any static file server. Ensure your server delivers `.wasm` files with the `application/wasm` MIME type.

## Testing

**Unit tests** use Vitest with Testing Library:

```bash
npm run test          # single run
npm run test:watch    # watch mode
```

**End-to-end tests** use Playwright:

```bash
npx playwright install   # first-time setup
npm run test:e2e
```

**Full CI check** (unit tests + lint + build):

```bash
npm run check
```

## References

- Ondov BD, Treangen TJ, Melsted P, Mallonee AB, Bergman NH, Koren S, Phillippy AM. Mash: fast genome and metagenome distance estimation using MinHash. *Genome Biol.* 2016;17:132. [doi:10.1186/s13059-016-0997-x](https://doi.org/10.1186/s13059-016-0997-x)

- Katz LS, Griswold T, Morrison SS, Caravas JA, Zhang S, den Bakker HC, Deng X, Carleton HA. Mashtree: a rapid comparison of whole genome sequence files. *J Open Source Softw.* 2019;4(44):1762. [doi:10.21105/joss.01762](https://doi.org/10.21105/joss.01762)

This project is a web reimplementation of [mashtree](https://github.com/lskatz/mashtree) by Lee Katz.

## Author

**Nabil-Fareed Alikhan**
Senior Bioinformatician, Centre for Genomic Pathogen Surveillance, University of Oxford

- [happykhan.com](https://www.happykhan.com)
- [ORCID: 0000-0002-1243-0767](https://orcid.org/0000-0002-1243-0767)
- [nabil@happykhan.com](mailto:nabil@happykhan.com)
- [GitHub: happykhan](https://github.com/happykhan)

## License

[GPL-3.0-only](https://www.gnu.org/licenses/gpl-3.0.html)
