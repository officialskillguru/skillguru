import { test } from '@playwright/test';
import { toErrorMessage } from '../../src/utils/error';

test('debug signup flow', async ({ page }) => {
  console.log("--- STARTING BROWSER TEST ---");

  // Capture all console logs from the browser
  page.on('console', msg => {
    console.log(`BROWSER CONSOLE: ${msg.type().toUpperCase()} - ${msg.text()}`);
  });

  // Capture all network requests to /auth/v1/signup
  let signupRequests = 0;
  page.on('request', request => {
    if (request.url().includes('/auth/v1/signup')) {
      signupRequests++;
      console.log(`NETWORK REQUEST ${signupRequests}: ${request.method()} ${request.url()}`);
      console.log(`NETWORK REQUEST ${signupRequests} POST DATA: ${request.postData()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/auth/v1/signup')) {
      console.log(`NETWORK RESPONSE: ${response.status()} ${response.statusText()}`);
      try {
        const body = await response.text();
        console.log(`NETWORK RESPONSE BODY: ${body}`);
      } catch (e: unknown) {
        console.log(`Could not read response body: ${toErrorMessage(e)}`);
      }
    }
  });

  // Go to signup page
  await page.goto('http://127.0.0.1:5173/signup');
  await page.waitForLoadState('networkidle');

  // Generate a random email
  const randomEmail = `test${Date.now()}@example.com`;
  console.log(`Using email: ${randomEmail}`);

  // Fill out the form
  await page.fill('input[name="fullName"]', 'Test User');
  await page.fill('input[name="email"]', randomEmail);
  await page.fill('input[name="password"]', 'Password123!');

  // Submit
  console.log("Submitting form...");
  await page.click('button[type="submit"]');

  // Wait a few seconds to let all async processes finish
  await page.waitForTimeout(5000);

  console.log("--- TEST COMPLETE ---");
  console.log(`Total /signup network requests: ${signupRequests}`);
});
