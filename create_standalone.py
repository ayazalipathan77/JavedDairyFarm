#!/usr/bin/env python3
"""
Create a standalone HTML file with all CSS and JS inlined
This will work in Chrome without CORS issues
"""

import os
import re
import base64

# Paths
dist_dir = 'dist'
output_file = 'dist/index-standalone.html'

# Read the original HTML
with open(f'{dist_dir}/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Read CSS file
css_file = None
css_match = re.search(r'href="\./(assets/style-[^"]+\.css)"', html)
if css_match:
    css_file = css_match.group(1)
    css_path = f'{dist_dir}/{css_file}'
    if os.path.exists(css_path):
        with open(css_path, 'r', encoding='utf-8') as f:
            css_content = f.read()

        # Inline fonts in CSS as base64
        # Find all woff2 font references
        font_pattern = r'url\(([^)]+\.woff2)\)'
        fonts = re.findall(font_pattern, css_content)

        for font_url in fonts:
            # Clean the URL
            clean_url = font_url.strip('\'"')
            # Try both assets and fonts directories
            for font_dir in ['assets', 'fonts']:
                font_path = f'{dist_dir}/{font_dir}/{os.path.basename(clean_url)}'
                if os.path.exists(font_path):
                    with open(font_path, 'rb') as f:
                        font_data = f.read()
                    font_base64 = base64.b64encode(font_data).decode('utf-8')
                    data_uri = f'url(data:font/woff2;base64,{font_base64})'
                    css_content = css_content.replace(f'url({font_url})', data_uri)
                    print(f'Inlined font: {os.path.basename(clean_url)}')
                    break

        # Replace CSS link with inline style
        css_link_pattern = r'<link[^>]+href="[^"]*style-[^"]+\.css"[^>]*>'
        inline_css = f'<style>{css_content}</style>'
        html = re.sub(css_link_pattern, inline_css, html)
        print(f'Inlined CSS: {css_file}')

# Read JS file
js_file = None
js_match = re.search(r'src="\./(assets/index-[^"]+\.js)"', html)
if js_match:
    js_file = js_match.group(1)
    js_path = f'{dist_dir}/{js_file}'
    if os.path.exists(js_path):
        with open(js_path, 'r', encoding='utf-8') as f:
            js_content = f.read()

        # Replace script tag with inline script
        script_pattern = r'<script[^>]+src="[^"]*index-[^"]+\.js"[^>]*></script>'
        inline_js = f'<script>{js_content}</script>'
        # Use a function to avoid re.sub interpretation of backslashes
        html = re.sub(script_pattern, lambda m: inline_js, html)
        print(f'Inlined JS: {js_file}')

# Write the standalone file
with open(output_file, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'\n✅ Created standalone file: {output_file}')
print(f'File size: {os.path.getsize(output_file) / 1024:.1f} KB')
print('\nThis file contains everything and will work in Chrome!')
