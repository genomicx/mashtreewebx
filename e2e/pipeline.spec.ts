import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import os from 'os'

/**
 * Generate a synthetic FASTA file with deterministic pseudo-random sequence.
 */
function makeSyntheticFasta(name: string, seed: number): string {
  const bases = ['A', 'T', 'C', 'G']
  let seq = ''
  let s = seed
  for (let i = 0; i < 5000; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    seq += bases[s % 4]
  }
  return `>${name}\n${seq}\n`
}

/**
 * Create temporary FASTA files for upload.
 */
function createTempFastaFiles(): string[] {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mashtree-e2e-'))
  const files: string[] = []

  const genomes = [
    { name: 'genome_alpha', seed: 1 },
    { name: 'genome_beta', seed: 2 },
    { name: 'genome_gamma', seed: 3 },
  ]

  for (const g of genomes) {
    const content = makeSyntheticFasta(g.name, g.seed)
    const filePath = path.join(tmpDir, `${g.name}.fasta`)
    fs.writeFileSync(filePath, content)
    files.push(filePath)
  }

  return files
}

test.describe('Pipeline E2E', () => {
  let fastaFiles: string[]

  test.beforeAll(() => {
    fastaFiles = createTempFastaFiles()
  })

  test.afterAll(() => {
    // Clean up temp files
    for (const f of fastaFiles) {
      try { fs.unlinkSync(f) } catch { /* ignore */ }
    }
    try {
      fs.rmdirSync(path.dirname(fastaFiles[0]))
    } catch { /* ignore */ }
  })

  test('upload 3 FASTA files and run pipeline', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fastaFiles)

    // Verify files are listed
    await expect(page.locator('text=3 file(s) selected')).toBeVisible()

    // Build Tree button should be enabled
    const buildButton = page.locator('button:has-text("Build Tree")')
    await expect(buildButton).toBeEnabled()

    // Click Build Tree
    await buildButton.click()

    // Wait for results (distance matrix heading appears)
    await expect(page.locator('h2:has-text("Distance Matrix")')).toBeVisible({
      timeout: 90_000,
    })

    // Verify distance matrix has correct structure
    const tableHeaders = page.locator('.distance-table th')
    // Should have 4 headers: empty corner + 3 genome names
    await expect(tableHeaders).toHaveCount(4)

    // Verify tree section appears
    await expect(page.locator('h2:has-text("Phylogenetic Tree")')).toBeVisible()

    // Verify log section appears with entries
    await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible()
    const logEntries = page.locator('.log-line')
    expect(await logEntries.count()).toBeGreaterThan(0)
  })

  test('TSV export button works', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fastaFiles)
    await page.click('button:has-text("Build Tree")')

    await expect(page.locator('h2:has-text("Distance Matrix")')).toBeVisible({
      timeout: 90_000,
    })

    // Set up download listener
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export TSV")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('mashtree_distances.tsv')
  })

  test('Newick export button works', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fastaFiles)
    await page.click('button:has-text("Build Tree")')

    await expect(page.locator('h2:has-text("Phylogenetic Tree")')).toBeVisible({
      timeout: 90_000,
    })

    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export Newick")')
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe('mashtree.nwk')
  })

  test('distance matrix shows diagonal dashes and numeric values', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fastaFiles)
    await page.click('button:has-text("Build Tree")')

    await expect(page.locator('h2:has-text("Distance Matrix")')).toBeVisible({
      timeout: 90_000,
    })

    // Diagonal cells should have em-dash
    const diagonalCells = page.locator('.distance-zero')
    await expect(diagonalCells).toHaveCount(3)
    for (let i = 0; i < 3; i++) {
      await expect(diagonalCells.nth(i)).toHaveText('\u2014')
    }

    // Off-diagonal cells should have numeric values
    const distanceCells = page.locator('.distance-cell')
    expect(await distanceCells.count()).toBe(6) // 3x3 - 3 diagonal = 6
  })

  test('log console shows pipeline steps', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(fastaFiles)
    await page.click('button:has-text("Build Tree")')

    await expect(page.getByRole('heading', { name: 'Log', exact: true })).toBeVisible({
      timeout: 90_000,
    })

    // Verify log contains key pipeline steps
    const logText = await page.locator('.log-body').textContent()
    expect(logText).toContain('Reading')
    expect(logText).toContain('Pipeline complete')
  })
})
