import { render, screen, fireEvent } from '@testing-library/react'
import { MashOptions } from '../MashOptions'
import { DEFAULT_MASH_OPTIONS, DEFAULT_BOOTSTRAP_OPTIONS } from '../../mashtree/types'
import type { MashOptions as MashOptionsType, BootstrapOptions } from '../../mashtree/types'

function renderMashOptions(overrides: {
  options?: MashOptionsType
  onOptionsChange?: (options: MashOptionsType) => void
  bootstrapOptions?: BootstrapOptions
  onBootstrapChange?: (options: BootstrapOptions) => void
  disabled?: boolean
} = {}) {
  const props = {
    options: overrides.options ?? { ...DEFAULT_MASH_OPTIONS },
    onOptionsChange: overrides.onOptionsChange ?? vi.fn(),
    bootstrapOptions: overrides.bootstrapOptions ?? { ...DEFAULT_BOOTSTRAP_OPTIONS },
    onBootstrapChange: overrides.onBootstrapChange ?? vi.fn(),
    disabled: overrides.disabled ?? false,
  }
  const result = render(<MashOptions {...props} />)
  return { ...result, props }
}

describe('MashOptions', () => {
  it('renders all parameter labels', () => {
    renderMashOptions()

    expect(screen.getByText('Mash Parameters')).toBeInTheDocument()
    expect(screen.getByLabelText('K-mer length')).toBeInTheDocument()
    expect(screen.getByLabelText('Sketch size')).toBeInTheDocument()
    expect(screen.getByLabelText('Seed')).toBeInTheDocument()
    expect(screen.getByLabelText('Sort order')).toBeInTheDocument()
    expect(screen.getByText('Bootstrap')).toBeInTheDocument()
    expect(screen.getByLabelText('Enable bootstrap')).toBeInTheDocument()
  })

  it('shows the correct k-mer length value', () => {
    renderMashOptions({
      options: { ...DEFAULT_MASH_OPTIONS, kmerLength: 17 },
    })

    const input = screen.getByLabelText('K-mer length') as HTMLInputElement
    expect(input.value).toBe('17')
    expect(input.type).toBe('number')
    expect(input.min).toBe('1')
    expect(input.max).toBe('32')
  })

  it('shows the correct sketch size value', () => {
    renderMashOptions({
      options: { ...DEFAULT_MASH_OPTIONS, sketchSize: 5000 },
    })

    const input = screen.getByLabelText('Sketch size') as HTMLInputElement
    expect(input.value).toBe('5000')
    expect(input.type).toBe('number')
    expect(input.min).toBe('100')
    expect(input.max).toBe('1000000')
  })

  it('shows the correct seed value', () => {
    renderMashOptions({
      options: { ...DEFAULT_MASH_OPTIONS, seed: 99 },
    })

    const input = screen.getByLabelText('Seed') as HTMLInputElement
    expect(input.value).toBe('99')
    expect(input.type).toBe('number')
    expect(input.min).toBe('0')
  })

  it('shows the correct sort order value', () => {
    renderMashOptions({
      options: { ...DEFAULT_MASH_OPTIONS, sortOrder: 'input-order' },
    })

    const select = screen.getByLabelText('Sort order') as HTMLSelectElement
    expect(select.value).toBe('input-order')

    const options = select.querySelectorAll('option')
    expect(options).toHaveLength(3)
    expect(options[0].textContent).toBe('Alphabetical (ABC)')
    expect(options[1].textContent).toBe('Input order')
    expect(options[2].textContent).toBe('Random')
  })

  it('calls onOptionsChange when k-mer length changes', () => {
    const onOptionsChange = vi.fn()
    renderMashOptions({ onOptionsChange })

    const input = screen.getByLabelText('K-mer length')
    fireEvent.change(input, { target: { value: '15' } })

    expect(onOptionsChange).toHaveBeenCalledTimes(1)
    expect(onOptionsChange).toHaveBeenCalledWith({
      ...DEFAULT_MASH_OPTIONS,
      kmerLength: 15,
    })
  })

  it('calls onOptionsChange when sort order changes', () => {
    const onOptionsChange = vi.fn()
    renderMashOptions({ onOptionsChange })

    const select = screen.getByLabelText('Sort order')
    fireEvent.change(select, { target: { value: 'random' } })

    expect(onOptionsChange).toHaveBeenCalledTimes(1)
    expect(onOptionsChange).toHaveBeenCalledWith({
      ...DEFAULT_MASH_OPTIONS,
      sortOrder: 'random',
    })
  })

  it('shows bootstrap toggle initially unchecked when enabled is false', () => {
    renderMashOptions({
      bootstrapOptions: { ...DEFAULT_BOOTSTRAP_OPTIONS, enabled: false },
    })

    const checkbox = screen.getByLabelText('Enable bootstrap') as HTMLInputElement
    expect(checkbox.type).toBe('checkbox')
    expect(checkbox.checked).toBe(false)
  })

  it('calls onBootstrapChange when bootstrap toggle is clicked', () => {
    const onBootstrapChange = vi.fn()
    renderMashOptions({ onBootstrapChange })

    const checkbox = screen.getByLabelText('Enable bootstrap')
    fireEvent.click(checkbox)

    expect(onBootstrapChange).toHaveBeenCalledTimes(1)
    expect(onBootstrapChange).toHaveBeenCalledWith({
      ...DEFAULT_BOOTSTRAP_OPTIONS,
      enabled: true,
    })
  })

  it('hides bootstrap method and replicates fields when bootstrap is disabled', () => {
    renderMashOptions({
      bootstrapOptions: { ...DEFAULT_BOOTSTRAP_OPTIONS, enabled: false },
    })

    expect(screen.queryByLabelText('Method')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Replicates')).not.toBeInTheDocument()
  })

  it('shows bootstrap method and replicates fields when bootstrap is enabled', () => {
    renderMashOptions({
      bootstrapOptions: { ...DEFAULT_BOOTSTRAP_OPTIONS, enabled: true },
    })

    const methodSelect = screen.getByLabelText('Method') as HTMLSelectElement
    expect(methodSelect).toBeInTheDocument()
    expect(methodSelect.value).toBe('bootstrap')

    const methodOptions = methodSelect.querySelectorAll('option')
    expect(methodOptions).toHaveLength(2)
    expect(methodOptions[0].textContent).toBe('Bootstrap')
    expect(methodOptions[1].textContent).toBe('Jackknife')

    const repsInput = screen.getByLabelText('Replicates') as HTMLInputElement
    expect(repsInput).toBeInTheDocument()
    expect(repsInput.value).toBe('100')
    expect(repsInput.type).toBe('number')
    expect(repsInput.min).toBe('10')
    expect(repsInput.max).toBe('1000')
  })

  it('disables all inputs when disabled prop is true', () => {
    renderMashOptions({
      disabled: true,
      bootstrapOptions: { ...DEFAULT_BOOTSTRAP_OPTIONS, enabled: true },
    })

    expect(screen.getByLabelText('K-mer length')).toBeDisabled()
    expect(screen.getByLabelText('Sketch size')).toBeDisabled()
    expect(screen.getByLabelText('Seed')).toBeDisabled()
    expect(screen.getByLabelText('Sort order')).toBeDisabled()
    expect(screen.getByLabelText('Enable bootstrap')).toBeDisabled()
    expect(screen.getByLabelText('Method')).toBeDisabled()
    expect(screen.getByLabelText('Replicates')).toBeDisabled()
  })
})
