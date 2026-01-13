#!/usr/bin/env node
/**
 * Creates a standalone HTML file with all assets inlined
 * This allows the app to work offline without CORS issues in Chrome
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const outputPath = path.join(distDir, 'index-standalone.html');

console.log('Creating standalone HTML file...\n');

// Read the original HTML
let html = fs.readFileSync(indexPath, 'utf-8');

// Find and inline CSS
const cssLinkRegex = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
let match;
while ((match = cssLinkRegex.exec(html)) !== null) {
    const cssPath = match[1].replace(/^\.\//, '');
    const fullCssPath = path.join(distDir, cssPath);

    if (fs.existsSync(fullCssPath)) {
        let css = fs.readFileSync(fullCssPath, 'utf-8');

        // Inline fonts in CSS as base64
        const fontRegex = /url\(\.\.\/fonts\/([^)]+)\)/g;
        css = css.replace(fontRegex, (fontMatch, fontFile) => {
            const fontPath = path.join(distDir, 'fonts', fontFile);
            if (fs.existsSync(fontPath)) {
                const fontData = fs.readFileSync(fontPath);
                const base64 = fontData.toString('base64');
                const ext = path.extname(fontFile).slice(1);
                const mimeType = ext === 'woff2' ? 'font/woff2' : `font/${ext}`;
                console.log(`  ✓ Inlined font: ${fontFile}`);
                return `url(data:${mimeType};base64,${base64})`;
            }
            return fontMatch;
        });

        // Also handle fonts in assets folder
        const assetFontRegex = /url\(\.\/assets\/([^)]+\.woff2)\)/g;
        css = css.replace(assetFontRegex, (fontMatch, fontFile) => {
            const fontPath = path.join(distDir, 'assets', fontFile);
            if (fs.existsSync(fontPath)) {
                const fontData = fs.readFileSync(fontPath);
                const base64 = fontData.toString('base64');
                console.log(`  ✓ Inlined font: ${fontFile}`);
                return `url(data:font/woff2;base64,${base64})`;
            }
            return fontMatch;
        });

        // Replace the link tag with inline style
        const styleTag = `<style>${css}</style>`;
        html = html.replace(match[0], styleTag);
        console.log(`  ✓ Inlined CSS: ${cssPath}\n`);
    }
}

// Find and inline JavaScript
const scriptRegex = /<script[^>]*src="([^"]+)"[^>]*><\/script>/g;
while ((match = scriptRegex.exec(html)) !== null) {
    const jsPath = match[1].replace(/^\.\//, '');
    const fullJsPath = path.join(distDir, jsPath);

    if (fs.existsSync(fullJsPath)) {
        const js = fs.readFileSync(fullJsPath, 'utf-8');

        // Replace the script tag with inline script (no type="module")
        const scriptTag = `<script>${js}</script>`;
        html = html.replace(match[0], scriptTag);
        console.log(`  ✓ Inlined JS: ${jsPath}\n`);
    }
}

// Move script to end of body if it's in the head
const scriptStart = html.indexOf('<script>');
const scriptEnd = html.indexOf('</script>') + '</script>'.length;

if (scriptStart !== -1 && scriptEnd > scriptStart) {
    const headEnd = html.indexOf('</head>');

    // Check if script is in head section
    if (scriptStart < headEnd) {
        const scriptContent = html.substring(scriptStart, scriptEnd);

        // Remove from head
        html = html.substring(0, scriptStart) + html.substring(scriptEnd);

        // Add before closing body tag
        const bodyEnd = html.lastIndexOf('</body>');
        if (bodyEnd !== -1) {
            html = html.substring(0, bodyEnd) + '\n' + scriptContent + '\n' + html.substring(bodyEnd);
            console.log('  ✓ Moved script to end of body\n');
        }
    }
}

// Write the standalone file
fs.writeFileSync(outputPath, html, 'utf-8');

const stats = fs.statSync(outputPath);
const sizeKB = (stats.size / 1024).toFixed(1);

console.log(`✅ Created standalone file: dist/index-standalone.html`);
console.log(`   File size: ${sizeKB} KB\n`);
console.log('This file contains everything and will work in Chrome without a server!');
console.log('\nTo create the final package:');
console.log('  1. cd dist');
console.log('  2. mv index-standalone.html index.html');
console.log('  3. rm -rf assets fonts');
console.log('  4. zip -r ../JavedDairyFarm-Standalone.zip .');
