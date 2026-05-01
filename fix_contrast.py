import os

fixes = [
    ('frontend/src/styles/themes.css', '--text-tertiary:   #606860;', '--text-tertiary:   #9ca49c;'),
    ('frontend/src/styles/themes.css', '--text-tertiary:   #8a8e8a;', '--text-tertiary:   #6b706b;'),
    ('frontend/src/styles/alerts.css', 'color: rgba(255, 255, 255, 0.55);', 'color: rgba(255, 255, 255, 0.85);'),
    ('frontend/src/styles/alerts.css', 'color: #D48A00;', 'color: #F5B623;'),
    ('frontend/src/styles/alerts.css', 'color: rgba(255, 255, 255, 0.50);', 'color: rgba(255, 255, 255, 0.85);'),
    ('frontend/src/styles/modals.css', 'color: #9a9e9a;', 'color: #5a5e5a;'),
    ('frontend/src/styles/pages.css', 'color: rgba(255, 255, 255, 0.7);', 'color: rgba(255, 255, 255, 0.95);'),
    ('frontend/src/styles/pages.css', 'color: rgba(255, 255, 255, 0.70);', 'color: rgba(255, 255, 255, 0.95);'),
    ('frontend/src/styles/auth.css', 'color: rgba(255, 255, 255, 0.6);', 'color: rgba(255, 255, 255, 0.95);'),
    ('frontend/src/styles/analytics-components.css', '--text-muted: #666c7a;', '--text-muted: #9CA4B8;'),
    ('frontend/src/styles/ExplainabilityPanel.css', 'color: #6b7280;', 'color: #374151;'),
    ('frontend/src/styles/global.css', 'color: var(--text-secondary);', 'color: var(--text-inverse-dim);')
]

for file, old, new in fixes:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        if old in content:
            content = content.replace(old, new)
            with open(file, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f'Fixed {old.strip()} in {file}')
        else:
            print(f'Count not find {old.strip()} in {file}')
    else:
        print(f'File {file} not found')
