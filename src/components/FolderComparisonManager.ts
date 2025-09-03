import { FileItem, FolderComparisonResult, DualTreeNode } from '../types';
import { NotificationManager } from './NotificationManager';
import { ConfirmationDialog } from './ConfirmationDialog';

export class FolderComparisonManager {
  private folder1Zone: HTMLElement;
  private folder2Zone: HTMLElement;
  private folder1Path: HTMLElement;
  private folder2Path: HTMLElement;
  private folder1Tree: HTMLElement;
  private folder2Tree: HTMLElement;
  private folder1Name: HTMLElement;
  private folder2Name: HTMLElement;
  private syncLeftToRightBtn: HTMLButtonElement;
  private syncRightToLeftBtn: HTMLButtonElement;
  private clearFolder1Btn: HTMLButtonElement;
  private clearFolder2Btn: HTMLButtonElement;
  private diffOnlyToggle: HTMLInputElement;
  private notificationManager: NotificationManager;
  private confirmationDialog: ConfirmationDialog;

  private folder1: string | null = null;
  private folder2: string | null = null;
  private folder1Structure: FileItem[] | null = null;
  private folder2Structure: FileItem[] | null = null;
  private showDifferencesOnly = true;
  private lastStatusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'> | null = null;

  constructor() {
    this.initializeElements();
    this.notificationManager = new NotificationManager();
    this.confirmationDialog = new ConfirmationDialog();

    this.initializeDragAndDrop();
    this.initializeSyncButtons();
    this.initializeClearButtons();
    this.initializeToggleSwitch();
  }

  private initializeElements() {
    this.folder1Zone = document.getElementById('folder1-zone')!;
    this.folder2Zone = document.getElementById('folder2-zone')!;
    this.folder1Path = document.getElementById('folder1-path')!;
    this.folder2Path = document.getElementById('folder2-path')!;
    this.folder1Tree = document.getElementById('folder1-tree')!;
    this.folder2Tree = document.getElementById('folder2-tree')!;
    this.folder1Name = document.getElementById('folder1-name')!;
    this.folder2Name = document.getElementById('folder2-name')!;
    this.syncLeftToRightBtn = document.getElementById('sync-left-to-right')! as HTMLButtonElement;
    this.syncRightToLeftBtn = document.getElementById('sync-right-to-left')! as HTMLButtonElement;
    this.clearFolder1Btn = document.getElementById('clear-folder1')! as HTMLButtonElement;
    this.clearFolder2Btn = document.getElementById('clear-folder2')! as HTMLButtonElement;
    this.diffOnlyToggle = document.getElementById('diff-only-toggle')! as HTMLInputElement;
  }

  private initializeDragAndDrop() {
    [this.folder1Zone, this.folder2Zone].forEach((zone, index) => {
      const isFolder1 = index === 0;

      zone.addEventListener('dragover', e => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', e => {
        e.preventDefault();
        if (!zone.contains(e.relatedTarget as Node)) {
          zone.classList.remove('drag-over');
        }
      });

      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        this.handleDrop(e, isFolder1);
      });

