import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const authFile = path.join(__dirname, 'playwright/.auth/user.json');

setup('authenticate as admin', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');

    // Submit form and wait for the login response
    console.log('Submitting login form...');

    // Set up response promise before clicking
    const responsePromise = page.waitForResponse(response => response.url().includes('accounts/auth/login/') && response.request().method() === 'POST');
    await page.click('button[type="submit"]');

    console.log('Waiting for API response...');
    const response = await responsePromise;
    console.log('Login API response status:', response.status());

    if (response.status() !== 200) {
        const body = await response.json().catch(() => ({}));
        throw new Error(`Login API failed: ${response.status()} - ${JSON.stringify(body)}`);
    }

    // Simple wait for URL
    console.log('Waiting for redirect to /admin...');
    await page.waitForURL(/.*\/admin/, { timeout: 15000 });

    console.log('Login successful, saving state...');
    // Save the authentication state (cookies/localStorage)
    await page.context().storageState({ path: authFile });
});
