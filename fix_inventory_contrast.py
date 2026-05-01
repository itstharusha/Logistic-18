import os, re

fixes = [
    ('frontend/src/styles/pages.css', r'color:\s*#9[Aa]9[Ee]9[Aa];', 'color: #535853;'),
    ('frontend/src/styles/pages.css', r'color:\s*#5[Aa]5[Ee]5[Aa];', 'color: #3A3E3A;'),
    ('frontend/src/styles/modals.css', r'color:\s*#5[Aa]5[Ee]5[Aa];', 'color: #3A3E3A;'),
    ('frontend/src/pages/WarehousePage.jsx', r"color:\s*'#9[Aa]9[Ee]9[Aa]'", "color: '#535853'")
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

