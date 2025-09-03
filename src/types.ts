export interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileItem[];
  checksum?: string;
  checksumData?: {
    fileChecksum?: string;
    contentChecksum?: string;
    lastModified?: number;
  };
}

export interface FolderComparisonResult {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status: 'removed' | 'added' | 'common' | 'modified';
  children?: FolderComparisonResult[];
  checksum?: string;
  checksumData?: {
    fileChecksum?: string;
    contentChecksum?: string;
    lastModified?: number;
  };
}

export interface SyncResult {
  success: boolean;
  copied: number;
  errors: string[];
  message: string;
}

export interface TreeNode {
  item: FileItem;
  element: HTMLElement;
  childrenContainer?: HTMLElement;
  isExpanded: boolean;
  isLoaded: boolean;
}

export interface DualTreeNode {
  item: FileItem;
  element: HTMLElement;
  childrenContainer?: HTMLElement;
  isExpanded: boolean;
  status: 'removed' | 'added' | 'common' | 'missing' | 'modified';
}

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  autoHide?: boolean;
}
