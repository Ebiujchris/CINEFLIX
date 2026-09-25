# CINEFLIX Mobile App

A React Native mobile app that brings the CINEFLIX streaming experience to iOS and Android devices. Features include browsing movies and TV series, authentication, watchlist management, video playback, and over-the-air (OTA) updates.

## ✨ Features

### Core
- **Browse Content**: Movies, TV Series, and Asian Drama collections
- **Genre Filtering**: Filter movies and series by genre
- **Search**: Real-time search across titles, genres, and cast
- **My List**: Save favorite titles to a personal watchlist
- **Continue Watching**: Resume where you left off

### Playback
- **Native Video**: Direct playback with full controls
- **YouTube/Vimeo**: Embedded iframe playback
- **Multiple Sources**: Fallback to alternate sources if primary fails
- **Source Switching**: Switch between available playback sources

### User Experience
- **Authentication**: Email/password signup and login
- **Persistent Sessions**: Stay logged in across app restarts
- **Dark Theme**: Beautiful dark UI matching Netflix design
- **Responsive Layout**: Optimized for all screen sizes
- **Offline Support**: Cached content and local progress tracking

### Deployment
- **OTA Updates**: Push updates without app store review
- **Automatic Checks**: App checks for updates on launch
- **Seamless**: Users get updates within 30 seconds
- **Zero Downtime**: No interruption for existing users

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Expo CLI: `npm install -g expo-cli`
- Android SDK or Xcode (for native builds)
- Expo account (free at expo.dev)

### Setup & Development

1. **Install dependencies:**
   ```bash
   cd CINEFLOW-RN
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Run on device:**
   ```bash
   # Android
   npm run android
   
   # iOS
   npm run ios
   
   # Web (testing)
   npm run web
   ```

## 🏗️ Architecture

### Tech Stack
- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Styling**: React Native StyleSheet
- **Video**: expo-video + React Native WebView
- **Auth**: JWT with secure storage
- **State**: React hooks (useState, useMemo)
- **Updates**: EAS Updates (Expo)

### API Integration
- **Base URL**: `https://cineflix-be.vercel.app` (configurable)
- **Authentication**: JWT Bearer tokens
- **Endpoints**: RESTful API matching web backend

### Key Components
- **App.tsx**: Main component with navigation and state management
- **PlaybackModal**: Video player with multi-source support
- **AuthSheet**: Login/signup modal
- **DetailScreen**: Full content details with episode selection

## 📱 Usage

### Homepage
- **Hero Banner**: Featured content
- **Continue Watching**: Recently played items
- **Discover**: Popular content recommendations

### Browse Pages
- **Movies**: All movies with genre filtering
- **Series**: All TV series with episode lists
- **My List**: Personal watchlist
- **Search**: Global content search

### Playback
- Press play on any item to start watching
- Use player controls for play/pause/seek
- Switch sources if needed
- Full screen support

### Account
- Tap profile icon to sign in/up
- Save titles to your list (requires login)
- View account details
- Sign out

## 🔄 OTA Updates (Over-the-Air)

After the app is released, update users without reinstalling:

### For Bug Fixes
```bash
# Fix the bug in App.tsx
# Test locally: npm start

# Push update to production
npm run update

# All users get it within 30 seconds (no Play Store needed!)
```

### For Major Changes
```bash
# Update dependencies
npm install

# Rebuild required
npm run build:prod
npm run submit:apk
```

### Update Branches
- **preview**: Internal testing
- **staging**: Team QA
- **production**: Live for all users

See `DEPLOYMENT.md` for full details.

## 📦 Building for Release

### Android APK (Testing)
```bash
npm run build:apk
```

### Android App Bundle (Play Store)
```bash
npm run build:prod
npm run submit:apk
```

### iOS
```bash
eas build --platform ios --profile production
```

## 🔧 Configuration

### Environment Variables
```bash
# .env or .env.production
EXPO_PUBLIC_API_URL=https://cineflix-be.vercel.app
```

### App Settings
Edit `app.json`:
- `version`: App version (bumped for releases)
- `scheme`: Deep link scheme
- `android.package`: Android app ID
- `ios.bundleIdentifier`: iOS app ID

### EAS Configuration
Edit `eas.json`:
- Build profiles (preview, production)
- Update channels
- Environment variables

## 🎯 Features by Section

### Home Tab
✅ Featured hero with content details  
✅ Continue Watching section  
✅ Popular content grid  
✅ Genre filtering (when enabled)  

### Movies Tab
✅ All movies grid  
✅ Genre filtering  
✅ Search within category  
✅ Tap for full details  

### Series Tab
✅ All series grid  
✅ Genre filtering  
✅ Season/episode selection  
✅ Episode details and playback  

### My List Tab
✅ Saved titles only  
✅ Search within list  
✅ Quick access to watchlist  

### Search
✅ Real-time matching  
✅ Across titles, genres, cast  
✅ Global or tab-specific  

### Player
✅ Native playback  
✅ Embedded YouTube/Vimeo  
✅ Multi-source fallback  
✅ Fullscreen support  
✅ Source switching  

## 🐛 Troubleshooting

### Blank Screen
```bash
npm start -- --clear
```

### Video Won't Play
- Check API URL in app.json
- Try alternate source (if available)
- Verify backend is accessible

### Build Fails
```bash
npm cache clean --force
rm -rf node_modules
npm install
```

### Update Not Applying
- Restart app completely
- Check internet connection
- Updates check on launch, takes ~30s

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev)
- [React Native Docs](https://reactnative.dev)
- [EAS Updates](https://docs.expo.dev/eas-update/introduction/)
- [EAS Build](https://docs.expo.dev/build/introduction/)

## 📄 Additional Docs

- **SETUP.md** - Detailed setup and configuration
- **DEPLOYMENT.md** - Building, releasing, and OTA updates
- **scripts/check-updates.ts** - Manual update checker utility

## 📞 Support

### Common Issues
1. **Updates not working**: Restart app, check internet
2. **Video playback fails**: Try alternate source
3. **Login fails**: Check API URL and backend status
4. **Build errors**: Clear cache and reinstall

### Debug Mode
```bash
# Enable dev menu
npm start

# Then press:
# Android: shake device or press 'd' in terminal
# iOS: shake device or press 'cmd+d' in simulator
```

## 📋 Version History

### v1.0.0
- ✅ Initial release
- ✅ Core browsing features
- ✅ Authentication
- ✅ Video playback
- ✅ OTA updates support

## 📝 License

Proprietary - CINEFLIX

## 👨‍💼 Author

Built with React Native and Expo  
Maintained by: CINEFLIX Team

---

**Ready to get started?** See `SETUP.md` for detailed setup instructions.
