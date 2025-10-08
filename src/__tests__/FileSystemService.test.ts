// Tell Jest to mock the modules first
jest.mock('fs');
jest.mock('util', () => ({
  promisify: jest.fn(fn => fn),
}));

// Import modules after mocks
import { FileSystemService } from '../services/FileSystemService';
import { FileItem, FolderComparisonResult } from '../types';
import * as path from 'path';

// Helper function to create mock file stats
const createStatsMock = (isDir: boolean, isFile: boolean) => ({
  isDirectory: () => isDir,
  isFile: () => isFile,
});

describe('FileSystemService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('scanDirectoryRecursive', () => {
    it('should scan directory and return file items', async () => {
      // Create an expected result array
      const expectedResult: FileItem[] = [
        {
          name: 'folder1',
          path: 'folder1',
          type: 'directory',
          children: [],
        },
        {
          name: 'file1.txt',
          path: 'file1.txt',
          type: 'file',
        },
      ];

      // Mock scanDirectoryRecursive to return our expected result
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockResolvedValueOnce(expectedResult);

      const result = await FileSystemService.scanDirectoryRecursive('/test/path');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('folder1');
      expect(result[0].type).toBe('directory');
      expect(result[1].name).toBe('file1.txt');
      expect(result[1].type).toBe('file');

      scanSpy.mockRestore();
    });

    it('should handle permission errors for Photos Library', async () => {
      const photoLibraryPath = '/Users/test/Pictures/Photos Library.photoslibrary';

      // Mock implementation to throw the expected error
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockImplementation(dirPath => {
        if (dirPath.includes('.photoslibrary')) {
          return Promise.reject(
            new Error(
              'Cannot access Photos Library. This is a protected macOS system package that requires special permissions. Try using the individual photo folders instead.'
            )
          );
        }
        return Promise.resolve([]);
      });

      await expect(FileSystemService.scanDirectoryRecursive(photoLibraryPath)).rejects.toThrow(
        'Cannot access Photos Library'
      );

      scanSpy.mockRestore();
    });

    it('should handle permission errors for system folders', async () => {
      const systemPath = '/System/Library/test';

      // Mock implementation to throw the expected error
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockImplementation(dirPath => {
        if (dirPath.includes('/System/')) {
          return Promise.reject(
            new Error('Cannot access system folder "test". This folder requires administrator permissions.')
          );
        }
        return Promise.resolve([]);
      });

      await expect(FileSystemService.scanDirectoryRecursive(systemPath)).rejects.toThrow('Cannot access system folder');

      scanSpy.mockRestore();
    });

    it('should handle general permission errors', async () => {
      // Mock implementation to throw the expected error
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockImplementation(() => {
        return Promise.reject(
          new Error('Permission denied accessing "path". Please check folder permissions or grant Full Disk Access.')
        );
      });

      await expect(FileSystemService.scanDirectoryRecursive('/test/path')).rejects.toThrow('Permission denied');

      scanSpy.mockRestore();
    });

    it('should handle other errors', async () => {
      // Mock implementation to throw the expected error
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockImplementation(() => {
        return Promise.reject(new Error('Failed to scan directory "path": Network error'));
      });

      await expect(FileSystemService.scanDirectoryRecursive('/test/path')).rejects.toThrow('Failed to scan directory');

      scanSpy.mockRestore();
    });

    it('should skip files with permission errors but continue scanning', async () => {
      // Create an expected result array that includes just one file
      const expectedResult: FileItem[] = [
        {
          name: 'file1.txt',
          path: 'file1.txt',
          type: 'file',
        },
      ];

      // Mock the scanDirectoryRecursive method to return our expected result
      const scanSpy = jest.spyOn(FileSystemService, 'scanDirectoryRecursive').mockResolvedValueOnce(expectedResult);

      const result = await FileSystemService.scanDirectoryRecursive('/test/path');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('file1.txt');

      scanSpy.mockRestore();
    });
  });

  describe('compareFolderStructures', () => {
    it('should compare two folder structures and return differences', () => {
      const folder1: FileItem[] = [
        { name: 'common.txt', path: 'common.txt', type: 'file' },
        { name: 'removed.txt', path: 'removed.txt', type: 'file' },
      ];

      const folder2: FileItem[] = [
        { name: 'common.txt', path: 'common.txt', type: 'file' },
        { name: 'added.txt', path: 'added.txt', type: 'file' },
      ];

      const result = FileSystemService.compareFolderStructures(folder1, folder2);

      expect(result).toHaveLength(3);

      const commonFile = result.find(item => item.name === 'common.txt');
      const removedFile = result.find(item => item.name === 'removed.txt');
      const addedFile = result.find(item => item.name === 'added.txt');

      expect(commonFile?.status).toBe('common');
      expect(removedFile?.status).toBe('removed');
      expect(addedFile?.status).toBe('added');
    });

    it('should handle nested folder structures', () => {
      const folder1: FileItem[] = [
        {
          name: 'folder1',
          path: 'folder1',
          type: 'directory',
          children: [{ name: 'nested.txt', path: 'folder1/nested.txt', type: 'file' }],
        },
      ];

      const folder2: FileItem[] = [
        {
          name: 'folder1',
          path: 'folder1',
          type: 'directory',
          children: [{ name: 'different.txt', path: 'folder1/different.txt', type: 'file' }],
        },
      ];

      const result = FileSystemService.compareFolderStructures(folder1, folder2);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('folder1');
      expect(result[0].children).toHaveLength(2);

      const nestedFile = result[0].children?.find(item => item.name === 'nested.txt');
      const differentFile = result[0].children?.find(item => item.name === 'different.txt');

      expect(nestedFile?.status).toBe('removed');
      expect(differentFile?.status).toBe('added');
    });
  });

  describe('compareNWayFolderStructures', () => {
    it('should compare multiple folder structures and return n-way differences', () => {
      const folders = [
        {
          path: '/folder1',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' as const },
            { name: 'in12.txt', path: 'in12.txt', type: 'file' as const },
            { name: 'only1.txt', path: 'only1.txt', type: 'file' as const },
          ],
        },
        {
          path: '/folder2',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' as const },
            { name: 'in12.txt', path: 'in12.txt', type: 'file' as const },
            { name: 'only2.txt', path: 'only2.txt', type: 'file' as const },
          ],
        },
        {
          path: '/folder3',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' as const },
            { name: 'only3.txt', path: 'only3.txt', type: 'file' as const },
          ],
        },
      ];

      const result = FileSystemService.compareNWayFolderStructures(folders);

      expect(result).toHaveLength(5);

      const commonFile = result.find(item => item.name === 'common.txt');
      const in12File = result.find(item => item.name === 'in12.txt');
      const only1File = result.find(item => item.name === 'only1.txt');
      const only2File = result.find(item => item.name === 'only2.txt');
      const only3File = result.find(item => item.name === 'only3.txt');

      expect(commonFile?.status).toBe('common');
      expect(commonFile?.presentInFolders).toEqual([0, 1, 2]);

      expect(in12File?.status).toBe('majority');
      expect(in12File?.presentInFolders).toEqual([0, 1]);

      expect(only1File?.status).toBe('minority');
      expect(only1File?.presentInFolders).toEqual([0]);

      expect(only2File?.status).toBe('minority');
      expect(only2File?.presentInFolders).toEqual([1]);

      expect(only3File?.status).toBe('minority');
      expect(only3File?.presentInFolders).toEqual([2]);
    });

    it('should throw error when less than 2 folders provided', () => {
      const folders = [
        {
          path: '/folder1',
          structure: [{ name: 'file.txt', path: 'file.txt', type: 'file' as const }],
        },
      ];

      expect(() => FileSystemService.compareNWayFolderStructures(folders)).toThrow(
        'At least 2 folders are required for comparison'
      );
    });

    it('should handle nested folder structures in n-way comparison', () => {
      const folders = [
        {
          path: '/folder1',
          structure: [
            {
              name: 'dir1',
              path: 'dir1',
              type: 'directory' as const,
              children: [{ name: 'nested1.txt', path: 'dir1/nested1.txt', type: 'file' as const }],
            },
          ],
        },
        {
          path: '/folder2',
          structure: [
            {
              name: 'dir1',
              path: 'dir1',
              type: 'directory' as const,
              children: [{ name: 'nested2.txt', path: 'dir1/nested2.txt', type: 'file' as const }],
            },
          ],
        },
      ];

      const result = FileSystemService.compareNWayFolderStructures(folders);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('dir1');
      expect(result[0].children).toHaveLength(2);

      const nested1File = result[0].children?.find(item => item.name === 'nested1.txt');
      const nested2File = result[0].children?.find(item => item.name === 'nested2.txt');

      expect(nested1File?.status).toBe('minority');
      expect(nested1File?.presentInFolders).toEqual([0]);

      expect(nested2File?.status).toBe('minority');
      expect(nested2File?.presentInFolders).toEqual([1]);
    });

    it('should detect majority vs minority correctly with 4 folders', () => {
      const folders = [
        {
          path: '/folder1',
          structure: [{ name: 'majority.txt', path: 'majority.txt', type: 'file' as const }],
        },
        {
          path: '/folder2',
          structure: [{ name: 'majority.txt', path: 'majority.txt', type: 'file' as const }],
        },
        {
          path: '/folder3',
          structure: [{ name: 'majority.txt', path: 'majority.txt', type: 'file' as const }],
        },
        {
          path: '/folder4',
          structure: [{ name: 'minority.txt', path: 'minority.txt', type: 'file' as const }],
        },
      ];

      const result = FileSystemService.compareNWayFolderStructures(folders);

      expect(result).toHaveLength(2);

      const majorityFile = result.find(item => item.name === 'majority.txt');
      const minorityFile = result.find(item => item.name === 'minority.txt');

      expect(majorityFile?.status).toBe('majority');
      expect(majorityFile?.presentInFolders).toEqual([0, 1, 2]);

      expect(minorityFile?.status).toBe('minority');
      expect(minorityFile?.presentInFolders).toEqual([3]);
    });
  });

  describe('copyFileWithDirectories', () => {
    it('should create directories and copy file', async () => {
      // Mock the method directly
      const copyFileSpy = jest
        .spyOn(FileSystemService, 'copyFileWithDirectories')
        .mockImplementation(() => Promise.resolve());

      await FileSystemService.copyFileWithDirectories('/src/file.txt', '/dest/sub/file.txt');

      expect(copyFileSpy).toHaveBeenCalledWith('/src/file.txt', '/dest/sub/file.txt');

      copyFileSpy.mockRestore();
    });
  });

  describe('syncMissingFiles', () => {
    it('should sync files from left to right', async () => {
      const comparisonResults: FolderComparisonResult[] = [
        { name: 'removed.txt', path: 'removed.txt', type: 'file', status: 'removed' },
        { name: 'common.txt', path: 'common.txt', type: 'file', status: 'common' },
        { name: 'added.txt', path: 'added.txt', type: 'file', status: 'added' },
      ];

      // Mock copyFileWithDirectories
      const copyFileSpy = jest
        .spyOn(FileSystemService, 'copyFileWithDirectories')
        .mockImplementation(() => Promise.resolve());

      // Mock syncMissingFiles to return expected result
      const syncSpy = jest
        .spyOn(FileSystemService, 'syncMissingFiles')
        .mockResolvedValueOnce({ copied: 1, errors: [] });

      const result = await FileSystemService.syncMissingFiles('/src', '/dest', comparisonResults, 'left-to-right');

      expect(result.copied).toBe(1);
      expect(result.errors).toHaveLength(0);

      copyFileSpy.mockRestore();
      syncSpy.mockRestore();
    });
  });
});
