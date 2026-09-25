# Cineflix Android TV

A lightweight Android TV wrapper for the deployed Cineflix web app.

## Open and build

1. Open this `CINEFLIX-TV` folder in Android Studio.
2. Let Gradle sync and install the Android SDK platform 35 if prompted.
3. Select the `app` configuration.
4. Build an APK with **Build > Build APK(s)**.
5. Install the APK on an Android TV device or emulator.

The app loads:

`https://cineflix-theta-lovat.vercel.app/`

## TV behavior

- Declares a Leanback launcher entry.
- Uses landscape orientation.
- Supports D-pad focus through the web app.
- The TV Back button navigates browser history before exiting.
- Fullscreen HTML video is handled by the Android activity.
- External links are blocked by the WebView navigation policy.

## Release checklist

- Replace the placeholder TV banner/icon with branded 320x180 and launcher artwork if publishing.
- Test remote focus on the target TV model.
- Test external video providers and login CORS on the TV network.
- Sign the release APK/AAB before distribution.
