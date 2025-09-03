// Type definitions for global mock functions used in tests

declare global {
  // Jest mock functions for fs module
  const mockReaddir: jest.Mock;
  const mockStat: jest.Mock;
  const mockCopyFile: jest.Mock;
  const mockMkdir: jest.Mock;

  // Add any other global mocks here as needed
  namespace NodeJS {
    interface Global {
      mockReaddir: jest.Mock;
      mockStat: jest.Mock;
      mockCopyFile: jest.Mock;
      mockMkdir: jest.Mock;
    }
  }
}

// This file needs to be a module
export {};
