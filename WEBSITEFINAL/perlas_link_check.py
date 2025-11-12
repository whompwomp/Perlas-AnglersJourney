import os
import re

ROOT = os.path.dirname(__file__)

link_re = re.compile(r"href\s*=\s*\"([^\"]+\.html(?:#[^\"]*)?)\"", re.IGNORECASE)

errors = []
all_links = []

for dirpath, dirnames, filenames in os.walk(ROOT):
    for fname in filenames:
        if not fname.lower().endswith('.html'):
            continue
        fpath = os.path.join(dirpath, fname)
        rel_fpath = os.path.relpath(fpath, ROOT)
        with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        for m in link_re.finditer(content):
            raw = m.group(1).strip()
            link = raw.split('#',1)[0].split('?',1)[0]
            all_links.append((rel_fpath, raw))
            # ignore external links
            if link.startswith('http://') or link.startswith('https://') or link.startswith('mailto:'):
                continue
            # resolve path
            target = os.path.normpath(os.path.join(dirpath, link))
            if not os.path.exists(target):
                errors.append((rel_fpath, raw, target))

print('Link check report for folder:', ROOT)
print('Scanned HTML files:', len(set(p for p, _ in all_links)))
print('Total HTML links found:', len(all_links))
print()

if errors:
    print('Broken or missing links:')
    for src, raw, target in errors:
        print(f" - {src} -> {raw}  (resolved: {os.path.relpath(target, ROOT)})")
    print(f"\n{len(errors)} broken links found.")
    exit(2)
else:
    print('No broken local HTML links found.')
    exit(0)
