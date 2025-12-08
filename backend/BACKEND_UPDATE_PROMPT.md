# Backend API Updates for Multi-Language Support

## Overview

This document provides the backend modifications required to support multi-language content in MediaCore. The frontend has been updated to support:

1. **Upload Page**: Multi-language file uploads with language assignment
2. **Player**: Language switching between content variants
3. **Home Page**: Browse by language feature

Your backend API needs the following updates to support these features.

---

## Database Schema Changes

### 1. Add Language Fields to Media Table/Collection

```sql
-- For SQL databases (MySQL/PostgreSQL)
ALTER TABLE media ADD COLUMN language VARCHAR(10) DEFAULT 'en';
ALTER TABLE media ADD COLUMN content_group_id VARCHAR(100) NULL;
CREATE INDEX idx_media_language ON media(language);
CREATE INDEX idx_media_content_group ON media(content_group_id);
```

```javascript
// For Firestore/MongoDB - Add these fields to media documents
{
  // ... existing fields
  language: "en",           // Language code (e.g., "en", "hi", "te", "ta")
  contentGroupId: null,     // Groups different language versions of same content
}
```

### 2. Create Languages Reference Table 

```sql
CREATE TABLE languages (
  code VARCHAR(10) PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  native_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert common languages
INSERT INTO languages (code, name, native_name) VALUES
('en', 'English', 'English'),
('hi', 'Hindi', 'हिन्दी'),
('te', 'Telugu', 'తెలుగు'),
('ta', 'Tamil', 'தமிழ்'),
('kn', 'Kannada', 'ಕನ್ನಡ'),
('ml', 'Malayalam', 'മലയാളം'),
('mr', 'Marathi', 'मराठी'),
('bn', 'Bengali', 'বাংলা'),
('gu', 'Gujarati', 'ગુજરાતી'),
('pa', 'Punjabi', 'ਪੰਜਾਬੀ'),
('ur', 'Urdu', 'اردو'),
('es', 'Spanish', 'Español'),
('fr', 'French', 'Français'),
('de', 'German', 'Deutsch'),
('ja', 'Japanese', '日本語'),
('ko', 'Korean', '한국어'),
('zh', 'Chinese', '中文'),
('ar', 'Arabic', 'العربية'),
('pt', 'Portuguese', 'Português'),
('ru', 'Russian', 'Русский');
```

---

## API Endpoint Changes

### 1. Update POST /admin/media (Upload Media)

**Add new form fields:**
- `language` (string, optional, default: "en") - Language code for the media
- `contentGroupId` (string, optional) - Group ID to link language variants together

**Request Body (multipart/form-data):**
```
file: <media file>
title: "Content Title"
subtitle: "Description"
type: "video" | "audio"
language: "en"                                    // NEW
contentGroupId: "cg_1234567890_abcdef123"        // NEW (optional)
artistId: "artist123"
albumId: "album456"
```

**Backend Logic:**
```javascript
// In your upload handler
const uploadMedia = async (req, res) => {
  const {
    title,
    subtitle,
    type,
    language = 'en',       // NEW - default to English
    contentGroupId,        // NEW - optional
    artistId,
    albumId
  } = req.body;
  
  // Generate contentGroupId if not provided and this is a new content
  const finalContentGroupId = contentGroupId || `cg_${Date.now()}_${generateRandomId()}`;
  
  // Create media document with new fields
  const mediaDoc = {
    title,
    subtitle,
    type,
    language,              // NEW
    contentGroupId: finalContentGroupId,  // NEW
    artistId,
    albumId,
    fileUrl: uploadedFileUrl,
    // ... other fields
  };
  
  // Save to database
  const result = await db.collection('media').add(mediaDoc);
  
  return res.json({
    success: true,
    data: {
      id: result.id,
      ...mediaDoc
    }
  });
};
```

---

### 2. NEW: GET /api/media/languages/:contentGroupId

