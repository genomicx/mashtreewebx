import type { MashOptions as MashOptionsType, BootstrapOptions } from '../mashtree/types'

interface MashOptionsProps {
  options: MashOptionsType
  onOptionsChange: (options: MashOptionsType) => void
  bootstrapOptions: BootstrapOptions
  onBootstrapChange: (options: BootstrapOptions) => void
  disabled: boolean
}

export function MashOptions({
  options,
  onOptionsChange,
  bootstrapOptions,
  onBootstrapChange,
  disabled,
}: MashOptionsProps) {
  return (
    <div className="mash-options">
      <label className="option-group-label">Mash Parameters</label>

      <div className="option-row">
        <label htmlFor="kmer-length">K-mer length</label>
        <input
          id="kmer-length"
          type="number"
          min={1}
          max={32}
          value={options.kmerLength}
          onChange={(e) =>
            onOptionsChange({ ...options, kmerLength: parseInt(e.target.value) || 21 })
          }
          disabled={disabled}
        />
      </div>

      <div className="option-row">
        <label htmlFor="sketch-size">Sketch size</label>
        <input
          id="sketch-size"
          type="number"
          min={100}
          max={1000000}
          step={100}
          value={options.sketchSize}
          onChange={(e) =>
            onOptionsChange({ ...options, sketchSize: parseInt(e.target.value) || 10000 })
          }
          disabled={disabled}
        />
      </div>

      <div className="option-row">
        <label htmlFor="seed">Seed</label>
        <input
          id="seed"
          type="number"
          min={0}
          value={options.seed}
          onChange={(e) =>
            onOptionsChange({ ...options, seed: parseInt(e.target.value) || 42 })
          }
          disabled={disabled}
        />
      </div>

      <div className="option-row">
        <label htmlFor="sort-order">Sort order</label>
        <select
          id="sort-order"
          value={options.sortOrder}
          onChange={(e) =>
            onOptionsChange({
              ...options,
              sortOrder: e.target.value as 'ABC' | 'random' | 'input-order',
            })
          }
          disabled={disabled}
        >
          <option value="ABC">Alphabetical (ABC)</option>
          <option value="input-order">Input order</option>
          <option value="random">Random</option>
        </select>
      </div>

      <div className="option-divider" />

      <label className="option-group-label">Bootstrap</label>

      <div className="option-row">
        <label htmlFor="bootstrap-toggle">Enable bootstrap</label>
        <input
          id="bootstrap-toggle"
          type="checkbox"
          checked={bootstrapOptions.enabled}
          onChange={(e) =>
            onBootstrapChange({ ...bootstrapOptions, enabled: e.target.checked })
          }
          disabled={disabled}
        />
      </div>

      {bootstrapOptions.enabled && (
        <>
          <div className="option-row">
            <label htmlFor="bootstrap-method">Method</label>
            <select
              id="bootstrap-method"
              value={bootstrapOptions.method}
              onChange={(e) =>
                onBootstrapChange({
                  ...bootstrapOptions,
                  method: e.target.value as 'bootstrap' | 'jackknife',
                })
              }
              disabled={disabled}
            >
              <option value="bootstrap">Bootstrap</option>
              <option value="jackknife">Jackknife</option>
            </select>
          </div>

          <div className="option-row">
            <label htmlFor="bootstrap-reps">Replicates</label>
            <input
              id="bootstrap-reps"
              type="number"
              min={10}
              max={1000}
              step={10}
              value={bootstrapOptions.replicates}
              onChange={(e) =>
                onBootstrapChange({
                  ...bootstrapOptions,
                  replicates: parseInt(e.target.value) || 100,
                })
              }
              disabled={disabled}
            />
          </div>
        </>
      )}
    </div>
  )
}
