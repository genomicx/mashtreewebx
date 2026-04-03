import { useState, useEffect, useCallback } from 'react'
import { Routes, Route } from 'react-router-dom'
import { NavBar, AppFooter, LogConsole } from '@genomicx/ui'
import { FileUpload } from './components/FileUpload'
import { MashOptions } from './components/MashOptions'
import { DistanceMatrix } from './components/DistanceMatrix'
import { PhyloTree } from './components/PhyloTree'
import { About } from './pages/About'
import { runMashtree } from './mashtree/pipeline'
import type { MashOptions as MashOptionsType, BootstrapOptions } from './mashtree/types'
import { DEFAULT_MASH_OPTIONS, DEFAULT_BOOTSTRAP_OPTIONS } from './mashtree/types'
import './App.css'

function AnalysisPage() {
  const [files, setFiles] = useState<File[]>([])
  const [options, setOptions] = useState<MashOptionsType>(DEFAULT_MASH_OPTIONS)
  const [bootstrapOptions, setBootstrapOptions] = useState<BootstrapOptions>(DEFAULT_BOOTSTRAP_OPTIONS)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [error, setError] = useState('')
  const [logLines, setLogLines] = useState<string[]>([])

  // Results
  const [newick, setNewick] = useState('')
  const [distanceMatrix, setDistanceMatrix] = useState<number[][]>([])
  const [genomeNames, setGenomeNames] = useState<string[]>([])

  const handleRun = useCallback(async () => {
    if (files.length < 2) return

    setRunning(true)
    setError('')
    setNewick('')
    setDistanceMatrix([])
    setGenomeNames([])
    setLogLines([])
    setProgress('Starting...')
    setProgressPct(0)

    try {
      const result = await runMashtree(
        files,
        options,
        bootstrapOptions,
        (msg, pct) => {
          setProgress(msg)
          setProgressPct(pct)
        },
        (msg) => {
          setLogLines((prev) => [...prev, msg])
        },
      )

      setNewick(result.newick)
      setDistanceMatrix(result.distanceMatrix)
      setGenomeNames(result.genomeNames)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [files, options, bootstrapOptions])

  const canRun = files.length >= 2 && !running

  return (
    <>
      <div className="controls">
        <FileUpload
          files={files}
          onFilesChange={setFiles}
          disabled={running}
        />
        <MashOptions
          options={options}
          onOptionsChange={setOptions}
          bootstrapOptions={bootstrapOptions}
          onBootstrapChange={setBootstrapOptions}
          disabled={running}
        />
        <button
          className="run-button"
          onClick={handleRun}
          disabled={!canRun}
        >
          {running ? 'Running...' : 'Build Tree'}
        </button>
      </div>

      {running && (
        <section className="progress" aria-live="polite">
          <div
            className="progress-bar"
            role="progressbar"
            aria-valuenow={Math.round(progressPct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Mashtree progress"
          >
            <div
              className="progress-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="progress-text">{progress}</p>
        </section>
      )}

      {error && (
        <section className="error" role="alert">
          <p>{error}</p>
        </section>
      )}

      {genomeNames.length > 0 && (
        <DistanceMatrix matrix={distanceMatrix} names={genomeNames} />
      )}

      {newick && <PhyloTree newick={newick} />}

      {logLines.length > 0 && <LogConsole logs={logLines} />}
    </>
  )
}

function App() {
  useEffect(() => {
    const saved = (localStorage.getItem('gx-theme') as 'light' | 'dark') || 'dark'
    document.documentElement.setAttribute('data-theme', saved)
  }, [])

  return (
    <div className="app">
      <NavBar appName="mashtreewebx" appSubtitle="Browser-based phylogenetic trees from genome assemblies" />

      <main className="app-main">
        <Routes>
          <Route path="/" element={<AnalysisPage />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </main>

      <AppFooter appName="mashtreewebx" />
    </div>
  )
}

export default App
