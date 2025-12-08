# MediaCore Frontend

A production-grade media streaming frontend built with React, TailwindCSS, and ShadCN/UI. Features a Spotify/YouTube Music-inspired dark theme with PWA support.

## Features

### User Features
- 🏠 **Home Feed** - Discover trending and recent media
- 🔍 **Search** - Search with real-time filtering by type
- 📚 **Library** - Personal media library management
- ❤️ **Liked** - Quick access to favorite tracks
- 📜 **History** - View listening/watching history
- 🎵 **Playlists** - Create, edit, and manage playlists
- 🎬 **Video Player** - Full-featured video playback with PiP support
- 🎧 **Mini Player** - Persistent bottom player with queue management
- ⚙️ **Settings** - Theme, playback quality, and account settings

### Admin Features (Restricted to admin email)
- 📊 **Dashboard** - Overview with stats and charts
- 📁 **Media Management** - Upload, edit, delete media
- 🔑 **API Keys** - Generate and manage API keys
- 📈 **Analytics** - Real-time stats and usage reports
- 👥 **Users** - View Firebase authenticated users
- ⚙️ **Settings** - App name, theme color customization

### Technical Features
- 📱 **PWA** - Installable with offline support
- 🔐 **Firebase Auth** - Google sign-in integration
- 🎨 **Dark Theme** - Spotify-inspired design
- ⚡ **Performance** - Lazy loading, code splitting
- 🔄 **Real-time** - React Query for data fetching
- 💾 **State Management** - Zustand for global state

## Tech Stack

- **Framework**: React 18 (Create React App)
- **Styling**: TailwindCSS 3 + ShadCN/UI components
- **State**: Zustand (client), React Query (server)
- **Routing**: React Router v6
- **Auth**: Firebase Authentication
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project with Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mediacore-frontend.git
cd mediacore-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
REACT_APP_API_BASE_URL=https://your-api-url.com
REACT_APP_API_KEY=your-public-api-key

# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-firebase-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Admin Configuration
REACT_APP_ADMIN_EMAIL=admin@example.com
```

5. Start development server:
```bash
npm start
```

### Building for Production

```bash
npm run build
```

The build artifacts will be in the `build/` folder.

## Deployment

### cPanel Deployment

1. Build the project:
```bash
npm run build
```

2. Upload the contents of the `build/` folder to your cPanel's `public_html` directory (or a subdirectory)

3. Create a `.htaccess` file in the deployment directory:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteCond %{REQUEST_FILENAME} !-l
  RewriteRule . /index.html [L]
</IfModule>
```

### Vercel/Netlify Deployment

Simply connect your GitHub repository and deploy. The build settings:
- Build command: `npm run build`
- Output directory: `build`

## Project Structure

```
src/
├── components/
│   ├── auth/          # Login modal, protected routes
│   ├── layout/        # Sidebar, header, mini player
│   ├── media/         # Media card, grid, list
│   ├── player/        # Video player component
│   └── ui/            # ShadCN/UI components
├── config/
│   └── firebase.js    # Firebase configuration
├── lib/
│   └── utils.js       # Utility functions
├── pages/
│   ├── admin/         # Admin dashboard pages
│   └── ...            # User pages
├── services/
│   └── api.js         # API service layer
├── store/
│   ├── authStore.js   # Authentication state
│   ├── playerStore.js # Player state
│   ├── libraryStore.js # Library state
│   └── uiStore.js     # UI state
├── App.jsx            # Main app component
└── index.js           # Entry point
```

## API Integration

This frontend connects to the MediaCore API. See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for endpoint details.

### Public Endpoints (require API key)
- `GET /media` - List all media
- `GET /media/:id` - Get media by ID
- `GET /media/stream/:id` - Stream media

### Admin Endpoints (require Firebase Auth token)
- `POST /admin/media` - Upload media
- `PUT /admin/media/:id` - Update media
- `DELETE /admin/media/:id` - Delete media
- `GET /admin/analytics/*` - Analytics endpoints
- `GET /admin/api-keys` - API key management

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_API_BASE_URL` | Backend API URL | Yes |
| `REACT_APP_API_KEY` | Public API key for requests | Yes |
| `REACT_APP_FIREBASE_*` | Firebase configuration | Yes |
| `REACT_APP_ADMIN_EMAIL` | Admin email for access control | Yes |

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## Support

For issues and feature requests, please use the GitHub issues page.
