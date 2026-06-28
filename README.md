# Sorted Spotify

## Overview

Sorted Spotify is a Next.js web app built as a university final project. It connects to a user's Spotify account and provides a focused dashboard for viewing listening activity, exploring top artists/tracks/albums, and managing Spotify playlists with practical organisation tools.

The project is no longer deployed, but the source code is retained for reference and future redeployment.

## Problem / Purpose

Spotify playlists can become difficult to maintain once they contain many tracks, duplicates, unavailable items, or inconsistent ordering. This project was built to explore how a full-stack web app can use the Spotify Web API to make playlist data easier to inspect, organise, and safely update.

The goal was to combine authentication, third-party API integration, user-facing data views, and playlist management workflows in one cohesive application.

## Key Features

- Spotify sign-in using OAuth through NextAuth.
- Protected app routes for authenticated users.
- Home dashboard showing the currently playing track and recently played tracks.
- Stats page for top artists, top tracks, and derived top albums across 1 month, 6 month, and 12 month ranges.
- Playlist browser with pagination, search, and name sorting.
- Playlist detail drawer with links back to Spotify.
- Playlist tools for sorting tracks, shuffling tracks, removing duplicates, and removing unavailable items.
- CSV and JSON export for playlist track data.
- Safety checks that avoid rewriting playlists containing local, missing, or unsupported items.
- Task/progress UI for longer playlist operations.
- Settings page showing Spotify profile/session information and sign-out.

## User Flow

1. The user opens the app and lands on the public marketing/login page.
2. If not signed in, the user signs in with Spotify and approves the requested scopes.
3. Authenticated users are redirected into the app dashboard.
4. The app retrieves Spotify data through internal API routes.
5. The user can view recent listening activity, top artists/tracks/albums, and playlists.
6. In the playlist area, the user can search, inspect, export, sort, shuffle, dedupe, or clean supported playlist items.
7. Playlist updates are sent back to Spotify only after the app validates that the selected playlist can be safely rewritten.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- NextAuth.js
- Spotify Web API
- ESLint
- npm

## Spotify Integration

Spotify authentication is handled with NextAuth's Spotify provider. The app requests scopes for profile access, current/recent playback data, top listening data, playlist reading, and playlist modification.

The server-side API routes call the Spotify Web API using the authenticated user's access token. The app includes token refresh handling for expired access tokens and passes refresh failures back to the session so the UI/API can require the user to sign in again.

Playlist modification uses Spotify's playlist item endpoints. The app rewrites supported playlist item URIs in chunks and checks for common failure cases such as missing playlist modification scope, non-owned playlists, collaborative restrictions, local items, and unavailable tracks.

From 20 July 2026, Spotify refresh tokens expire after six months. If this project is redeployed, the authentication flow should handle `invalid_grant` refresh-token errors by clearing stored Spotify tokens and sending the user through Spotify sign-in again.

## Environment Variables

Create a local `.env.local` file using placeholder values from `.env.example`. Do not commit real secrets.

```env
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here
```

A Spotify Developer app is required. For local development, configure the Spotify redirect URI to match the NextAuth callback route:

```txt
http://localhost:3000/api/auth/callback/spotify
```

## Running Locally

```bash
git clone https://github.com/sjkali22/sorted-spotify.git
cd sorted-spotify
npm install
npm run dev
```

Open the app at:

```txt
http://localhost:3000
```

For a production build:

```bash
npm run build
npm run start
```

## Project Structure

```txt
app/                         Main Next.js app routes, pages, styles, and providers
app/(public)/                Public landing and login pages
app/(app)/                   Authenticated home, playlists, stats, and settings pages
app/api/auth/[...nextauth]/  NextAuth Spotify authentication route
app/api/spotify/             Internal API routes that wrap Spotify Web API calls
app/components/              Shared app UI components
app/types/                   NextAuth session type extensions
lib/                         Shared Spotify API helper functions
public/                      Static assets
middleware.ts                Route protection for authenticated app pages
next.config.ts               Next.js configuration, including Spotify image hosts
.env.example                 Placeholder environment variable template
```

## Skills Demonstrated

- Building a full-stack React/Next.js application with the App Router.
- Implementing OAuth authentication with NextAuth and Spotify.
- Working with authenticated third-party API requests and token refresh flows.
- Designing typed API routes and reusable API helper functions.
- Handling paginated Spotify playlist data and rate-limit responses.
- Building interactive playlist management tools with safety checks.
- Using TypeScript for API response modelling and UI state management.
- Creating responsive, data-driven UI views for dashboards and operational tools.
- Managing environment variables without committing secrets.
- Using Git/GitHub for version control and project archiving.

## Project Status

- Completed university final project.
- No longer deployed on Vercel.
- Source code retained on GitHub for reference.
- Can be redeployed in the future with valid Spotify app credentials and environment variables.

## Project Archive Note

This project is no longer deployed on Vercel. The source code is retained in this repository for reference and future redeployment if needed.

Spotify refresh tokens expire after six months from 20 July 2026. If this project is redeployed, the authentication flow should handle `invalid_grant` refresh-token errors by clearing stored Spotify tokens and sending the user through Spotify sign-in again.
