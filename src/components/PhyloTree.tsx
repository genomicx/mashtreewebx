import { useRef, useEffect, useCallback, useState, memo } from 'react'

// phylocanvas.gl is loaded from CDN in index.html
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const phylocanvas: any

interface PhyloTreeProps {
  newick: string
}

export const PhyloTree = memo(function PhyloTree({ newick }: PhyloTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const treeRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !newick) return

    try {
      if (typeof phylocanvas === 'undefined' || !phylocanvas.PhylocanvasGL) {
        setError('phylocanvas.gl not loaded. Check CDN script in index.html.')
        console.error('[PhyloTree] phylocanvas global not found')
        return
      }

      if (treeRef.current) {
        treeRef.current.destroy()
        treeRef.current = null
      }

      const rect = containerRef.current.getBoundingClientRect()
      console.log('[PhyloTree] Creating tree, container size:', rect.width, 'x', rect.height)
      console.log('[PhyloTree] Newick (first 100 chars):', newick.slice(0, 100))

      treeRef.current = new phylocanvas.PhylocanvasGL(
        containerRef.current,
        {
          showLabels: true,
          showLeafLabels: true,
          source: newick,
          size: { width: rect.width || 800, height: 500 },
          padding: 20,
        }
      )

      console.log('[PhyloTree] Tree created successfully')
      setError(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[PhyloTree] Error creating tree:', err)
      setError(msg)
    }

    return () => {
      if (treeRef.current) {
        treeRef.current.destroy()
        treeRef.current = null
      }
    }
  }, [newick])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (treeRef.current) {
          const { width } = entries[0].contentRect
          treeRef.current.setProps({
            size: { width: width || 800, height: 500 },
          })
        }
      })
      observer.observe(container)
      return () => observer.disconnect()
    }
    // Fallback for environments without ResizeObserver
    const handleResize = () => {
      if (treeRef.current) {
        const rect = container.getBoundingClientRect()
        treeRef.current.setProps({
          size: { width: rect.width || 800, height: 500 },
        })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleExportNewick = useCallback(() => {
    const blob = new Blob([newick], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mashtree.nwk'
    a.click()
    URL.revokeObjectURL(url)
  }, [newick])

  return (
    <section className="tree-section">
      <div className="tree-header">
        <h2>Phylogenetic Tree</h2>
        <div className="results-actions">
          <button className="export-button" onClick={handleExportNewick}>
            Export Newick
          </button>
        </div>
      </div>
      {error && <div className="tree-error">{error}</div>}
      <div className="tree-container" ref={containerRef} />
    </section>
  )
})
