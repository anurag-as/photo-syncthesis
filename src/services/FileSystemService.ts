import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { FileItem, FolderComparisonResult } from '../types';
import { ChecksumService } from './ChecksumService';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);

export class FileSystemService {
  static async scanDirectoryRecursive(
    dirPath: string,
    relativePath = '',
    calculateChecksums = true
  ): Promise<FileItem[]> {
    const items: FileItem[] = [];

    try {
      const entries = await readdir(dirPath);

      for (const entry of entries) {
        // Skip hidden files and the .photosyncthesis metadata file
        if (entry.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry);
        const relPath = path.join(relativePath, entry);

        try {
          const stats = await stat(fullPath);

          if (stats.isDirectory()) {
            const children = await this.scanDirectoryRecursive(fullPath, relPath, calculateChecksums);

            const folderItem: FileItem = {
              name: entry,
              path: relPath,
              type: 'directory',
              children: children,
            };

            // Calculate directory checksum if requested
            if (calculateChecksums && children.length > 0) {
              const { checksum } = await ChecksumService.calculateDirectoryChecksum(fullPath, children);
              folderItem.checksum = checksum;
            }

            items.push(folderItem);
          } else if (stats.isFile()) {
            const fileItem: FileItem = {
              name: entry,
              path: relPath,
              type: 'file',
            };

            // Calculate file checksum if requested
            if (calculateChecksums) {
              try {
                const checksum = await ChecksumService.calculateFileChecksum(fullPath);
                fileItem.checksum = checksum;
                fileItem.checksumData = {
                  fileChecksum: checksum,
                  lastModified: stats.mtimeMs,
                };
              } catch (error) {
                console.warn(`Failed to calculate checksum for ${fullPath}`, error);
              }
            }

            items.push(fileItem);
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM') {
            console.log(`Skipping ${entry}: ${error.code || error.message}`);
            throw new Error();
          }
        }
      }
    } catch (error: any) {
      // For permission errors, provide specific user-friendly messages
      if (error.code === 'EPERM' || error.code === 'EACCES') {
        if (dirPath.includes('.photoslibrary')) {
          throw new Error(
            `Cannot access Photos Library. This is a protected macOS system package that requires special permissions. Try using the individual photo folders instead.`
          );
        } else if (dirPath.includes('System') || dirPath.includes('/Library')) {
          throw new Error(
            `Cannot access system folder "${path.basename(dirPath)}". This folder requires administrator permissions.`
          );
        } else {
          throw new Error(
            `Permission denied accessing "${path.basename(dirPath)}". Please check folder permissions or grant Full Disk Access.`
          );
        }
      }

      // For other errors, provide generic but helpful message
      throw new Error(`Failed to scan directory "${path.basename(dirPath)}": ${error.message}`);
    }

    return this.sortItems(items);
  }

  static compareFolderStructures(folder1: FileItem[], folder2: FileItem[]): FolderComparisonResult[] {
    const folder1Map = new Map<string, FileItem>();
    const folder2Map = new Map<string, FileItem>();

    const addToMap = (items: FileItem[], map: Map<string, FileItem>, prefix = '') => {
      items.forEach(item => {
        const fullPath = prefix ? path.join(prefix, item.name) : item.name;
        map.set(fullPath, item);
        if (item.children) addToMap(item.children, map, fullPath);
      });
    };

    addToMap(folder1, folder1Map);
    addToMap(folder2, folder2Map);

    const allPaths = new Set([...folder1Map.keys(), ...folder2Map.keys()]);
    const result: FolderComparisonResult[] = [];
    const resultMap = new Map<string, FolderComparisonResult>();

    for (const fullPath of allPaths) {
      const item1 = folder1Map.get(fullPath);
      const item2 = folder2Map.get(fullPath);

      let status: 'removed' | 'added' | 'common' | 'modified';
      let sourceItem: FileItem;

      if (item1 && item2) {
        // Both items exist, check if they're identical by comparing checksums
        if (item1.type === 'file' && item2.type === 'file' && item1.checksum && item2.checksum) {
          const comparison = ChecksumService.compareFileChecksums(item1, item2);
          status = comparison === 'identical' ? 'common' : 'modified';
        } else if (item1.type === 'directory' && item2.type === 'directory' && item1.checksum && item2.checksum) {
          const comparison = ChecksumService.compareFolderChecksums(item1, item2);
          status = comparison === 'identical' ? 'common' : 'modified';
        } else {
          // Default to common if we can't compare checksums
          status = 'common';
        }
        sourceItem = status === 'modified' ? item2 : item1;
      } else if (item1) {
        status = 'removed';
        sourceItem = item1;
      } else {
        status = 'added';
        sourceItem = item2!;
      }

      const comparisonItem: FolderComparisonResult = {
        name: sourceItem.name,
        path: sourceItem.path,
        type: sourceItem.type,
        status: status,
        children: [],
        checksum: sourceItem.checksum,
        checksumData: sourceItem.checksumData,
      };

      resultMap.set(fullPath, comparisonItem);
    }

    for (const [fullPath, item] of resultMap) {
      const parentPath = path.dirname(fullPath);

      if (parentPath === '.' || parentPath === '') {
        result.push(item);
      } else {
        const parent = resultMap.get(parentPath);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(item);
        }
      }
    }

