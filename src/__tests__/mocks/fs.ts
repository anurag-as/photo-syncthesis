// Mock implementations for fs functions
export const mockReaddir = jest.fn();
export const mockStat = jest.fn();
export const mockCopyFile = jest.fn();
export const mockMkdir = jest.fn();

// Export a mock fs module
export default {
  promises: {
    readdir: mockReaddir,
    stat: mockStat,
    copyFile: mockCopyFile,
    mkdir: mockMkdir,
  },
};
