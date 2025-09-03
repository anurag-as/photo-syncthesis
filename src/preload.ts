// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

// Interface for file items
interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
}

// Interface for path check result
interface PathCheckResult {
  exists: boolean;
  isDirectory: boolean;
  isFile: boolean;
}

// Interface for folder comparison result
interface FolderComparisonResult {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status: 'removed' | 'added' | 'common';
  children?: FolderComparisonResult[];
}

// Interface for sync result
interface SyncResult {
  success: boolean;
  copied: number;
  errors: string[];
  message: string;
}

// Expose file system APIs to renderer
contextBridge.exposeInMainWorld('fileSystemAPI', {
  // Get contents of a directory
  getDirectoryContents: (dirPath: string): Promise<FileItem[]> => ipcRenderer.invoke('get-directory-contents', dirPath),

  // Get user home directory
  getHomeDirectory: (): Promise<string> => ipcRenderer.invoke('get-home-directory'),

  // Check if a path exists and get its type
  checkPath: (dirPath: string): Promise<PathCheckResult> => ipcRenderer.invoke('check-path', dirPath),

  // Scan directory recursively
  scanDirectoryRecursive: (dirPath: string): Promise<FileItem[]> =>
    ipcRenderer.invoke('scan-directory-recursive', dirPath),

  // Compare two folders
  compareFolders: (folder1Path: string, folder2Path: string): Promise<FolderComparisonResult[]> =>
    ipcRenderer.invoke('compare-folders', folder1Path, folder2Path),

  // Sync folders: copy missing files from folder1 to folder2
  syncFoldersLeftToRight: (folder1Path: string, folder2Path: string): Promise<SyncResult> =>
    ipcRenderer.invoke('sync-folders-left-to-right', folder1Path, folder2Path),

  // Sync folders: copy missing files from folder2 to folder1
  syncFoldersRightToLeft: (folder1Path: string, folder2Path: string): Promise<SyncResult> =>
    ipcRenderer.invoke('sync-folders-right-to-left', folder1Path, folder2Path),
});

// Type declarations for TypeScript
declare global {
  interface Window {
    fileSystemAPI: {
      getDirectoryContents: (dirPath: string) => Promise<FileItem[]>;
      getHomeDirectory: () => Promise<string>;
      checkPath: (dirPath: string) => Promise<PathCheckResult>;
      scanDirectoryRecursive: (dirPath: string) => Promise<FileItem[]>;
      compareFolders: (folder1Path: string, folder2Path: string) => Promise<FolderComparisonResult[]>;
      syncFoldersLeftToRight: (folder1Path: string, folder2Path: string) => Promise<SyncResult>;
      syncFoldersRightToLeft: (folder1Path: string, folder2Path: string) => Promise<SyncResult>;
    };
  }
}
