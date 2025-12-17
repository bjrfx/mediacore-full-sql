# File Manager Implementation - Complete Guide

## Overview
A comprehensive file management system for MediaCore admin dashboard with bulk upload capabilities, file organization, and seamless integration with the Artists/Albums workflow.

## Implementation Date
December 18, 2025

## Features Implemented

### 1. Backend File Storage Service
**Location:** `backend/services/fileStorage.js`

- **File Type Detection:** Automatic detection of video, audio, subtitle, image, and HLS files
- **Directory Management:** Recursive file listing, tree structure generation, folder creation
- **File Operations:** Move, delete, search with type filtering
- **Metadata Retrieval:** File size, creation date, public URLs
- **Storage Statistics:** Track total files, size, and breakdown by type
- **HLS Support:** Special handling for HLS video directories

### 2. Backend File Manager API
**Location:** `backend/routes/files.js`

#### Endpoints

##### Browse & Search
- `GET /api/files` - Get directory contents (non-recursive)
  - Query params: `dir` (path), `type` (filter by file type)
  - Returns: Array of files and folders with metadata

- `GET /api/files/tree` - Get complete directory tree structure
  - Returns: Nested folder hierarchy

- `GET /api/files/search` - Search files by name
  - Query params: `q` (search query), `type` (optional filter)
  - Returns: Matching files with public URLs

- `GET /api/files/hls` - Get all HLS directories
  - Returns: HLS media with playlist URLs

- `GET /api/files/stats` - Get storage statistics
  - Returns: Total files, size, breakdown by type

- `GET /api/files/metadata` - Get file metadata
  - Query params: `path` (file path)
  - Returns: Detailed file information

##### Upload
- `POST /api/files/upload` - Upload multiple files
  - Body: multipart/form-data with `files` array
  - Optional: `targetDir`, `preserveNames`
  - Returns: Array of uploaded files with public URLs

- `POST /api/files/upload-folder` - Upload and extract ZIP folder
  - Body: multipart/form-data with `folder` (zip file)
  - Optional: `targetDir`
  - Returns: Extracted folder contents

##### Management
- `POST /api/files/folder` - Create new folder
  - Body: `name`, `parentDir`
  - Returns: Created folder path

- `PUT /api/files/move` - Move file or folder
  - Body: `sourcePath`, `destPath`
  - Returns: Success status

- `DELETE /api/files` - Delete single file
  - Query params: `path`
  - Returns: Success status

- `DELETE /api/files/batch` - Delete multiple files
  - Body: `paths` (array)
  - Returns: Deleted and failed items

##### Media Creation
- `POST /api/files/create-media` - Create media entries from files
  - Body: `files` (array with path, name, type, subtitlePath, thumbnailPath)
  - Optional: `artistId`, `albumId`, `language`
  - Returns: Created media entries and failures

### 3. Frontend File Manager Page
**Location:** `frontend/src/pages/admin/AdminFileManager.jsx`

#### Features
- **Storage Statistics Dashboard:** Visual overview of total files, size, and type breakdown
- **View Modes:** Grid and list views for file browsing
- **Search & Filter:** Real-time search with type filtering (video, audio, subtitle, image, HLS)
- **Navigation:** Breadcrumb navigation, up button, folder browsing
- **Multi-Select:** Select multiple files with checkboxes (Ctrl/Cmd+click)
- **Drag & Drop Upload:** Drag files from desktop directly into the interface
- **Bulk Operations:**
  - Upload multiple files
  - Delete selected files
  - Create folders
- **File Preview:** Click to view files in new tab
- **Responsive Design:** Works on desktop, tablet, and mobile

#### UI Components
- Stats cards for quick overview
- Toolbar with search, filters, and view switchers
- Breadcrumb navigation
- Selection toolbar with bulk actions
- Drag-and-drop upload zone
- Loading states and empty states

### 4. Reusable File Picker Modal
**Location:** `frontend/src/components/admin/FilePickerModal.jsx`

