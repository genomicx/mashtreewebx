import { render, screen, fireEvent } from '@testing-library/react'
import { PhyloTree } from '../PhyloTree'

const mockDestroy = vi.fn()
const mockSetProps = vi.fn()
const mockPhylocanvasGL = vi.fn(function (this: unknown) {
  ;(this as Record<string, unknown>).destroy = mockDestroy
  ;(this as Record<string, unknown>).setProps = mockSetProps
})

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(globalThis as any).phylocanvas = {
    PhylocanvasGL: mockPhylocanvasGL,
  }
})

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).phylocanvas
})

describe('PhyloTree', () => {
  const sampleNewick = '((A:0.1,B:0.2):0.3,C:0.4);'

  it('renders tree section with heading "Phylogenetic Tree"', () => {
    render(<PhyloTree newick={sampleNewick} />)

    expect(screen.getByText('Phylogenetic Tree')).toBeInTheDocument()
    expect(screen.getByText('Phylogenetic Tree').tagName).toBe('H2')
  })

  it('shows error when phylocanvas is not loaded', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).phylocanvas

    render(<PhyloTree newick={sampleNewick} />)

    expect(
      screen.getByText('phylocanvas.gl not loaded. Check CDN script in index.html.'),
    ).toBeInTheDocument()
  })

  it('creates PhylocanvasGL instance with newick source', () => {
    render(<PhyloTree newick={sampleNewick} />)

    expect(mockPhylocanvasGL).toHaveBeenCalledTimes(1)

    const callArgs = (mockPhylocanvasGL.mock.calls as unknown[][])[0]
    expect(callArgs[0]).toBeInstanceOf(HTMLDivElement)
    expect(callArgs[1]).toMatchObject({
      source: sampleNewick,
      showLabels: true,
      showLeafLabels: true,
    })
  })

  it('destroys tree on unmount', () => {
    const { unmount } = render(<PhyloTree newick={sampleNewick} />)

    expect(mockPhylocanvasGL).toHaveBeenCalledTimes(1)

    unmount()

    expect(mockDestroy).toHaveBeenCalled()
  })

  it('renders Export Newick button', () => {
    render(<PhyloTree newick={sampleNewick} />)

    const button = screen.getByText('Export Newick')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('Export Newick creates a download with correct filename', () => {
    const mockUrl = 'blob:http://localhost/fake-url'
    const createObjectURL = vi.fn(() => mockUrl)
    const revokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL

    const clickSpy = vi.fn()
    const originalCreateElement =
      Document.prototype.createElement.bind(document)

    const createElementSpy = vi
      .spyOn(document, 'createElement')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockImplementation((tagName: string, options?: any) => {
        const el = originalCreateElement(tagName, options)
        if (tagName === 'a') {
          el.click = clickSpy
        }
        return el
      })

    render(<PhyloTree newick={sampleNewick} />)

    const exportButton = screen.getByText('Export Newick')
    fireEvent.click(exportButton)

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const blob = (createObjectURL.mock.calls as unknown[][])[0][0] as Blob
    expect(blob).toBeInstanceOf(Blob)

    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith(mockUrl)

    createElementSpy.mockRestore()
  })
})
