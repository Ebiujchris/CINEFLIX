# CINEFLIX Mobile - Quick Start Reference

## 🚀 Fast Track

### 1. Setup (One Time)
```bash
cd CINEFLOW-RN
npm install
```

### 2. Test Locally
```bash
npm start                    # Start dev server
npm run android             # Run on Android
npm run ios                 # Run on iOS  
npm run web                 # Run in browser
```

### 3. Build for Android
```bash
# Testing APK
npm run build:apk

# Play Store app bundle
npm run build:prod

# Submit to Play Store
npm run submit:apk
```

### 4. Push OTA Update (After Release)
```bash
# Fix bugs, update UI, etc
# Then:
npm run update              # All users get it in 30 seconds!

# OR
npm run update:preview      # Test with preview branch first
```

## 📦 What's Included

| Feature | Status |
|---------|--------|
| Home feed with hero | ✅ |
| Movies with genres | ✅ |
| TV Series & episodes | ✅ |
| My List (watchlist) | ✅ |
| Search | ✅ |
| Continue watching | ✅ |
| Video player | ✅ |
| YouTube/Vimeo embeds | ✅ |
| Authentication | ✅ |
| OTA Updates | ✅ |
| Dark theme UI | ✅ |

## 🎮 Navigation

**Bottom Tabs:**
- 🏠 Home - Featured + Popular
- ▣ Movies - All movies with genre filter
- ▤ Series - All TV series with episodes
- ♡ My List - Saved titles (login required)

**Other:**
- 👤 Profile - Tap avatar to login/account
- 🔍 Search - Find any title/genre/actor

## 💾 Environment

```bash
# .env or auto (Vercel backend)
EXPO_PUBLIC_API_URL=https://cineflix-be.vercel.app
```

## 🐛 Quick Fixes

**Blank screen?**
```bash
npm start -- --clear
```

**Video won't play?**
- Check API URL is correct
- Try alternate source

**Build fails?**
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

## 📱 Release Timeline

| Step | Command | Time |
|------|---------|------|
| Build | `npm run build:prod` | 10-15 min |
| Submit | `npm run submit:apk` | 1 min |
| Review | Play Store review | 2-4 hours |
| Live | App appears in Play Store | 1-2 hours |

## 🔄 OTA Update Examples

### Scenario: Fix typo in UI
```bash
# 1. Edit App.tsx
# 2. npm start (test)
# 3. npm run update
# Done! Users get it in 30s
```

### Scenario: Update video library
```bash
# 1. npm install expo-new-library
# 2. npm run build:prod (rebuild required)
# 3. npm run submit:apk
```

### Scenario: Emergency hotfix
```bash
# 1. Fix critical bug
# 2. npm run update (immediate release!)
```

## 📊 Stats

- **APK Size**: ~50MB
- **Update Size**: 2-5MB typically
- **Launch Time**: 3-5 seconds
- **Video Buffer**: <2 seconds

## 🔗 Important Files

| File | Purpose |
|------|---------|
| `App.tsx` | Main component |
| `app.json` | App config |
| `eas.json` | Build config |
| `package.json` | Dependencies |
| `SETUP.md` | Full setup guide |
| `DEPLOYMENT.md` | Build/release guide |

## 📞 Common Commands

```bash
# Development
npm start
npm run android
npm run ios

# Building
npm run build:apk           # Test APK
npm run build:prod          # Play Store
npm run submit:apk          # Submit to store

# Updates
npm run update              # Production
npm run update:preview      # Preview branch
eas update:list             # View all updates

# Debugging
npm run android -- --clear
npx expo-cli doctor
```

## ⚡ Pro Tips

1. **Always test locally first**: `npm run android` before pushing
2. **Use preview branch first**: Test OTA on `npm run update:preview`
3. **Monitor updates**: `eas update:list` to see deployment status
4. **Fast iteration**: OTA updates are instant, no Play Store wait
5. **Version tracking**: Bump version in `app.json` for each release

## ✅ Pre-Release Checklist

- [ ] Tested on Android device
- [ ] Tested on iOS device (if available)
- [ ] All videos play correctly
- [ ] Login/signup works
- [ ] Watchlist functions
- [ ] Search works
- [ ] Updated version in app.json
- [ ] Ready to build and submit

## 🚀 Release Command Sequence

```bash
# 1. Final test
npm run android

# 2. Build for production
npm run build:prod

# 3. Download and test APK locally

# 4. Submit to Play Store
npm run submit:apk

# 5. Monitor Play Store for approval
# Usually 2-4 hours

# 6. App goes live!
```

## 🎯 After Release

Keep iterating with OTA updates:

```bash
# Weekly: Fix bugs and improve
npm run update

# Monthly: New features (may need rebuild)
npm run build:prod

# Emergency: Critical fixes (instant OTA)
npm run update
```

---

**Need more details?** See `SETUP.md`, `DEPLOYMENT.md`, or `README.md`
