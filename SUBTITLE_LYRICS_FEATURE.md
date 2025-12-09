# Subtitle/Lyrics Feature - Complete Integration

## Overview

This implementation adds automatic subtitle generation and Spotify-like lyrics display to MediaCore. The system works entirely within the existing Node.js backend without requiring Python/Vosk.

## What's Included

### Backend Components

#### 1. Transcription Service (`/backend/services/transcriptionService.js`)
- Uses FFmpeg for audio analysis (silence detection)
- Generates timed subtitle segments based on audio patterns
- Outputs SRT, VTT, and JSON formats
- Supports importing existing SRT/VTT files
- Line-by-line editing capability

#### 2. Subtitle Routes (`/backend/routes/subtitles.js`)
- `GET /api/subtitles/:mediaId` - Get subtitles (json/srt/vtt)
- `GET /api/subtitles/:mediaId/status` - Check generation status
- `POST /api/subtitles/:mediaId/process` - Trigger processing (admin)
- `POST /api/subtitles/:mediaId/import` - Import SRT/VTT file (admin)
- `PUT /api/subtitles/:mediaId/line/:index` - Edit specific line (admin)
- `DELETE /api/subtitles/:mediaId` - Delete subtitles (admin)
- `GET /api/subtitles/admin/pending` - List media without subtitles
- `POST /api/subtitles/admin/batch-process` - Process multiple files

### Frontend Components

#### 1. Admin Subtitle Management (`/frontend/src/pages/admin/AdminSubtitles.jsx`)
- View pending media (no subtitles)
- Process individual or batch files
- Import existing SRT/VTT files
- Edit subtitle lines inline
- Delete subtitles
- Real-time status polling

#### 2. Lyrics Display Component (`/frontend/src/components/player/LyricsDisplay.jsx`)
- Spotify-like synced lyrics
- Word-by-word highlighting (green gradient fill)
- Smooth auto-scroll to active line
- Minimized/expanded modes
- User scroll detection (pauses auto-scroll)
- Now playing indicator animation

#### 3. Player Integration (`/frontend/src/pages/MediaPlayer.jsx`)
- "Show Lyrics" button for audio content
- Animated lyrics panel
- Connected to player progress updates

## Database Schema

Run this SQL in phpMyAdmin:

```sql
ALTER TABLE media 
ADD COLUMN has_subtitles TINYINT(1) DEFAULT 0,
ADD COLUMN subtitle_id VARCHAR(36) DEFAULT NULL,
ADD COLUMN subtitle_status VARCHAR(20) DEFAULT NULL;
```

## File Storage

Subtitles are stored in `/backend/public/subtitles/`:
- `{mediaId}.srt` - SubRip format
- `{mediaId}.vtt` - WebVTT format
- `{mediaId}.json` - JSON with timed words for Spotify-style display

## How It Works

### Processing Flow
1. Admin goes to `/admin/subtitles`
2. Selects media to process (or batch process)
3. Backend uses FFmpeg to detect silence/speech patterns
4. Generates placeholder segments with timestamps
5. Admin can edit text for each segment
6. Subtitles saved in multiple formats

### Playback Flow
1. User plays audio track
2. Clicks "Show Lyrics" button
3. LyricsDisplay component fetches JSON subtitles
4. As audio plays, active line is highlighted
5. Auto-scrolls to keep active line centered
6. Word-by-word highlighting shows progress

## JSON Subtitle Format

```json
[
  {
    "startTime": 0.0,
    "endTime": 4.5,
    "text": "This is the first line",
    "words": [
      { "word": "This", "startTime": 0.0, "endTime": 0.9 },
      { "word": "is", "startTime": 0.9, "endTime": 1.3 },
      ...
    ]
  },
  ...
]
```

## Requirements

- FFmpeg installed on server (for audio analysis)
  - On shared hosting: Use static FFmpeg binary
  - Download: https://johnvansickle.com/ffmpeg/

## Admin Navigation

New "Subtitles" tab added to admin navigation between "Upload" and "Users".

## Usage Guide

### Generate Subtitles
1. Go to Admin → Subtitles
2. Find media in "Pending" tab
3. Click "Process" to generate
4. Wait for processing to complete
5. Switch to "Completed" tab
6. Click "Edit" to add actual lyrics text

### Import Existing Subtitles
1. Go to Admin → Subtitles
2. Find media in "Pending" tab
3. Click "Import"
4. Upload .srt or .vtt file
5. Subtitles are parsed and stored

### Edit Subtitles
1. Go to Admin → Subtitles → Completed
2. Click "Edit" on any media
3. Click edit icon on any line
4. Update text and save
5. All formats (SRT/VTT/JSON) are regenerated

## Future Enhancements

- Real STT integration (Whisper API, AssemblyAI)
- Multi-language support
- LRC format for music
- Karaoke-style highlighting
- Seek to line on click
