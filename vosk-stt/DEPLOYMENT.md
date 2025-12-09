# Vosk STT - cPanel Deployment Guide

## Overview

This guide explains how to deploy the Vosk Speech-to-Text backend on cPanel shared hosting using the "Setup Python App" feature.

---

## Prerequisites

- cPanel with "Setup Python App" feature (Passenger WSGI)
- SSH access to your hosting account
- Python 3.11+ (3.13 recommended)
- MySQL database (already configured for MediaCore)

---

## Step 1: Create Python App in cPanel

1. Log into cPanel
2. Go to **"Setup Python App"** (under Software section)
3. Click **"Create Application"**
4. Configure:
   - **Python version**: 3.13.x (or highest available)
   - **Application root**: `vosk-stt`
   - **Application URL**: `/stt` (or your preferred path)
   - **Application startup file**: `passenger_wsgi.py`
   - **Application Entry point**: `application`
   - **Passenger log file**: `logs/passenger.log`

5. Click **"Create"**

---

## Step 2: Upload Files

Upload all files from the `vosk-stt` folder to your hosting:

```
/home/yourusername/vosk-stt/
├── app.py
├── passenger_wsgi.py
├── requirements.txt
├── config.py
├── .env
├── models/
├── services/
├── uploads/
├── processed/
├── subtitles/
├── vosk_models/
└── logs/
```

**Using File Manager or FTP:**
1. Compress vosk-stt folder locally
2. Upload ZIP to home directory
3. Extract via File Manager or SSH

**Using SSH:**
```bash
cd ~
git clone https://github.com/yourusername/mediacore-full-sql.git temp-clone
cp -r temp-clone/vosk-stt ~/vosk-stt
rm -rf temp-clone
```

---

## Step 3: Create Environment File

Create `.env` file in vosk-stt directory:

```bash
cd ~/vosk-stt
nano .env
```

Add your configuration:

```ini
# Flask
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-super-secret-key-generate-random-string

# MySQL (use your cPanel MySQL credentials)
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=yourusername_dbuser
MYSQL_PASSWORD=your-db-password
MYSQL_DATABASE=yourusername_mediacore

# Vosk
VOSK_MODEL_NAME=en-us

# FFmpeg (static binary path)
FFMPEG_PATH=/home/yourusername/vosk-stt/bin/ffmpeg

# Node.js backend URL
NODEJS_BACKEND_URL=https://mediacoreapi-sql.masakalirestrobar.ca

# Optional API key
STT_API_KEY=your-optional-api-key
```

---

## Step 4: Install Dependencies via SSH

1. SSH into your hosting:
```bash
ssh yourusername@yourserver.com
```

2. Activate the virtual environment:
```bash
source ~/virtualenv/vosk-stt/3.13/bin/activate
```

3. Install Python packages:
```bash
cd ~/vosk-stt
pip install --upgrade pip
pip install -r requirements.txt
```

**Note:** If `vosk` fails to install due to missing wheel, try:
```bash
pip install vosk --no-cache-dir
```

---

## Step 5: Install FFmpeg (Static Binary)

cPanel shared hosting typically doesn't have FFmpeg. Download static binary:

```bash
cd ~/vosk-stt
mkdir -p bin
cd bin

# Download FFmpeg static build
wget https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz
tar xf ffmpeg-release-amd64-static.tar.xz
mv ffmpeg-*-amd64-static/ffmpeg ./ffmpeg
mv ffmpeg-*-amd64-static/ffprobe ./ffprobe

# Cleanup
rm -rf ffmpeg-release-amd64-static.tar.xz ffmpeg-*-amd64-static

# Make executable
chmod +x ffmpeg ffprobe

# Test
./ffmpeg -version
```

---

## Step 6: Download Vosk Model

Download the English model (or your preferred language):

```bash
cd ~/vosk-stt/vosk_models

# Small English model (~40 MB) - recommended for shared hosting
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
mv vosk-model-small-en-us-0.15 en-us
rm vosk-model-small-en-us-0.15.zip

# Verify
ls -la en-us/
```

**Other models:**
```bash
# Hindi (small)
wget https://alphacephei.com/vosk/models/vosk-model-small-hi-0.22.zip

# Spanish (small)
wget https://alphacephei.com/vosk/models/vosk-model-small-es-0.42.zip
```

---

## Step 7: Create Required Directories

```bash
cd ~/vosk-stt
mkdir -p uploads processed subtitles logs
chmod 755 uploads processed subtitles logs
```

---

## Step 8: Initialize Database Tables

Run the SQL migration to create tables:

