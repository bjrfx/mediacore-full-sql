# Vosk Speech-to-Text Backend - Task Plan

## Project Overview

Build an offline Speech-to-Text service using **Vosk ASR** that:
- Processes audio/video files uploaded to MediaCore
- Generates **timed line-by-line subtitles** (like Spotify lyrics)
- Stores subtitles in MySQL database
- Deploys on cPanel shared hosting via Python App (Passenger WSGI)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MEDIACORE SYSTEM                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     HTTP POST      ┌──────────────────────────────┐   │
│  │  Node.js     │ ─────────────────▶ │  Python Flask (Vosk STT)     │   │
│  │  Backend     │                    │                              │   │
│  │  (port 5001) │ ◀───────────────── │  /api/transcribe             │   │
│  │              │    JSON Response   │  /api/subtitles/:media_id    │   │
│  └──────────────┘                    └──────────────────────────────┘   │
│         │                                        │                       │
│         │                                        │                       │
│         ▼                                        ▼                       │
│  ┌──────────────┐                    ┌──────────────────────────────┐   │
│  │   MySQL      │◀───────────────────│   Vosk Model                 │   │
│  │  Database    │   Store subtitles  │   (vosk-model-small-en-us)   │   │
│  └──────────────┘                    └──────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Folder Structure

```
vosk-stt/
├── app.py                    # Main Flask application
├── passenger_wsgi.py         # cPanel Passenger WSGI entry point
├── requirements.txt          # Python dependencies
├── config.py                 # Configuration (DB, paths)
├── .env.example              # Environment variables template
├── .htaccess                 # Apache configuration
│
├── models/                   # Database models
│   ├── __init__.py
│   └── database.py           # SQLAlchemy models
│
├── services/                 # Business logic
│   ├── __init__.py
│   ├── audio_processor.py    # FFmpeg audio conversion
│   ├── vosk_transcriber.py   # Vosk ASR transcription
│   └── subtitle_generator.py # SRT/VTT generation
│
├── utils/                    # Utilities
│   ├── __init__.py
│   └── helpers.py            # Helper functions
│
├── uploads/                  # Temporary upload storage
│   └── .gitkeep
│
├── processed/                # Converted WAV files
│   └── .gitkeep
│
├── subtitles/                # Generated .srt/.vtt files
│   └── .gitkeep
│
├── vosk_models/              # Vosk language models
│   └── README.md             # Model download instructions
│
├── static/                   # Static assets (optional admin UI)
│   └── .gitkeep
│
├── templates/                # Jinja2 templates (optional admin UI)
│   └── .gitkeep
│
├── logs/                     # Application logs
│   └── .gitkeep
│
└── DEPLOYMENT.md             # cPanel deployment guide
```

---

## Database Schema

### Table: `media_files`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| filename | VARCHAR(255) | Original filename |
| path | TEXT | File path on server |
| file_type | VARCHAR(20) | audio/video |
| duration | INT | Duration in seconds |
| language | VARCHAR(10) | Detected/specified language |
| created_at | TIMESTAMP | Creation time |
| updated_at | TIMESTAMP | Last update |

### Table: `subtitles`
| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(36) PK | UUID |
| media_id | VARCHAR(36) FK | Reference to media_files |
| subtitle_path | TEXT | Path to .srt/.vtt file |
| format | VARCHAR(10) | srt/vtt |
| text_json | LONGTEXT | JSON array of timed lines |
| word_timings | LONGTEXT | Word-level timestamps (optional) |
| language | VARCHAR(10) | Language code |
| status | VARCHAR(20) | pending/processing/completed/failed |
| error_message | TEXT | Error details if failed |
| created_at | TIMESTAMP | Creation time |

### `text_json` Format (Spotify-style)
```json
{
  "lines": [
    {
      "index": 1,
      "start": 0.0,
      "end": 2.5,
      "text": "Hello, welcome to this audio"
    },
    {
      "index": 2,
      "start": 2.5,
      "end": 5.2,
      "text": "Today we will learn about meditation"
    }
  ],
  "metadata": {
    "total_lines": 50,
    "duration": 245.5,
    "language": "en",
    "model": "vosk-model-small-en-us-0.15"
  }
}
```

