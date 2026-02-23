import { render, screen, fireEvent } from '@testing-library/react'
import { FileUpload } from '../FileUpload'

describe('FileUpload', () => {
  const noop = () => {}

  it('renders empty state with drop prompt', () => {
    render(<FileUpload files={[]} onFilesChange={noop} disabled={false} />)

    expect(
      screen.getByText('Drop FASTA files here or click to browse'),
    ).toBeInTheDocument()
    expect(screen.getByText('.fasta, .fa, .fna, .fsa, .gz')).toBeInTheDocument()
  })

  it('renders file count when files are provided', () => {
    const files = [
      new File(['content'], 'a.fasta', { type: 'text/plain' }),
      new File(['content'], 'b.fa', { type: 'text/plain' }),
      new File(['content'], 'c.fna', { type: 'text/plain' }),
    ]

    render(<FileUpload files={files} onFilesChange={noop} disabled={false} />)

    expect(screen.getByText('3 file(s) selected')).toBeInTheDocument()
  })

  it('lists individual file names when files are provided', () => {
    const files = [
      new File([''], 'genome1.fasta', { type: 'text/plain' }),
      new File([''], 'genome2.fa.gz', { type: 'text/plain' }),
    ]

    render(<FileUpload files={files} onFilesChange={noop} disabled={false} />)

    expect(screen.getByText('genome1.fasta')).toBeInTheDocument()
    expect(screen.getByText('genome2.fa.gz')).toBeInTheDocument()
  })

  it('file input has correct accept attribute', () => {
    render(<FileUpload files={[]} onFilesChange={noop} disabled={false} />)

    const input = screen.getByLabelText('Upload FASTA genome files')
    expect(input).toHaveAttribute(
      'accept',
      '.fasta,.fa,.fna,.fsa,.fasta.gz,.fa.gz,.fna.gz,.fsa.gz,.gz',
    )
  })

  it('file input has aria-label "Upload FASTA genome files"', () => {
    render(<FileUpload files={[]} onFilesChange={noop} disabled={false} />)

    const input = screen.getByLabelText('Upload FASTA genome files')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('file input triggers onFilesChange on change event', () => {
    const onFilesChange = vi.fn()
    render(
      <FileUpload files={[]} onFilesChange={onFilesChange} disabled={false} />,
    )

    const input = screen.getByLabelText(
      'Upload FASTA genome files',
    ) as HTMLInputElement
    const file = new File(['content'], 'test.fasta', { type: 'text/plain' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onFilesChange).toHaveBeenCalledTimes(1)
    expect(onFilesChange).toHaveBeenCalledWith([file])
  })

  it('disables the input when disabled prop is true', () => {
    render(<FileUpload files={[]} onFilesChange={noop} disabled={true} />)

    const input = screen.getByLabelText('Upload FASTA genome files')
    expect(input).toBeDisabled()
  })

  it('drag-drop filters out non-FASTA files', () => {
    const onFilesChange = vi.fn()
    render(
      <FileUpload files={[]} onFilesChange={onFilesChange} disabled={false} />,
    )

    const fastaFile = new File([''], 'genome.fasta', { type: 'text/plain' })
    const txtFile = new File([''], 'readme.txt', { type: 'text/plain' })
    const gzFile = new File([''], 'sample.fa.gz', { type: 'text/plain' })
    const csvFile = new File([''], 'data.csv', { type: 'text/csv' })

    const dropArea = screen
      .getByText(/Drop FASTA files/i)
      .closest('.file-upload')!

    fireEvent.drop(dropArea, {
      dataTransfer: { files: [fastaFile, txtFile, gzFile, csvFile] },
    })

    expect(onFilesChange).toHaveBeenCalledTimes(1)

    const passedFiles = onFilesChange.mock.calls[0][0] as File[]
    expect(passedFiles).toHaveLength(2)

    const names = passedFiles.map((f: File) => f.name)
    expect(names).toContain('genome.fasta')
    expect(names).toContain('sample.fa.gz')
    expect(names).not.toContain('readme.txt')
    expect(names).not.toContain('data.csv')
  })

  it('drag-drop calls onFilesChange with all valid FASTA extensions', () => {
    const onFilesChange = vi.fn()
    render(
      <FileUpload files={[]} onFilesChange={onFilesChange} disabled={false} />,
    )

    const fastaFile = new File([''], 'a.fasta', { type: 'text/plain' })
    const faFile = new File([''], 'b.fa', { type: 'text/plain' })
    const fnaFile = new File([''], 'c.fna', { type: 'text/plain' })
    const fsaFile = new File([''], 'd.fsa', { type: 'text/plain' })
    const fnaGzFile = new File([''], 'e.fna.gz', { type: 'text/plain' })

    const dropArea = screen
      .getByText(/Drop FASTA files/i)
      .closest('.file-upload')!

    fireEvent.drop(dropArea, {
      dataTransfer: {
        files: [fastaFile, faFile, fnaFile, fsaFile, fnaGzFile],
      },
    })

    expect(onFilesChange).toHaveBeenCalledTimes(1)

    const passedFiles = onFilesChange.mock.calls[0][0] as File[]
    expect(passedFiles).toHaveLength(5)
    expect(passedFiles.map((f: File) => f.name)).toEqual([
      'a.fasta',
      'b.fa',
      'c.fna',
      'd.fsa',
      'e.fna.gz',
    ])
  })
})