      zone.addEventListener('click', () => this.showFolderPicker(isFolder1));
    });
  }

  private initializeToggleSwitch() {
    // Initialize toggle state from checkbox
    this.showDifferencesOnly = this.diffOnlyToggle.checked;

    // Add event listener for toggle changes
    this.diffOnlyToggle.addEventListener('change', () => {
      this.showDifferencesOnly = this.diffOnlyToggle.checked;

      // Reapply filtering with the new toggle state if we have comparison data
      if (this.folder1Structure && this.folder2Structure && this.lastStatusMap) {
        this.applyDiffFilter(this.lastStatusMap);
      }
    });
  }

  private initializeSyncButtons() {
    this.updateSyncButtonState();

    this.syncLeftToRightBtn.addEventListener('click', () => {
      if (this.folder1 && this.folder2) {
        this.confirmationDialog.show(this.folder1, this.folder2, 'left-to-right', () =>
          this.performSync('left-to-right')
        );
      }
    });

    this.syncRightToLeftBtn.addEventListener('click', () => {
      if (this.folder1 && this.folder2) {
        this.confirmationDialog.show(this.folder2, this.folder1, 'right-to-left', () =>
          this.performSync('right-to-left')
        );
      }
    });
  }

  private initializeClearButtons() {
    this.clearFolder1Btn.addEventListener('click', e => {
      e.stopPropagation();
      this.clearFolder(true);
    });

    this.clearFolder2Btn.addEventListener('click', e => {
      e.stopPropagation();
      this.clearFolder(false);
    });
  }

  private clearFolder(isFolder1: boolean) {
    if (isFolder1) {
      this.folder1 = null;
      this.folder1Structure = null;
      this.folder1Path.textContent = '';
      this.folder1Name.textContent = '';
      this.folder1Zone.classList.remove('has-folder', 'differences', 'identical');
      this.clearFolder1Btn.classList.add('hidden');
      this.folder1Tree.innerHTML = '';
    } else {
      this.folder2 = null;
      this.folder2Structure = null;
      this.folder2Path.textContent = '';
      this.folder2Name.textContent = '';
      this.folder2Zone.classList.remove('has-folder', 'differences', 'identical');
      this.clearFolder2Btn.classList.add('hidden');
      this.folder2Tree.innerHTML = '';
    }

    this.updateDropZoneStates();
    this.updateSyncButtonState();

    if (isFolder1 && this.folder2Structure) {
      this.displayFolderStructure(this.folder2Structure, this.folder2Tree, 'folder2', null);
    } else if (!isFolder1 && this.folder1Structure) {
      this.displayFolderStructure(this.folder1Structure, this.folder1Tree, 'folder1', null);
    }

    // Reset the status map if both folders are cleared
    if (!this.folder1Structure && !this.folder2Structure) {
      this.lastStatusMap = null;
    }
  }

  private updateDropZoneStates() {
    this.folder1Zone.classList.remove('differences', 'identical');
    this.folder2Zone.classList.remove('differences', 'identical');
  }

  private updateSyncButtonState() {
    const bothFoldersSelected = this.folder1 && this.folder2;
    this.syncLeftToRightBtn.disabled = !bothFoldersSelected;
    this.syncRightToLeftBtn.disabled = !bothFoldersSelected;
  }

  private async performSync(direction: 'left-to-right' | 'right-to-left') {
    if (!this.folder1 || !this.folder2) return;

    const button = direction === 'left-to-right' ? this.syncLeftToRightBtn : this.syncRightToLeftBtn;

    try {
      button.classList.add('loading');
      button.disabled = true;

      const result =
        direction === 'left-to-right'
          ? await window.fileSystemAPI.syncFoldersLeftToRight(this.folder1, this.folder2)
          : await window.fileSystemAPI.syncFoldersRightToLeft(this.folder1, this.folder2);

      if (result.success) {
        button.classList.remove('loading');
        button.classList.add('success');

        // Show warning notification when no items were copied
        if (result.copied === 0) {
          this.notificationManager.show({
            type: 'warning',
            title: 'Nothing to Sync',
            message: 'No files needed to be copied. Folders are already in sync.',
            duration: 4000,
          });
        } else {
          this.notificationManager.show({
            type: 'success',
            title: 'Sync Complete!',
            message: `Successfully copied ${result.copied} items${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ''}`,
            duration: 4000,
          });
        }

        await this.refreshAfterSync();
      } else {
        button.classList.remove('loading');
        button.classList.add('error');

        this.notificationManager.show({
          type: 'error',
          title: 'Sync Failed',
          message:
            result.message + (result.errors.length > 0 ? `\nErrors: ${result.errors.slice(0, 3).join(', ')}` : ''),
          duration: 6000,
        });
      }

      setTimeout(() => {
        button.classList.remove('success', 'error');
        button.disabled = false;
      }, 3000);
    } catch (error) {
      button.classList.remove('loading');
      button.classList.add('error');

      this.notificationManager.show({
        type: 'error',
        title: 'Sync Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 6000,
      });

      setTimeout(() => {
        button.classList.remove('error');
        button.disabled = false;
      }, 3000);
    }
  }

  private async refreshAfterSync() {
    try {
      if (this.folder1) await this.loadFolder1Structure();
      if (this.folder2) await this.loadFolder2Structure();

      if (this.folder1Structure && this.folder2Structure) {
        await this.compareLoadedFolders();
      }
    } catch (error) {
      this.notificationManager.show({
        type: 'error',
        title: 'Refresh Error',
        message: 'Could not refresh folder views after sync',
        duration: 4000,
      });
    }
  }

  private async handleDrop(event: DragEvent, isFolder1: boolean) {
    let filePath: string | null = null;

    const internalPath = event.dataTransfer?.getData('application/x-folder-path');
    if (internalPath) {
      filePath = internalPath;
    } else {
      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;
      filePath = (files[0] as any).path;
    }

    if (!filePath) return;

    try {
      const pathInfo = await window.fileSystemAPI.checkPath(filePath);
      if (!pathInfo.exists || !pathInfo.isDirectory) {
        this.notificationManager.show({
          type: 'error',
          title: 'Invalid Drop',
          message: 'Please drop a folder, not a file or invalid path.',
          duration: 4000,
        });
        return;
      }
      if (isFolder1) {
        this.folder1 = filePath;
        this.folder1Path.textContent = filePath;
        this.folder1Zone.classList.remove('differences', 'identical');
        this.folder1Zone.classList.add('has-folder');
        this.folder2Zone.classList.remove('differences', 'identical');
        this.folder1Name.textContent = this.getBaseName(filePath);
        this.clearFolder1Btn.classList.remove('hidden');
        await this.loadFolder1Structure();
      } else {
        this.folder2 = filePath;
        this.folder2Path.textContent = filePath;
        this.folder2Zone.classList.remove('differences', 'identical');
        this.folder2Zone.classList.add('has-folder');
        this.folder1Zone.classList.remove('differences', 'identical');
        this.folder2Name.textContent = this.getBaseName(filePath);
        this.clearFolder2Btn.classList.remove('hidden');
        await this.loadFolder2Structure();
      }

      this.updateSyncButtonState();
    } catch (error) {
      this.notificationManager.show({
        type: 'error',
        title: 'Drop Error',
        message: `Error processing the dropped folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private getBaseName(filePath: string): string {
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  }

  private async showFolderPicker(_isFolder1: boolean) {
    // Future enhancement placeholder
  }

  private async loadFolder1Structure() {
    if (!this.folder1) return;

    try {
      this.folder1Tree.innerHTML = '<div class="dual-tree-loading">Loading folder structure...</div>';
      this.folder1Structure = await window.fileSystemAPI.scanDirectoryRecursive(this.folder1);

      this.displayFolderStructure(this.folder1Structure, this.folder1Tree, 'folder1', null);

      if (this.folder1Structure && this.folder2Structure) {
        await this.compareLoadedFolders();
      }
    } catch (error) {
      this.folder1Tree.innerHTML = '<div class="dual-tree-empty">Error loading folder structure</div>';
      this.folder1Structure = null;

      this.notificationManager.show({
        type: 'error',
        title: 'Folder Load Error',
        message: `Could not load folder structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private async loadFolder2Structure() {
    if (!this.folder2) return;

    try {
      this.folder2Tree.innerHTML = '<div class="dual-tree-loading">Loading folder structure...</div>';
      this.folder2Structure = await window.fileSystemAPI.scanDirectoryRecursive(this.folder2);

      this.displayFolderStructure(this.folder2Structure, this.folder2Tree, 'folder2', null);

      if (this.folder1Structure && this.folder2Structure) {
        await this.compareLoadedFolders();
      }
    } catch (error) {
      this.folder2Tree.innerHTML = '<div class="dual-tree-empty">Error loading folder structure</div>';
      this.folder2Structure = null;

      this.notificationManager.show({
        type: 'error',
        title: 'Folder Load Error',
        message: `Could not load folder structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private async compareLoadedFolders() {
    if (!this.folder1 || !this.folder2 || !this.folder1Structure || !this.folder2Structure) return;

    try {
      const comparisonResult = await window.fileSystemAPI.compareFolders(this.folder1, this.folder2);
      const hasDifferences = this.checkForDifferences(comparisonResult);

      this.folder1Zone.classList.remove('differences', 'identical');
      this.folder2Zone.classList.remove('differences', 'identical');

      if (hasDifferences) {
        this.folder1Zone.classList.add('differences');
        this.folder2Zone.classList.add('differences');
      } else {
        this.folder1Zone.classList.add('identical');
        this.folder2Zone.classList.add('identical');
      }

      this.buildDualTreeView(this.folder1Structure, this.folder2Structure, comparisonResult);
    } catch (error) {
      this.folder1Tree.innerHTML = '<div class="dual-tree-empty">Error comparing folders</div>';
      this.folder2Tree.innerHTML = '<div class="dual-tree-empty">Error comparing folders</div>';

      this.notificationManager.show({
        type: 'error',
        title: 'Comparison Error',
        message: `Could not compare folders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private checkForDifferences(comparisonResult: FolderComparisonResult[]): boolean {
    const hasDifferencesInItems = (items: FolderComparisonResult[]): boolean => {
      for (const item of items) {
        // Consider modified files as differences too
        if (item.status === 'added' || item.status === 'removed' || item.status === 'modified') return true;
        if (item.children && hasDifferencesInItems(item.children)) return true;
      }
      return false;
    };

    return hasDifferencesInItems(comparisonResult);
  }

  private displayFolderStructure(
    structure: FileItem[],
    container: HTMLElement,
    treeType: 'folder1' | 'folder2',
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'> | null
  ) {
    container.innerHTML = '';

    if (structure.length === 0) {
      container.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
      return;
    }

    structure.forEach(item => {
      const node = this.createDualTreeNode(item, 0, statusMap || new Map(), treeType);
      container.appendChild(node.element);
    });
  }

  private buildDualTreeView(
    folder1Structure: FileItem[],
    folder2Structure: FileItem[],
    comparisonResult: FolderComparisonResult[]
  ) {
    const statusMap = new Map<string, 'removed' | 'added' | 'common' | 'modified'>();

    const buildStatusMap = (items: FolderComparisonResult[], prefix = '') => {
      items.forEach(item => {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        statusMap.set(fullPath, item.status);
        if (item.children) buildStatusMap(item.children, fullPath);
      });
    };
    buildStatusMap(comparisonResult);

    // Store the status map for later use when toggling filters
    this.lastStatusMap = statusMap;

    this.folder1Tree.innerHTML = '';
    if (folder1Structure.length === 0) {
      this.folder1Tree.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
    } else {
      folder1Structure.forEach(item => {
        const node = this.createDualTreeNode(item, 0, statusMap, 'folder1');
        this.folder1Tree.appendChild(node.element);
      });
    }

    this.folder2Tree.innerHTML = '';
    if (folder2Structure.length === 0) {
      this.folder2Tree.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
    } else {
      folder2Structure.forEach(item => {
        const node = this.createDualTreeNode(item, 0, statusMap, 'folder2');
        this.folder2Tree.appendChild(node.element);
      });
    }

    // Apply diff filtering based on current toggle state
    if (this.showDifferencesOnly) {
      this.applyDiffFilter(statusMap);
    }
  }

  private applyDiffFilter(statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>) {
    // Apply filter to both tree views
    this.filterTreeNodes(this.folder1Tree, 'folder1', statusMap);
    this.filterTreeNodes(this.folder2Tree, 'folder2', statusMap);
  }

  private filterTreeNodes(
    container: HTMLElement,
    _treeType: 'folder1' | 'folder2',
    _statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>
  ) {
    // Get all tree items
    const treeItems = container.querySelectorAll('.dual-tree-item');

    // Process each item
    treeItems.forEach(item => {
      const itemContent = item.querySelector('.dual-tree-item-content');
      const status = itemContent?.classList.contains('common') ? 'common' : null;
      const isDirectory = itemContent?.getAttribute('data-type') === 'directory';

      // If the item is a common file (not modified), hide it when filter is on
      if (status === 'common' && !isDirectory && this.showDifferencesOnly) {
        (item as HTMLElement).classList.add('filtered');
      } else {
        (item as HTMLElement).classList.remove('filtered');
      }

      // If it's a directory, check if it has any differences in its children
      if (isDirectory) {
        const childrenContainer = item.querySelector('.dual-tree-children');
        if (childrenContainer) {
          // Count visible (non-filtered) child items
          const visibleChildren = Array.from(childrenContainer.querySelectorAll('.dual-tree-item')).filter(
            child => !child.classList.contains('filtered')
          );

          // If all direct children are filtered/hidden and we're showing differences only, hide this directory too
          if (visibleChildren.length === 0 && this.showDifferencesOnly) {
            // Only hide directory if it's marked as common (no differences)
            if (status === 'common') {
              (item as HTMLElement).classList.add('filtered');
            }
          } else {
            (item as HTMLElement).classList.remove('filtered');
          }
        }
      }
    });
  }

  private createDualTreeNode(
    item: FileItem,
    level: number,
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>,
    treeType: 'folder1' | 'folder2',
    pathPrefix = ''
  ): DualTreeNode {
    const fullPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;
    const status = statusMap.get(fullPath);

    let displayStatus: 'removed' | 'added' | 'common' | 'modified' | 'missing';

    if (item.type === 'directory' && item.children) {
      const hasChildDifferences = this.hasChildrenWithDifferences(item, statusMap, fullPath);

      if (hasChildDifferences) {
        if (treeType === 'folder1') {
          displayStatus = this.hasRemovedChildren(item, statusMap, fullPath) ? 'removed' : 'common';
        } else {
          displayStatus = this.hasAddedChildren(item, statusMap, fullPath) ? 'added' : 'common';
        }
      } else {
        if (status === undefined) {
          displayStatus = 'common';
        } else if (treeType === 'folder1') {
          displayStatus = status === 'removed' ? 'removed' : status;
        } else {
          displayStatus = status === 'added' ? 'added' : status;
        }
      }
    } else {
      if (status === undefined) {
        displayStatus = 'common';
      } else if (treeType === 'folder1') {
        displayStatus = status === 'removed' ? 'removed' : status;
      } else {
        displayStatus = status === 'added' ? 'added' : status;
      }
    }

    const node: DualTreeNode = {
      item,
      element: this.createElement('div', 'dual-tree-item'),
      isExpanded: false,
      status: displayStatus,
    };

    const content = this.createElement('div', 'dual-tree-item-content');
    content.classList.add(displayStatus);
    content.setAttribute('data-type', item.type);
    content.style.paddingLeft = `${level * 16 + 8}px`;

    const expandIcon = this.createElement('span', 'dual-tree-expand-icon');
    if (item.type === 'directory' && item.children && item.children.length > 0) {
      expandIcon.classList.add('expandable', 'collapsed');
      expandIcon.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleDualTreeNode(node, statusMap, treeType, fullPath);
      });
    } else {
      expandIcon.classList.add('file');
    }

    const label = this.createElement('span', 'dual-tree-item-label');
    label.textContent = item.name;

    const statusIcon = this.createElement('span', 'dual-tree-status-icon');
    statusIcon.classList.add(displayStatus);

    content.appendChild(expandIcon);
    content.appendChild(label);
    content.appendChild(statusIcon);
    node.element.appendChild(content);

    if (item.type === 'directory' && item.children && item.children.length > 0) {
      node.childrenContainer = this.createElement('div', 'dual-tree-children');

      item.children.forEach(child => {
        const childNode = this.createDualTreeNode(child, level + 1, statusMap, treeType, fullPath);
        node.childrenContainer!.appendChild(childNode.element);
      });

      node.element.appendChild(node.childrenContainer);
    }

    return node;
  }

  private hasChildrenWithDifferences(
    item: FileItem,
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>,
    parentPath: string
  ): boolean {
    if (!item.children) return false;

    for (const child of item.children) {
      const childPath = `${parentPath}/${child.name}`;
      const childStatus = statusMap.get(childPath);

      if (childStatus === 'removed' || childStatus === 'added') return true;

      if (child.type === 'directory' && this.hasChildrenWithDifferences(child, statusMap, childPath)) {
        return true;
      }
    }

    return false;
  }

  private hasRemovedChildren(
    item: FileItem,
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>,
    parentPath: string
  ): boolean {
    if (!item.children) return false;

    for (const child of item.children) {
      const childPath = `${parentPath}/${child.name}`;
      const childStatus = statusMap.get(childPath);

      if (childStatus === 'removed') return true;
      if (child.type === 'directory' && this.hasRemovedChildren(child, statusMap, childPath)) return true;
    }

    return false;
  }

  private hasAddedChildren(
    item: FileItem,
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>,
    parentPath: string
  ): boolean {
    if (!item.children) return false;

    for (const child of item.children) {
      const childPath = `${parentPath}/${child.name}`;
      const childStatus = statusMap.get(childPath);

      if (childStatus === 'added') return true;
      if (child.type === 'directory' && this.hasAddedChildren(child, statusMap, childPath)) return true;
    }

    return false;
  }

  private toggleDualTreeNode(
    node: DualTreeNode,
    statusMap: Map<string, 'removed' | 'added' | 'common' | 'modified'>,
    treeType: 'folder1' | 'folder2',
    _pathPrefix: string
  ) {
    if (!node.childrenContainer) return;

    const expandIcon = node.element.querySelector('.dual-tree-expand-icon')!;
    const childrenContainer = node.childrenContainer;

    if (node.isExpanded) {
      node.isExpanded = false;
      childrenContainer.classList.remove('expanded');
      expandIcon.classList.remove('expanded');
      expandIcon.classList.add('collapsed');
    } else {
      node.isExpanded = true;
      childrenContainer.classList.add('expanded');
      expandIcon.classList.remove('collapsed');
      expandIcon.classList.add('expanded');

      // If we're showing differences only, apply filtering to children when expanding
      if (this.showDifferencesOnly) {
        this.filterTreeNodes(childrenContainer, treeType, statusMap);
      }
    }
  }

  private createElement(tag: string, className?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
  }
}
