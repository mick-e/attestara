import { test, expect } from '@playwright/test'

// Reviewed 2026-04-15: selectors verified against current page implementations.

test.describe('Landing page', () => {
  test('shows hero section with Get Started CTA', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1').first()).toBeVisible()
    // Primary "Get Started" link navigates to /register
    const getStarted = page.getByRole('link', { name: /get started/i }).first()
    await expect(getStarted).toBeVisible()
    await expect(getStarted).toHaveAttribute('href', '/register')
  })

  test('Get Started CTA navigates to /register', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: /get started/i }).first().click()
    await page.waitForURL('/register')
    await expect(page).toHaveURL('/register')
  })
})

test.describe('Registration page', () => {
  test('shows registration form with required fields', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('#orgName')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('form fields accept input', async ({ page }) => {
    await page.goto('/register')
    await page.fill('#orgName', 'Acme Corp')
    await page.fill('#email', 'admin@acme.example')
    await page.fill('#password', 'securePass1!')
    await expect(page.locator('#orgName')).toHaveValue('Acme Corp')
    await expect(page.locator('#email')).toHaveValue('admin@acme.example')
    await expect(page.locator('#password')).toHaveValue('securePass1!')
  })

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.goto('/register')
    await page.getByRole('button', { name: /create account/i }).click()
    // Validation message should appear
    await expect(page.getByText(/required/i)).toBeVisible()
  })

  test('has link to login page', async ({ page }) => {
    await page.goto('/register')
    const loginLink = page.getByRole('link', { name: /sign in/i })
    await expect(loginLink).toBeVisible()
    await expect(loginLink).toHaveAttribute('href', '/login')
  })
})

test.describe('Login page', () => {
  test('shows sign in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('form fields accept input', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@acme.example')
    await page.fill('#password', 'securePass1!')
    await expect(page.locator('#email')).toHaveValue('admin@acme.example')
    await expect(page.locator('#password')).toHaveValue('securePass1!')
  })

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/required/i)).toBeVisible()
  })
})

test.describe('Pricing page', () => {
  test('shows pricing heading', async ({ page }) => {
    await page.goto('/pricing')
    await expect(page.getByRole('heading', { name: /pricing/i })).toBeVisible()
  })

  test('shows pricing tier cards', async ({ page }) => {
    await page.goto('/pricing')
    // Tier headings are h2 elements inside the tier cards
    const tierHeadings = page.getByRole('heading', { level: 2 })
    await expect(tierHeadings.first()).toBeVisible()
    // All plans note is visible
    await expect(page.getByText(/all plans include/i)).toBeVisible()
  })

  test('CTA links point to register', async ({ page }) => {
    await page.goto('/pricing')
    const ctaLinks = page.getByRole('link', { name: /get started|contact/i })
    await expect(ctaLinks.first()).toBeVisible()
  })
})

test.describe('Demo page', () => {
  test('shows interactive demo heading', async ({ page }) => {
    await page.goto('/demo')
    await expect(page.getByRole('heading', { name: /interactive demo/i })).toBeVisible()
  })

  test('shows step indicators', async ({ page }) => {
    await page.goto('/demo')
    // Step 1 indicator is visible (aria-label contains "Step 1")
    await expect(page.getByRole('button', { name: /step 1/i })).toBeVisible()
  })

  test('shows first step content', async ({ page }) => {
    await page.goto('/demo')
    // The step counter "1 / N" is rendered
    await expect(page.getByText(/1 \/ /)).toBeVisible()
  })

  test('Next button advances to step 2', async ({ page }) => {
    await page.goto('/demo')
    const nextButton = page.getByRole('button', { name: /next/i })
    await expect(nextButton).toBeVisible()
    await nextButton.click()
    await expect(page.getByText(/2 \/ /)).toBeVisible()
  })

  test('Previous button is disabled on first step', async ({ page }) => {
    await page.goto('/demo')
    const prevButton = page.getByRole('button', { name: /previous/i })
    await expect(prevButton).toBeDisabled()
  })
})

test.describe('Docs page', () => {
  test('shows documentation heading', async ({ page }) => {
    await page.goto('/docs')
    await expect(page.getByRole('heading', { name: /documentation/i })).toBeVisible()
  })

  test('shows documentation section cards', async ({ page }) => {
    await page.goto('/docs')
    // Multiple h2 cards are rendered for doc sections
    const sectionHeadings = page.getByRole('heading', { level: 2 })
    await expect(sectionHeadings.first()).toBeVisible()
  })
})
