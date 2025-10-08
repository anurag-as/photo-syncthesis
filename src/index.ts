import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';
import { FileSystemService } from './services/FileSystemService';
import { FileItem } from './types';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

if (require('electron-squirrel-startup')) {
  app.quit();
}

async function requestFileSystemPermissions(): Promise<boolean> {
  try {
    const homeDir = os.homedir();
    await fs.promises.access(homeDir, fs.constants.R_OK);
    return true;
  } catch (error) {
    if (process.platform === 'darwin') {
      const result = await dialog.showMessageBox({
        type: 'warning',
        title: 'File System Access Required',
        message: 'Photo Syncthesis needs access to your file system to compare photo folders.',
        detail:
          'Please grant "Full Disk Access" to this app in System Preferences > Security & Privacy > Privacy > Full Disk Access.',
        buttons: ['Open System Preferences', 'Continue Anyway'],
        defaultId: 0,
        cancelId: 1,
      });

      if (result.response === 0) {
        shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles');
      }
    } else if (process.platform === 'win32') {
      await dialog.showMessageBox({
        type: 'info',
        title: 'Administrator Access May Be Required',
        message: 'Photo Syncthesis may need administrator privileges for some system folders.',
        detail: 'If you encounter permission errors, try right-clicking the app and selecting "Run as administrator".',
        buttons: ['OK'],
        defaultId: 0,
      });
    } else {
      await dialog.showMessageBox({
        type: 'info',
        title: 'File System Permissions',
        message: 'Photo Syncthesis may need elevated permissions for some system folders.',
        detail:
          'If you encounter permission errors, try launching from terminal with "sudo photo-syncthesis" or ensure your user has appropriate folder permissions.',
        buttons: ['OK'],
        defaultId: 0,
      });
    }

    return false;
  }
}

const createWindow = async (): Promise<void> => {
  await requestFileSystemPermissions();

  const mainWindow = new BrowserWindow({
    height: 700,
    width: 1200,
    minHeight: 500,
    minWidth: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    title: 'Photo Syncthesis',
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
};

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC Handlers
ipcMain.handle('get-directory-contents', async (event, dirPath: string) => {
  try {
    await fs.promises.access(dirPath, fs.constants.R_OK);

    const items = await readdir(dirPath);
    const fileItems: FileItem[] = [];

    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = await stat(itemPath);
        if (item.startsWith('.')) continue;

        fileItems.push({
          name: item,
          path: itemPath,
          type: stats.isDirectory() ? 'directory' : 'file',
        });
      } catch (error: any) {
        if (error.code !== 'ENOENT' && error.code !== 'EACCES' && error.code !== 'EPERM') {
          console.log(`Skipping ${item}: ${error.code || error.message}`);
        }
      }
    }

    return fileItems.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  } catch (error: any) {
    // Throw user-friendly error messages that will show as notifications
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      if (dirPath.includes('.photoslibrary')) {
        throw new Error(
          `Cannot access Photos Library. This is a protected macOS system package that requires special permissions. Try using individual photo folders instead.`
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

    throw new Error(`Failed to access directory "${path.basename(dirPath)}": ${error.message}`);
  }
});

ipcMain.handle('get-home-directory', () => os.homedir());

ipcMain.handle('check-path', async (event, dirPath: string) => {
  try {
    const stats = await stat(dirPath);
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  } catch (error) {
    return {
      exists: false,
      isDirectory: false,
      isFile: false,
    };
  }
});

ipcMain.handle('scan-directory-recursive', async (event, dirPath: string) => {
  const stats = await stat(dirPath);
  if (!stats.isDirectory()) {
    throw new Error('Path is not a directory');
  }

  return await FileSystemService.scanDirectoryRecursive(dirPath);
});

ipcMain.handle('compare-folders', async (event, folder1Path: string, folder2Path: string) => {
  const [folder1Structure, folder2Structure] = await Promise.all([
    FileSystemService.scanDirectoryRecursive(folder1Path),
    FileSystemService.scanDirectoryRecursive(folder2Path),
  ]);

  return FileSystemService.compareFolderStructures(folder1Structure, folder2Structure);
});

ipcMain.handle('compare-nway-folders', async (event, folders: { path: string; structure: FileItem[] }[]) => {
  return FileSystemService.compareNWayFolderStructures(folders);
});

ipcMain.handle('sync-folders-left-to-right', async (event, folder1Path: string, folder2Path: string) => {
  try {
    const [folder1Structure, folder2Structure] = await Promise.all([
      FileSystemService.scanDirectoryRecursive(folder1Path),
      FileSystemService.scanDirectoryRecursive(folder2Path),
    ]);

    const comparison = FileSystemService.compareFolderStructures(folder1Structure, folder2Structure);
    const result = await FileSystemService.syncMissingFiles(folder1Path, folder2Path, comparison, 'left-to-right');

    return {
      success: true,
      copied: result.copied,
      errors: result.errors,
      message: `Copied ${result.copied} items from Folder 1 to Folder 2`,
    };
  } catch (error: any) {
    return {
      success: false,
      copied: 0,
      errors: [error.message],
      message: `Error: ${error.message}`,
    };
  }
});

ipcMain.handle('sync-folders-right-to-left', async (event, folder1Path: string, folder2Path: string) => {
  try {
    const [folder1Structure, folder2Structure] = await Promise.all([
      FileSystemService.scanDirectoryRecursive(folder1Path),
      FileSystemService.scanDirectoryRecursive(folder2Path),
    ]);

    const comparison = FileSystemService.compareFolderStructures(folder1Structure, folder2Structure);
    const result = await FileSystemService.syncMissingFiles(folder2Path, folder1Path, comparison, 'right-to-left');

    return {
      success: true,
      copied: result.copied,
      errors: result.errors,
      message: `Copied ${result.copied} items from Folder 2 to Folder 1`,
    };
  } catch (error: any) {
    return {
      success: false,
      copied: 0,
      errors: [error.message],
      message: `Error: ${error.message}`,
    };
  }
});
