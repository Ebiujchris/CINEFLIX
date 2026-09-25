# CINEFLIX Mobile App - Setup & Deployment Guide

## Overview

CINEFLIX Mobile is a React Native app for iOS and Android that mirrors the web version's mobile layout and features. It includes OTA (Over-the-Air) updates via EAS Updates, allowing you to push app updates without requiring users to reinstall.

## Prerequisites

- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Android SDK (for Android builds) or Xcode (for iOS builds)
- Expo account (create at expo.dev)

## Installation

1. **Navigate to the project:**
   ```bash
   cd CINEFLOW-RN
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment:**
   Create a `.env` file:
   ```
   EXPO_PUBLIC_API_URL=https://cineflix-be.vercel.app
   ```

## Development

### Local Testing

**Run on Android:**
```bash
npm run android
```

**Run on iOS:**
```bash
npm run ios
```

**Run on Web:**
```bash
npm run web
```

**Start dev server:**
```bash
npm start
```

## Building for Production

### Build APK (Android)

1. **Preview Build (for internal testing):**
   ```bash
   npm run build:apk
   ```
   
   This creates an APK file that you can download and install on Android devices.

2. **Production Build (App Bundle for Play Store):**
   ```bash
   npm run build:prod
   ```
   
   Creates an App Bundle (.aab) optimized for Google Play Store distribution.

### Build for iOS

```bash
eas build --platform ios --profile production
```

## OTA Updates (Over-the-Air)

### How OTA Updates Work

- Users download the app from Play Store or App Store
- The app automatically checks for updates on launch
- New code/UI updates are delivered without app store review
- Users get updates within 30 seconds on app startup

### Publishing Updates

**Update Preview Branch (testing):**
```bash
npm run update:preview
```

**Update Production Branch (all users):**
```bash
npm run update
```

**Custom branch update:**
```bash
eas update --branch your-branch-name --message "Update message"
```

## App Features

### Core Features
- **Home Feed**: Featured content with hero banner
- **Movies**: Browse all movies with genre filtering
- **Series**: Browse TV series with episode selection
- **My List**: Saved watchlist (requires login)
- **Search**: Full-text search across titles, genres, cast
- **Continue Watching**: Track progress across resumed items
- **Player**: Native video playback + YouTube/Vimeo embeds

### Authentication
- Email/password signup and login
- JWT-based authentication
- Secure token storage (Secure Store)
- Persistent session on app launch

### Playback
- **Native video**: Direct playback with native controls
- **YouTube/Vimeo**: Embedded iframe playback
- **Multiple sources**: Fallback to alternate sources on error
- **Source switching**: Switch between available playback sources

### Offline
- Cached content list
- Local resume position storage
- Graceful offline handling

## Configuration

### API URL

The app connects to the backend via `EXPO_PUBLIC_API_URL`:
- **Development**: `http://localhost:4000`
- **Staging**: `https://cineflix-be-staging.vercel.app`
- **Production**: `https://cineflix-be.vercel.app`

Edit in `app.json` or set via environment variable.

### EAS Configuration

Key settings in `eas.json`:
- **Preview profile**: For internal testing APKs
- **Production profile**: For Play Store app bundles
- **Updates URL**: Points to Expo's update service

## Troubleshooting

### Blank Screen on Startup
- Clear app cache: `npm start -- --clear`
- Restart Expo: Kill and restart dev server

### Video Won't Play
- Check API_URL is correct in app settings
- Verify backend is running
- Try alternate source (if available)

### Build Fails
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules && npm install`
- Check EAS credentials: `eas login`

### OTA Update Not Applied
- Force app update check: `eas update --branch production`
- Restart app completely
- Updates check on app launch; allow 30 seconds

## File Structure

```
CINEFLOW-RN/
├── App.tsx              # Main app component
├── app.json             # Expo config (name, version, splash, etc.)
├── eas.json             # EAS build/update configuration
├── package.json         # Dependencies & scripts
├── assets/              # App icons & splash screens
├── index.ts             # Entry point
└── SETUP.md             # This file
```

## Deployment Checklist

- [ ] Update `version` in `app.json`
- [ ] Update `version` in `package.json`
- [ ] Test on Android & iOS
- [ ] Build APK/AAB: `eas build`
- [ ] Submit to stores: `eas submit`
- [ ] For bug fixes without rebuild, use OTA: `eas update`

## Backend Integration

The app fetches from these API endpoints:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/content?limit=100` | Fetch all movies/series |
| POST | `/api/users/login` | User login |
| POST | `/api/users/signup` | User registration |
| GET | `/api/users/me/library` | Get watchlist + progress |
| PUT | `/api/users/me/watchlist/:id` | Add to watchlist |
| DELETE | `/api/users/me/watchlist/:id` | Remove from watchlist |
| PUT | `/api/users/me/progress` | Save watch progress |

## Support

For issues, check:
1. Expo docs: https://docs.expo.dev
2. React Native docs: https://reactnative.dev
3. EAS Build: https://docs.expo.dev/build/introduction/
4. EAS Updates: https://docs.expo.dev/eas-update/introduction/
