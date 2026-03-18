import { test, expect } from '@playwright/test';

test.describe('Grade Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Assuming auth setup handles login for REGISTRAR
        await page.goto('/registrar');
    });

    test('should navigate to Historical TOR Encoding and see workspace', async ({ page }) => {
        await page.click('text=Historical TOR Encoding');
        await expect(page).toHaveURL(/\/registrar\/historical-encode/);
        await expect(page.locator('h2')).toContainText('Historical TOR Encoding');

        // Test search functionality (UI only)
        await page.fill('input[placeholder="Search by IDN or Name..."]', '1001');
        await page.click('button:has-text("Load Student")');
    });

    test('should display Grade Management Console with tabs and grading window', async ({ page }) => {
        await page.goto('/registrar/grades');
        await expect(page.locator('h2').first()).toContainText('Grade Management Console');

        // Verify tabs are visible
        await expect(page.getByRole('tab', { name: 'Finalization Queue' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Resolution Requests' })).toBeVisible();
        await expect(page.getByRole('tab', { name: 'Resolution Finalization' })).toBeVisible();

        // Verify grading window management section
        await expect(page.locator('text=Grading Window Management')).toBeVisible();
        await expect(page.locator('button:has-text("Save Configuration")')).toBeVisible();

        // Switch to Resolution Requests tab
        await page.getByRole('tab', { name: 'Resolution Requests' }).click();
        await expect(page.locator('text=INC Resolution Initial Requests')).toBeVisible();
    });

    test('should allow adding/removing rows in Historical Encoding', async ({ page }) => {
        await page.goto('/registrar/historical-encode');
        // Mock student load via search or assume one is already there if we could
        // For now, testing basic dynamic UI
        await page.fill('input[placeholder="Search by IDN or Name..."]', '1001');
        await page.click('button:has-text("Load Student")');

        // Wait for dynamic rows to be ready if student found
        // (This part requires the backend to be running with seed data)
    });
});
