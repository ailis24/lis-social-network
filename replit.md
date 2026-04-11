# Project Overview

A social media app called "Lis" built with React, Vite, and an Express backend. Users can register/login, post content, follow others, search users, chat, and receive notifications.

## Tech Stack

- **Frontend**: React 18 + Vite (port 5000)
- **Backend**: Express.js (port 3000, in-memory database)
- **Styling**: Tailwind CSS
- **Routing**: React Router DOM v6
- **Icons**: Lucide React
- **Process manager**: concurrently (runs both frontend and backend)

## Project Structure

```
src/
  components/    # Reusable UI components (Avatar, BottomNav, Header, Post)
  context/       # React context (AuthContext)
  pages/         # Route pages (Feed, Login, Register, Profile, CreatePost, Notifications, Search, Chat)
  services/      # API and cloud service integration
  firebase.js    # Firebase initialization
  main.jsx       # App entry point with BrowserRouter
  App.jsx        # Route definitions
server.js        # Express backend API (auth, users, posts stubs)
```

## Configuration

- **Dev server**: Vite on port 5000, host 0.0.0.0, allowedHosts: true
- **API server**: Express on port 3000
- **Vite proxy**: /api → http://localhost:3000

## Running

```bash
npm run dev    # Starts both frontend (5000) and backend (3000) via concurrently
npm run build  # Build frontend to dist/
npm run server # Start only the Express backend
npm run client # Start only the Vite dev server
```

## Storage

- **Primary**: SQLite via `better-sqlite3` — file: `lis_users.db` in project root
- **Persistent**: data survives server restarts (stored on disk)
- **Tables**: `users` with indexes on `username` (case-insensitive) and `phone`
- **YDB**: code is removed; `AQV...` static keys only work for S3, not YDB gRPC. For YDB, a service account authorized key (RSA JSON) is required.

## Deployment

- **Target**: VM (always running)
- **Build**: npm run build
- **Run**: bash -c "npm run server & npx vite preview --port 5000 --host 0.0.0.0"
