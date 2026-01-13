#!/bin/bash
# Create final standalone package for distribution

set -e

echo "📦 Creating standalone package..."
echo ""

# Check if standalone file exists
if [ ! -f "dist/index-standalone.html" ]; then
    echo "❌ Error: dist/index-standalone.html not found"
    echo "   Run 'npm run build:standalone' first"
    exit 1
fi

# Create package directory
PACKAGE_DIR="dist-package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Copy standalone HTML
cp dist/index-standalone.html "$PACKAGE_DIR/index.html"
echo "✓ Copied standalone HTML"

# Create README
cat > "$PACKAGE_DIR/README.txt" << 'EOF'
========================================
  Javed Dairy Farm Management System
========================================

HOW TO USE:
-----------
1. Double-click on "index.html"
2. The app will open in your browser
3. That's it! Everything works offline.

WORKS IN:
---------
✓ Chrome (no server needed!)
✓ Firefox
✓ Edge
✓ Safari
✓ Mobile browsers

IMPORTANT:
----------
• All data is stored locally in your browser
• Use Settings → Export Backup regularly to save your data
• Don't clear browser data or you'll lose records
• Each browser has separate data

FEATURES:
---------
• Dashboard with statistics and charts
• Daily milk entry tracking
• Customer management
• Monthly billing with PDF export
• Cash ledger and expense tracking
• Customer reports
• Backup and restore

SUPPORT:
--------
For help or issues, contact your administrator.

Generated: $(date)
EOF
echo "✓ Created README.txt"

# Create HOW_TO_RUN guide
cat > "$PACKAGE_DIR/HOW_TO_RUN.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>How to Run - Javed Dairy Farm</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #667eea; margin-top: 0; }
        .subtitle { color: #666; font-size: 18px; margin-bottom: 30px; }
        .method {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .recommended {
            background: linear-gradient(135deg, #e0f7fa 0%, #e8f5e9 100%);
            border-left-color: #00c853;
        }
        code {
            background: #263238;
            color: #aed581;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
        }
        ol { line-height: 1.8; }
        .btn {
            display: inline-block;
            padding: 15px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            margin-top: 20px;
            font-weight: bold;
        }
        .btn:hover { background: #5568d3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🥛 Javed Dairy Farm</h1>
        <p class="subtitle">✅ Chrome Compatible - Works in ALL Browsers!</p>

        <div class="method recommended">
            <h2>✨ Super Easy - Just Double Click!</h2>
            <p><strong>This version works in ALL browsers including Chrome!</strong></p>
            <ol>
                <li>Double-click <code>index.html</code></li>
                <li>That's it! The app opens and works perfectly.</li>
                <li>Works in Chrome, Firefox, Edge, Safari</li>
                <li>No server needed, no setup required!</li>
            </ol>
        </div>

        <div class="method">
            <h2>📱 Mobile Devices</h2>
            <p>The app works great on phones and tablets too!</p>
            <ol>
                <li>Copy this folder to your mobile device</li>
                <li>Open <code>index.html</code> in your mobile browser</li>
                <li>Use all features on the go!</li>
            </ol>
        </div>

        <div class="method">
            <h2>💾 Important: Backup Your Data</h2>
            <p>Your data is stored locally in the browser:</p>
            <ul>
                <li>Go to Settings → Export Backup regularly</li>
                <li>Save the JSON file in a safe location</li>
                <li>Don't clear browser data or you'll lose records</li>
                <li>Each browser stores data separately</li>
            </ul>
        </div>

        <a href="index.html" class="btn">🚀 Launch Javed Dairy Farm</a>
    </div>
</body>
</html>
EOF
echo "✓ Created HOW_TO_RUN.html"

# Create Windows server script (optional)
cat > "$PACKAGE_DIR/START_SERVER.bat" << 'EOF'
@echo off
echo Starting Javed Dairy Farm local server...
echo.
echo The app will open in your browser at http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

where python >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    start http://localhost:8080
    python -m http.server 8080
) else (
    echo Python not found. Opening file directly...
    start index.html
)
EOF
echo "✓ Created START_SERVER.bat"

# Create Linux/Mac server script (optional)
cat > "$PACKAGE_DIR/START_SERVER.sh" << 'EOF'
#!/bin/bash
echo "Starting Javed Dairy Farm local server..."
echo ""
echo "The app will open in your browser at http://localhost:8080"
echo "Press Ctrl+C to stop the server"
echo ""

if command -v python3 &> /dev/null; then
    open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || true
    python3 -m http.server 8080
elif command -v python &> /dev/null; then
    open http://localhost:8080 2>/dev/null || xdg-open http://localhost:8080 2>/dev/null || true
    python -m http.server 8080
else
    echo "Python not found. Opening file directly..."
    open index.html 2>/dev/null || xdg-open index.html 2>/dev/null || start index.html
fi
EOF
chmod +x "$PACKAGE_DIR/START_SERVER.sh"
echo "✓ Created START_SERVER.sh"

# Create ZIP
ZIP_NAME="JavedDairyFarm-Standalone.zip"
rm -f "$ZIP_NAME"
cd "$PACKAGE_DIR"
zip -r "../$ZIP_NAME" .
cd ..

# Get file size
SIZE=$(ls -lh "$ZIP_NAME" | awk '{print $5}')

echo ""
echo "✅ Package created successfully!"
echo ""
echo "📦 File: $ZIP_NAME"
echo "📊 Size: $SIZE"
echo ""
echo "This package contains:"
echo "  • index.html (standalone, works in all browsers)"
echo "  • README.txt (usage instructions)"
echo "  • HOW_TO_RUN.html (visual guide)"
echo "  • START_SERVER scripts (optional local server)"
echo ""
echo "Ready to share! 🎉"
