# Mobile Performance Optimization Guide

## Current Issue

Your media files are hosted on **cPanel shared hosting** which has significant limitations:

| Metric | Your Server | Recommended |
|--------|-------------|-------------|
| Time to First Byte | ~560ms | <100ms |
| Download Speed | ~90 KB/s | >1 MB/s |
| 25 MB file download | ~4.5 minutes | ~25 seconds |

## Solutions (In Order of Impact)

### 1. ✅ BEST SOLUTION: Use a CDN for Media Files

**Recommended: Cloudflare (Free tier available)**

1. Add your domain to Cloudflare
2. Enable caching for `/uploads/*` paths
3. Cloudflare will cache media files at edge locations worldwide

**Setup Steps:**
```
1. Sign up at cloudflare.com
2. Add domain: masakalirestrobar.ca
3. Update nameservers at your registrar
4. Create Page Rule:
   - URL: *masakalirestrobar.ca/uploads/*
   - Settings: 
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 month
```

**Alternative CDNs:**
- **BunnyCDN** - Very cheap, great performance (~$1/month for small usage)
- **Cloudinary** - Automatic optimization + transcoding
- **AWS CloudFront** - Scalable but more complex

---

### 2. Compress Audio Files on Upload

Your audio files are **25 MB** for a single track. This is extremely large.

**Target sizes:**
- Audio: 3-5 MB per 3-minute track (128 kbps MP3)
- Video: 20-50 MB per minute (720p)

**Install ffmpeg on server:**
```bash
# On cPanel, request ffmpeg installation from host
# Or use a cloud transcoding service
```

**Auto-compress on upload (add to media upload route):**
```javascript
const { exec } = require('child_process');

// Compress audio to 128kbps after upload
const compressAudio = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    exec(
      `ffmpeg -i "${inputPath}" -b:a 128k -ar 44100 "${outputPath}"`,
      (error, stdout, stderr) => {
        if (error) reject(error);
        else resolve(outputPath);
      }
    );
  });
};
```

---

### 3. Upgrade Hosting (Medium-term)

**Recommended Hosting for Media:**

| Provider | Type | Price | Media Performance |
|----------|------|-------|-------------------|
| DigitalOcean | VPS | $6/mo | Excellent |
| Vultr | VPS | $5/mo | Excellent |
| Linode | VPS | $5/mo | Excellent |
| AWS Lightsail | VPS | $5/mo | Excellent |

**What you get:**
- 10-50x faster file serving
- Range request optimization
- Better CPU for compression
- SSH access for full control

---

### 4. React Native Player Optimization

Until you can implement the above, optimize your React Native app:

```javascript
// Use react-native-track-player with buffering config
import TrackPlayer from 'react-native-track-player';

// Configure for slow connections
await TrackPlayer.setupPlayer({
  minBuffer: 15,      // Seconds to buffer before playing
  maxBuffer: 50,      // Max buffer size
  playBuffer: 2.5,    // Start playing after this many seconds buffered
  backBuffer: 30,     // Keep 30 seconds of played audio
});

// Add track with lower buffer requirements
await TrackPlayer.add({
  id: media.id,
  url: media.fileUrl,
  title: media.title,
  artist: media.artistName,
  artwork: media.thumbnailUrl,
});

// Show loading indicator while buffering
TrackPlayer.addEventListener(Event.PlaybackState, async (state) => {
  if (state.state === State.Buffering) {
    // Show loading spinner
  } else if (state.state === State.Ready) {
    // Hide loading spinner
  }
});
```

---

### 5. Add Quality Selection API

Let users choose quality on slow connections:

**API Endpoint:** `GET /api/media/:id/stream?quality=low`

Quality options:
- `high` - Original file
- `medium` - 192 kbps
- `low` - 96 kbps (for slow connections)

---

## Quick Win: Preload First 30 Seconds

In React Native, preload the beginning of tracks:

```javascript
const preloadTrack = async (mediaUrl) => {
  // Fetch first 500KB (about 30 seconds of 128kbps audio)
  try {
    await fetch(mediaUrl, {
      headers: { 'Range': 'bytes=0-512000' }
    });
    console.log('Track preloaded');
  } catch (e) {
    console.log('Preload failed, will buffer on play');
  }
};

// Preload next track while current is playing
useEffect(() => {
  if (currentIndex < playlist.length - 1) {
    preloadTrack(playlist[currentIndex + 1].fileUrl);
  }
}, [currentIndex]);
```

---

## Summary

| Solution | Effort | Impact | Cost |
|----------|--------|--------|------|
| Cloudflare CDN | Low | High | Free |
| Compress audio files | Medium | High | Free |
| Upgrade hosting | Medium | Very High | $5-20/mo |
| Player optimization | Low | Medium | Free |
| Quality selection | High | Medium | Free |

**Recommended first step:** Set up Cloudflare CDN (free, 1-2 hours to configure).