---

## API Endpoints

### POST `/api/transcribe`
Process audio/video and generate subtitles.

**Request (multipart/form-data):**
```
file: <audio/video file>
media_id: <UUID from Node.js backend>
language: en (optional, default: en)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "subtitle_id": "uuid",
    "media_id": "uuid",
    "status": "completed",
    "subtitle_path": "/subtitles/uuid.srt",
    "text_json": { ... },
    "duration": 245.5
  }
}
```

### POST `/api/transcribe-url`
Process file from URL (for integration with Node.js backend).

**Request (JSON):**
```json
{
  "file_url": "https://server.com/uploads/audio/file.m4a",
  "media_id": "uuid",
  "language": "en"
}
```

### GET `/api/subtitles/<media_id>`
Get subtitles for a media file.

**Response:**
```json
{
  "success": true,
  "data": {
    "subtitle_id": "uuid",
    "media_id": "uuid",
    "format": "srt",
    "text_json": {
      "lines": [...],
      "metadata": {...}
    },
    "subtitle_url": "/subtitles/uuid.srt"
  }
}
```

### GET `/api/subtitles/<media_id>/file`
Download subtitle file (.srt or .vtt).

**Query params:** `?format=srt` or `?format=vtt`

### GET `/api/status/<job_id>`
Check transcription job status (for async processing).

### GET `/health`
Health check endpoint.

---

## Processing Pipeline

```
1. UPLOAD
   └─▶ Save file to /uploads/

2. CONVERT (FFmpeg)
   └─▶ Extract audio → Convert to WAV (16kHz, mono, 16-bit)
   └─▶ Save to /processed/

3. TRANSCRIBE (Vosk)
   └─▶ Load Vosk model
   └─▶ Process audio in chunks
   └─▶ Get word-level timestamps

4. SEGMENT INTO LINES
   └─▶ Group words into sentences/phrases (3-7 second segments)
   └─▶ Apply natural break detection (punctuation, pauses)
   └─▶ Generate line-by-line timecodes

5. GENERATE SUBTITLES
   └─▶ Create .srt file with proper formatting
   └─▶ Create .vtt file (WebVTT)
   └─▶ Generate JSON structure for frontend

6. STORE IN DATABASE
   └─▶ Insert into subtitles table
   └─▶ Link to media_id

7. CLEANUP
   └─▶ Remove temporary files
   └─▶ Keep only /subtitles/ output

8. RESPOND
   └─▶ Return JSON with subtitle data
```

---

## Tasks Checklist

### Phase 1: Setup & Structure
- [x] Create task.md plan
- [ ] Create folder structure
- [ ] Create requirements.txt
- [ ] Create config.py
- [ ] Create .env.example

### Phase 2: Database
- [ ] Create SQLAlchemy models
- [ ] Create migration script
- [ ] Test database connection

### Phase 3: Core Services
- [ ] Create audio_processor.py (FFmpeg)
- [ ] Create vosk_transcriber.py
- [ ] Create subtitle_generator.py

### Phase 4: Flask API
- [ ] Create app.py with routes
- [ ] Implement /api/transcribe
- [ ] Implement /api/subtitles
- [ ] Add error handling
- [ ] Add logging

### Phase 5: Deployment
- [ ] Create passenger_wsgi.py
- [ ] Create .htaccess
- [ ] Create DEPLOYMENT.md
- [ ] Test locally
- [ ] Deploy to cPanel

### Phase 6: Integration
- [ ] Update Node.js backend to call Python API
- [ ] Update frontend to display synced lyrics
- [ ] End-to-end testing

---

## Vosk Models

### Recommended Models (Download via SSH)

| Language | Model | Size | Accuracy |
|----------|-------|------|----------|
| English (US) | vosk-model-small-en-us-0.15 | 40 MB | Good |
| English (US) | vosk-model-en-us-0.22 | 1.8 GB | Best |
| Hindi | vosk-model-small-hi-0.22 | 42 MB | Good |
| Spanish | vosk-model-small-es-0.42 | 39 MB | Good |