**Purpose:** Fetch all language variants for a specific content group (used by player for language switching)

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "media123",
      "title": "Sample Video",
      "language": "en",
      "fileUrl": "https://...",
      "type": "video"
    },
    {
      "id": "media124",
      "title": "Sample Video",
      "language": "hi",
      "fileUrl": "https://...",
      "type": "video"
    },
    {
      "id": "media125",
      "title": "Sample Video",
      "language": "te",
      "fileUrl": "https://...",
      "type": "video"
    }
  ]
}
```

**Backend Implementation:**
```javascript
// Route: GET /api/media/languages/:contentGroupId
const getLanguageVariants = async (req, res) => {
  const { contentGroupId } = req.params;
  
  if (!contentGroupId) {
    return res.status(400).json({ success: false, message: 'Content group ID required' });
  }
  
  // Query media with matching contentGroupId
  const snapshot = await db.collection('media')
    .where('contentGroupId', '==', contentGroupId)
    .get();
  
  const variants = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  return res.json({
    success: true,
    count: variants.length,
    data: variants
  });
};
```

---

### 3. NEW: GET /api/languages

**Purpose:** Get list of available languages (with content counts)

**Response:**
```json
{
  "success": true,
  "data": [
    { "code": "en", "name": "English", "nativeName": "English", "count": 45 },
    { "code": "hi", "name": "Hindi", "nativeName": "हिन्दी", "count": 32 },
    { "code": "te", "name": "Telugu", "nativeName": "తెలుగు", "count": 18 }
  ]
}
```

**Backend Implementation:**
```javascript
// Route: GET /api/languages
const getAvailableLanguages = async (req, res) => {
  // Get all unique languages with counts
  const snapshot = await db.collection('media').get();
  
  const languageCounts = {};
  snapshot.docs.forEach(doc => {
    const lang = doc.data().language || 'en';
    languageCounts[lang] = (languageCounts[lang] || 0) + 1;
  });
  
  // Map to language info
  const LANGUAGE_INFO = {
    en: { name: 'English', nativeName: 'English' },
    hi: { name: 'Hindi', nativeName: 'हिन्दी' },
    te: { name: 'Telugu', nativeName: 'తెలుగు' },
    ta: { name: 'Tamil', nativeName: 'தமிழ்' },
    kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
    ml: { name: 'Malayalam', nativeName: 'മലയാളം' },
    // ... add more languages
  };
  
  const languages = Object.entries(languageCounts)
    .map(([code, count]) => ({
      code,
      name: LANGUAGE_INFO[code]?.name || code,
      nativeName: LANGUAGE_INFO[code]?.nativeName || code,
      count
    }))
    .sort((a, b) => b.count - a.count);
  
  return res.json({
    success: true,
    data: languages
  });
};
```

---

### 4. Update GET /api/feed (Media List)

**Add optional language filter:**

**Query Parameters:**
- `language` (string, optional) - Filter by language code

**Example Request:**
```
GET /api/feed?language=hi&type=video&limit=20
```

**Backend Update:**
```javascript
const getMediaFeed = async (req, res) => {
  const { type, limit = 50, orderBy = 'createdAt', order = 'desc', language } = req.query;
  
  let query = db.collection('media');
  
  if (type) {
    query = query.where('type', '==', type);
  }
  
  // NEW: Filter by language
  if (language) {
    query = query.where('language', '==', language);
  }
  
  query = query.orderBy(orderBy, order).limit(parseInt(limit));
  
  const snapshot = await query.get();
  const media = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return res.json({
    success: true,
    count: media.length,
    data: media
  });
};
```

---

### 5. Update GET /api/media/:id

**Include language variants in response:**

```json
{
  "success": true,
  "data": {
    "id": "media123",
    "title": "Sample Video",
    "type": "video",
    "language": "en",
    "contentGroupId": "cg_1234567890_abc",
    "fileUrl": "https://...",
    "availableLanguages": ["en", "hi", "te"]  // NEW
  }
}
```

**Backend Update:**
```javascript
const getMediaById = async (req, res) => {
  const { id } = req.params;
  
  const doc = await db.collection('media').doc(id).get();
  if (!doc.exists) {
    return res.status(404).json({ success: false, message: 'Media not found' });
  }
  
  const mediaData = { id: doc.id, ...doc.data() };
  
  // NEW: Get available languages if part of a content group
  if (mediaData.contentGroupId) {
    const variants = await db.collection('media')
      .where('contentGroupId', '==', mediaData.contentGroupId)
      .get();
    
    mediaData.availableLanguages = variants.docs.map(v => v.data().language || 'en');
  } else {
    mediaData.availableLanguages = [mediaData.language || 'en'];
  }
  
  return res.json({ success: true, data: mediaData });
};
```

---

## Route Registration

Add these new routes to your Express router:

```javascript
// Public routes (with API key)
router.get('/api/languages', validateApiKey, getAvailableLanguages);
router.get('/api/media/languages/:contentGroupId', validateApiKey, getLanguageVariants);

// Update existing route
router.get('/api/feed', validateApiKey, getMediaFeed);  // Updated with language filter
router.get('/api/media/:id', validateApiKey, getMediaById);  // Updated with availableLanguages

// Admin route update
router.post('/admin/media', validateAuth, uploadMiddleware, uploadMedia);  // Updated with language fields
```

---

## Migration Script (for existing data)

Run this migration to add default language to existing media:

```javascript
// Migration: Add default language to existing media
const migrateMediaLanguage = async () => {
  const snapshot = await db.collection('media').get();
  
  const batch = db.batch();
  let updateCount = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (!data.language) {
      batch.update(doc.ref, { 
        language: 'en',  // Default to English
        contentGroupId: `cg_${doc.id}`  // Use media ID as initial content group
      });
      updateCount++;
    }
  });
  
  if (updateCount > 0) {
    await batch.commit();
    console.log(`Updated ${updateCount} media documents with default language`);
  }
};

migrateMediaLanguage();
```

---

## Testing Checklist

After implementing these changes, verify:

1. ✅ Upload media with language parameter works
2. ✅ Upload multiple language versions with same contentGroupId works
3. ✅ GET /api/feed returns language field in response
4. ✅ GET /api/feed?language=hi filters by language correctly
5. ✅ GET /api/languages returns language list with counts
6. ✅ GET /api/media/languages/:contentGroupId returns all variants
7. ✅ GET /api/media/:id includes availableLanguages array

---

## Frontend API Calls Reference

The frontend will make these API calls:

```javascript
// Upload with language
POST /admin/media
FormData: { file, title, subtitle, type, language, contentGroupId }

// Get media feed (optionally filtered by language)
GET /api/feed?language=te&type=video&limit=50

// Get available languages
GET /api/languages

// Get language variants for current playing content
GET /api/media/languages/cg_1234567890_abc
```

---

## Summary of Changes

| Endpoint | Change Type | Description |
|----------|-------------|-------------|
| POST /admin/media | UPDATE | Add `language` and `contentGroupId` fields |
| GET /api/feed | UPDATE | Add `language` query parameter filter |
| GET /api/media/:id | UPDATE | Include `availableLanguages` in response |
| GET /api/languages | NEW | List available languages with counts |
| GET /api/media/languages/:groupId | NEW | Get all language variants for content |

---

**Note:** After implementing these changes, redeploy your backend API and the frontend features will work automatically.
