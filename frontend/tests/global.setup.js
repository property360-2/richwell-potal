import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = path.resolve(__dirname, '../../backend');

export default async function globalSetup() {
    console.log('[E2E Global Setup] Re-seeding E2E database...');
    try {
        execSync('python manage.py seed_e2e', {
            cwd: backendDir,
            stdio: 'inherit',
            timeout: 120000,
        });
        console.log('[E2E Global Setup] Seed complete.');
    } catch (error) {
        console.error('[E2E Global Setup] Seed failed:', error.message);
        throw error;
    }
}
