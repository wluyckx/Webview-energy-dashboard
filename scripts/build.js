/**
 * Build script for Energy Dashboard.
 * Reads index.html, inlines all src/ script tags, and writes dist/dashboard.html.
 *
 * Usage: node scripts/build.js
 *
 * CHANGELOG:
 * - 2026-02-15: Initial build script with JS inlining (STORY-001)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const INPUT_FILE = path.join(ROOT_DIR, 'index.html');
const OUTPUT_DIR = path.join(ROOT_DIR, 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'dashboard.html');

/**
 * Read a file and return its contents as a string.
 * @param {string} filePath - Absolute path to the file.
 * @returns {string} File contents.
 */
function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Replace <script src="src/..."> tags with inline <script> blocks.
 * @param {string} html - The HTML content.
 * @returns {string} HTML with inlined scripts.
 */
function inlineScripts(html) {
  const scriptTagPattern = /<script\s+src="(src\/[^"]+)"\s*><\/script>/g;
  let inlinedCount = 0;

  const result = html.replace(scriptTagPattern, (match, srcPath) => {
    const absolutePath = path.join(ROOT_DIR, srcPath);

    if (!fs.existsSync(absolutePath)) {
      console.error(`  ERROR: Source file not found: ${srcPath}`);
      process.exit(1);
    }

    const fileContents = readFile(absolutePath);
    inlinedCount++;
    console.log(`  Inlined: ${srcPath} (${fileContents.length} bytes)`);
    return `<script>\n${fileContents}\n</script>`;
  });

  console.log(`  Total scripts inlined: ${inlinedCount}`);
  return result;
}

/**
 * Main build function.
 */
function build() {
  console.log('Energy Dashboard Build');
  console.log('======================');
  console.log(`  Input:  ${INPUT_FILE}`);
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log('');

  // Read index.html
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`ERROR: index.html not found at ${INPUT_FILE}`);
    process.exit(1);
  }

  let html = readFile(INPUT_FILE);
  console.log(`  Read index.html (${html.length} bytes)`);

  // Inline scripts
  console.log('');
  console.log('Inlining scripts...');
  html = inlineScripts(html);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`\n  Created directory: ${OUTPUT_DIR}`);
  }

  // Write output
  fs.writeFileSync(OUTPUT_FILE, html, 'utf-8');

  // Report size
  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKB = (stats.size / 1024).toFixed(1);
  console.log('');
  console.log('Build complete!');
  console.log(`  Output: ${OUTPUT_FILE}`);
  console.log(`  Size:   ${stats.size} bytes (${sizeKB} KB)`);

  if (stats.size > 200 * 1024) {
    console.warn(`  WARNING: Output exceeds 200 KB budget!`);
    process.exit(1);
  } else {
    console.log(`  Status: Within 200 KB budget`);
  }
}

build();
