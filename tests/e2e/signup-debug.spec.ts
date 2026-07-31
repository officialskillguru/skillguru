import { test, expect } from '@playwright/test';

test.describe('Auth Signup Flow Hardening', () => {
  test('prevents duplicate submissions via single-flight lock', async ({ page }) => {
    // Intercept signup requests to simulate network delay
    await page.route('**/auth/v1/signup', async (route) => {
      // Delay response by 2 seconds to keep the lock active
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('http://localhost:5173/signup');
    await page.waitForLoadState('networkidle');

    // Fill form
    const randomEmail = `test${Date.now()}@example.com`;
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', 'Password123!');

    // Track requests
    let signupRequests = 0;
    page.on('request', (request) => {
      if (request.url().includes('/auth/v1/signup')) {
        signupRequests++;
      }
    });

    // Spam click the submit button
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    // Use force: true so playwright doesn't wait for the button to become enabled again
    await submitBtn.click({ force: true });
    await submitBtn.click({ force: true });

    // Verify UI is locked
    await expect(submitBtn).toBeDisabled();
    
    // Wait for the single request to complete
    await page.waitForTimeout(2500);

    // Only one network request should have been sent despite 3 clicks
    expect(signupRequests).toBe(1);
  });

  test('handles rate limit gracefully and routes to verify email on success', async ({ page, context }) => {
    // 1. Initial success -> routes to verify email
    await page.goto('http://localhost:5173/signup');
    const randomEmail = `ratelimit${Date.now()}@example.com`;
    
    await page.fill('input[name="fullName"]', 'Rate Limit Test');
    await page.fill('input[name="email"]', randomEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Should redirect to verify email
    await expect(page).toHaveURL(new RegExp(`/verify-email\\?email=${encodeURIComponent(randomEmail)}`));
    await expect(page.locator('text=Check your inbox')).toBeVisible();

    // 2. Open new tab, try to sign up with SAME email -> should get EMAIL_EXISTS
    const newPage = await context.newPage();
    await newPage.goto('http://localhost:5173/signup');
    
    // Mock the duplicate email response to prevent hitting real Supabase rate limits
    await newPage.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 400,
        json: { code: "user_already_exists", msg: "User already registered" }
      });
    });

    await newPage.fill('input[name="fullName"]', 'Rate Limit Test 2');
    await newPage.fill('input[name="email"]', randomEmail);
    await newPage.fill('input[name="password"]', 'Password123!');
    await newPage.click('button[type="submit"]');

    // Should show conflict error toast
    await expect(newPage.locator('text=An account with this email already exists')).toBeVisible();

    // 3. To test 429, we would need to mock Supabase or hit it 4 times.
    // Playwright route mocking is the best way to verify the UI handles the 429 correctly.
    await newPage.route('**/auth/v1/signup', async (route) => {
      await route.fulfill({
        status: 429,
        json: { code: "over_email_send_rate_limit", message: "email rate limit exceeded" }
      });
    });

    // Use a fresh email to bypass the server's "email exists" check (since we are mocking the network anyway)
    await newPage.fill('input[name="email"]', `fresh${Date.now()}@example.com`);
    await newPage.click('button[type="submit"]');

    // Should stay on page and show rate limit banner
    await expect(newPage).toHaveURL(/.*\/signup/);
    await expect(newPage.locator('text="Please wait"')).toBeVisible();
    await expect(newPage.locator('text=Continue to Verify Email')).toBeVisible();
  });
});
