import { test, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const registrarState = path.join(__dirname, '../playwright/.auth/registrar.json');
const professorState = path.join(__dirname, '../playwright/.auth/professor.json');
const studentState = path.join(__dirname, '../playwright/.auth/student.json');

test.describe('Academic Cycle E2E Flow', () => {

    test('Full Grading Lifecycle: Professor -> Registrar -> Student', async ({ browser }) => {
        // 1. Professor Context: Submit Grade
        const profContext = await browser.newContext({ storageState: professorState });
        const profPage = await profContext.newPage();

        await profPage.goto('/professor');
        await expect(profPage.getByRole('heading', { name: 'Faculty Dashboard' })).toBeVisible();

        // Navigate to Grade Entry
        await profPage.click('text=Grade Entry');

        // Select the E2E section from sidebar
        await profPage.click('button:has-text("E2E101")');

        // Wait for roster to load
        await profPage.waitForLoadState('networkidle');

        // Find our E2E student in the roster
        const studentRow = profPage.locator('tr').filter({ hasText: 'E2E-1001' });
        await expect(studentRow).toBeVisible({ timeout: 10000 });

        // Select "1.25" from the Final Grade dropdown
        // The Select component uses a native <select> or something similar
        await studentRow.locator('select').nth(1).selectOption({ label: '1.25' });

        // Verify auto-save toast
        await expect(profPage.locator('text=Grade updated successfully')).toBeVisible();
        await profContext.close();

        // 2. Registrar Context: Review and Finalize
        const regContext = await browser.newContext({ storageState: registrarState });
        const regPage = await regContext.newPage();

        // Handle the confirmation dialog during finalization
        regPage.on('dialog', dialog => dialog.accept());

        await regPage.goto('/registrar/grades');
        await regPage.waitForLoadState('networkidle');
        // PageHeader uses h2 for title, let's just check for the text anywhere on the page
        await expect(regPage.locator('text=Grade Management Console').first()).toBeVisible({ timeout: 10000 });

        // The enrollment should appear in the finalization queue
        const sectionRow = regPage.locator('tr').filter({ hasText: 'E2E101' });
        await sectionRow.locator('button:has-text("Review")').click();

        // Finalize the section
        await regPage.click('button:has-text("Finalize All Grades")');
        await expect(regPage.locator('text=Grades finalized successfully')).toBeVisible();

        await regContext.close();

        // 3. Student Context: Verify Transcript
        const studContext = await browser.newContext({ storageState: studentState });
        const studPage = await studContext.newPage();

        await studPage.goto('/student');
        // Student dashboard says "Welcome, E2E!"
        await expect(studPage.getByText(/Welcome, E2E/)).toBeVisible();

        // Navigate to Grade Report
        await studPage.click('text=Grade Report');

        // Verify the grade is visible and status is PASSED
        const gradeRow = studPage.locator('tr').filter({ hasText: 'E2E101' });
        await expect(gradeRow).toContainText('1.25');
        await expect(gradeRow).toContainText(/Passed/i);

        await studContext.close();
    });
});