    return this.sortComparisonItems(result);
  }

  static async copyFileWithDirectories(srcPath: string, destPath: string): Promise<void> {
    const destDir = path.dirname(destPath);
    await mkdir(destDir, { recursive: true });
    await copyFile(srcPath, destPath);
  }

  static async copyDirectoryRecursive(srcPath: string, destPath: string): Promise<void> {
    await mkdir(destPath, { recursive: true });
    const entries = await readdir(srcPath);

    for (const entry of entries) {
      if (entry.startsWith('.')) continue;

      const srcItemPath = path.join(srcPath, entry);
      const destItemPath = path.join(destPath, entry);

      try {
        const stats = await stat(srcItemPath);

        if (stats.isDirectory()) {
          await this.copyDirectoryRecursive(srcItemPath, destItemPath);
        } else if (stats.isFile()) {
          await copyFile(srcItemPath, destItemPath);
        }
      } catch (error: any) {
        if (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM') {
          console.log(`Skipping ${entry}: ${error.code || error.message}`);
        }
      }
    }
  }

  static async syncMissingFiles(
    sourceBasePath: string,
    destBasePath: string,
    comparisonResults: FolderComparisonResult[],
    direction: 'left-to-right' | 'right-to-left',
    includeModified = true
  ): Promise<{ copied: number; errors: string[] }> {
    const copiedFiles: string[] = [];
    const errors: string[] = [];
    // Determine which status to look for based on sync direction
    const targetStatus = direction === 'left-to-right' ? 'removed' : 'added';

    // Define statuses to sync: missing files and optionally modified files
    const statusesToSync = includeModified ? [targetStatus, 'modified'] : [targetStatus];

    const processItems = async (items: FolderComparisonResult[], currentSrcPath: string, currentDestPath: string) => {
      for (const item of items) {
        // Sync if the item has a status we're looking for
        if (statusesToSync.includes(item.status)) {
          const srcItemPath = path.join(currentSrcPath, item.name);
          const destItemPath = path.join(currentDestPath, item.name);

          try {
            const srcStats = await stat(srcItemPath);

            if (srcStats.isDirectory()) {
              await this.copyDirectoryRecursive(srcItemPath, destItemPath);
              copiedFiles.push(`📁 ${item.name}/`);
            } else if (srcStats.isFile()) {
              await this.copyFileWithDirectories(srcItemPath, destItemPath);
              copiedFiles.push(`📄 ${item.name}`);
            }
          } catch (error: any) {
            const errorMsg = `Failed to copy ${item.name}: ${error.message}`;
            errors.push(errorMsg);
          }
        } else if (item.children && item.children.length > 0) {
          const srcChildPath = path.join(currentSrcPath, item.name);
          const destChildPath = path.join(currentDestPath, item.name);
          await processItems(item.children, srcChildPath, destChildPath);
        }
      }
    };

    await processItems(comparisonResults, sourceBasePath, destBasePath);

    // After sync, generate/update metadata files
    if (copiedFiles.length > 0) {
      try {
        // Rescan source and destination directories
        const sourceItems = await this.scanDirectoryRecursive(sourceBasePath);
        const destItems = await this.scanDirectoryRecursive(destBasePath);

        // Create or update metadata files
        await ChecksumService.createMetadataFile(sourceBasePath, sourceItems);
        await ChecksumService.createMetadataFile(destBasePath, destItems);
      } catch (error) {
        console.error('Failed to update metadata files after sync:', error);
      }
    }

    return { copied: copiedFiles.length, errors };
  }

  private static sortItems(items: FileItem[]): FileItem[] {
    return items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }

  private static sortComparisonItems(items: FolderComparisonResult[]): FolderComparisonResult[] {
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    items.forEach(item => {
      if (item.children && item.children.length > 0) {
        this.sortComparisonItems(item.children);
      }
    });

    return items;
  }

  /**
   * Create or update the .photosyncthesis metadata file for a directory
   */
  static async generateMetadataFile(dirPath: string): Promise<string> {
    try {
      const items = await this.scanDirectoryRecursive(dirPath);
      return await ChecksumService.createMetadataFile(dirPath, items);
    } catch (error) {
      console.error(`Failed to generate metadata file for ${dirPath}:`, error);
      throw new Error(`Failed to generate metadata file: ${error}`);
    }
  }
}
