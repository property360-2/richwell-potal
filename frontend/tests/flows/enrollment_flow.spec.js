import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registrarFile = path.join(__dirname, '../playwright/.auth/registrar.json');
const enrolleeFile = path.join(__dirname, '../playwright/.auth/enrollee.json');
const programHeadFile = path.join(__dirname, '../playwright/.auth/program-head.json');

test.describe('Enrollment Cycle E2E Flow', () => {

    test('Full Enrollment Lifecycle: Student -> Registrar -> PH -> Student', async ({ browser }) => {
        // 1. REGISTRAR VERIFICATION
        const regContext = await browser.newContext({ storageState: registrarFile });
        const regPage = await regContext.newPage();
        await regPage.goto('/registrar/verification');
        await regPage.waitForLoadState('networkidle');

        // Find the enrollee student
        const studentRow = regPage.locator('tr').filter({ hasText: 'E2E-2002' });
        await expect(studentRow).toBeVisible();
        await studentRow.getByText('Verify Docs').click();

        // Verification Modal
        const modal = regPage.locator('.modal-content');
        await expect(modal).toBeVisible();
        await expect(modal.locator('text=Verify Student Documents')).toBeVisible();

        // Verify all docs
        // Use a more specific locator to avoid matching "Verified" once clicked
        // and scope it to the modal to avoid matching table buttons.
        const rows = modal.locator('.divide-y > div');
        const rowCount = await rows.count();
        console.log(`[E2E] Found ${rowCount} document rows`);

        for (let i = 0; i < rowCount; i++) {
            const row = rows.nth(i);
            const docName = await row.locator('.font-medium').first().innerText();
            const btn = row.getByRole('button');
            const btnText = await btn.innerText();

            if (btnText.trim().includes('Verify') && !btnText.trim().includes('Verified')) {
                console.log(`[E2E] Verifying document: ${docName}`);
                await btn.click();
                await expect(btn).toHaveText(/Verified/i);
            } else {
                console.log(`[E2E] Document ${docName} already verified.`);
            }
        }

        regPage.on('console', msg => console.log(`[PAGE LOG] ${msg.text()}`));
        regPage.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
        regPage.on('requestfinished', async (request) => {
            const response = await request.response();
            if (response && response.status() >= 400) {
                try {
                    const body = await response.text();
                    console.log(`[API ERROR] ${request.method()} ${request.url()} -> ${response.status()}: ${body.substring(0, 500)}`);
                } catch (e) {
                    console.log(`[API ERROR] ${request.method()} ${request.url()} -> ${response.status()} (could not read body)`);
                }
            }
        });

        console.log('[E2E] Taking screenshot before saving...');
        await regPage.screenshot({ path: path.join(__dirname, '../../tests/playwright/screenshots/registrar_before_save.png') });

        console.log('[E2E] Saving verification...');
        const saveButton = regPage.getByRole('button', { name: /save verification/i });
        await expect(saveButton).toBeVisible();
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        try {
            console.log('[E2E] Waiting for modal to close...');
            await expect(regPage.locator('text=Verify Student Documents')).not.toBeVisible({ timeout: 15000 });
        } catch (e) {
            console.log('[E2E] Modal did not close. Taking failure screenshot...');
            await regPage.screenshot({ path: path.join(__dirname, '../../tests/playwright/screenshots/registrar_modal_fail.png') });
            throw e;
        }
        await regContext.close();

        // 2. STUDENT ADVISING (DRAFT -> PENDING)
        const studContext = await browser.newContext({ storageState: enrolleeFile });
        const studPage = await studContext.newPage();

        // Handle dialogs (alerts)
        studPage.on('dialog', async dialog => {
            console.log(`[E2E] Student page dialog: ${dialog.message()}`);
            await dialog.dismiss();
        });

        await studPage.goto('/student/advising');
        await studPage.waitForLoadState('networkidle');

        // Since the enrollee is regular, we should see the "Subject Advising" header
        await expect(studPage.locator('h1.header-title:has-text("Subject Advising")')).toBeVisible();

        const genBtn = studPage.locator('button:has-text("Generate Enrollment Slip")');
        // Wait for button to be enabled (unlocked by registrar update)
        await expect(genBtn).toBeEnabled({ timeout: 15000 });
        await genBtn.click();

        // Verify status changed to PENDING
        // Increase timeout for possible network delay
        await expect(studPage.locator('text=PENDING')).toBeVisible({ timeout: 15000 });
        await studContext.close();

        // 3. PROGRAM HEAD APPROVAL (PENDING -> APPROVED)
        const phContext = await browser.newContext({ storageState: programHeadFile });
        const phPage = await phContext.newPage();
        await phPage.goto('/program-head/advising');
        await phPage.waitForLoadState('networkidle');

        // Find student in pending list
        const phStudentRow = phPage.locator('tr').filter({ hasText: 'E2E Enrollee' });
        await expect(phStudentRow).toBeVisible();

        // Click approve button (CheckCircle icon)
        const approveBtn = phStudentRow.locator('button').nth(1);
        await approveBtn.click();

        // Verify student disappears from pending list
        await expect(phStudentRow).not.toBeVisible();
        await phContext.close();

        // 4. SCHEDULE PICKING
        const pickingContext = await browser.newContext({ storageState: enrolleeFile });
        const pickingPage = await pickingContext.newPage();
        await pickingPage.goto('/student/picking');
        await pickingPage.waitForLoadState('networkidle');

        // Should see session selector OR Already Finalized (if re-run)
        const isAlreadyFinalized = await pickingPage.locator('h2', { hasText: 'Schedule Already Finalized' }).isVisible();
        
        if (!isAlreadyFinalized) {
            await expect(pickingPage.locator('h2', { hasText: /Schedule Selection|Schedule Already Finalized/ }).first()).toBeVisible();
            
            // Pick Morning (only if not finalized)
            const morningBtn = pickingPage.getByText('Morning', { exact: true });
            if (await morningBtn.isVisible()) {
                await morningBtn.click({ force: true });

                // Confirm dialog (MUST BE BEFORE CLICK)
                pickingPage.on('dialog', dialog => dialog.accept());
                await pickingPage.click('button:has-text("Confirm & Lock Schedule")');
            }
        } else {
            console.log('[E2E] Schedule already finalized, skipping pick step.');
        }

        // Verify success
        // Note: The UI shows "Schedule Already Finalized" when is_schedule_picked is true
        await expect(pickingPage.locator('h1, h2', { hasText: 'Schedule Already Finalized' }).first()).toBeVisible({ timeout: 15000 });
        await pickingContext.close();
    });
});
