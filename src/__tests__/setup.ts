// This file is a setup file for Jest, not a test file
// Don't try to run it as a test

// Mock DOM APIs that might not be available in the test environment
Object.defineProperty(window, 'fileSystemAPI', {
  value: {
    getHomeDirectory: jest.fn(),
    getDirectoryContents: jest.fn(),
    scanDirectoryRecursive: jest.fn(),
    compareFolders: jest.fn(),
    syncFoldersLeftToRight: jest.fn(),
    syncFoldersRightToLeft: jest.fn(),
    checkPath: jest.fn(),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup DOM environment
document.body.innerHTML = `
  <div id="file-tree"></div>
  <div id="notification-container"></div>
  <div id="sync-confirmation-overlay" class="hidden">
    <div id="sync-source-name"></div>
    <div id="sync-source-path"></div>
    <div id="sync-dest-name"></div>
    <div id="sync-dest-path"></div>
    <div id="sync-direction-arrow"></div>
    <button id="sync-confirm-close"></button>
    <button id="sync-confirm-cancel"></button>
    <button id="sync-confirm-proceed"></button>
  </div>
  <div id="folder1-zone"></div>
  <div id="folder2-zone"></div>
  <div id="folder1-path"></div>
  <div id="folder2-path"></div>
  <div id="folder1-tree"></div>
  <div id="folder2-tree"></div>
  <div id="folder1-name"></div>
  <div id="folder2-name"></div>
  <button id="sync-left-to-right"></button>
  <button id="sync-right-to-left"></button>
  <button id="clear-folder1"></button>
  <button id="clear-folder2"></button>
`;

export {}; // This makes the file a module
