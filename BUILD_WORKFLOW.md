# 🛠️ Build Workflow Guide

## Overview

This project now has **TWO separate build modes**:

1. **Development/Regular Build** - For working on localhost with hot reload
2. **Standalone Build** - For creating offline-compatible zip packages

---

## 🔧 Development Workflow (Regular Work)

### When developing features or fixing bugs:

```bash
# Start development server
npm run dev

# Opens at http://localhost:3000 (or 3001, 3002, 3003 if ports are busy)
# Hot reload enabled - changes appear instantly
```

### When you want to test the production build locally:

```bash
# Build for production (with PWA)
npm run build

# Preview the build
npm run preview
```

**This creates:**
- `dist/` folder with separate CSS/JS files
- PWA features enabled (service worker)
- Works on localhost/server
- **NOT for direct file:// opening in Chrome**

---

## 📦 Standalone Build Workflow (For Distribution)

### When you want to create a zip file for offline use:

```bash
# Step 1: Build standalone version
npm run build:standalone

# This does:
# - Builds with PWA disabled (BUILD_OFFLINE=true)
# - Inlines all CSS, JS, and fonts into single HTML
# - Creates dist/index-standalone.html
# - Shows file size and instructions
```

### Step 2: Create the final package:

```bash
# Option A: Using the script (RECOMMENDED)
bash scripts/create-package.sh

# This automatically:
# - Creates dist-package/ folder
# - Copies standalone HTML as index.html
# - Adds README.txt and HOW_TO_RUN.html
# - Adds server scripts for optional use
# - Creates JavedDairyFarm-Standalone.zip
```

```bash
# Option B: Manual steps
cd dist
mv index-standalone.html index.html
rm -rf assets fonts
zip -r ../JavedDairyFarm-Standalone.zip index.html README.txt HOW_TO_RUN.html
```

---

## 📋 Available NPM Scripts

| Command | Purpose | Output |
|---------|---------|--------|
| `npm run dev` | Start development server | Hot reload at localhost:3000 |
| `npm run build` | Production build (normal) | dist/ with PWA, for hosting |
| `npm run build:standalone` | Standalone build | dist/index-standalone.html |
| `npm run preview` | Preview production build | Local server for testing |

---

## 🎯 When to Use Each Build

### Use `npm run build` when:
- ✅ Deploying to a web server
- ✅ Testing production build locally
- ✅ You want PWA features
- ✅ Normal development workflow

### Use `npm run build:standalone` when:
- ✅ Creating offline package for friend/client
- ✅ Need Chrome compatibility without server
- ✅ Want single HTML file
- ✅ Distribution via USB/email/WhatsApp

---

## 🔄 Typical Development Cycle

### Making changes and testing:

```bash
# 1. Make code changes in components/
# 2. Dev server auto-reloads
npm run dev

# 3. When feature is done, test production build
npm run build
npm run preview

# 4. If everything works, commit changes
git add .
git commit -m "feat: your feature description"
```

### Creating distribution package:

```bash
# 1. Make sure all changes are tested
npm run dev  # Test in development

# 2. Build standalone version
npm run build:standalone

# 3. Create package
bash scripts/create-package.sh

# 4. Test the zip file
unzip -l JavedDairyFarm-Standalone.zip
# Extract and test index.html in Chrome

# 5. Share the zip file
# Ready to send!
```

---

## 🗂️ File Structure

```
JavedDairyFarm/
├── components/          # React components
├── contexts/           # React contexts
├── services/           # Database services
├── scripts/            # Build scripts
│   ├── create-standalone.js   # Inlines assets
│   └── create-package.sh      # Creates final zip
├── dist/               # Build output (gitignored)
│   ├── index.html     # Regular build
│   └── index-standalone.html  # Standalone build
├── dist-package/       # Package staging (gitignored)
├── package.json        # NPM scripts
├── vite.config.ts      # Vite configuration
└── BUILD_WORKFLOW.md   # This file
```

---

## 🐛 Troubleshooting

### Issue: "CORS errors in Chrome"
**Solution:** You're using the wrong build. Use standalone:
```bash
npm run build:standalone
bash scripts/create-package.sh
```

### Issue: "Root element not found"
**Solution:** Standalone script moves script to body end automatically. If issue persists:
- Clear dist/ folder: `rm -rf dist`
- Rebuild: `npm run build:standalone`

### Issue: "Dev server won't start"
**Solution:** Port might be in use:
```bash
# Kill existing servers
lsof -ti:3000,3001,3002,3003 | xargs kill -9

# Or just use the port Vite finds automatically
npm run dev
```

### Issue: "Changes not showing"
**Solutions:**
- Hard refresh: Ctrl+Shift+R (Cmd+Shift+R on Mac)
- Clear cache
- Check if dev server is actually running
- Restart dev server

---

## ✨ Key Differences

| Feature | Regular Build | Standalone Build |
|---------|--------------|------------------|
| **CSS** | External file | Inlined |
| **JavaScript** | External file | Inlined |
| **Fonts** | External files | Base64 embedded |
| **PWA** | ✅ Enabled | ❌ Disabled |
| **Service Worker** | ✅ Yes | ❌ No |
| **File Count** | ~19 files | 1 file (+helpers) |
| **Total Size** | ~1.6 MB | ~1.6 MB |
| **Chrome file://** | ❌ CORS errors | ✅ Works |
| **Server needed** | ✅ Yes | ❌ No |
| **Use case** | Hosting/dev | Distribution |

---

## 📝 Quick Reference

### I want to work on a new feature:
```bash
npm run dev
# Make changes, test, commit
```

### I want to create a package for my friend:
```bash
npm run build:standalone
bash scripts/create-package.sh
# Share JavedDairyFarm-Standalone.zip
```

### I want to deploy to a web server:
```bash
npm run build
# Upload dist/ folder to your server
```

### I want to test production build locally:
```bash
npm run build
npm run preview
```

---

## 🎯 Remember

1. **NEVER use standalone build for development** - it's slow and unnecessary
2. **ALWAYS test standalone build** before sharing - extract and test in Chrome
3. **Regular builds are for servers** - they won't work with file:// protocol
4. **Commit source code, not builds** - dist/ is gitignored for a reason

---

## 🚀 Summary

- **Regular work:** `npm run dev` → make changes → test
- **Production test:** `npm run build` → `npm run preview`
- **Share with friend:** `npm run build:standalone` → `bash scripts/create-package.sh` → send zip

That's it! Simple and clean workflow for both development and distribution. 🎉
