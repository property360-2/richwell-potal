import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should show login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Richwell Portal/);
        await expect(page.locator('h1')).toContainText('Richwell Portal');
    });

    test('should fail with invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', 'wrong-user');
        await page.fill('input[name="password"]', 'wrong-password');

        await page.click('button[type="submit"]');

        // Look for the red error box - contains "credentials" or "account" or "Invalid"
        const errorMsg = page.locator('div.text-red-600');
        await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
        const text = await errorMsg.first().textContent();
        expect(text).toMatch(/credentials|account|Invalid|failed/i);
    });
});
