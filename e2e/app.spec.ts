import { test, expect } from '@playwright/test'

test.describe('App basics', () => {
  test('page loads with correct title and heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('mashtreewebx')
    await expect(page).toHaveTitle(/mashtreewebx/i)
  })

  test('about tab navigation works', async ({ page }) => {
    await page.goto('/')
    await page.click('button:has-text("About")')
    await expect(page.locator('h2:has-text("About mashtreewebx")')).toBeVisible()
    await page.click('button:has-text("Analysis")')
    await expect(page.locator('.file-upload')).toBeVisible()
  })

  test('theme toggle switches between light and dark', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')

    // Default is light
    await expect(html).toHaveAttribute('data-theme', 'light')

    // Toggle to dark
    await page.click('[aria-label="Toggle theme"]')
    await expect(html).toHaveAttribute('data-theme', 'dark')

    // Toggle back to light
    await page.click('[aria-label="Toggle theme"]')
    await expect(html).toHaveAttribute('data-theme', 'light')
  })

  test('file upload area is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.file-upload')).toBeVisible()
    await expect(page.locator('text=Drop FASTA files here')).toBeVisible()
  })

  test('Build Tree button is disabled initially', async ({ page }) => {
    await page.goto('/')
    const button = page.locator('button:has-text("Build Tree")')
    await expect(button).toBeVisible()
    await expect(button).toBeDisabled()
  })
})
