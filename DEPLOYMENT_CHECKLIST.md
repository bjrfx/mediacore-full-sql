# DEPLOYMENT CHECKLIST - OG Tags Fix

## Status: ✅ READY TO DEPLOY

All code changes are complete and tested locally. Follow these steps to deploy to production.

---

## 📦 What's Changed

### Backend Changes
- **File**: `/backend/server.js`
- **Change**: Added `/og/:mediaId` endpoint (replaces non-functional middleware)
- **Location**: Lines 920-970
- **What it does**: Serves dynamic OG tags for social media crawlers

### Frontend Changes
- **File**: `/frontend/src/components/media/ShareMenu.jsx`
- **Change**: Updated `getShareUrl()` to point to `/og/{id}` instead of `/listen/{id}`
- **Location**: Line 126
- **What it does**: All share buttons now send traffic to the OG endpoint

### Build
- **Status**: Frontend already built (`npm run build` completed)
- **Folder**: `/frontend/build/` ready for deployment

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Backend
```
1. SSH into production server
2. Navigate to /backend/
3. Replace server.js with updated version
   - Verify `/og/:mediaId` endpoint exists (line 920)
```

### Step 2: Deploy Frontend
```
1. Navigate to /frontend/build/
2. Replace entire build folder with the new one
   - Contains updated ShareMenu logic
```

### Step 3: Restart Services
```
1. Restart Node.js application
   - Via cPanel: Go to Manage Applications → Restart
   - OR: pkill node && start app again
   
2. Restart website
   - Via cPanel: Restart website services
   
3. Wait 2-3 minutes for everything to come online
```

---

## ✅ VERIFICATION

### Test 1: Backend Endpoint Working
```bash
curl "https://app.mediacore.in/og/cef28c40-be83-471b-b630-a4364a61f39e" | grep "og:title"

Expected output:
<meta property="og:title" content="How Do I Set Energetic Boundaries" />
```

### Test 2: With Crawler User-Agent
```bash
curl -A "facebookexternalhit/1.1" "https://app.mediacore.in/og/cef28c40-be83-471b-b630-a4364a61f39e" | head -50

Should show OG tags, NOT React index.html
```

### Test 3: On OrcaScan Validator
1. Go to: https://orcascan.com/tools/open-graph-validator
2. Enter: `https://app.mediacore.in/og/cef28c40-be83-471b-b630-a4364a61f39e`
3. Verify it shows:
   - ✅ og:title = actual media title
   - ✅ og:description = actual description
   - ✅ og:image = actual thumbnail
   - ✅ NO "Missing Open Graph tags" errors

### Test 4: Real-World Share Test
1. Open app at: https://app.mediacore.in
2. Find a media item
3. Click Share button
4. Copy the share link (should be /og/)
5. Send on WhatsApp/Facebook to test account
6. Verify preview shows media title + thumbnail

---

## 🔄 Rollback Plan (If Needed)

If issues occur after deployment:

```bash
# Stop Node application
pkill node

# Restore previous server.js
git checkout backend/server.js

# Restore previous frontend build
rm -rf frontend/build
# Deploy previous build from backup

# Restart
node app.js &
```

---

## 📱 What Users Will See After Deployment

### Before (Current - BROKEN):
When sharing a link on WhatsApp/Facebook:
```
MediaCore
Discover and stream premium audio and video content
[Generic Logo]
```

### After (FIXED - Your Implementation):
When sharing a link on WhatsApp/Facebook:
```
How Do I Set Energetic Boundaries
Kim explains why we need to trust our deeper self...
[Actual Media Thumbnail]
```

---

## ⚠️ Important Notes

1. **Code is local-ready**: All changes verified to work on localhost:5001
2. **Deployment-ready**: No further code changes needed
3. **Production-only issue**: Phusion Passenger hosting requires this approach
4. **Cache clearing**: After deployment, social platforms may take 24-48h to refresh previews

---

## 🆘 Troubleshooting

### If `/og/` endpoint returns React index.html
- ❌ Deployment incomplete
- ✅ Verify server.js was deployed
- ✅ Verify Node.js was restarted
- ✅ Check cPanel for errors

### If ShareMenu doesn't show `/og/` links
- ❌ Frontend build not deployed
- ✅ Verify /frontend/build/ was deployed
- ✅ Clear browser cache (Ctrl+Shift+Del)
- ✅ Hard refresh (Cmd+Shift+R on Mac)

### If OG tags still generic after deployment
- ❌ Caches not refreshed
- ✅ Use Facebook Debugger: https://developers.facebook.com/tools/debug/
- ✅ Click "Scrape Again" to refresh
- ✅ Wait 24-48 hours for Twitter/LinkedIn caches

---

## 📋 Final Checklist Before Deploying

- [ ] server.js updated in /backend/
- [ ] /og/:mediaId endpoint present (line 920)
- [ ] ShareMenu.jsx updated in /frontend/src/
- [ ] npm run build completed
- [ ] /frontend/build/ folder exists and is recent
- [ ] Backup of current deployment ready
- [ ] Test media ID identified for verification
- [ ] cPanel access ready

---

## 🎯 Success Criteria

After deployment, consider it successful when:

✅ `curl https://app.mediacore.in/og/[id]` returns OG tags (not React index.html)
✅ OrcaScan shows media-specific OG tags
✅ WhatsApp/Facebook preview shows actual media title & thumbnail
✅ Share buttons in app work without errors
✅ Regular app functionality unchanged

---

**READY TO DEPLOY** ✅
**NEXT STEP**: Execute deployment steps above
