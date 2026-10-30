import { expect, type Page, test } from '@playwright/test'

const headline = (page: Page) => page.getByText(/^Forecast [−+] \d/)

test.beforeEach(async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/')
  await expect(headline(page)).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})

test('shows the month, the headline figure and the three charts', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/January 2026/)
  await expect(page.getByText(/9 times in 10, metered wind was no more than/)).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /Actual wind against/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /lead time/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: /How big are the misses/ })).toBeVisible()
  await expect(page.getByRole('slider', { name: /Decision time/ })).toHaveAttribute('aria-valuetext', '09:50')
})

test('picking two delivery days applies the range and closes the picker', async ({ page }) => {
  await page.getByRole('button', { name: /Delivery days/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Choose delivery days' })
  await dialog
    .getByRole('button', { name: /January 5th, 2026/ })
    .first()
    .click()
  await dialog
    .getByRole('button', { name: /January 11th, 2026/ })
    .first()
    .click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/from=2026-01-05&to=2026-01-11/)
  await expect(page.getByRole('button', { name: /5 Jan – 11 Jan 2026/ })).toBeVisible()
})

test('escape after one pick cancels instead of applying a single day', async ({ page }) => {
  await page.getByRole('button', { name: /Delivery days/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Choose delivery days' })
  await dialog
    .getByRole('button', { name: /January 8th, 2026/ })
    .first()
    .click()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/from=2026-01-02&to=2026-02-01/)
})

test('the slider is keyboard operable and batches requests', async ({ page }) => {
  const requests: string[] = []
  page.on('request', (r) => r.url().includes('/api/v1/wind/analysis') && requests.push(r.url()))
  const slider = page.getByRole('slider', { name: /Decision time/ })
  await slider.focus()
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight')
  await expect(page).toHaveURL(/gate=10%3A50/)
  await expect(slider).toHaveAttribute('aria-valuetext', '10:50')
  await expect.poll(() => requests.length).toBe(1)
})

test('table view is reachable and spreadsheet friendly', async ({ page }) => {
  await page.getByRole('radio', { name: 'Table' }).first().click()
  const region = page.getByRole('region', { name: 'Hourly actual against forecast' })
  await expect(region).toBeVisible()
  await expect(region.getByRole('cell').first()).toHaveText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/)
  await expect(region.getByRole('cell').nth(1)).toHaveText(/^\d+$/)
})

test('fits the viewport without horizontal scroll', async ({ page }) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})
