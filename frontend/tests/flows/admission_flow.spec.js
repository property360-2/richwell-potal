import { test, expect } from '@playwright/test';

/**
 * admission_flow.spec.js
 * 
 * E2E test for the student admission lifecycle:
 * 1. Public Applicant fills the application form.
 * 2. Registrar reviews and admits the applicant.
 * 3. Verification of system outcome (IDN generation, monthly commitment assignment).
 */

test.describe('Student Admission Flow', () => {
    
    test('should allow a student to apply and a registrar to admit them', async ({ page }) => {
        // Step 1: Public Student Application
        await page.goto('/apply');
        
        // Step 1.1: Personal Info
        await page.getByLabel('First Name').fill('Juan');
        await page.getByLabel('Last Name').fill('Dela Cruz');
        
        // Date of Birth - Using index since these fields lack unique labels
        const dobSelects = page.locator('select');
        await dobSelects.nth(0).selectOption('01'); // Month (January)
        await dobSelects.nth(1).selectOption('01'); // Day
        await dobSelects.nth(2).selectOption('2005'); // Year
        
        await page.getByLabel('Gender').selectOption('MALE');
        await page.getByLabel('Student Type').selectOption('FRESHMAN');
        await page.getByRole('button', { name: /Continue/i }).click();
        
        // Step 1.2: Contact Info
        const timestamp = Date.now();
        await page.locator('input[name="email"]').fill(`juan.test.${timestamp}@example.com`);
        await page.locator('input[name="contact_number"]').fill('09171234567');
        await page.locator('select[name="address_municipality"]').selectOption('Meycauayan');
        // Wait for barangays to load
        await page.waitForTimeout(1000); 
        await page.locator('select[name="address_barangay"]').selectOption('Pandayan');
        await page.locator('input[name="address_full"]').fill('123 Test St, Pandayan, Meycauayan');
        await page.getByRole('button', { name: /Continue/i }).click();
        
        // Wait for step transition
        await page.waitForTimeout(1000); 

        // Step 1.3: Academic Preference
        await page.locator('select[name="program"]').selectOption({ index: 1 });
        await page.getByRole('button', { name: /Continue/i }).click();
        
        // Wait for step transition
        await page.waitForTimeout(1000); 

        // Step 1.4: Guardian Info
        await page.locator('input[name="guardian_name"]').fill('Maria Dela Cruz');
        await page.locator('input[name="guardian_contact"]').fill('09177654321');
        await page.getByRole('button', { name: /Continue/i }).click();
        
        // Wait for step transition
        await page.waitForTimeout(1000); 

        // Step 1.5: Review & Submit
        await page.locator('input[type="checkbox"]').check();
        await page.getByRole('button', { name: /Submit Application/i }).click();
        
        // Wait for success message
        await expect(page.getByText('Application Submitted!')).toBeVisible();
        
        // Step 2: Registrar Admission
        await page.goto('/login');
        await page.locator('input[name="username"]').fill('registrar_e2e');
        await page.locator('input[name="password"]').fill('password123');
        await page.getByRole('button', { name: /Sign In/i }).click();
        
        await expect(page).toHaveURL(/\/registrar/);
        
        // Navigate to Applicants
        await page.goto('/admission/applicants');
        await expect(page.getByText('Applicant Management')).toBeVisible();
        
        // Search for the new applicant
        await page.getByPlaceholder(/Search by name/i).fill('Juan Dela Cruz');
        
        // Wait for results to filter
        await page.waitForTimeout(2000); 
        
        // Click Review on the first row
        await page.getByRole('button', { name: /Review/i }).first().click();
        
        // Fill Monthly Commitment
        // Use label for commitment input
        await page.getByLabel(/Monthly Payment Commitment/i).fill('4500');
        
        // Intercept confirmation dialog
        page.once('dialog', dialog => dialog.accept());
        
        // Click Admit button in modal
        await page.getByRole('button', { name: /Admit & Finalize Registration/i }).click();
        
        // Verify success
        await expect(page.getByRole('heading', { name: 'Student Admitted!' })).toBeVisible();
        await expect(page.locator('.credentials-success')).toBeVisible();
        await expect(page.getByText(/Student ID \(IDN\)/i)).toBeVisible();
        
        // Verify credentials display
        await expect(page.getByText('Default Password')).toBeVisible();
    });
});
