import os, re

fixes = [
    ('frontend/src/styles/themes.css', r'--text-tertiary:\s*#606860;', '--text-tertiary:   #a8b0a8;'),
    ('frontend/src/styles/themes.css', r'--text-tertiary:\s*#8a8e8a;', '--text-tertiary:   #6b706b;'),
    ('frontend/src/styles/alerts.css', r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.55\);', 'color: rgba(255, 255, 255, 0.85);'),
    ('frontend/src/styles/alerts.css', r'color:\s*#D48A00;', 'color: #F5B623;'),
    ('frontend/src/styles/alerts.css', r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.50\);', 'color: rgba(255, 255, 255, 0.85);'),
    ('frontend/src/styles/modals.css', r'color:\s*#9a9e9a;', 'color: #5a5e5a;'),
    ('frontend/src/styles/pages.css', r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.70?\);', 'color: rgba(255, 255, 255, 0.95);'),
    ('frontend/src/styles/auth.css', r'color:\s*rgba\(255,\s*255,\s*255,\s*0\.60?\);', 'color: rgba(255, 255, 255, 0.95);'),
    ('frontend/src/styles/analytics-components.css', r'--text-muted:\s*#666c7a;', '--text-muted: #9CA4B8;'),
    ('frontend/src/components/ExplainabilityPanel.css', r'color:\s*#6b7280;', 'color: #374151;'),
    ('frontend/src/styles/global.css', r'color:\s*var\(--text-secondary\);(\s*font-size:\s*14px;\s*letter-spacing:\s*0\.02em;)', r'color: var(--text-inverse-dim);\1')
]

for file, old_re, new in fixes:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        content_new, count = re.subn(old_re, new, content, flags=re.IGNORECASE)
        if count > 0:
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content_new)
            print(f'Fixed {new} in {file}')
        else:
            print(f'Could not find match for {old_re} in {file}')
    else:
        print(f'File {file} not found')