### Download Commands
```bash
cd ~/vosk-stt/vosk_models/

# Small English model (recommended for shared hosting)
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
rm vosk-model-small-en-us-0.15.zip

# Rename for easier access
mv vosk-model-small-en-us-0.15 en-us
```

---

## Dependencies

```
Flask==3.0.0
Flask-CORS==4.0.0
SQLAlchemy==2.0.23
PyMySQL==1.1.0
vosk==0.3.45
python-dotenv==1.0.0
requests==2.31.0
gunicorn==21.2.0
```

### System Dependencies (via SSH or cPanel)
- **ffmpeg**: Required for audio conversion
  - Static binary: https://johnvansickle.com/ffmpeg/

---

## cPanel Deployment Notes

### Application Settings
- **Python version**: 3.13.x
- **Application root**: vosk-stt
- **Application URL**: /stt (or subdomain)
- **Application startup file**: passenger_wsgi.py
- **Application Entry point**: application

### Environment Variables (in .env)
```
FLASK_ENV=production
MYSQL_HOST=localhost
MYSQL_USER=yourusername
MYSQL_PASSWORD=yourpassword
MYSQL_DATABASE=masakali_mediacore
VOSK_MODEL_PATH=./vosk_models/en-us
FFMPEG_PATH=./bin/ffmpeg
SECRET_KEY=your-secret-key
```

---

## Integration with Node.js Backend

After upload in Node.js `/admin/media/upload`:

```javascript
// After file upload succeeds, call Python STT service
const transcribeMedia = async (mediaId, filePath) => {
  try {
    const response = await fetch('https://your-domain.com/stt/api/transcribe-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: `https://your-domain.com${filePath}`,
        media_id: mediaId,
        language: 'en'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Update media record with subtitle info
      await db.query(
        'UPDATE media SET has_subtitles = 1, subtitle_id = ? WHERE id = ?',
        [result.data.subtitle_id, mediaId]
      );
    }
    
    return result;
  } catch (error) {
    console.error('Transcription failed:', error);
    return { success: false, error: error.message };
  }
};
```

---

## Frontend Integration (React Native / Web)

### Spotify-style Lyrics Component
```javascript
const LyricsPlayer = ({ mediaId, currentTime }) => {
  const [lyrics, setLyrics] = useState(null);
  const [activeLine, setActiveLine] = useState(0);
  
  useEffect(() => {
    fetch(`/api/subtitles/${mediaId}`)
      .then(res => res.json())
      .then(data => setLyrics(data.data.text_json.lines));
  }, [mediaId]);
  
  useEffect(() => {
    if (!lyrics) return;
    
    const current = lyrics.findIndex(
      line => currentTime >= line.start && currentTime < line.end
    );
    
    if (current !== -1) setActiveLine(current);
  }, [currentTime, lyrics]);
  
  return (
    <div className="lyrics-container">
      {lyrics?.map((line, i) => (
        <p 
          key={i}
          className={i === activeLine ? 'active' : ''}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
};
```

---

## Timeline

| Day | Task |
|-----|------|
| 1 | Setup structure, requirements, config |
| 1 | Database models & migrations |
| 2 | Audio processor (FFmpeg) |
| 2 | Vosk transcriber service |
| 3 | Subtitle generator (SRT/VTT/JSON) |
| 3 | Flask API routes |
| 4 | Testing & debugging |
| 4 | cPanel deployment |
| 5 | Node.js integration |
| 5 | Frontend lyrics display |

---

## Success Criteria

- [ ] Upload audio → Get timed subtitles in <30 seconds (for 5-min audio)
- [ ] Subtitles sync with audio playback (±0.5 second accuracy)
- [ ] Works on cPanel shared hosting
- [ ] Supports mp3, m4a, wav, mp4
- [ ] Frontend displays Spotify-style synced lyrics
