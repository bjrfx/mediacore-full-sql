# File Manager HLS Upload & Selection Fix

## Issues Fixed

### 1. **HLS ZIP Auto-Extraction**
**Problem**: When uploading a ZIP file to the HLS folder, it remained as a ZIP file instead of being automatically extracted.

**Solution**: Enhanced the upload handler to detect ZIP files in HLS folders and automatically extract them:
- Detects when `targetDir` contains "hls" and file extension is `.zip`
- Extracts ZIP into a folder named after the file (e.g., `video.zip` → `video/`)
- Deletes the ZIP file after successful extraction
- Returns the extracted folder as an HLS directory

**Files Modified**:
- `backend/routes/files.js` - Modified `/api/files/upload` endpoint (lines 272-356)

**How It Works**:
```javascript
// When uploading "Am I Compromising My Connection.zip" to hls folder:
// 1. Upload received → saved to hls/Am I Compromising My Connection.zip
// 2. ZIP detected → extracted to hls/Am I Compromising My Connection/
// 3. ZIP deleted → only folder remains with .m3u8 and .ts segments
// 4. Response → returns folder as type 'hls', isDirectory: true
```

---

### 2. **HLS Folder Selection in File Picker**
**Problem**: When using the File Picker (in Artist Detail → Add from File Manager), clicking on an HLS folder would navigate into it instead of selecting it for assignment.

**Solution**: Added logic to allow selecting HLS folders when filtering for HLS content:
- HLS folders show a checkbox (like files)
- Clicking selects the folder instead of navigating into it
- Works when `filterType='hls'` or `allowedTypes` includes 'hls'
- Non-HLS folders still navigate normally

**Files Modified**:
- `frontend/src/components/admin/FilePickerModal.jsx` - Modified `toggleFileSelection` (lines 128-152) and checkbox rendering (line 274)

**How It Works**:
```javascript
// canSelectFolder = true when:
// - file.type === 'hls' (folder detected as HLS)
// - filterType === 'hls' (user filtering for HLS)
// - allowedTypes includes 'hls' (parent component allows HLS)

// If canSelectFolder = true:
// - Show checkbox on folder
// - Clicking selects folder (doesn't navigate)
// - Folder can be assigned as media source

// If canSelectFolder = false:
// - No checkbox shown
// - Clicking navigates into folder
```

---

## Testing

### Test HLS ZIP Upload:
1. Navigate to Admin → File Manager → `hls` folder
2. Click "Upload Files"
3. Select a ZIP file containing .m3u8 and .ts segments (e.g., `video.zip`)
4. Upload completes
5. ✅ **Expected**: Folder appears (e.g., `video/`) with contents extracted
6. ❌ **Previously**: `video.zip` remained as a ZIP file

### Test HLS Folder Selection:
1. Navigate to Admin → Artists → Select Artist
2. Go to "From File Manager" tab
3. Click filter dropdown → Select "HLS" type
4. Navigate to `hls` folder
5. ✅ **Expected**: HLS folders show checkbox, clicking selects them
6. ❌ **Previously**: Clicking HLS folders navigated into them

---

## Deployment

### Backend:
- **File**: `backend/routes/files.js`
- **Dependency**: Ensure `unzipper` package is installed (`npm install unzipper`)
- **Restart**: Required after deployment

### Frontend:
- **File**: `frontend/src/components/admin/FilePickerModal.jsx`
- **Build**: Already compiled in latest build
- **Deployment**: Upload new build folder to production

---

## Additional Notes

- ZIP extraction only happens in HLS folder (any path containing "hls")
- If extraction fails, the ZIP file is kept and an error is returned
- HLS folders are identified by:
  - Being in the `hls` directory
  - Containing `.m3u8` playlist files
  - Having type `'hls'` in metadata
- Original filenames are preserved for all uploads (including ZIP names)

---

## Date: December 18, 2025