```bash
cd ~/vosk-stt
source ~/virtualenv/vosk-stt/3.13/bin/activate
python -c "from models.database import CREATE_TABLES_SQL; print(CREATE_TABLES_SQL)"
```

Copy the output and run in phpMyAdmin, or:

```bash
mysql -u yourusername_dbuser -p yourusername_mediacore < scripts/create_tables.sql
```

---

## Step 9: Test Locally via SSH

```bash
cd ~/vosk-stt
source ~/virtualenv/vosk-stt/3.13/bin/activate

# Test FFmpeg
./bin/ffmpeg -version

# Test Python app
python app.py
```

Press Ctrl+C to stop.

---

## Step 10: Restart Application

In cPanel > Setup Python App:
1. Find your application
2. Click **"Restart"**

Or via SSH:
```bash
touch ~/vosk-stt/tmp/restart.txt
```

---

## Step 11: Test the API

```bash
# Health check
curl https://yourdomain.com/stt/health

# Status check
curl https://yourdomain.com/stt/api/status

# Test transcription (replace with actual file)
curl -X POST https://yourdomain.com/stt/api/transcribe \
  -F "file=@test-audio.mp3" \
  -F "media_id=test-123"
```

---

## Troubleshooting

### Check Logs

```bash
# Application logs
tail -f ~/vosk-stt/logs/app.log

# Passenger logs
tail -f ~/vosk-stt/logs/passenger.log

# Apache error logs
tail -f ~/logs/yourdomain.com.error.log
```

### Common Issues

**1. "Module not found" errors**
```bash
source ~/virtualenv/vosk-stt/3.13/bin/activate
pip install -r requirements.txt
touch ~/vosk-stt/tmp/restart.txt
```

**2. FFmpeg not found**
- Check path in .env matches actual location
- Verify executable permissions: `chmod +x ~/vosk-stt/bin/ffmpeg`

**3. Vosk model not found**
- Verify model directory: `ls ~/vosk-stt/vosk_models/en-us/`
- Check VOSK_MODEL_NAME in .env

**4. Database connection errors**
- Verify MySQL credentials in .env
- Check database exists in phpMyAdmin
- Ensure user has proper permissions

**5. 500 Internal Server Error**
- Check passenger.log for details
- Verify passenger_wsgi.py Python interpreter path

---

## Directory Structure After Setup

```
/home/yourusername/vosk-stt/
├── app.py
├── passenger_wsgi.py
├── requirements.txt
├── config.py
├── .env                    ← Your config
├── .htaccess
│
├── bin/
│   ├── ffmpeg              ← Static binary
│   └── ffprobe
│
├── models/
│   ├── __init__.py
│   └── database.py
│
├── services/
│   ├── __init__.py
│   ├── audio_processor.py
│   ├── vosk_transcriber.py
│   └── subtitle_generator.py
│
├── uploads/                ← Temp uploads
├── processed/              ← WAV files
├── subtitles/              ← Generated .srt/.vtt
│
├── vosk_models/
│   └── en-us/              ← Vosk model
│       ├── am/
│       ├── conf/
│       ├── graph/
│       └── ...
│
├── logs/
│   ├── app.log
│   └── passenger.log
│
└── tmp/
    └── restart.txt         ← Touch to restart
```

---

## Integration with Node.js Backend

After deployment, update your Node.js backend to call the STT service.

See the integration code in the MediaCore backend documentation.

---

## Performance Notes

- **Shared hosting limitations**: Memory limits may cause issues with large files
- **Processing time**: ~1x real-time on shared hosting (5-minute audio ≈ 5 minutes to process)
- **Recommendation**: Use small Vosk model for shared hosting
- **Large files**: Consider upgrading to VPS for better performance

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| GET | `/api/status` | Detailed status |
| POST | `/api/transcribe` | Upload & transcribe file |
| POST | `/api/transcribe-url` | Transcribe from URL |
| GET | `/api/subtitles/:media_id` | Get subtitles JSON |
| GET | `/api/subtitles/:media_id/file` | Download .srt/.vtt |
| GET | `/subtitles/:filename` | Serve subtitle file |

---

## Security Recommendations

1. **Set STT_API_KEY** in .env and require it for all requests
2. **Restrict CORS** if only used by your backend
3. **Limit file size** via MAX_CONTENT_LENGTH
4. **Regular cleanup** of uploads/processed directories

```bash
# Cron job to cleanup old files (add via cPanel > Cron Jobs)
0 3 * * * find ~/vosk-stt/uploads -type f -mtime +1 -delete
0 3 * * * find ~/vosk-stt/processed -type f -mtime +1 -delete
```
