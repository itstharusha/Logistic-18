const fs = require('fs');
const path = require('path');

const stylesDir = __dirname;
const files = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css') && f !== 'themes.css' && f !== 'global.css');

const replacements = [
  { pattern: /color:\s*#1[Aa]1[Cc]1[Aa]/g, replacement: 'color: var(--text-primary)' },
  { pattern: /color:\s*#3[Aa]3[Ee]3[Aa]/g, replacement: 'color: var(--text-secondary)' },
  { pattern: /color:\s*#535853/g, replacement: 'color: var(--text-secondary)' },
  { pattern: /color:\s*#5[Aa]5[Ee]5[Aa]/g, replacement: 'color: var(--text-secondary)' },
  { pattern: /color:\s*#9[Aa]9[Ee]9[Aa]/g, replacement: 'color: var(--text-tertiary)' },
  
  // Backgrounds
  { pattern: /background(-color)?:\s*(?:white|#ffffff|#FFFFFF)/g, replacement: 'background$1: var(--surface-card)' },
  { pattern: /background(-color)?:\s*#ECEEED/gi, replacement: 'background$1: var(--surface-card-alt)' },
  
  // Borders
  { pattern: /(border(?:-[a-z]+)?):\s*(.*?)(?:#E6EAE6|#E2E5E0)/gi, replacement: '$1: $2var(--border-light)' },
  { pattern: /(border(?:-[a-z]+)?):\s*(.*?)(?:#C8CCC5)/gi, replacement: '$1: $2var(--border-medium)' },
  { pattern: /(border-color):\s*(?:#E6EAE6|#E2E5E0)/gi, replacement: '$1: var(--border-light)' },
  { pattern: /(border-color):\s*(?:#C8CCC5)/gi, replacement: '$1: var(--border-medium)' },
  
  // Dark blocks (e.g. #1A1C1A background) 
  { pattern: /background(-color)?:\s*#1[Aa]1[Cc]1[Aa]/g, replacement: 'background$1: var(--text-primary)' },
  
  // Brand colors
  { pattern: /color:\s*#E85D2F/gi, replacement: 'color: var(--brand-primary)' },
  { pattern: /background(-color)?:\s*#E85D2F/gi, replacement: 'background$1: var(--brand-primary)' }
];

let totalChanges = 0;

for (const file of files) {
  const filePath = path.join(stylesDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;
  
  for (const rule of replacements) {
    content = content.replace(rule.pattern, rule.replacement);
  }

  // Fix white text on var(--text-primary) backgrounds
  content = content.replace(/(background:\s*var\(--text-primary\);[\s\S]*?color:\s*)(?:white|#ffffff|#FFFFFF)\b/gi, '$1var(--surface-deep)');
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    totalChanges++;
    console.log(`Updated ${file}`);
  }
}

console.log(`Total files updated: ${totalChanges}`);
