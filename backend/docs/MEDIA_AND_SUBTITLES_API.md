# MediaCore Backend API — Media Cards & Subtitles

This guide explains how to use your backend API to fetch media cards (title, description, artists) and subtitles (label, file_path/fileUrl, media_id) and how to set up Postman with the correct authentication headers.

## Overview
- Base URL (local): `https://mediacoreapi-sql.masakalirestrobar.ca`
- Core routes are defined in [backend/routes/media.js](backend/routes/media.js), [backend/routes/artists.js](backend/routes/artists.js) and mounted in [backend/server.js](backend/server.js).
- Public API endpoints require an `x-api-key` header. Admin/user-protected endpoints require `Authorization: Bearer <accessToken>`.

## Authentication

### API Key (x-api-key)
- Public data (feed, media details, subtitles) uses `x-api-key` header.
- Generate an API key via the admin endpoint once you have an admin token:
  - `POST /admin/generate-key` → returns `apiKey`.
- List active keys: `GET /admin/api-keys`.
- Permissions are enforced by middleware in [backend/middleware/checkApiKeyPermissions.js](backend/middleware/checkApiKeyPermissions.js).

### Bearer Token (JWT)
- Used for authenticated user endpoints (e.g., `/api/user/*`) and all `/admin/*` endpoints.
- Obtain tokens via login:
  - `POST /auth/login` with `{ "email": "...", "password": "..." }`
  - Response includes `accessToken` and `refreshToken`.
- Admin check is enforced by [backend/middleware/checkAdminAuth.js](backend/middleware/checkAdminAuth.js). JWT utilities live in [backend/auth/jwt.js](backend/auth/jwt.js).

## Media Cards

### List Media (Feed)
- Endpoint: `GET /api/feed`
- Headers: `x-api-key: <your_api_key>`
- Query params:
  - `type` (`audio`|`video`, optional)
  - `language` (e.g., `en`, optional)
  - `limit` (default `50`)
  - `orderBy` (`createdAt`|`updatedAt`|`title`|`duration`)
  - `order` (`asc`|`desc`)
- Returns array of media items with:
  - `id`, `title`, `description`, `artistName`, `artistId`, `type`, `language`, `duration`, `fileUrl`/`filePath`, `thumbnailUrl`, `isHls`, `createdAt`, `updatedAt`.

Example:
```
GET /api/feed?limit=50
Headers: x-api-key: mc_XXXXXXXXXXXXXXXX
```

### Media Details
- Endpoint: `GET /api/media/:id`
- Headers: `x-api-key: <your_api_key>`
- Returns one item with all card fields plus `streamUrl`, `hlsPlaylistUrl`, `availableLanguages`, etc.

## Subtitles

### Get Subtitles for a Media Item
- Endpoint: `GET /api/media/:id/subtitles`
- Headers: `x-api-key: <your_api_key>`
- Returns array of subtitles with:
  - `id`, `mediaId`, `language`, `format`, `label`, `fileUrl` (DB `file_path`), `isDefault`, `createdAt`, `updatedAt`.

### Get Single Subtitle Metadata
- Endpoint: `GET /api/subtitles/:id/content`
- Headers: `x-api-key: <your_api_key>`
- Returns subtitle metadata and `fileUrl` to fetch the actual `.vtt`/`.srt` file.

### Upload/Update/Delete Subtitles (Admin)
- `POST /admin/media/:id/subtitles` — multipart upload (field `subtitle`), body: `language`, `label`, `isDefault`.
- `PUT /admin/subtitles/:id` — update `language`, `label`, `isDefault`.
- `DELETE /admin/subtitles/:id` — delete.
- Headers: `Authorization: Bearer <admin_access_token>`.

## Artists

- List artists: `GET /api/artists` (headers: `x-api-key`).
- Artist by ID: `GET /api/artists/:id` (headers: `x-api-key`).
- Media feed already includes `artistName` and `artistId` for cards.

## Postman Setup

1. Create a collection with variables:
   - `baseUrl` = `https://mediacoreapi-sql.masakalirestrobar.ca/`
   - `apiKey` = `<mc_...>`
   - `accessToken` = `<JWT access token>`
2. Set headers per request:
   - Public endpoints: `x-api-key: {{apiKey}}`
   - Admin/user endpoints: `Authorization: Bearer {{accessToken}}`
3. Example requests:
   - All media: `GET {{baseUrl}}/api/feed?limit=50`
   - Media details: `GET {{baseUrl}}/api/media/123`
   - Subtitles for media: `GET {{baseUrl}}/api/media/123/subtitles`
   - Generate API key (admin): `POST {{baseUrl}}/admin/generate-key` with body `{ "name": "Postman", "accessType": "read_only" }` and `Authorization: Bearer {{accessToken}}`.

## How to Get an Admin Token

1. Ensure an admin user exists. You can create one using the script in [backend/scripts/setup-admin.js](backend/scripts/setup-admin.js) (email `admin@mediacore.com`).
2. Login via `POST /auth/login` with admin credentials.
3. Copy `accessToken` from the response; use in `Authorization: Bearer <token>`.

## Notes
- Local dev port is defined in [backend/app.js](backend/app.js) and defaults to `5001` if not using Passenger.
- Static files (including subtitles) are served under `/uploads/...` via [backend/server.js](backend/server.js).
- API key permissions and usage logging are enforced and tracked; missing/invalid `x-api-key` returns `401`.

---

## Postman AI Agent Prompt

"""
Project: MediaCore API (MySQL) — Backend

Goal: Build a Postman workspace to explore public media feed, media details, subtitles, and admin key generation.

Environment:
- baseUrl: https://mediacoreapi-sql.masakalirestrobar.ca/
- apiKey: <mc_...>
- accessToken: <JWT access token>

Collections & Requests:
1) Public
 - GET {{baseUrl}}/api/feed?limit=50  (Header: x-api-key: {{apiKey}})
 - GET {{baseUrl}}/api/media/:id      (Header: x-api-key: {{apiKey}})
 - GET {{baseUrl}}/api/media/:id/subtitles (Header: x-api-key: {{apiKey}})
 - GET {{baseUrl}}/api/subtitles/:id/content (Header: x-api-key: {{apiKey}})

2) Admin
 - POST {{baseUrl}}/auth/login (Body: email, password)
 - GET  {{baseUrl}}/admin/api-keys (Header: Authorization: Bearer {{accessToken}})
 - POST {{baseUrl}}/admin/generate-key (Body: name, accessType; Header: Authorization: Bearer {{accessToken}})

Headers:
- Public: x-api-key
- Admin/User: Authorization: Bearer

Please create variables, folders, and example requests, and include sample responses for quick testing.
"""
