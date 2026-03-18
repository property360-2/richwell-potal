import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registrarFile = path.join(__dirname, 'playwright/.auth/registrar.json');
const professorFile = path.join(__dirname, 'playwright/.auth/professor.json');
const studentFile = path.join(__dirname, 'playwright/.auth/student.json');
const enrolleeFile = path.join(__dirname, 'playwright/.auth/enrollee.json');
const irregularFile = path.join(__dirname, 'playwright/.auth/irregular.json');
const blockedStudentFile = path.join(__dirname, 'playwright/.auth/blocked-student.json');
const programHeadFile = path.join(__dirname, 'playwright/.auth/program-head.json');
const cashierFile = path.join(__dirname, 'playwright/.auth/cashier.json');
const adminFile = path.join(__dirname, 'playwright/.auth/user.json');

async function loginAs(page, username, password, targetUrl, savePath) {
    console.log(`[E2E] Starting login for ${username}...`);
    await page.goto('/login');
    // Ensure page loaded
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1')).toContainText('Welcome Back');

    await page.fill('input[name="username"]', username);
    await page.fill('input[name="password"]', password);

    console.log(`[E2E] Submitting for ${username}...`);
    const [response] = await Promise.all([
        page.waitForResponse(response =>
            response.url().includes('accounts/auth/login/') && response.request().method() === 'POST',
            { timeout: 60000 }
        ),
        page.click('button[type="submit"]')
    ]);

    console.log(`[E2E] Response for ${username}: ${response.status()}`);
    if (response.status() !== 200) {
        const body = await response.json().catch(() => ({}));
        throw new Error(`Login failed for ${username}: ${response.status()} - ${JSON.stringify(body)}`);
    }

    console.log(`[E2E] Waiting for redirect to ${targetUrl}...`);
    await page.waitForURL(new RegExp(`.*${targetUrl}`), { timeout: 60000 });
    await page.context().storageState({ path: savePath });
    console.log(`[E2E] Login successful, saved state for ${username} to ${savePath}`);
}

setup('authenticate as admin', async ({ page }) => {
    await loginAs(page, 'admin', 'password123', '/admin', adminFile);
});

setup('authenticate as registrar', async ({ page }) => {
    await loginAs(page, 'registrar_e2e', 'password123', '/registrar', registrarFile);
});

setup('authenticate as professor', async ({ page }) => {
    await loginAs(page, 'professor_e2e', 'password123', '/professor', professorFile);
});

setup('authenticate as student', async ({ page }) => {
    await loginAs(page, 'student_e2e', 'password123', '/student', studentFile);
});

setup('authenticate as enrollee', async ({ page }) => {
    await loginAs(page, 'enrollee_e2e', 'password123', '/student', enrolleeFile);
});

setup('authenticate as irregular student', async ({ page }) => {
    await loginAs(page, 'irregular_e2e', 'password123', '/student', irregularFile);
});

setup('authenticate as blocked student', async ({ page }) => {
    await loginAs(page, 'blocked_student_e2e', 'password123', '/student', blockedStudentFile);
});

setup('authenticate as program head', async ({ page }) => {
    await loginAs(page, 'program_head_e2e', 'password123', '/program-head', programHeadFile);
});

setup('authenticate as cashier', async ({ page }) => {
    await loginAs(page, 'cashier_e2e', 'password123', '/cashier', cashierFile);
});
