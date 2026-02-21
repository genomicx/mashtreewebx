import { useCallback } from 'react'

interface DistanceMatrixProps {
  matrix: number[][]
  names: string[]
}

export function DistanceMatrix({ matrix, names }: DistanceMatrixProps) {
  const handleExportTSV = useCallback(() => {
    // Export in Phylip-like tab-separated format
    const n = names.length
    let tsv = `${n}\n`
    for (let i = 0; i < n; i++) {
      const row = [names[i]]
      for (let j = 0; j < n; j++) {
        row.push(matrix[i][j].toFixed(6))
      }
      tsv += row.join('\t') + '\n'
    }

    const blob = new Blob([tsv], { type: 'text/tab-separated-values' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mashtree_distances.tsv'
    a.click()
    URL.revokeObjectURL(url)
  }, [matrix, names])

  if (names.length === 0) return null

  return (
    <section className="results">
      <div className="results-header">
        <h2>Distance Matrix</h2>
        <div className="results-actions">
          <button className="export-button" onClick={handleExportTSV}>
            Export TSV
          </button>
        </div>
      </div>
      <div className="results-table-container">
        <table className="results-table distance-table">
          <thead>
            <tr>
              <th></th>
              {names.map((name) => (
                <th key={name}>{name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {names.map((rowName, i) => (
              <tr key={rowName}>
                <td className="filename-cell">{rowName}</td>
                {names.map((colName, j) => (
                  <td
                    key={colName}
                    className={i === j ? 'distance-zero' : 'distance-cell'}
                  >
                    {i === j ? '—' : matrix[i][j].toFixed(4)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
