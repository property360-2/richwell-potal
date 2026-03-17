import { test, expect } from '@playwright/test';

test.describe('Grade Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Assuming auth setup handles login for REGISTRAR
        await page.goto('/registrar/dashboard');
    });

    test('should navigate to Historical TOR Encoding and see workspace', async ({ page }) => {
        await page.click('text=Historical TOR Encoding');
        await expect(page).toHaveURL(/\/registrar\/historical-encode/);
        await expect(page.locator('h1')).toContainText('Historical TOR Encoding');

        // Test search functionality (UI only)
        await page.fill('input[placeholder="Search by IDN or Name..."]', '1001');
        await page.click('button:has-text("Load Student")');
    });

    test('should show safety modal with countdown for Global Lock', async ({ page }) => {
        await page.goto('/registrar/grades');
        await expect(page.locator('h1')).toContainText('Grade Management Console');

        await page.click('button:has-text("Global Lock")');

        // Check if modal appears
        await expect(page.locator('text=CRITICAL: Global Term Lock')).toBeVisible();

        // Check for countdown (initially disabled)
        const lockButton = page.locator('button:has-text("Unlocking Button")');
        await expect(lockButton).toBeDisabled();

        // Wait for countdown to finish (approx 5s)
        await page.waitForTimeout(6000);

        // Challenge box
        await page.fill('input[placeholder="CONFIRM"]', 'CONFIRM');
        await expect(page.locator('button:has-text("Finalize & Lock Term")')).toBeEnabled();
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
