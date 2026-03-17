/* global process */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        baseURL: 'http://localhost:5173',
        trace: 'on-first-retry',
        viewport: { width: 1280, height: 720 },
        video: 'on-first-retry',
    },
    timeout: 120000,
    expect: {
        timeout: 20000,
    },
    projects: [
        {
            name: 'setup',
            testMatch: /.*\.setup\.js/,
            timeout: 120000, // Setup can be slow
        },
        {
            name: 'chromium-unauth',
            testMatch: /auth\.spec\.js/,
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'chromium',
            testIgnore: /auth\.spec\.js/,
            use: {
                ...devices['Desktop Chrome'],
                storageState: 'tests/playwright/.auth/user.json',
            },
            dependencies: ['setup'],
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
