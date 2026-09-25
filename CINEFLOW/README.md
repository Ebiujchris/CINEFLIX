# CineFlow

A Flutter mobile app version of the Cineflix streaming experience.

## Features included
- Dark cinematic home screen
- Movie discovery and search UI
- Details screen
- My List / profile sections
- API-ready structure for backend integration
- Update-ready configuration

## To run locally

1. Install Flutter SDK.
2. Open this folder in VS Code or Android Studio.
3. Run:

```bash
flutter pub get
flutter run
```

## Notes
- The app is structured to mirror the web app flow and uses mocked content for a quick Android-ready prototype.
- Replace `lib/core/config/app_config.dart` with your API domain and backend routes.
- For production distribution, consider GitHub Releases, Firebase App Distribution, or a custom OTA update flow.
