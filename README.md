# Cineflix

A responsive streaming homepage for movies and shows, built with React, TypeScript, and Vite.

## Run locally

```bash
npm install
npm run dev
```

The UI currently uses curated demo data because the supplied `CINEFLIX-BE` repository has no committed source or API routes yet.

## Playback integration

Movie records already include the provider shape needed for the backend contract:

- `YOUTUBE` and `VIMEO` render an approved embed URL.
- `DIRECT_HLS` and `DIRECT_MP4` render a permitted playback URL.

When the API is available, replace the local `movies` array in `src/main.tsx` with a request to `GET /movies` and use `GET /movies/:movieId/playback` before starting playback. Keep provider URLs permission-based and prefer signed URLs for protected content.