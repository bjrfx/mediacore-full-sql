# File Manager - Quick Start Guide

## Access File Manager

1. Log in as admin
2. Navigate to **Admin Dashboard**
3. Click **File Manager** in the navigation menu

## Upload Files

### Method 1: Button Upload
1. Click **Upload Files** button
2. Select files from your computer
3. Click Open
4. Files upload automatically

### Method 2: Drag & Drop
1. Select files on your computer
2. Drag them into the File Manager window
3. Drop to upload instantly

## Organize Files

### Create Folders
1. Click **New Folder** button
2. Enter folder name
3. Click Create

### Navigate Folders
- Click folder name to open
- Use breadcrumbs at top to go back
- Click **Up** button to go to parent folder

### Move Files
1. Select file(s) with checkbox
2. Use Move option (coming soon)

### Delete Files
1. Select file(s) with checkbox
2. Click **Delete** button
3. Confirm deletion

## Search & Filter

### Search Files
- Type in search box at top
- Results filter in real-time

### Filter by Type
- Use dropdown to select:
  - All Types
  - Videos
  - Audio
  - Subtitles
  - Images
  - HLS

### Change View
- **Grid View:** See thumbnails and icons
- **List View:** See detailed file information

## Add Tracks to Albums

### From File Manager

1. Go to **Artists** → Select artist
2. Click **Add Tracks** on an album
3. Switch to **"From File Manager"** tab
4. Click **Browse Files**
5. Select audio/video files (hold Ctrl/Cmd for multiple)
6. Click **Select**
7. **Optional:** For each file:
   - Click **"Select subtitle"** → choose SRT/VTT file
   - Click **"Select thumbnail"** → choose image
8. Click **"Create & Add to Album"**

### From Existing Media

1. Go to **Artists** → Select artist
2. Click **Add Tracks** on an album
3. Stay on **"Existing Media"** tab
4. Select track(s) from the list
5. Click **"Add to Album"**

## Tips & Best Practices

### Organizing Files
- Create folders by artist or album name
- Keep audio and video in separate folders
- Store all subtitles in `/subtitles/` folder
- Store all thumbnails in `/thumbnails/` folder

### File Naming
- Use descriptive names: `Artist - Song Title.mp3`
- Avoid special characters: `/ \ : * ? " < > |`
- Be consistent with naming convention

### Subtitles
- Supported formats: `.srt`, `.vtt`, `.txt`
- Name subtitles similar to media files for easy matching
- Use language codes: `Song - English.srt`, `Song - Spanish.srt`

### Thumbnails
- Supported formats: `.jpg`, `.png`, `.webp`, `.gif`
- Recommended size: 1920x1080 for video, 1000x1000 for audio
- Keep file size under 500KB for fast loading

### Performance
- Upload in batches of 10-20 files for best performance
- Large files (>500MB) may take several minutes
- Use grid view for browsing, list view for details

## Troubleshooting

### Upload Failed
- Check file format is supported
- Ensure file size is under 2GB
- Verify stable internet connection

### File Not Found
- Refresh the page
- Check you're in the correct folder
- Use search to locate file

### Can't Delete File
- Ensure you have admin permissions
- Check if file is currently being used
- Try refreshing the page

## Keyboard Shortcuts

- **Ctrl/Cmd + Click:** Select multiple files
- **Ctrl/Cmd + A:** Select all (coming soon)
- **Delete:** Delete selected files (coming soon)
- **Escape:** Close dialogs

## Support

For issues or questions, contact your administrator or refer to the complete documentation at `docs/FILE_MANAGER_IMPLEMENTATION.md`.
