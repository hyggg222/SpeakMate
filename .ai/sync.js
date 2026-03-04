const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const aiDir = path.resolve(rootDir, '.ai');

function sync() {
    console.log('🔄 Sychronizing AI Context...');
    const contextStr = fs.readFileSync(path.join(aiDir, 'CONTEXT.md'), 'utf-8');

    // Generate CLAUDE.md
    const claudeAddendum = fs.readFileSync(path.join(aiDir, 'claude-addendum.md'), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'CLAUDE.md'), `${contextStr}\n${claudeAddendum}`);
    console.log('✅ Generated CLAUDE.md');

    // Generate GEMINI.md 
    const geminiAddendum = fs.readFileSync(path.join(aiDir, 'gemini-addendum.md'), 'utf-8');
    fs.writeFileSync(path.join(rootDir, 'GEMINI.md'), `${contextStr}\n${geminiAddendum}`);
    console.log('✅ Generated GEMINI.md');

    // Generate KILO / CURSOR Rules
    const kiloAddendum = fs.readFileSync(path.join(aiDir, 'kilo-addendum.md'), 'utf-8');
    fs.writeFileSync(path.join(rootDir, '.kilorules'), `${contextStr}\n${kiloAddendum}`);
    fs.writeFileSync(path.join(rootDir, '.cursorrules'), `${contextStr}\n${kiloAddendum}`);
    console.log('✅ Generated .kilorules and .cursorrules');
}

sync();
