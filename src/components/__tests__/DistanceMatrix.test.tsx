import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DistanceMatrix } from '../DistanceMatrix'

const names = ['A', 'B', 'C']
const matrix = [
  [0, 0.1234, 0.5678],
  [0.1234, 0, 0.9012],
  [0.5678, 0.9012, 0],
]

describe('DistanceMatrix', () => {
  it('renders nothing when names array is empty', () => {
    const { container } = render(<DistanceMatrix matrix={[]} names={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders correct column headers in thead', () => {
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const thead = document.querySelector('thead')
    expect(thead).toBeInTheDocument()

    const headerCells = thead!.querySelectorAll('th')
    // First th is the empty corner cell, then A, B, C
    expect(headerCells).toHaveLength(4)
    expect(headerCells[0]).toHaveTextContent('')
    expect(headerCells[1]).toHaveTextContent('A')
    expect(headerCells[2]).toHaveTextContent('B')
    expect(headerCells[3]).toHaveTextContent('C')
  })

  it('renders correct row names as the first cell in each body row', () => {
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const filenameCells = document.querySelectorAll('.filename-cell')
    expect(filenameCells).toHaveLength(3)
    expect(filenameCells[0]).toHaveTextContent('A')
    expect(filenameCells[1]).toHaveTextContent('B')
    expect(filenameCells[2]).toHaveTextContent('C')
  })

  it('formats off-diagonal distances to 4 decimal places', () => {
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const distanceCells = document.querySelectorAll('.distance-cell')
    const values = Array.from(distanceCells).map((cell) => cell.textContent)

    // Off-diagonal cells: (0,1), (0,2), (1,0), (1,2), (2,0), (2,1)
    expect(values).toContain('0.1234')
    expect(values).toContain('0.5678')
    expect(values).toContain('0.9012')
    // Total off-diagonal cells for a 3x3 matrix = 6
    expect(distanceCells).toHaveLength(6)
  })

  it('displays em-dash on the diagonal cells', () => {
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const zeroCells = document.querySelectorAll('.distance-zero')
    expect(zeroCells).toHaveLength(3)
    zeroCells.forEach((cell) => {
      expect(cell).toHaveTextContent('\u2014') // em-dash
    })
  })

  it('renders an Export TSV button', () => {
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const button = screen.getByRole('button', { name: /export tsv/i })
    expect(button).toBeInTheDocument()
  })

  it('creates a downloadable TSV blob when Export TSV is clicked', async () => {
    const createObjectURLMock = vi.fn(() => 'blob:mock')
    const revokeObjectURLMock = vi.fn()
    globalThis.URL.createObjectURL = createObjectURLMock
    globalThis.URL.revokeObjectURL = revokeObjectURLMock

    // Spy on document.createElement to capture the anchor click
    const clickSpy = vi.fn()
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string, options?: ElementCreationOptions) => {
        const element = originalCreateElement(tagName, options)
        if (tagName === 'a') {
          element.click = clickSpy
        }
        return element
      })

    const user = userEvent.setup()
    render(<DistanceMatrix matrix={matrix} names={names} />)

    const button = screen.getByRole('button', { name: /export tsv/i })
    await user.click(button)

    expect(createObjectURLMock).toHaveBeenCalledOnce()
    const blobArg = (createObjectURLMock.mock.calls as unknown[][])[0][0] as Blob
    expect(blobArg).toBeInstanceOf(Blob)
    expect(blobArg.type).toBe('text/tab-separated-values')

    expect(clickSpy).toHaveBeenCalledOnce()
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock')

    createElementSpy.mockRestore()
  })
})
