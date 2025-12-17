/**
 * File Storage Service
 * Handles file system operations, type detection, and metadata management
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Storage configuration
const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || path.join(__dirname, '../public');
const UPLOAD_DIR = path.join(UPLOAD_BASE_PATH, 'uploads');
const HLS_DIR = path.join(UPLOAD_DIR, 'hls');
const SUBTITLES_DIR = path.join(UPLOAD_DIR, 'subtitles');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');

// File type detection
const FILE_TYPES = {
  video: {
    extensions: ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.mpeg', '.mpg'],
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo', 'video/x-matroska', 'video/mpeg']
  },
  audio: {
    extensions: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'],
    mimeTypes: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/x-m4a', 'audio/m4a', 'audio/mp4', 'audio/aac', 'audio/x-aac', 'audio/ogg', 'audio/flac']
  },
  subtitle: {
    extensions: ['.srt', '.vtt', '.txt'],
    mimeTypes: ['text/plain', 'text/vtt', 'application/x-subrip', 'text/srt']
  },
  hls: {
    extensions: ['.m3u8', '.ts'],
    mimeTypes: ['application/x-mpegURL', 'application/vnd.apple.mpegURL', 'video/MP2T', 'video/mp2t']
  },
  image: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  }
};

class FileStorageService {
  constructor() {
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  ensureDirectories() {
    const dirs = [
      UPLOAD_DIR,
      path.join(UPLOAD_DIR, 'video'),
      path.join(UPLOAD_DIR, 'audio'),
      path.join(UPLOAD_DIR, 'subtitles'),
      path.join(UPLOAD_DIR, 'hls'),
      path.join(UPLOAD_DIR, 'temp'),
      path.join(UPLOAD_DIR, 'thumbnails'),
    ];

    dirs.forEach(dir => {
      if (!fsSync.existsSync(dir)) {
        fsSync.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Detect file type from extension or mime type
   */
  detectFileType(fileName, mimeType = '') {
    const ext = path.extname(fileName).toLowerCase();
    
    for (const [type, config] of Object.entries(FILE_TYPES)) {
      if (config.extensions.includes(ext) || config.mimeTypes.includes(mimeType)) {
        return type;
      }
    }
    
    return 'other';
  }

  /**
   * Get all files recursively from a directory
   */
  async getFilesRecursive(dirPath, basePath = dirPath, result = []) {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);
        
        if (entry.isDirectory()) {
          // Add folder entry
          result.push({
            id: uuidv4(),
            name: entry.name,
            path: relativePath,
            fullPath: fullPath,
            type: 'folder',
            isDirectory: true,
            children: [],
            createdAt: (await fs.stat(fullPath)).birthtime,
            updatedAt: (await fs.stat(fullPath)).mtime,
          });
          
          // Recurse into subdirectory
          await this.getFilesRecursive(fullPath, basePath, result);
        } else {
          const stats = await fs.stat(fullPath);
          const fileType = this.detectFileType(entry.name);
          
          result.push({
            id: uuidv4(),
            name: entry.name,
            path: relativePath,
            fullPath: fullPath,
            type: fileType,
            isDirectory: false,
            size: stats.size,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            extension: path.extname(entry.name),
          });
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error reading directory:', error);
      throw error;
    }
  }

  /**
   * Get directory tree structure
   */
  async getDirectoryTree(dirPath = UPLOAD_DIR, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) return [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const tree = [];
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(UPLOAD_DIR, fullPath);
        const stats = await fs.stat(fullPath);
        
        if (entry.isDirectory()) {
          const children = await this.getDirectoryTree(fullPath, depth + 1, maxDepth);
          tree.push({
            id: relativePath || 'root',
            name: entry.name,
            path: relativePath,
            fullPath: fullPath,
            type: 'folder',
            isDirectory: true,
            children: children,
            size: 0, // Can calculate if needed
            itemCount: children.length,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
          });
        }
      }
      
      return tree;
    } catch (error) {
      console.error('Error getting directory tree:', error);
      throw error;
    }
  }

  /**
   * Get files in a specific directory (non-recursive)
   */
  async getDirectoryContents(dirPath = UPLOAD_DIR) {
    try {
      const resolvedPath = dirPath.startsWith(UPLOAD_DIR) 
        ? dirPath 
        : path.join(UPLOAD_DIR, dirPath);
      
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const contents = [];
      
      for (const entry of entries) {
        const fullPath = path.join(resolvedPath, entry.name);
        const relativePath = path.relative(UPLOAD_DIR, fullPath);
        const stats = await fs.stat(fullPath);
        
        if (entry.isDirectory()) {
          // Count items in folder
          const subEntries = await fs.readdir(fullPath);
          
          contents.push({
            id: relativePath,
            name: entry.name,
            path: relativePath,
            fullPath: fullPath,
            type: 'folder',
            isDirectory: true,
            size: 0,
            itemCount: subEntries.length,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
          });
        } else {
          const fileType = this.detectFileType(entry.name);
          const publicUrl = `/uploads/${relativePath.replace(/\\/g, '/')}`;
          
          contents.push({
            id: relativePath,
            name: entry.name,
            path: relativePath,
            fullPath: fullPath,
            publicUrl: publicUrl,
            type: fileType,
            isDirectory: false,
            size: stats.size,
            createdAt: stats.birthtime,
            updatedAt: stats.mtime,
            extension: path.extname(entry.name),
          });
        }
      }
      
      return contents;
    } catch (error) {
      console.error('Error getting directory contents:', error);
      throw error;
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(dirPath) {
    try {
      const fullPath = path.join(UPLOAD_DIR, dirPath);
      await fs.mkdir(fullPath, { recursive: true });
      return {
        success: true,
        path: dirPath,
        fullPath: fullPath
      };
    } catch (error) {
      console.error('Error creating directory:', error);
      throw error;
    }
  }

  /**
   * Move file or directory
   */
  async moveFile(sourcePath, destPath) {
    try {
      const fullSourcePath = path.join(UPLOAD_DIR, sourcePath);
      const fullDestPath = path.join(UPLOAD_DIR, destPath);
      
      await fs.rename(fullSourcePath, fullDestPath);
      return {
        success: true,
        oldPath: sourcePath,
        newPath: destPath
      };
    } catch (error) {
      console.error('Error moving file:', error);
      throw error;
    }
  }

  /**
   * Delete file or directory
   */
  async deleteFile(filePath) {
    try {
      const fullPath = path.join(UPLOAD_DIR, filePath);
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        await fs.rm(fullPath, { recursive: true, force: true });
      } else {
        await fs.unlink(fullPath);
      }
      
      return {
        success: true,
        path: filePath
      };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get file metadata and stats
   */
  async getFileMetadata(filePath) {
    try {
      const fullPath = path.join(UPLOAD_DIR, filePath);
      const stats = await fs.stat(fullPath);
      const fileType = this.detectFileType(path.basename(filePath));
      const publicUrl = `/uploads/${filePath.replace(/\\/g, '/')}`;
      
      return {
        name: path.basename(filePath),
        path: filePath,
        fullPath: fullPath,
        publicUrl: publicUrl,
        type: fileType,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        extension: path.extname(filePath),
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      throw error;
    }
  }

  /**
   * Search files by name or type
   */
  async searchFiles(query, fileType = null) {
    try {
      const allFiles = await this.getFilesRecursive(UPLOAD_DIR);
      
      let results = allFiles.filter(file => {
        const nameMatch = file.name.toLowerCase().includes(query.toLowerCase());
        const typeMatch = !fileType || file.type === fileType;
        return nameMatch && typeMatch && !file.isDirectory;
      });
      
      // Add public URLs
      results = results.map(file => ({
        ...file,
        publicUrl: `/uploads/${file.path.replace(/\\/g, '/')}`
      }));
      
      return results;
    } catch (error) {
      console.error('Error searching files:', error);
      throw error;
    }
  }

  /**
   * Get HLS directory contents
   */
  async getHLSFiles() {
    try {
      const hlsEntries = await fs.readdir(HLS_DIR, { withFileTypes: true });
      const hlsContents = [];
      
      for (const entry of hlsEntries) {
        if (entry.isDirectory()) {
          const mediaId = entry.name;
          const mediaPath = path.join(HLS_DIR, mediaId);
          const files = await fs.readdir(mediaPath);
          const m3u8File = files.find(f => f.endsWith('.m3u8'));
          
          if (m3u8File) {
            const stats = await fs.stat(path.join(mediaPath, m3u8File));
            hlsContents.push({
              id: mediaId,
              name: mediaId,
              path: `hls/${mediaId}`,
              fullPath: mediaPath,
              type: 'hls',
              isDirectory: true,
              playlistUrl: `/uploads/hls/${mediaId}/${m3u8File}`,
              fileCount: files.length,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
            });
          }
        }
      }
      
      return hlsContents;
    } catch (error) {
      console.error('Error getting HLS files:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats() {
    try {
      const allFiles = await this.getFilesRecursive(UPLOAD_DIR);
      
      const stats = {
        totalFiles: 0,
        totalSize: 0,
        byType: {
          video: { count: 0, size: 0 },
          audio: { count: 0, size: 0 },
          subtitle: { count: 0, size: 0 },
          hls: { count: 0, size: 0 },
          image: { count: 0, size: 0 },
          other: { count: 0, size: 0 },
        }
      };
      
      allFiles.forEach(file => {
        if (!file.isDirectory) {
          stats.totalFiles++;
          stats.totalSize += file.size || 0;
          
          const type = file.type || 'other';
          if (stats.byType[type]) {
            stats.byType[type].count++;
            stats.byType[type].size += file.size || 0;
          }
        }
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new FileStorageService();
