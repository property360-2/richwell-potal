import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import os from 'os'
import fs from 'fs'

// Helper to get all HTML files as entry points for the build
function getHtmlEntries() {
    const root = resolve(__dirname)
    const files = fs.readdirSync(root)
    const entries = {}

    files.forEach(file => {
        if (file.endsWith('.html')) {
            const name = file.split('.')[0]
            entries[name] = resolve(__dirname, file)
        }
    })

    return entries
}

export default defineConfig({
    plugins: [
        tailwindcss(),
    ],
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    },
    build: {
        rollupOptions: {
            input: getHtmlEntries()
        }
    }
})
