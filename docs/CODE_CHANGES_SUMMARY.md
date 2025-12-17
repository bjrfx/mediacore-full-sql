# EXACT CODE CHANGES - Copy/Paste Ready

This document shows the EXACT code changes made to fix the OG tags issue.

---

## FILE 1: /backend/server.js

### Location: Lines 920-970 (NEW ENDPOINT)

This is the new `/og/:mediaId` endpoint that serves dynamic OG tags.

**Status**: Already added to your local repository
**Action**: Deploy to production

```javascript
// PUBLIC OG ENDPOINT FOR SOCIAL SHARING
// ========================================
// Serves dynamic Open Graph tags for /listen/:id and /watch/:id
// This endpoint is accessible at /og/:mediaId and accessed via redirects in ShareMenu
app.get('/og/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    const userAgent = req.headers['user-agent'] || '';
    
    console.log(`🔍 OG Request for media: ${mediaId}`);
    console.log(`📱 User-Agent: ${userAgent.substring(0, 100)}`);

    // Fetch media from database
    const [media] = await db.query(
      'SELECT id, title, description, type, file_path, thumbnail_path, artist, duration FROM media WHERE id = ?',
      [mediaId]
    );

    if (!media || (typeof media === 'object' && Object.keys(media).length === 0)) {
      console.log(`❌ Media not found`);
      return res.send(generateGenericOGHTML());
    }

    const mediaData = media;
    const isVideo = mediaData.type === 'video';
    const shareType = isVideo ? 'watch' : 'listen';
    const appDomain = process.env.APP_DOMAIN || process.env.REACT_APP_DOMAIN || 'https://app.mediacore.in';
    
    const pageUrl = `${appDomain}/${shareType}/${mediaData.id}`;
    const title = `${mediaData.title}`;
    const description = mediaData.description || 
      `${isVideo ? 'Watch' : 'Listen to'} "${mediaData.title}"${mediaData.artist ? ` by ${mediaData.artist}` : ''} on MediaCore`;
    
    // Ensure thumbnail is absolute URL
    let image = `${appDomain}/logo512.png`;
    if (mediaData.thumbnail_path) {
      if (mediaData.thumbnail_path.startsWith('http')) {
        image = mediaData.thumbnail_path;
      } else if (mediaData.thumbnail_path.startsWith('/')) {
        image = `${appDomain}${mediaData.thumbnail_path}`;
      } else {
        image = `${appDomain}/${mediaData.thumbnail_path}`;
      }
    }

    console.log(`✅ Serving OG for: "${title}"`);
    console.log(`   Image: ${image}`);

    // Generate HTML with comprehensive OG tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow">
  
  <!-- Essential Open Graph Meta Tags -->
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:type" content="${isVideo ? 'video.other' : 'music.song'}" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:type" content="image/jpeg" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(title)}" />
  <meta property="og:site_name" content="MediaCore" />
  <meta property="og:locale" content="en_US" />
  
  <!-- Twitter Card Meta Tags -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:url" content="${pageUrl}" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(title)}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${pageUrl}" />
  
  <!-- Redirect to actual app -->
  <script>
    if (navigator.userAgent.toLowerCase().match(/(facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|discordbot|skypeuripreview)/)) {
      // This is a crawler - serve the meta tags
    } else {
      // Regular user - redirect to app
      window.location.href = '${pageUrl}';
    }
  </script>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p>Redirecting to MediaCore...</p>
</body>
</html>`;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(html);
  } catch (error) {
    console.error('Error generating OG tags:', error);
    res.send(generateGenericOGHTML());
  }
});
```

### Location: REMOVED (Lines 1055-1180 - Old Middleware)

**Old Code Removed**: 
- `isSocialMediaCrawler()` function
- `serveOGTags()` middleware function
- `app.use(serveOGTags)` call

**Reason**: This middleware doesn't work on Phusion Passenger hosting

---

## FILE 2: /frontend/src/components/media/ShareMenu.jsx

### Location: Lines 126-130 (UPDATED FUNCTION)

**Before**:
```javascript
const getShareUrl = useCallback(() => {
  if (!media) return '';
  const type = media.type === 'video' ? 'watch' : 'listen';
  return `${APP_DOMAIN}/${type}/${media.id}`;
}, [media]);
```

**After** (CURRENT):
```javascript
const getShareUrl = useCallback(() => {
  if (!media) return '';
  // Use /og/:id endpoint which serves dynamic OG tags for crawlers
  // Regular users will be redirected to the actual app URL
  return `${APP_DOMAIN}/og/${media.id}`;
}, [media]);
```

**Change**: Now returns `/og/{id}` instead of `/listen/{id}`

---

## FILE 3: /frontend/build/ (REBUILT)

**Status**: Fresh build generated with `npm run build`
**Contains**: Updated ShareMenu with new `/og/` URLs

---

## VERIFICATION

### Test Endpoint Exists
```bash
# Local test
curl -s http://localhost:5001/og/cef28c40-be83-471b-b630-a4364a61f39e | head -20

# Should show HTML with og:title meta tag
```

### Test with Crawler UA
```bash
# Local test
curl -A "facebookexternalhit/1.1" http://localhost:5001/og/cef28c40-be83-471b-b630-a4364a61f39e | grep "og:title"

# Should show: <meta property="og:title" content="How Do I Set Energetic Boundaries" />
```

### After Production Deployment
```bash
# Production test
curl "https://app.mediacore.in/og/cef28c40-be83-471b-b630-a4364a61f39e" | grep "og:title"

# Should show: <meta property="og:title" content="How Do I Set Energetic Boundaries" />
# (Not: generic MediaCore title)
```

---

## DEPLOYMENT COMMANDS

### Copy to Production

```bash
# Copy backend changes
scp /path/to/backend/server.js user@host:/path/to/backend/

# Copy frontend build
scp -r /path/to/frontend/build user@host:/path/to/frontend/

# On production server
ssh user@host
cd /path/to/backend

# Restart Node
pkill node
node app.js &

# OR via cPanel - restart application
```

---

## SUMMARY OF CHANGES

| File | Lines | Change | Type |
|------|-------|--------|------|
| backend/server.js | 920-970 | Added `/og/:mediaId` endpoint | NEW |
| backend/server.js | 1055-1180 | Removed old middleware | DELETED |
| frontend/src/.../ShareMenu.jsx | 126-130 | Updated getShareUrl() | UPDATED |
| frontend/build/* | All | Rebuilt with new logic | REBUILT |

**Total Changes**: 3 files modified
**Complexity**: Low (1 endpoint + 1 function update)
**Risk**: Very Low (isolated changes, no breaking changes)
**Testing**: Verified locally ✅

---

## WHY THIS WORKS

1. ✅ `/og/` routes not blocked by Passenger static files
2. ✅ Express `/og/:mediaId` matches and is executed
3. ✅ Endpoint fetches from DB (always fresh)
4. ✅ Returns HTML with OG tags (no JavaScript execution needed)
5. ✅ ShareMenu points to `/og/` URLs
6. ✅ Crawlers extract meta tags
7. ✅ Regular users redirected to actual app

---

**All changes verified locally and ready for production deployment.**
