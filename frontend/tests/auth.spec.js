import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
    test('should show login page', async ({ page }) => {
        await page.goto('/login');
        await expect(page).toHaveTitle(/Richwell Portal/);
        await expect(page.locator('h1')).toContainText('Welcome Back');
    });

    test('should fail with invalid credentials', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="username"]', 'wrong-user');
        await page.fill('input[name="password"]', 'wrong-password');

        await page.click('button[type="submit"]');

        // Look for the red error box - contains "credentials" or "account" or "Invalid"
        const errorMsg = page.locator('div.error-banner');
        await expect(errorMsg.first()).toBeVisible({ timeout: 10000 });
        const text = await errorMsg.first().textContent();
        expect(text).toMatch(/credentials|account|Invalid|failed/i);
    });

    test('should not expose raw tokens in the login response body', async ({ page }) => {
        await page.goto('/login');
        await page.waitForLoadState('networkidle');

        const { status, payload } = await page.evaluate(async () => {
            const response = await fetch('http://localhost:8000/api/accounts/auth/login/', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'password123',
                }),
            });

            return {
                status: response.status,
                payload: await response.json(),
            };
        });

        expect(status).toBe(200);
        expect(payload.access).toBeUndefined();
        expect(payload.refresh).toBeUndefined();
        expect(payload.user?.username).toBe('admin');
    });
});
