import { expect, test } from '@playwright/test'

test('shows the private sign-in experience and switches direction', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('دستیار تغذیه نوزاد')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByLabel('ایمیل')).toBeVisible()

  await page.getByRole('button', { name: /English/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Infant Feeding Assistant')

  await page.getByRole('button', { name: 'No account? Create one' }).click()
  await expect(page.getByLabel('Confirm password')).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(overflow).toBe(false)
})
