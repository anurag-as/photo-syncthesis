import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import CRC32 from 'crc-32';
import { FileItem } from '../types';

// Standard promisified fs functions
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const stat = promisify(fs.stat);
const exists = promisify(fs.exists);

// Cache for recently calculated checksums to avoid duplicate work
// Key: filePath + mtime, Value: checksum
const checksumCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

// Function to manage cache size
const addToCache = (key: string, value: string): void => {
  // Remove oldest entry if cache is full
  if (checksumCache.size >= MAX_CACHE_SIZE) {
    const firstKey = checksumCache.keys().next().value;
    checksumCache.delete(firstKey);
  }
  checksumCache.set(key, value);
};

/**
 * Metadata structure stored in .photosyncthesis files
 */
interface PhotoSyncthesisMetadata {
  version: string;
  timestamp: number;
  folderChecksum: string;
  files: Record<
    string,
    {
      path: string;
      checksum: string;
      lastModified: number;
    }
  >;
}

export class ChecksumService {
  private static readonly METADATA_FILENAME = '.photosyncthesis';
  private static readonly METADATA_VERSION = '1.0.0';

  /**
   * Calculate CRC32 checksum for file content
   */
  static async calculateFileChecksum(filePath: string): Promise<string> {
    try {
      // Get file stats to check last modified time
      const fileStats = await stat(filePath);
      const mtimeMs = fileStats.mtimeMs;

      // Create a cache key based on file path and modification time
      const cacheKey = `${filePath}:${mtimeMs}`;

      // Check if we already have this checksum cached
      if (checksumCache.has(cacheKey)) {
        return checksumCache.get(cacheKey)!;
      }

      // For files larger than 100MB, use chunked reading to avoid memory issues
      const fileSize = fileStats.size;
      let crc;

      if (fileSize > 100 * 1024 * 1024) {
        // For large files, use a stream to process in chunks
        crc = await new Promise<number>((resolve, reject) => {
          const stream = fs.createReadStream(filePath);
          let currentCrc = 0;

          stream.on('data', chunk => {
            // Ensure chunk is treated as a Buffer for CRC32
            currentCrc = CRC32.buf(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk), currentCrc);
          });

          stream.on('end', () => {
            resolve(currentCrc);
          });

          stream.on('error', err => {
            reject(err);
          });
        });
      } else {
        // For smaller files, read the whole file at once
        const buffer = await readFile(filePath);
        crc = CRC32.buf(buffer);
      }

      // Convert to hex string and ensure it's positive (CRC32 can return negative values)
      const checksum = (crc >>> 0).toString(16).padStart(8, '0');

      // Store in cache
      addToCache(cacheKey, checksum);

      return checksum;
    } catch (error: any) {
      console.error(`Error calculating checksum for ${filePath}:`, error.message);
      throw new Error(`Failed to calculate checksum: ${error.message}`);
    }
  }

  /**
   * Calculate checksum for a directory recursively
   */
  static async calculateDirectoryChecksum(
    dirPath: string,
    items: FileItem[] | null = null,
    relativePath = ''
  ): Promise<{ checksum: string; items: FileItem[] }> {
    // If items are not provided, scan the directory
    if (!items) {
      // First check if we have a valid metadata file to use
      try {
        const metadata = await this.readMetadataFile(dirPath);
        // Use metadata if it's recent (less than 1 hour old)
        if (metadata && Date.now() - metadata.timestamp < 3600000) {
          return { checksum: metadata.folderChecksum, items: [] };
        }
      } catch (error) {
        // Continue with full scan if metadata read fails
      }

      items = [];
      const entries = await promisify(fs.readdir)(dirPath);

      // Process in batches to improve performance for large directories
      const BATCH_SIZE = 25; // Process 25 entries in parallel

      // Create batches of entries
      const batches = [];
      for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        batches.push(entries.slice(i, i + BATCH_SIZE));
      }

      for (const batch of batches) {
        // Process each batch in parallel
        const batchPromises = batch.map(async entry => {
          // Skip hidden files and metadata
          if (entry === this.METADATA_FILENAME || entry.startsWith('.')) return null;

          const fullPath = path.join(dirPath, entry);
          const relPath = path.join(relativePath, entry);

          try {
            const stats = await stat(fullPath);

            if (stats.isDirectory()) {
              const { checksum, items: children } = await this.calculateDirectoryChecksum(fullPath, null, relPath);
              return {
                name: entry,
                path: relPath,
                type: 'directory' as const,
                children,
                checksum,
              };
            } else if (stats.isFile()) {
              // Skip very large binary files that aren't likely to be photos (>100MB)
              if (stats.size > 100 * 1024 * 1024 && !fullPath.match(/\.(jpg|jpeg|png|gif|tiff|raw|cr2|nef|arw)$/i)) {
                console.log(`Skipping large non-image file: ${entry}`);
                return null;
              }

              const checksum = await this.calculateFileChecksum(fullPath);
              return {
                name: entry,
                path: relPath,
                type: 'file' as const,
                checksum,
                checksumData: {
                  fileChecksum: checksum,
                  lastModified: stats.mtimeMs,
                },
              };
            }
          } catch (error: any) {
            if (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM') {
              console.error(`Skipping ${entry}:`, error.message);
            }
          }
          return null;
        });

        // Wait for all files in this batch to be processed
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(item => {
          if (item !== null) {
            items.push(item);
          }
        });
      }
    }

    // Calculate combined checksum for all items
    const checksums = items
      .map(item => {
        return `${item.path}:${item.checksum || ''}`;
      })
      .sort()
      .join('|');

    const folderCrc = CRC32.str(checksums);
    const folderChecksum = (folderCrc >>> 0).toString(16).padStart(8, '0');

    return { checksum: folderChecksum, items };
  }

  /**
   * Create .photosyncthesis metadata file for a directory
   */
  static async createMetadataFile(dirPath: string, items: FileItem[]): Promise<string> {
    const metadataPath = path.join(dirPath, this.METADATA_FILENAME);

    // Calculate folder checksum
    const { checksum: folderChecksum } = await this.calculateDirectoryChecksum(dirPath, items);

    // Build metadata structure
    const metadata: PhotoSyncthesisMetadata = {
      version: this.METADATA_VERSION,
      timestamp: Date.now(),
      folderChecksum,
      files: {},
    };

    // Flatten the file structure for easy lookup
    const processItems = (items: FileItem[], metadata: PhotoSyncthesisMetadata) => {
      for (const item of items) {
        if (item.type === 'file' && item.checksum) {
          metadata.files[item.path] = {
            path: item.path,
            checksum: item.checksum,
            lastModified: item.checksumData?.lastModified || Date.now(),
          };
        }

        if (item.children && item.children.length > 0) {
          processItems(item.children, metadata);
        }
      }
    };

    processItems(items, metadata);

    // Write the metadata file
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    return folderChecksum;
  }

  /**
   * Read .photosyncthesis metadata file for a directory
   */
  static async readMetadataFile(dirPath: string): Promise<PhotoSyncthesisMetadata | null> {
    const metadataPath = path.join(dirPath, this.METADATA_FILENAME);

    try {
      if (await exists(metadataPath)) {
        const data = await readFile(metadataPath, 'utf8');
        return JSON.parse(data) as PhotoSyncthesisMetadata;
      }
    } catch (error) {
      console.error(`Error reading metadata file for ${dirPath}:`, error);
    }

    return null;
  }

  /**
   * Compare files using checksums
   */
  static compareFileChecksums(file1: FileItem, file2: FileItem): 'identical' | 'modified' | 'different' {
    // If either file doesn't have checksum data, we can't compare
    if (!file1.checksum || !file2.checksum) {
      return 'different';
    }

    // Check if the file checksums match
    if (file1.checksum === file2.checksum) {
      return 'identical';
    }

    return 'modified';
  }

  /**
   * Compare directories using checksums
   */
  static compareFolderChecksums(folder1: FileItem, folder2: FileItem): 'identical' | 'modified' | 'different' {
    // If either folder doesn't have checksum data, we can't compare
    if (!folder1.checksum || !folder2.checksum) {
      return 'different';
    }

    // Check if the folder checksums match
    if (folder1.checksum === folder2.checksum) {
      return 'identical';
    }

    return 'modified';
  }
}
