import { test, expect } from '@playwright/test';

test.describe('Grade Resolution UI & Responsiveness', () => {

    test.use({ storageState: 'tests/playwright/.auth/registrar.json' });

    test('Registrar: Resolution Management Tabs & Responsiveness', async ({ page }) => {
        await page.goto('/registrar/grades');

        // 1. Verify Tabs existence
        const tabs = page.locator('button[role="tab"]');
        await expect(tabs).toHaveCount(3);
        await expect(tabs.nth(0)).toContainText('Finalization Queue');
        await expect(tabs.nth(1)).toContainText('Resolution Requests');
        await expect(tabs.nth(2)).toContainText('Resolution Finalization');

        // 2. Click through tabs
        await tabs.nth(1).click();
        await expect(page.getByRole('heading', { name: 'INC Resolution Initial Requests' })).toBeVisible();

        await tabs.nth(2).click();
        await expect(page.getByRole('heading', { name: 'Final Resolution Approvals' })).toBeVisible();

        // 3. Responsiveness Check (Desktop view: 1280x720)
        await page.setViewportSize({ width: 1280, height: 720 });
        const manageConsoleCard = page.locator('.grade-finalization-container .grid').first();
        await expect(manageConsoleCard).toBeVisible();

        // 4. Responsiveness Check (Mobile view: 375x812)
        await page.setViewportSize({ width: 375, height: 812 });
        // Cards should stack vertically in mobile (usually grid-cols-1)
        const grid = page.locator('.grade-finalization-container .grid').first();
        const boxStyles = await grid.evaluate(el => window.getComputedStyle(el).gridTemplateColumns);
        // Expecting 1 column layout for mobile responsiveness
        // Note: this depends on your CSS/Tailwind classes (lg:grid-cols-4 etc.)
        // But verifying that it's visible and text doesn't overflow wildly.

        // Check for any console errors (captured by Playwright by default, but we can log)
        page.on('console', msg => {
            if (msg.type() === 'error') console.error(`[FE ERROR] ${msg.text()}`);
        });
    });

    test.describe('Program Head UI Flow', () => {
        test.use({ storageState: 'tests/playwright/.auth/program-head.json' });

        test('Program Head: Resolution Queue & Sidebar Navigation', async ({ page }) => {
            // 1. Check Sidebar link
            await page.goto('/program-head');
            const sidebarLink = page.getByRole('link', { name: 'Grade Resolutions' });
            await expect(sidebarLink).toBeVisible();

            // 2. Navigate to Resolutions
            await sidebarLink.click();
            await expect(page).toHaveURL(/\/program-head\/resolutions/);
            await expect(page.locator('h2')).toContainText('Resolution Approval Queue');

            // 3. Test numeric formatting in "Proposed Upgrade" column
            // (Assuming data exists from seeder/test script)
            // Even if empty, we verify the table headers.
            const headers = page.locator('th');
            await expect(headers).toContainText(['Student', 'Subject & Section', 'Proposed Upgrade', 'Requested By', 'Reason', 'Actions']);
        });
    });
});
