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
  status: 'removed' | 'added' | 'common' | 'modified' | 'majority' | 'minority';
  children?: FolderComparisonResult[];
  checksum?: string;
  checksumData?: {
    fileChecksum?: string;
    contentChecksum?: string;
    lastModified?: number;
  };
  // For n-way diff: track which folders contain this item
  presentInFolders?: number[];
  // For n-way diff: track majority/minority status
  majorityStatus?: 'majority' | 'minority';
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
  status: 'removed' | 'added' | 'common' | 'missing' | 'modified' | 'majority' | 'minority';
}

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  autoHide?: boolean;
}

export interface FolderInfo {
  path: string;
  name: string;
  structure: FileItem[] | null;
}

export interface NWayComparisonResult {
  folders: FolderInfo[];
  comparison: FolderComparisonResult[];
}

export interface RepairItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  action: 'copy' | 'replace';
  majorityFolders: number[];
  minorityFolders: number[];
  sourceFolderIndex: number; // Index of folder to copy from
}
