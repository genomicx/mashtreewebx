import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_1 = path.join(__dirname, '../fixtures/ecoli_novel.fa')
const FIXTURE_2 = path.join(__dirname, '../fixtures/ecoli_novel_2.fa')

test.describe('MASHTREEWEBX e2e — tree building', () => {
  test('loads the app with file upload and disabled Build Tree button', async ({ page }) => {
    await page.goto('/')

    // File upload should be present
    await expect(page.locator('input[type="file"]')).toBeAttached()

    // Build Tree button is disabled until >= 2 files uploaded
    const buildButton = page.getByRole('button', { name: /build tree/i })
    await expect(buildButton).toBeVisible()
    await expect(buildButton).toBeDisabled()
  })

  test('uploading two FASTA files enables the Build Tree button', async ({ page }) => {
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([FIXTURE_1, FIXTURE_2])

    // Both filenames should appear in the UI
    await expect(page.getByText('ecoli_novel.fa')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('ecoli_novel_2.fa')).toBeVisible({ timeout: 10_000 })

    // Build Tree button should now be enabled
    const buildButton = page.getByRole('button', { name: /build tree/i })
    await expect(buildButton).toBeEnabled()
  })

  test('running tree build shows progress then distance matrix section', async ({ page }) => {
    await page.goto('/')

    const fileInput = page.locator('input[type="file"]').first()
    await fileInput.setInputFiles([FIXTURE_1, FIXTURE_2])

    const buildButton = page.getByRole('button', { name: /build tree/i })
    await expect(buildButton).toBeEnabled({ timeout: 10_000 })
    await buildButton.click()

    // Progress should appear
    await expect(page.locator('.progress')).toBeVisible({ timeout: 10_000 })

    // Wait for distance matrix — WASM can take a while
    const resultsSection = page.locator('.results')
    await expect(resultsSection).toBeVisible({ timeout: 120_000 })

    // Distance Matrix heading should be visible
    await expect(page.getByRole('heading', { name: /distance matrix/i })).toBeVisible()
  })
})
