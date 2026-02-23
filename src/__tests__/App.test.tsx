import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from '../App'
import { runMashtree } from '../mashtree/pipeline'

vi.mock('../mashtree/pipeline', () => ({
  runMashtree: vi.fn(),
}))

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).phylocanvas = {
    PhylocanvasGL: vi.fn(() => ({ destroy: vi.fn(), setProps: vi.fn() })),
  }
  // jsdom does not implement scrollIntoView; stub it so LogConsole works
  Element.prototype.scrollIntoView = vi.fn()
  localStorage.clear()
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).phylocanvas
  vi.restoreAllMocks()
})

/**
 * Helper: upload two FASTA files via the hidden file input so that
 * the Build Tree button becomes enabled.
 */
function uploadTwoFiles() {
  const input = screen.getByLabelText('Upload FASTA genome files')
  const file1 = new File(['content1'], 'genome_a.fasta', { type: 'text/plain' })
  const file2 = new File(['content2'], 'genome_b.fasta', { type: 'text/plain' })
  fireEvent.change(input, { target: { files: [file1, file2] } })
}

describe('App integration tests', () => {
  // ---------------------------------------------------------------
  // 1. Renders heading
  // ---------------------------------------------------------------
  it('renders the heading "mashtreewebx"', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'mashtreewebx',
    )
  })

  // ---------------------------------------------------------------
  // 2. Renders subtitle text
  // ---------------------------------------------------------------
  it('renders the subtitle text', () => {
    render(<App />)
    expect(
      screen.getByText(
        'Browser-based phylogenetic trees from genome assemblies',
      ),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // 3. Analysis tab active by default
  // ---------------------------------------------------------------
  it('shows the Analysis tab as active by default', () => {
    render(<App />)
    const analysisTab = screen.getByRole('button', { name: 'Analysis' })
    expect(analysisTab.className).toContain('tab-active')
  })

  // ---------------------------------------------------------------
  // 4. Clicking About tab shows AboutPage content
  // ---------------------------------------------------------------
  it('shows About page content when the About tab is clicked', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'About' }))
    expect(
      screen.getByRole('heading', { name: /About mashtreewebx/i }),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // 5. Clicking Analysis tab returns to analysis view
  // ---------------------------------------------------------------
  it('returns to analysis view when Analysis tab is clicked after About', () => {
    render(<App />)
    // Navigate away to About
    fireEvent.click(screen.getByRole('button', { name: 'About' }))
    expect(
      screen.queryByLabelText('Upload FASTA genome files'),
    ).not.toBeInTheDocument()

    // Navigate back to Analysis
    fireEvent.click(screen.getByRole('button', { name: 'Analysis' }))
    expect(
      screen.getByLabelText('Upload FASTA genome files'),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // 6. Build Tree button exists
  // ---------------------------------------------------------------
  it('renders a "Build Tree" button', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: 'Build Tree' }),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // 7. Build Tree button disabled initially (no files)
  // ---------------------------------------------------------------
  it('disables the Build Tree button when no files are selected', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Build Tree' })).toBeDisabled()
  })

  // ---------------------------------------------------------------
  // 8. Theme toggle button exists
  // ---------------------------------------------------------------
  it('renders a theme toggle button', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: 'Toggle theme' }),
    ).toBeInTheDocument()
  })

  // ---------------------------------------------------------------
  // 9. Theme toggle changes localStorage
  // ---------------------------------------------------------------
  it('persists the theme to localStorage when toggled', () => {
    render(<App />)
    const toggleBtn = screen.getByRole('button', { name: 'Toggle theme' })

    // Default is light
    expect(localStorage.getItem('mashtreewebx-theme')).toBe('light')

    // Toggle to dark
    fireEvent.click(toggleBtn)
    expect(localStorage.getItem('mashtreewebx-theme')).toBe('dark')

    // Toggle back to light
    fireEvent.click(toggleBtn)
    expect(localStorage.getItem('mashtreewebx-theme')).toBe('light')
  })

  // ---------------------------------------------------------------
  // 10. Build Tree button enables when files >= 2, and triggers
  //     runMashtree on click
  // ---------------------------------------------------------------
  it('enables Build Tree and calls runMashtree when two files are uploaded', async () => {
    vi.mocked(runMashtree).mockResolvedValue({
      newick: '(A:0.1,B:0.2);',
      distanceMatrix: [
        [0, 0.1],
        [0.1, 0],
      ],
      genomeNames: ['A', 'B'],
    })

    render(<App />)

    // Initially disabled
    const buildBtn = screen.getByRole('button', { name: 'Build Tree' })
    expect(buildBtn).toBeDisabled()

    // Upload two files
    uploadTwoFiles()

    // Now enabled
    expect(buildBtn).not.toBeDisabled()

    // Click and verify pipeline is called
    fireEvent.click(buildBtn)
    await waitFor(() => {
      expect(runMashtree).toHaveBeenCalledTimes(1)
    })

    // Verify first two arguments are File arrays and options
    const callArgs = vi.mocked(runMashtree).mock.calls[0]
    expect(callArgs[0]).toHaveLength(2)
    expect(callArgs[0][0]).toBeInstanceOf(File)
  })

  // ---------------------------------------------------------------
  // 11. Error display when pipeline rejects
  // ---------------------------------------------------------------
  it('displays an error alert when runMashtree rejects', async () => {
    vi.mocked(runMashtree).mockRejectedValue(
      new Error('Mash WASM failed to load'),
    )

    render(<App />)
    uploadTwoFiles()

    fireEvent.click(screen.getByRole('button', { name: 'Build Tree' }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent('Mash WASM failed to load')
    })
  })

  // ---------------------------------------------------------------
  // 12. Progress display during run
  // ---------------------------------------------------------------
  it('shows progress bar and text while the pipeline is running', async () => {
    let resolveRun!: (value: {
      newick: string
      distanceMatrix: number[][]
      genomeNames: string[]
    }) => void

    vi.mocked(runMashtree).mockImplementation(
      async (_files, _opts, _bsOpts, onProgress) => {
        onProgress('Computing distances...', 50)
        return new Promise((resolve) => {
          resolveRun = resolve
        })
      },
    )

    render(<App />)
    uploadTwoFiles()

    fireEvent.click(screen.getByRole('button', { name: 'Build Tree' }))

    // Wait for the progress section to appear
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })

    // Verify progress text
    expect(screen.getByText('Computing distances...')).toBeInTheDocument()

    // Verify the progressbar aria attributes
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '50')

    // Button should show "Running..." and be disabled
    expect(
      screen.getByRole('button', { name: 'Running...' }),
    ).toBeDisabled()

    // Resolve the pipeline to clean up
    resolveRun({
      newick: '(A:0.1,B:0.2);',
      distanceMatrix: [
        [0, 0.1],
        [0.1, 0],
      ],
      genomeNames: ['A', 'B'],
    })

    // Wait for running state to clear
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Build Tree' }),
      ).not.toBeDisabled()
    })
  })

  // ---------------------------------------------------------------
  // 13. Results rendering: distance matrix, tree, and log
  // ---------------------------------------------------------------
  it('renders distance matrix, phylogenetic tree, and log console after successful run', async () => {
    vi.mocked(runMashtree).mockImplementation(
      async (_files, _opts, _bsOpts, onProgress, onLog) => {
        onProgress('Computing distances...', 50)
        onLog('Reading genome files...')
        onLog('Pipeline complete.')
        return {
          newick: '(genome_a:0.1,genome_b:0.2);',
          distanceMatrix: [
            [0, 0.15],
            [0.15, 0],
          ],
          genomeNames: ['genome_a', 'genome_b'],
        }
      },
    )

    render(<App />)
    uploadTwoFiles()

    fireEvent.click(screen.getByRole('button', { name: 'Build Tree' }))

    // Wait for the distance matrix heading to appear
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Distance Matrix' }),
      ).toBeInTheDocument()
    })

    // Verify genome names appear in the table (appear in both header and row)
    expect(screen.getAllByText('genome_a').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('genome_b').length).toBeGreaterThanOrEqual(1)

    // Verify distance value is rendered (0.1500 formatted to 4 decimal places)
    expect(screen.getAllByText('0.1500').length).toBeGreaterThanOrEqual(1)

    // Verify the phylogenetic tree section appeared
    expect(
      screen.getByRole('heading', { name: 'Phylogenetic Tree' }),
    ).toBeInTheDocument()

    // Verify the log console appeared with entries
    expect(
      screen.getByRole('heading', { name: 'Log' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Reading genome files/)).toBeInTheDocument()
    expect(screen.getByText(/Pipeline complete/)).toBeInTheDocument()
  })
})
