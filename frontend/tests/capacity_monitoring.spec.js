import { test, expect } from '@playwright/test';

/**
 * Capacity Monitoring & Re-Sync E2E Tests
 * 
 * Verifies the Registrar's ability to monitor bottlenecks and trigger resolution.
 */
test.describe('Capacity Monitoring & Automated Re-Sync', () => {

    test.use({ storageState: 'tests/playwright/.auth/user.json' });

    test('Registrar: Capacity Bottleneck Alert and Re-Sync Flow', async ({ page }) => {
        // 1. Mock Dashboard Dependencies
        await page.route('**/api/terms/**', async (route) => {
            console.log(`[MOCK] Handled terms: ${route.request().url()}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ results: [{ id: 1, code: '2023-2024-1S', is_active: true }] })
            });
        });

        await page.route('**/api/sections/stats/**', async (route) => {
            console.log(`[MOCK] Handled stats: ${route.request().url()}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        await page.route('**/api/academics/programs/**', async (route) => {
            console.log(`[MOCK] Handled programs: ${route.request().url()}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 1, code: 'BSIT', name: 'BS IT' }])
            });
        });

        await page.route('**/api/sections/?term_id=**', async (route) => {
            console.log(`[MOCK] Handled sections: ${route.request().url()}`);
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ results: [], count: 0 })
            });
        });

        // 2. Mock the Capacity Bottlenecks API to return a deficit
        await page.route('**/api/scheduling/capacity-bottlenecks/**', async (route) => {
            console.log('[MOCK] Handled capacity-bottlenecks');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    {
                        program_id: 1,
                        program_code: 'BSIT',
                        year_level: 1,
                        students_waiting: 45,
                        sections_needed: 2
                    }
                ])
            });
        });

        // 3. Mock the Section Generation API
        await page.route('**/api/sections/generate/**', async (route) => {
            console.log('[MOCK] Handled sections/generate');
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ message: 'Success' })
            });
        });

        // 4. Navigate directly to the admin route
        await page.goto('/admin/sectioning');
        
        // Wait for page title
        await expect(page.getByText('Sectioning Dashboard')).toBeVisible({ timeout: 15000 });

        // 5. Verify Capacity Status Widget visibility and data
        const widgetTitle = page.getByText('Capacity Bottlenecks Detected');
        await expect(widgetTitle).toBeVisible({ timeout: 15000 });
        
        await expect(page.getByText('ACTION REQUIRED')).toBeVisible();
        // Use regex for partial matches and handle potential duplicate text by checking for one of them
        await expect(page.getByText('BSIT').first()).toBeVisible();
        await expect(page.getByText(/\+?45 students/)).toBeVisible();

        // 6. Trigger Re-Sync
        page.on('dialog', async dialog => {
            await dialog.accept();
        });
        const reSyncBtn = page.getByRole('button', { name: 'Trigger Re-Sync' });
        await reSyncBtn.click();
        
        // 7. Verify success toast
        await expect(page.getByText('Capacity re-sync completed successfully')).toBeVisible({ timeout: 10000 });
    });

    test('Registrar: Optimized Capacity State', async ({ page }) => {
        // Mock Dashboard Dependencies
        await page.route('**/api/terms/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ results: [{ id: 1, code: '2023-2024-1S', is_active: true }] })
            });
        });

        await page.route('**/api/sections/stats/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        await page.route('**/api/academics/programs/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([{ id: 1, code: 'BSIT', name: 'BS IT' }])
            });
        });

        await page.route('**/api/sections/?term_id=**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ results: [], count: 0 })
            });
        });

        // Mock empty bottlenecks
        await page.route('**/api/scheduling/capacity-bottlenecks/**', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        });

        await page.goto('/admin/sectioning');
        await expect(page.getByText('Sectioning Dashboard')).toBeVisible({ timeout: 15000 });

        const optimizedMsg = page.getByText('Capacity Status Optimized');
        await expect(optimizedMsg).toBeVisible({ timeout: 15000 });
    });
});