#### Props
- `open` - Boolean to control modal visibility
- `onOpenChange` - Callback when modal state changes
- `onSelect` - Callback with selected files array
- `multiSelect` - Allow multiple file selection (default: true)
- `allowedTypes` - Array of allowed file types (e.g., ['video', 'audio'])
- `title` - Custom modal title
- `description` - Custom modal description

#### Features
- Browse file manager within modal
- Filter by file type
- Search functionality
- Folder navigation with breadcrumbs
- Multi-select with checkboxes
- Shows file size and type badges
- Responsive design

### 5. Artists Page Integration
**Location:** `frontend/src/pages/admin/AdminArtistDetail.jsx`

#### Enhanced "Add Tracks" Dialog

Now includes **two tabs:**

##### Tab 1: Existing Media
- Select from already uploaded media
- Shows unassigned media for the artist
- Multi-select with checkboxes
- Shows thumbnails, titles, and types

##### Tab 2: From File Manager
- Browse and select files from file manager
- **For each selected file:**
  - Automatically detect type (audio/video/HLS)
  - Optional subtitle selection (SRT, VTT, TXT)
  - Optional thumbnail selection (JPG, PNG, WEBP, GIF)
- Creates media entries automatically
- Assigns to artist and album in one step
- Shows progress with loading states

#### Workflow
1. Navigate to Artist Detail page
2. Click "Add Tracks" button on an album
3. Choose tab:
   - **Existing Media:** Select from already created media
   - **From File Manager:** Select files, optionally assign subtitles/thumbnails
4. Click "Add to Album" or "Create & Add to Album"
5. Files are processed and added to the album

### 6. Navigation Updates

#### Admin Layout
**Location:** `frontend/src/pages/admin/AdminLayout.jsx`

Added "File Manager" navigation item with FolderOpen icon, positioned after "Upload".

#### App Routes
**Location:** `frontend/src/App.jsx`

Added route: `/admin/file-manager` → `AdminFileManager` component

---

## File Structure

```
backend/
├── services/
│   └── fileStorage.js          # File system operations service
├── routes/
│   └── files.js                # File manager API endpoints
└── server.js                   # Route registration

frontend/src/
├── pages/admin/
│   ├── AdminFileManager.jsx    # File manager main page
│   └── AdminArtistDetail.jsx   # Enhanced with file manager integration
├── components/admin/
│   └── FilePickerModal.jsx     # Reusable file picker component
├── App.jsx                     # Route definitions
└── pages/admin/AdminLayout.jsx # Navigation menu
```

---

## Usage Examples

### For Admins: Uploading Bulk Media

1. **Navigate to File Manager**
   - Go to Admin Dashboard → File Manager

2. **Upload Files**
   - Click "Upload Files" button
   - Or drag files directly into the interface
   - Files automatically sorted into audio/video/subtitles/thumbnails folders

3. **Organize Files**
   - Create folders for better organization
   - Move files between folders
   - Delete unwanted files

4. **View Statistics**
   - See total files, storage used
   - Breakdown by type (video, audio, subtitle, image)

### For Admins: Adding Tracks to Albums with File Manager

1. **Navigate to Artist**
   - Admin Dashboard → Artists → Select Artist

2. **Add Album** (if needed)
   - Click "Add Album"
   - Fill in album details

3. **Add Tracks from File Manager**
   - Click "Add Tracks" on an album
   - Switch to "From File Manager" tab
   - Click "Browse Files"
   - Select audio/video files (multi-select supported)
   - For each file (optional):
     - Click "Select subtitle" → Choose SRT/VTT file
     - Click "Select thumbnail" → Choose image file
   - Click "Create & Add to Album"

4. **Result**
   - Media entries created automatically
   - Assigned to artist and album
   - Subtitles and thumbnails linked
   - Ready for playback

### For Admins: Adding Existing Media to Albums

1. **Same steps as above**
2. **Use "Existing Media" tab**
3. **Select from already uploaded media**
4. **Click "Add to Album"**

---

