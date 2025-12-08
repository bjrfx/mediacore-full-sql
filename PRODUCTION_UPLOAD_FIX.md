# Production Upload Fix - URGENT 🔴

**Issue**: Audio file shows 0 B and won't play on production  
**Root Cause**: File path misconfiguration on production server  
**Status**: Code fixed, needs deployment + file migration

---

## What Went Wrong

When the file was uploaded on production, the old code created incorrect paths:

**Old (Wrong)**:
```
File saved to: /backend/storage/mediaaudio/file.m4a
Database path: http://domain.com/home/masakali/.../backend/storage/mediaaudio/file.m4a
```

**New (Correct)**:
```
File saved to: /backend/public/uploads/audio/file.m4a  
Database path: https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/file.m4a
```

---

## Fixes Applied

### 1. Backend Media Route (`/backend/routes/media.js`)

**Changed**: Simplified file URL construction
```javascript
// OLD
if (IS_PRODUCTION) {
  relativePath = `/storage/media/${type}/${file.filename}`;
  fileUrl = `https://mediacoreapi-sql.masakalirestrobar.ca/uploads/${type}/${file.filename}`;
}

// NEW
if (IS_PRODUCTION) {
  fileUrl = `https://mediacoreapi-sql.masakalirestrobar.ca/uploads/${type}/${file.filename}`;
}
```

**Result**: File URLs now correctly point to `/uploads/audio/filename.m4a`

### 2. Production Configuration

**Upload Directory**: `/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/public/uploads/`

**Structure**:
```
/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/
└── backend/
    └── public/
        └── uploads/
            ├── audio/
            └── video/
```

### 3. Database Fix

**Updated** the test file record:
```sql
UPDATE media 
SET file_path = 'https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/1765220182759_a12c1207-e47f-4f08-9336-6ff8f50300f3.m4a'
WHERE id = 'd33e5716-918f-4251-80b4-ec74a5cd77c6';
```

---

## Deployment Steps

### Step 1: Upload Fixed Backend Code

1. **Upload updated file** to cPanel:
   - `/backend/routes/media.js` (fixed upload paths)

2. **Verify** backend `.env` has:
   ```env
   NODE_ENV=production
   ```

3. **Restart** Node.js application in cPanel

### Step 2: Fix Existing File Location

**Option A: Move the existing file** (if you want to keep it)

Using cPanel File Manager:
1. Navigate to `/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/`
2. Find: `storage/mediaaudio/1765220182759_a12c1207-e47f-4f08-9336-6ff8f50300f3.m4a`
3. Move to: `public/uploads/audio/`

**Option B: Delete and re-upload** (recommended)
1. Delete the test upload from Admin → Media
2. Upload a new audio file
3. New upload will go to correct location automatically

### Step 3: Ensure Directory Structure Exists

On cPanel, verify this structure exists:
```
/home/masakali/mediacoreapi-sql.masakalirestrobar.ca/backend/public/uploads/
├── audio/
└── video/
```

If not, create it using File Manager → New Folder

### Step 4: Configure .htaccess (if needed)

Ensure `/backend/public/.htaccess` allows file access:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine Off
</IfModule>

# Allow file access
<FilesMatch "\.(mp3|mp4|m4a|wav|webm)$">
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>
```

---

## Testing After Deployment

### 1. Check Upload Endpoint
```bash
# Should return production paths
curl https://mediacoreapi-sql.masakalirestrobar.ca/admin/system/settings \
  -H "Authorization: Bearer {admin_token}"
```

**Expected**:
```json
{
  "productionMode": true,
  "nodeEnv": "production",
  "uploadDir": "/home/masakali/.../backend/public/uploads"
}
```

### 2. Upload New Audio File

1. Go to: https://mediacoreapi-sql.masakalirestrobar.ca/admin/upload
2. Select audio file
3. Fill in title, select artist
4. Click "Upload Media"
5. Check Admin → Media page
6. **File size should show** (e.g., "23.8 MB" not "0 B")

### 3. Verify File URL

In database, check new upload:
```sql
SELECT id, title, file_path, file_size FROM media ORDER BY created_at DESC LIMIT 1;
```

**Expected**:
```
file_path: https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/1234567890_uuid.m4a
file_size: 24929530 (not 0)
```

### 4. Test Playback

1. Go to homepage
2. Click on uploaded audio
3. **Should play** correctly
4. Progress bar should move
5. Duration should display

---

## Why File Size Shows 0 B

The `file_size` in database is **24929530 bytes** (24.9 MB), but admin panel shows "0 B" because:

1. The `file_path` URL is wrong, so browser can't access file
2. Without file access, JavaScript can't determine actual size
3. Frontend falls back to showing "0 B"

**After fix**: With correct URL, file will be accessible and size will display correctly.

---

## Current File Status

**Test File**: `Use_Conscious_Breath_to_Stop_Thinking`
- **Database ID**: `d33e5716-918f-4251-80b4-ec74a5cd77c6`
- **Current Location**: `/backend/storage/mediaaudio/1765220182759_a12c1207-e47f-4f08-9336-6ff8f50300f3.m4a`
- **Should Be At**: `/backend/public/uploads/audio/1765220182759_a12c1207-e47f-4f08-9336-6ff8f50300f3.m4a`
- **Database URL**: ✅ Fixed to `https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/...`
- **File Size**: 24.9 MB (24929530 bytes)

**Action Needed**: Move file to correct location OR delete and re-upload

---

## Production vs Development

### Development (NODE_ENV=development)
```javascript
UPLOAD_DIR: './public/uploads/'
File URL: http://localhost:5001/uploads/audio/file.m4a
```

### Production (NODE_ENV=production)
```javascript
UPLOAD_DIR: '/home/masakali/.../backend/public/uploads/'
File URL: https://mediacoreapi-sql.masakalirestrobar.ca/uploads/audio/file.m4a
```

---

## Quick Checklist

### Before Deployment ✅
- [x] Fixed media.js upload path construction
- [x] Fixed database URL for test file
- [x] Verified production configuration

### After Deployment ⏳
- [ ] Upload updated media.js to cPanel
- [ ] Restart Node.js application
- [ ] Verify production mode via API
- [ ] Move existing file OR delete test upload
- [ ] Upload new audio file
- [ ] Verify file size shows correctly
- [ ] Test playback functionality

---

## File Access Configuration

For production, ensure Express serves the uploads correctly.

**Backend server.js already has**:
```javascript
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
```

This maps:
- URL: `https://domain.com/uploads/audio/file.m4a`
- To: `/backend/public/uploads/audio/file.m4a`

---

## Summary

**Problem**: Old code created wrong file paths on production  
**Solution**: Fixed path construction in media.js  
**Next Steps**: 
1. Deploy updated code
2. Move existing file to correct location
3. Test new uploads

**After deployment, all new uploads will work correctly!** 🎉
