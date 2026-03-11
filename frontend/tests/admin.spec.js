import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
    test('should load the admin dashboard and display correct role', async ({ page }) => {
        // Since this test runs in the 'e2e-authenticated' project, the user is already logged in.
        await page.goto('/admin');

        // Ensure we haven't been redirected to login
        await expect(page).toHaveURL(/.*\/admin/);

        // Check for specific UI elements on the dashboard
        // Looking for the Sidebar or Header indicating Admin role
        const headerRole = page.locator('header').getByText(/Admin/i).first();
        await expect(headerRole).toBeVisible({ timeout: 10000 });

        // Ensure there are no 500 errors or immediate crashes
        const errorBoundary = page.locator('text="Something went wrong"');
        await expect(errorBoundary).toHaveCount(0);
    });
});
