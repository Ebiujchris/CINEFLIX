# CINEFLIX Mobile - Deployment Guide

## Quick Start

### 1. First Time Setup (One-time)

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS project (creates eas.json if needed)
eas build:configure
```

### 2. Build and Deploy APK

#### For Internal Testing
```bash
# Create APK for testing
npm run build:apk

# Download APK and install on Android device
# OR

# Use internal distribution for team testing
eas build --platform android --profile preview
```

#### For Play Store Release
```bash
# Create production App Bundle
npm run build:prod

# Submit to Play Store
npm run submit:apk
```

### 3. Update App After Release

#### For Code/UI Changes (No Reinstall Required)
```bash
# Push update to all users
npm run update

# OR push to testing branch
npm run update:preview
```

#### For Native Changes (Requires Rebuild)
```bash
# Bump version
# Edit version in app.json and package.json

# Rebuild and submit
npm run build:prod
npm run submit:apk
```

## OTA Update Examples

### Deploy a bug fix
```bash
# 1. Fix the bug in App.tsx
# 2. Test locally
npm start

# 3. Push update to preview branch
npm run update:preview

# 4. Users on preview branch get update in 30s
# 5. If all good, push to production
npm run update
```

### Update multiple branches
```bash
# Test branch
eas update --branch test --message "Testing new genre filter"

# Staging
eas update --branch staging --message "Ready for QA"

# Production (all users)
eas update --branch production --message "Bug fixes and performance improvements"
```

## Build Status

Check build status:
```bash
eas build:list
```

## EAS Update Status

Check published updates:
```bash
eas update:list

# See details of specific update
eas update:view BUILD_ID
```

## Rollback

If an update breaks things:

```bash
# Find the previous working update ID
eas update:list

# Create a new update pointing back to previous code
eas update --branch production --message "Rollback to v1.2.3"
```

## Branch Strategy

### Recommended Branches
- **preview**: Internal testing, new features
- **staging**: Team QA, before production
- **production**: Live app updates for all users

### Switch users to branch
```bash
# Tell users to reinstall if on wrong branch, OR
# Use manifest selection at runtime
# (Not recommended for public apps)
```

## Monitoring Updates

### Track update adoption
```bash
# View update details
eas update:view MANIFEST_ID

# Check rollout status
eas update:rollout-list
```

## Native Dependency Updates

If you add new native modules (e.g., `react-native-video`):

1. Update `package.json`
2. Run `npm install`
3. **Rebuild required** - can't use OTA
   ```bash
   npm run build:prod
   npm run submit:apk
   ```

## Common Scenarios

### Scenario 1: Fix typo or style
```bash
# 1. Fix in App.tsx or styles
# 2. Test: npm start
# 3. Deploy: npm run update
```

### Scenario 2: Add new API endpoint
```bash
# 1. Backend updated already
# 2. Update app code to call endpoint
# 3. Test: npm start
# 4. Deploy: npm run update
```

### Scenario 3: Update video player library
```bash
# 1. Update expo-video in package.json
# 2. npm install
# 3. Test: npm run android
# 4. Build: npm run build:prod
# 5. Submit: npm run submit:apk
# NOTE: Requires rebuild, can't use OTA
```

### Scenario 4: Emergency fix needed
```bash
# 1. Fix critical bug
# 2. Test on device or emulator
# 3. Deploy immediately: npm run update

# All users get fix within 30 seconds
# No need for Play Store review
```

## Troubleshooting Deployments

### Build Failed
```bash
# Check error log
eas build:log BUILD_ID

# Common fixes
npm cache clean --force
rm -rf node_modules
npm install
npm run build:apk
```

### Update Not Reaching Users
- Takes ~30 seconds to propagate
- Ensure app is connected to internet
- Check branch in app.json matches update branch
- Restart app (not just background resume)

### Users on Old Version
```bash
# Track active versions
eas update:list

# Force all users to minimum version
# (requires app update, not OTA possible)
# Edit in Playstore console
```

## Version Numbering

Use semantic versioning:
- `1.0.0` - Major release (big features)
- `1.1.0` - Minor release (new features, can use OTA)
- `1.0.1` - Patch (bug fixes, can use OTA)

OTA Updates = `1.0.1`, `1.0.2`, `1.1.0`, etc. (same major + minor)
Rebuild Needed = `2.0.0` (major bump for native changes)

## Links

- EAS Dashboard: https://expo.dev/accounts/ebiujchris/projects/cineflix
- EAS Docs: https://docs.expo.dev/eas-update/introduction/
- Play Store Console: https://play.google.com/apps/publish/
- Expo Status: https://status.expo.dev
