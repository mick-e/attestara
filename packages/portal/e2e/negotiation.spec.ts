import { test, expect } from '@playwright/test'

// Dashboard pages render with mock data when the relay backend is unavailable.
// These tests verify page rendering and interactive UI elements work correctly.

test.describe('Agents page', () => {
  test('shows agents heading', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByRole('heading', { name: /agents/i })).toBeVisible()
  })

  test('shows Provision Agent button', async ({ page }) => {
    await page.goto('/agents')
    await expect(page.getByRole('button', { name: /provision agent/i })).toBeVisible()
  })

  test('Provision Agent button opens modal', async ({ page }) => {
    await page.goto('/agents')
    await page.getByRole('button', { name: /provision agent/i }).click()
    // Modal title "Provision Agent" appears
    await expect(page.getByRole('heading', { name: /provision agent/i })).toBeVisible()
  })

  test('modal can be closed', async ({ page }) => {
    await page.goto('/agents')
    await page.getByRole('button', { name: /provision agent/i }).click()
    await expect(page.getByRole('heading', { name: /provision agent/i })).toBeVisible()
    // Click the Cancel button inside the modal
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('heading', { name: /provision agent/i })).not.toBeVisible()
  })

  test('shows mock agent data in table', async ({ page }) => {
    await page.goto('/agents')
    // Mock data includes agent names like "procurement-agent-eu" — at least one row renders
    await expect(page.getByRole('table')).toBeVisible()
  })
})

test.describe('Credentials page', () => {
  test('shows credentials heading', async ({ page }) => {
    await page.goto('/credentials')
    await expect(page.getByRole('heading', { name: /credentials/i })).toBeVisible()
  })

  test('shows Issue Credential button', async ({ page }) => {
    await page.goto('/credentials')
    await expect(page.getByRole('button', { name: /issue credential/i })).toBeVisible()
  })

  test('Issue Credential button opens wizard modal at step 1', async ({ page }) => {
    await page.goto('/credentials')
    await page.getByRole('button', { name: /issue credential/i }).click()
    // Modal title includes "Step 1: Select Agent"
    await expect(page.getByText(/step 1/i)).toBeVisible()
    await expect(page.getByText(/select agent/i)).toBeVisible()
  })

  test('wizard modal can be closed', async ({ page }) => {
    await page.goto('/credentials')
    await page.getByRole('button', { name: /issue credential/i }).click()
    await expect(page.getByText(/step 1/i)).toBeVisible()
    // Cancel button closes the wizard
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByText(/step 1: select agent/i)).not.toBeVisible()
  })

  test('shows mock credential data in table', async ({ page }) => {
    await page.goto('/credentials')
    await expect(page.getByRole('table')).toBeVisible()
  })
})

test.describe('Sessions page', () => {
  test('shows sessions heading', async ({ page }) => {
    await page.goto('/sessions')
    await expect(page.getByRole('heading', { name: /sessions/i })).toBeVisible()
  })

  test('shows status filter controls', async ({ page }) => {
    await page.goto('/sessions')
    // Status filter select element is present
    await expect(page.getByRole('combobox')).toBeVisible()
  })

  test('shows mock sessions in table', async ({ page }) => {
    await page.goto('/sessions')
    await expect(page.getByRole('table')).toBeVisible()
  })

  test('status filter can be changed', async ({ page }) => {
    await page.goto('/sessions')
    const filterSelect = page.getByRole('combobox').first()
    await filterSelect.selectOption('active')
    await expect(filterSelect).toHaveValue('active')
  })
})

test.describe('Commitments page', () => {
  test('shows commitments heading', async ({ page }) => {
    await page.goto('/commitments')
    await expect(page.getByRole('heading', { name: /commitments/i })).toBeVisible()
  })

  test('shows on-chain commitment description', async ({ page }) => {
    await page.goto('/commitments')
    await expect(page.getByText(/on-chain commitment records/i)).toBeVisible()
  })

  test('shows mock commitments in table', async ({ page }) => {
    await page.goto('/commitments')
    await expect(page.getByRole('table')).toBeVisible()
  })
})

test.describe('Settings page', () => {
  test('shows settings heading', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })

  test('shows Organization section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /organization/i })).toBeVisible()
  })

  test('shows Members section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /members/i })).toBeVisible()
  })

  test('shows API Keys navigation link', async ({ page }) => {
    await page.goto('/settings')
    const apiKeysLink = page.getByRole('link', { name: /api keys/i })
    await expect(apiKeysLink).toBeVisible()
    await expect(apiKeysLink).toHaveAttribute('href', '/settings/api-keys')
  })

  test('shows Billing navigation link', async ({ page }) => {
    await page.goto('/settings')
    const billingLink = page.getByRole('link', { name: /billing/i })
    await expect(billingLink).toBeVisible()
    await expect(billingLink).toHaveAttribute('href', '/settings/billing')
  })
})

test.describe('Overview page', () => {
  test('shows overview heading', async ({ page }) => {
    await page.goto('/overview')
    await expect(page.getByRole('heading', { name: /overview/i })).toBeVisible()
  })

  test('renders metric cards', async ({ page }) => {
    await page.goto('/overview')
    // Overview page has at least one h2 section heading
    await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible()
  })
})
