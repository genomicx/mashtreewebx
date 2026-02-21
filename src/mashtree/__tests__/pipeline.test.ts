import { runMashtree } from '../pipeline'
import { computeDistanceMatrix } from '../mashRunner'
import { buildNeighborJoiningTree, sortGenomes } from '../buildTree'
import { runBootstrap } from '../bootstrap'
import { DEFAULT_MASH_OPTIONS, DEFAULT_BOOTSTRAP_OPTIONS } from '../types'
import type { MashOptions, BootstrapOptions } from '../types'

vi.mock('../mashRunner', () => ({
  computeDistanceMatrix: vi.fn(),
}))
vi.mock('../buildTree', () => ({
  buildNeighborJoiningTree: vi.fn(),
  sortGenomes: vi.fn(),
}))
vi.mock('../bootstrap', () => ({
  runBootstrap: vi.fn(),
}))

// --- Helpers ---

/**
 * Create a File-like object with a working arrayBuffer() method.
 * jsdom's File implementation does not provide arrayBuffer(), so we
 * polyfill it by delegating to the underlying Blob text approach.
 */
function createMockFile(name: string, content: string): File {
  const bytes = new TextEncoder().encode(content)
  const file = new File([bytes], name, { type: 'application/octet-stream' })

  // Polyfill arrayBuffer() for jsdom environments that lack it
  if (typeof file.arrayBuffer !== 'function') {
    file.arrayBuffer = () => Promise.resolve(bytes.buffer as ArrayBuffer)
  }

  return file
}

const mockDistResult = {
  matrix: [
    [0, 0.1],
    [0.1, 0],
  ],
  names: ['A', 'B'],
}

const mockSortResult = {
  matrix: [
    [0, 0.1],
    [0.1, 0],
  ],
  names: ['A', 'B'],
}

const mockNewick = '(A:0.05,B:0.05);'
const mockBootstrapNewick = '(A:0.05,B:0.05)100;'

const defaultFiles = [
  createMockFile('genomeA.fasta', '>seq1\nACGT'),
  createMockFile('genomeB.fasta', '>seq2\nTGCA'),
]

const defaultOptions: MashOptions = { ...DEFAULT_MASH_OPTIONS }
const disabledBootstrap: BootstrapOptions = { ...DEFAULT_BOOTSTRAP_OPTIONS, enabled: false }
const enabledBootstrap: BootstrapOptions = {
  enabled: true,
  method: 'bootstrap',
  replicates: 10,
}

// --- Setup ---

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(computeDistanceMatrix).mockResolvedValue(mockDistResult)
  vi.mocked(sortGenomes).mockReturnValue(mockSortResult)
  vi.mocked(buildNeighborJoiningTree).mockReturnValue(mockNewick)
  vi.mocked(runBootstrap).mockResolvedValue(mockBootstrapNewick)
})

// --- Tests ---

