import { render, screen, fireEvent } from '@testing-library/react'
import { LogConsole } from '../LogConsole'

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

describe('LogConsole', () => {
  it('returns null when lines array is empty', () => {
    const { container } = render(<LogConsole lines={[]} />)

    expect(container.innerHTML).toBe('')
  })

  it('renders log lines with their text content', () => {
    const lines = ['Starting pipeline...', 'Sketching genomes...', 'Done.']

    render(<LogConsole lines={lines} />)

    expect(screen.getByText('Starting pipeline...')).toBeInTheDocument()
    expect(screen.getByText('Sketching genomes...')).toBeInTheDocument()
    expect(screen.getByText('Done.')).toBeInTheDocument()
  })

  it('shows 1-based line numbers padded to 3 characters', () => {
    const lines = ['Line one', 'Line two']

    const { container } = render(<LogConsole lines={lines} />)

    const indexSpans = container.querySelectorAll('.log-index')
    expect(indexSpans).toHaveLength(2)
    expect(indexSpans[0].textContent).toBe('  1')
    expect(indexSpans[1].textContent).toBe('  2')
  })

  it('shows entry count matching the number of lines', () => {
    const lines = ['a', 'b', 'c', 'd', 'e']

    render(<LogConsole lines={lines} />)

    expect(screen.getByText('5 entries')).toBeInTheDocument()
  })

  it('renders Copy Log button', () => {
    const lines = ['some log line']

    render(<LogConsole lines={lines} />)

    const button = screen.getByText('Copy Log')
    expect(button).toBeInTheDocument()
    expect(button.tagName).toBe('BUTTON')
  })

  it('copies log lines to clipboard when Copy Log is clicked', async () => {
    const writeTextMock = vi.fn(() => Promise.resolve())
    Object.assign(navigator, { clipboard: { writeText: writeTextMock } })

    const lines = ['First line', 'Second line', 'Third line']

    render(<LogConsole lines={lines} />)

    const copyButton = screen.getByText('Copy Log')
    fireEvent.click(copyButton)

    expect(writeTextMock).toHaveBeenCalledTimes(1)
    expect(writeTextMock).toHaveBeenCalledWith(
      'First line\nSecond line\nThird line',
    )
  })
})