## Technical Details

### Authentication
All file manager endpoints require admin authentication via `checkAdminAuth` middleware.

### File Storage
Files stored in: `backend/public/uploads/`
- `/uploads/video/` - Video files
- `/uploads/audio/` - Audio files
- `/uploads/subtitles/` - Subtitle files (SRT, VTT, TXT)
- `/uploads/thumbnails/` - Thumbnail images
- `/uploads/hls/` - HLS video directories
- `/uploads/temp/` - Temporary files

### Public URLs
Files accessible via: `https://api-domain.com/uploads/path/to/file`

### Database Integration
Media entries created in `media` table with:
- Automatic type detection
- Artist/album assignment
- Subtitle linking via `subtitles` table
- Thumbnail URLs
- HLS playlist support

### Performance Considerations
- Directory listing is cached on frontend with React Query
- File operations are optimized with streaming
- Large uploads supported (up to 2GB per file)
- Bulk operations process files sequentially to avoid overload

---

## Future Enhancements

### Potential Additions
1. **Cloud Storage Integration**
   - Add S3/Google Cloud adapters
   - Pluggable storage backend

2. **Advanced Media Processing**
   - Automatic thumbnail generation from video
   - HLS encoding for uploaded MP4/MP3
   - Audio waveform generation
   - Metadata extraction (duration, bitrate, etc.)

3. **Enhanced Organization**
   - Tags and labels for files
   - Favorites/starred files
   - Recently used files
   - File versioning

4. **Collaboration**
   - File comments
   - Share links with expiration
   - Access logs

5. **Advanced Search**
   - Filter by size, date range
   - Search within file content (metadata)
   - Saved searches

---

## Testing Checklist

### Backend API
- [x] GET /api/files - List directory contents
- [x] GET /api/files/tree - Get directory tree
- [x] GET /api/files/search - Search files
- [x] GET /api/files/stats - Get storage stats
- [x] POST /api/files/upload - Upload files
- [x] POST /api/files/folder - Create folder
- [x] PUT /api/files/move - Move files
- [x] DELETE /api/files - Delete file
- [x] DELETE /api/files/batch - Batch delete
- [x] POST /api/files/create-media - Create media from files

### Frontend File Manager
- [x] Display storage statistics
- [x] Grid and list view modes
- [x] Search and filter files
- [x] Navigate folders with breadcrumbs
- [x] Multi-select files
- [x] Drag and drop upload
- [x] Create new folders
- [x] Delete files
- [x] View file details

### File Picker Modal
- [x] Browse files in modal
- [x] Filter by file type
- [x] Search files
- [x] Navigate folders
- [x] Multi-select files
- [x] Confirm selection

### Artists Integration
- [x] Add tracks tab with "From File Manager" option
- [x] Select files from file manager
- [x] Assign subtitles per file
- [x] Assign thumbnails per file
- [x] Create media entries
- [x] Add to album
- [x] Handle errors gracefully

---

## Known Issues & Limitations

1. **Large File Uploads**
   - Files larger than 2GB may timeout on slow connections
   - Consider chunked uploads for very large files

2. **Browser Compatibility**
   - Drag-and-drop requires modern browser
   - File picker works on all browsers

3. **Mobile Experience**
   - Grid view optimized for desktop
   - List view better for mobile

---

## Support & Troubleshooting

### Common Issues

**Files not showing up after upload**
- Check file permissions in `/backend/public/uploads/`
- Verify file extensions are in allowed list
- Check browser console for errors

**"Failed to create media from files" error**
- Ensure files are audio/video type
- Check database connection
- Verify artist/album IDs exist

**Drag-and-drop not working**
- Ensure browser supports HTML5 drag-and-drop
- Check for browser extensions blocking the feature

---

## Conclusion

The File Manager implementation provides a complete solution for managing media files in MediaCore. With drag-and-drop uploads, bulk operations, and seamless integration with the Artists workflow, admins can efficiently organize and assign media content. The modular design allows for easy extension and customization.
