import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'
import os from 'os'
import fs from 'fs'

// Helper to get all HTML files recursively as entry points for the build
function getHtmlEntries() {
    const pagesDir = resolve(__dirname)
    const entries = {}

    function findHtmlFiles(dir, prefix = '') {
        const files = fs.readdirSync(dir)
        files.forEach(file => {
            const fullPath = resolve(dir, file)
            const stat = fs.statSync(fullPath)

            if (stat.isDirectory() && file !== 'node_modules' && file !== 'dist' && file !== 'public') {
                findHtmlFiles(fullPath, prefix + file + '/')
            } else if (file.endsWith('.html')) {
                const name = (prefix + file.split('.')[0]).replace(/\//g, '_')
                entries[name] = fullPath
            }
        })
    }

    findHtmlFiles(pagesDir)
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
