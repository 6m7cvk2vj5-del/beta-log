#!/usr/bin/env python3
"""Builds a review preview of the app into an output directory.

Usage: python3 tools/make-preview.py <outdir>

Publish <outdir>/index.html as the Artifact page with app.js and seed.js passed through `files`.
The Artifact host wraps the page in its own document skeleton, so this strips the repo page's
<!DOCTYPE>/<html>/<head>/<body> wrappers, renames the title, and loads tools/preview-seed.js
(sample data, only when the preview's localStorage is empty) ahead of app.js.
"""
import re, shutil, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)

html = (root / 'index.html').read_text()
style = re.search(r'<style>.*?</style>', html, re.S).group(0)
body = re.search(r'<body>(.*?)</body>', html, re.S).group(1)
body = re.sub(r'\s*<script src="app\.js"></script>\s*', '\n', body)

page = ('<meta charset="UTF-8">\n<title>Beta Log Preview</title>\n' + style + '\n' + body.strip() + '\n'
        '<script src="seed.js"></script>\n<script src="app.js"></script>\n')
(out / 'index.html').write_text(page)
shutil.copyfile(root / 'app.js', out / 'app.js')
shutil.copyfile(root / 'tools' / 'preview-seed.js', out / 'seed.js')
print('preview built in', out)
