const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function checkFile(relPath, assertions) {
  const fullPath = path.resolve(__dirname, '../../', relPath);
  const content = fs.readFileSync(fullPath, 'utf8');
  for (const { pattern, description } of assertions) {
    assert.match(content, pattern, `Failed: ${description} in ${relPath}`);
  }
}

// 1. RootLayout default html lang must be 'en' and metadata description in English
checkFile('frontend/src/app/layout.tsx', [
  { pattern: /<html\s+lang=["']en["']>/, description: 'RootLayout html tag must have lang="en"' },
  { pattern: /description:\s*['"]AI-Powered English Conversation Platform['"]/, description: 'metadata.description must be in English' },
]);

// 2. LanguageContext default must be 'en'
checkFile('frontend/src/context/LanguageContext.tsx', [
  { pattern: /createContext<LanguageContextValue>\(\{\s*lang:\s*['"]en['"]/, description: 'LanguageContext default lang must be "en"' },
  { pattern: /useState<Lang>\(['"]en['"]\)/, description: 'useState initial lang must be "en"' },
  { pattern: /translations\[lang\]\[key\]\s*\?\?\s*translations\s*\[['"]en['"]\]\[key\]/, description: 'LanguageContext fallback translation must default to "en"' },
]);

// 3. ErrorBoundary default language must be 'en'
checkFile('frontend/src/components/ErrorBoundary.tsx', [
  { pattern: /if\s*\(typeof window === ['"]undefined['"]\)\s*return\s*['"]en['"]/, description: 'ErrorBoundary getLang must return "en" when SSR' },
  { pattern: /localStorage\.getItem\(['"]speakmate_language['"]\)\s*as\s*['"]vi['"]\s*\|\s*['"]en['"]\)\s*\|\|\s*['"]en['"]/, description: 'ErrorBoundary getLang must fallback to "en"' },
  { pattern: /translations\[lang\]\[key\]\s*\?\?\s*translations\.en\[key\]/, description: 'ErrorBoundary translation must fallback to "en"' },
]);

// 4. apiClient default language must be 'en'
checkFile('frontend/src/lib/apiClient.ts', [
  { pattern: /localStorage\.getItem\(['"]speakmate_language['"]\)\s*\|\|\s*['"]en['"]/, description: 'apiClient getCurrentLanguage must fallback to "en"' },
  { pattern: /translations\[lang\]\?\.\[key\]\s*\?\?\s*translations\.en\?\.\[key\]/, description: 'apiClient t() must fallback to translations.en' },
]);

console.log('PASS: All default language checks passed with "en" as default.');