describe('runMashtree', () => {
  it('throws an error if fewer than 2 files are provided', async () => {
    const singleFile = [createMockFile('only.fasta', '>s\nACGT')]
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await expect(
      runMashtree(singleFile, defaultOptions, disabledBootstrap, onProgress, onLog),
    ).rejects.toThrow('At least 2 genome files are required')
  })

  it('throws an error when zero files are provided', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await expect(
      runMashtree([], defaultOptions, disabledBootstrap, onProgress, onLog),
    ).rejects.toThrow('At least 2 genome files are required')
  })

  it('calls computeDistanceMatrix with the file data and options', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(computeDistanceMatrix).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(computeDistanceMatrix).mock.calls[0]

    // First argument: array of { name, data } objects
    expect(callArgs[0]).toHaveLength(2)
    expect(callArgs[0][0].name).toBe('genomeA.fasta')
    expect(callArgs[0][1].name).toBe('genomeB.fasta')
    expect(callArgs[0][0].data).toBeInstanceOf(Uint8Array)
    expect(callArgs[0][1].data).toBeInstanceOf(Uint8Array)

    // Second argument: MashOptions
    expect(callArgs[1]).toEqual(defaultOptions)

    // Third and fourth arguments: onProgress and onLog callbacks
    expect(typeof callArgs[2]).toBe('function')
    expect(typeof callArgs[3]).toBe('function')
  })

  it('calls sortGenomes with the distance result and sortOrder', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(sortGenomes).toHaveBeenCalledTimes(1)
    expect(sortGenomes).toHaveBeenCalledWith(
      mockDistResult.matrix,
      mockDistResult.names,
      defaultOptions.sortOrder,
    )
  })

  it('calls buildNeighborJoiningTree with sorted matrix and names', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(buildNeighborJoiningTree).toHaveBeenCalledTimes(1)
    expect(buildNeighborJoiningTree).toHaveBeenCalledWith(
      mockSortResult.matrix,
      mockSortResult.names,
    )
  })

  it('returns a correct MashtreeResult structure', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    const result = await runMashtree(
      defaultFiles,
      defaultOptions,
      disabledBootstrap,
      onProgress,
      onLog,
    )

    expect(result).toEqual({
      newick: mockNewick,
      distanceMatrix: mockSortResult.matrix,
      genomeNames: mockSortResult.names,
    })
  })

  it('calls onProgress with status messages and percentages', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    // Should have been called multiple times with different stages
    expect(onProgress).toHaveBeenCalled()
    const calls = onProgress.mock.calls

    // Verify key progress milestones are present
    const messages = calls.map((c) => c[0] as string)
    const percentages = calls.map((c) => c[1] as number)

    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Reading files'),
        expect.stringContaining('Computing distances'),
        expect.stringContaining('Building neighbor-joining tree'),
        'Done!',
      ]),
    )

    // The final call should be 100%
    expect(percentages[percentages.length - 1]).toBe(100)
  })

  it('calls onLog with informational messages', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(onLog).toHaveBeenCalled()
    const logMessages = onLog.mock.calls.map((c) => c[0] as string)

    // Should log reading, distance computation, and pipeline completion
    expect(logMessages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Reading genome files'),
        expect.stringContaining('Computing pairwise distances'),
        expect.stringContaining('Building neighbor-joining tree'),
        'Pipeline complete.',
      ]),
    )
  })

  it('does NOT call runBootstrap when bootstrap is disabled', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(runBootstrap).not.toHaveBeenCalled()
  })

  it('calls runBootstrap when bootstrap is enabled', async () => {
    const onProgress = vi.fn()
    const onLog = vi.fn()

    const result = await runMashtree(
      defaultFiles,
      defaultOptions,
      enabledBootstrap,
      onProgress,
      onLog,
    )

    expect(runBootstrap).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(runBootstrap).mock.calls[0]

    // First arg: files array with { name, data }
    expect(callArgs[0]).toHaveLength(2)
    expect(callArgs[0][0].name).toBe('genomeA.fasta')

    // Second arg: options
    expect(callArgs[1]).toEqual(defaultOptions)

    // Third arg: bootstrapOptions
    expect(callArgs[2]).toEqual(enabledBootstrap)

    // Fourth arg: reference newick from buildNeighborJoiningTree
    expect(callArgs[3]).toBe(mockNewick)

    // Fifth and sixth args: onProgress and onLog callbacks
    expect(typeof callArgs[4]).toBe('function')
    expect(typeof callArgs[5]).toBe('function')

    // Result should use the bootstrap-annotated newick
    expect(result.newick).toBe(mockBootstrapNewick)
  })

  it('propagates errors from computeDistanceMatrix', async () => {
    const distError = new Error('Mash WASM crashed')
    vi.mocked(computeDistanceMatrix).mockRejectedValue(distError)

    const onProgress = vi.fn()
    const onLog = vi.fn()

    await expect(
      runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog),
    ).rejects.toThrow('Mash WASM crashed')
  })

  it('wraps errors from buildNeighborJoiningTree with "Failed to build tree:"', async () => {
    vi.mocked(buildNeighborJoiningTree).mockImplementation(() => {
      throw new Error('singular matrix')
    })

    const onProgress = vi.fn()
    const onLog = vi.fn()

    await expect(
      runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog),
    ).rejects.toThrow('Failed to build tree: singular matrix')
  })

  it('executes the pipeline in correct order: distance -> sort -> tree', async () => {
    const callOrder: string[] = []

    vi.mocked(computeDistanceMatrix).mockImplementation(async () => {
      callOrder.push('computeDistanceMatrix')
      return mockDistResult
    })

    vi.mocked(sortGenomes).mockImplementation(() => {
      callOrder.push('sortGenomes')
      return mockSortResult
    })

    vi.mocked(buildNeighborJoiningTree).mockImplementation(() => {
      callOrder.push('buildNeighborJoiningTree')
      return mockNewick
    })

    const onProgress = vi.fn()
    const onLog = vi.fn()

    await runMashtree(defaultFiles, defaultOptions, disabledBootstrap, onProgress, onLog)

    expect(callOrder).toEqual([
      'computeDistanceMatrix',
      'sortGenomes',
      'buildNeighborJoiningTree',
    ])
  })
})
