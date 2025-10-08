import { FileItem, FolderComparisonResult, DualTreeNode, FolderInfo, NWayComparisonResult, RepairItem } from '../types';
import { NotificationManager } from './NotificationManager';
import { ConfirmationDialog } from './ConfirmationDialog';

export class NWayFolderComparisonManager {
  private dropZonesContainer: HTMLElement;
  private syncButtonsContainer: HTMLElement;
  private treeColumnsContainer: HTMLElement;
  private addFolderBtn: HTMLButtonElement;
  private removeFolderBtn: HTMLButtonElement;
  private repairBtn: HTMLButtonElement;
  private diffOnlyToggle: HTMLInputElement;
  private notificationManager: NotificationManager;
  private confirmationDialog: ConfirmationDialog;

  private folders: FolderInfo[] = [];
  private showDifferencesOnly = true;
  private lastComparisonResult: NWayComparisonResult | null = null;

  constructor() {
    this.initializeElements();
    this.notificationManager = new NotificationManager();
    this.confirmationDialog = new ConfirmationDialog();

    this.initializeControls();
    this.initializeToggleSwitch();
    this.createInitialFolders();
  }

  private initializeElements() {
    this.dropZonesContainer = document.getElementById('drop-zones-container')!;
    this.syncButtonsContainer = document.getElementById('sync-buttons-container')!;
    this.treeColumnsContainer = document.getElementById('tree-columns-container')!;
    this.addFolderBtn = document.getElementById('add-folder-btn')! as HTMLButtonElement;
    this.removeFolderBtn = document.getElementById('remove-folder-btn')! as HTMLButtonElement;
    this.repairBtn = document.getElementById('repair-btn')! as HTMLButtonElement;
    this.diffOnlyToggle = document.getElementById('diff-only-toggle')! as HTMLInputElement;
  }

  private initializeControls() {
    this.addFolderBtn.addEventListener('click', () => this.addFolder());
    this.repairBtn.addEventListener('click', () => this.showRepairConfirmation());
    // Header remove button is hidden - using individual X buttons instead
  }

  private initializeToggleSwitch() {
    this.showDifferencesOnly = this.diffOnlyToggle.checked;

    this.diffOnlyToggle.addEventListener('change', () => {
      this.showDifferencesOnly = this.diffOnlyToggle.checked;
      if (this.lastComparisonResult) {
        this.applyDiffFilter();
      }
    });
  }

  private createInitialFolders() {
    // Start with 2 folders like the original
    this.addFolder();
    this.addFolder();
    this.updateHeaderButtons(); // Initialize button visibility
  }

  private addFolder() {
    const folderIndex = this.folders.length;
    const folderInfo: FolderInfo = {
      path: '',
      name: '',
      structure: null,
    };

    this.folders.push(folderInfo);
    this.createDropZone(folderIndex);
    this.createTreeColumn(folderIndex);
    this.updateSyncButtons();
    this.updateHeaderButtons();
    this.updateIndividualRemoveButtons();
    this.updateRepairButton();
    this.updateLayoutAttributes();
  }

  private removeFolder(index: number) {
    if (this.folders.length <= 2) {
      this.notificationManager.show({
        type: 'warning',
        title: 'Minimum Folders Required',
        message: 'At least 2 folders are required for comparison.',
        duration: 3000,
      });
      return;
    }

    // Remove the folder from the array
    this.folders.splice(index, 1);

    // Rebuild the entire UI to avoid index issues
    this.rebuildUI();

    this.updateSyncButtons();
    this.updateHeaderButtons();
    this.updateRepairButton();

    // Refresh comparison if we still have folders with structures
    const foldersWithStructure = this.folders.filter(f => f.structure !== null);
    if (foldersWithStructure.length >= 2) {
      this.performNWayComparison();
    }
  }

  private rebuildUI() {
    // Clear existing UI
    this.dropZonesContainer.innerHTML = '';
    this.treeColumnsContainer.innerHTML = '';

    // Rebuild drop zones and tree columns
    this.folders.forEach((folder, index) => {
      this.createDropZone(index);
      this.createTreeColumn(index);

      // Restore folder data if it exists
      if (folder.path) {
        this.restoreFolderData(index, folder);
      }
    });

    // Update individual remove button visibility
    this.updateIndividualRemoveButtons();

    // Update layout attributes for responsive behavior
    this.updateLayoutAttributes();
  }

  private restoreFolderData(index: number, folder: FolderInfo) {
    const dropZone = document.getElementById(`folder${index}-zone`)!;
    const pathElement = document.getElementById(`folder${index}-path`)!;
    const nameElement = document.getElementById(`folder${index}-name`)!;
    const removeBtn = dropZone.querySelector('.remove-folder-btn')!;
    const treeView = document.getElementById(`folder${index}-tree`)!;

    // Restore UI state
    pathElement.textContent = folder.path;
    nameElement.textContent = folder.name;
    dropZone.classList.add('has-folder');

    if (this.folders.length > 2) {
      removeBtn.classList.remove('hidden');
    }

    // Restore tree structure if available
    if (folder.structure) {
      if (folder.structure.length === 0) {
        treeView.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
      } else {
        this.displayFolderStructure(folder.structure, treeView, index);
      }
    }
  }

  private updateIndividualRemoveButtons() {
    const removeButtons = this.dropZonesContainer.querySelectorAll('.remove-folder-btn');
    removeButtons.forEach(btn => {
      if (this.folders.length <= 2) {
        btn.classList.add('hidden');
      } else {
        btn.classList.remove('hidden');
      }
    });
  }

  private createDropZone(index: number) {
    const dropZone = document.createElement('div');
    dropZone.className = 'drop-zone';
    dropZone.id = `folder${index}-zone`;

    const content = document.createElement('div');
    content.className = 'drop-zone-content';

    const icon = document.createElement('div');
    icon.className = 'drop-icon';
    icon.textContent = '📁';

    const text = document.createElement('div');
    text.className = 'drop-text';
    text.textContent = 'Drop Folder';

    const path = document.createElement('div');
    path.className = 'folder-path';
    path.id = `folder${index}-path`;

    content.appendChild(icon);
    content.appendChild(text);
    content.appendChild(path);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-folder-btn';
    removeBtn.title = `Remove Folder ${index + 1}`;
    removeBtn.innerHTML = '<span class="clear-icon">×</span>';

    // Show/hide based on folder count and whether this folder has content
    if (this.folders.length <= 2) {
      removeBtn.classList.add('hidden');
    }

    removeBtn.addEventListener('click', e => {
      e.stopPropagation();
      this.removeFolder(index);
    });

    dropZone.appendChild(content);
    dropZone.appendChild(removeBtn);

    this.initializeDragAndDrop(dropZone, index);
    this.dropZonesContainer.appendChild(dropZone);
  }

  private createTreeColumn(index: number) {
    const column = document.createElement('div');
    column.className = 'tree-column';

    const header = document.createElement('div');
    header.className = 'tree-column-header';

    const title = document.createElement('h4');
    title.textContent = `Folder ${index + 1}`;

    const folderName = document.createElement('span');
    folderName.className = 'folder-name';
    folderName.id = `folder${index}-name`;

    header.appendChild(title);
    header.appendChild(folderName);

    const treeView = document.createElement('div');
    treeView.className = 'tree-view';
    treeView.id = `folder${index}-tree`;

    column.appendChild(header);
    column.appendChild(treeView);

    this.treeColumnsContainer.appendChild(column);
  }

  private initializeDragAndDrop(dropZone: HTMLElement, index: number) {
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', e => {
      e.preventDefault();
      if (!dropZone.contains(e.relatedTarget as Node)) {
        dropZone.classList.remove('drag-over');
      }
    });

    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      this.handleDrop(e, index);
    });

    dropZone.addEventListener('click', () => this.showFolderPicker(index));
  }

  private async handleDrop(event: DragEvent, index: number) {
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

      await this.setFolder(index, filePath);
    } catch (error) {
      this.notificationManager.show({
        type: 'error',
        title: 'Drop Error',
        message: `Error processing the dropped folder: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private async setFolder(index: number, filePath: string) {
    const folder = this.folders[index];
    folder.path = filePath;
    folder.name = this.getBaseName(filePath);

    const pathElement = document.getElementById(`folder${index}-path`)!;
    const nameElement = document.getElementById(`folder${index}-name`)!;
    const dropZone = document.getElementById(`folder${index}-zone`)!;
    const removeBtn = dropZone.querySelector('.remove-folder-btn')!;

    pathElement.textContent = filePath;
    nameElement.textContent = folder.name;
    dropZone.classList.add('has-folder');

    // Only show individual remove button if we have more than 2 folders
    if (this.folders.length > 2) {
      removeBtn.classList.remove('hidden');
    }

    await this.loadFolderStructure(index);
    this.updateSyncButtons();
    this.updateIndividualRemoveButtons();

    // Perform comparison if we have at least 2 folders with structures
    const foldersWithStructure = this.folders.filter(f => f.structure !== null);
    if (foldersWithStructure.length >= 2) {
      await this.performNWayComparison();
    }
  }

  private async loadFolderStructure(index: number) {
    const folder = this.folders[index];
    if (!folder.path) return;

    const treeView = document.getElementById(`folder${index}-tree`)!;

    try {
      treeView.innerHTML = '<div class="dual-tree-loading">Loading folder structure...</div>';
      folder.structure = await window.fileSystemAPI.scanDirectoryRecursive(folder.path);

      if (folder.structure.length === 0) {
        treeView.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
      } else {
        this.displayFolderStructure(folder.structure, treeView, index);
      }
    } catch (error) {
      treeView.innerHTML = '<div class="dual-tree-empty">Error loading folder structure</div>';
      folder.structure = null;

      this.notificationManager.show({
        type: 'error',
        title: 'Folder Load Error',
        message: `Could not load folder structure: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private async performNWayComparison() {
    const foldersWithStructure = this.folders.filter(f => f.structure !== null);
    if (foldersWithStructure.length < 2) return;

    try {
      const comparisonResult = await window.fileSystemAPI.compareNWayFolders(
        foldersWithStructure.map(f => ({ path: f.path, structure: f.structure! }))
      );

      this.lastComparisonResult = {
        folders: [...this.folders],
        comparison: comparisonResult,
      };

      this.updateDropZoneStates(comparisonResult);
      this.buildNWayTreeView(comparisonResult);

      // Update sync buttons after comparison to show/hide based on differences
      this.updateSyncButtons();

      // Update repair button visibility
      this.updateRepairButton();
    } catch (error) {
      this.notificationManager.show({
        type: 'error',
        title: 'Comparison Error',
        message: `Could not compare folders: ${error instanceof Error ? error.message : 'Unknown error'}`,
        duration: 5000,
      });
    }
  }

  private updateDropZoneStates(comparisonResult: FolderComparisonResult[]) {
    const hasDifferences = this.checkForDifferences(comparisonResult);

    this.folders.forEach((_, index) => {
      const dropZone = document.getElementById(`folder${index}-zone`)!;
      dropZone.classList.remove('differences', 'identical');

      if (this.folders[index].structure) {
        if (hasDifferences) {
          dropZone.classList.add('differences');
        } else {
          dropZone.classList.add('identical');
        }
      }
    });
  }

  private checkForDifferences(comparisonResult: FolderComparisonResult[]): boolean {
    const hasDifferencesInItems = (items: FolderComparisonResult[]): boolean => {
      for (const item of items) {
        if (
          item.status === 'majority' ||
          item.status === 'minority' ||
          item.status === 'added' ||
          item.status === 'removed' ||
          item.status === 'modified'
        ) {
          return true;
        }
        if (item.children && hasDifferencesInItems(item.children)) return true;
      }
      return false;
    };

    return hasDifferencesInItems(comparisonResult);
  }

  private buildNWayTreeView(comparisonResult: FolderComparisonResult[]) {
    this.folders.forEach((folder, index) => {
      if (!folder.structure) return;

      const treeView = document.getElementById(`folder${index}-tree`)!;
      treeView.innerHTML = '';

      if (folder.structure.length === 0) {
        treeView.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
      } else {
        const statusMap = this.buildStatusMap(comparisonResult, index);
        folder.structure.forEach(item => {
          const node = this.createNWayTreeNode(item, 0, statusMap, index);
          treeView.appendChild(node.element);
        });
      }
    });

    if (this.showDifferencesOnly) {
      this.applyDiffFilter();
    }
  }

  private buildStatusMap(comparisonResult: FolderComparisonResult[], folderIndex: number): Map<string, string> {
    const statusMap = new Map<string, string>();

    const buildMap = (items: FolderComparisonResult[], prefix = '') => {
      items.forEach(item => {
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

        // Determine status for this specific folder
        let status = 'common';
        if (item.presentInFolders && !item.presentInFolders.includes(folderIndex)) {
          status = 'missing';
        } else if (item.majorityStatus) {
          status = item.majorityStatus;
        } else if (item.status !== 'common') {
          status = item.status;
        }

        statusMap.set(fullPath, status);
        if (item.children) buildMap(item.children, fullPath);
      });
    };

    buildMap(comparisonResult);
    return statusMap;
  }

  private displayFolderStructure(structure: FileItem[], container: HTMLElement, folderIndex: number) {
    container.innerHTML = '';

    if (structure.length === 0) {
      container.innerHTML = '<div class="dual-tree-empty">Empty folder</div>';
      return;
    }

    structure.forEach(item => {
      const node = this.createNWayTreeNode(item, 0, new Map(), folderIndex);
      container.appendChild(node.element);
    });
  }

  private createNWayTreeNode(
    item: FileItem,
    level: number,
    statusMap: Map<string, string>,
    folderIndex: number,
    pathPrefix = ''
  ): DualTreeNode {
    const fullPath = pathPrefix ? `${pathPrefix}/${item.name}` : item.name;
    const status = statusMap.get(fullPath) || 'common';

    const node: DualTreeNode = {
      item,
      element: this.createElement('div', 'dual-tree-item'),
      isExpanded: false,
      status: status as any,
    };

    const content = this.createElement('div', 'dual-tree-item-content');
    content.classList.add(status);
    content.setAttribute('data-type', item.type);
    content.style.paddingLeft = `${level * 16 + 8}px`;

    const expandIcon = this.createElement('span', 'dual-tree-expand-icon');
    if (item.type === 'directory' && item.children && item.children.length > 0) {
      expandIcon.classList.add('expandable', 'collapsed');
      expandIcon.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleNWayTreeNode(node, statusMap, folderIndex, fullPath);
      });
    } else {
      expandIcon.classList.add('file');
    }

    const label = this.createElement('span', 'dual-tree-item-label');
    label.textContent = item.name;

    const statusIcon = this.createElement('span', 'dual-tree-status-icon');
    statusIcon.classList.add(status);

    content.appendChild(expandIcon);
    content.appendChild(label);
    content.appendChild(statusIcon);
    node.element.appendChild(content);

    if (item.type === 'directory' && item.children && item.children.length > 0) {
      node.childrenContainer = this.createElement('div', 'dual-tree-children');

      item.children.forEach(child => {
        const childNode = this.createNWayTreeNode(child, level + 1, statusMap, folderIndex, fullPath);
        node.childrenContainer!.appendChild(childNode.element);
      });

      node.element.appendChild(node.childrenContainer);
    }

    return node;
  }

  private toggleNWayTreeNode(
    node: DualTreeNode,
    _statusMap: Map<string, string>,
    _folderIndex: number,
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

      if (this.showDifferencesOnly) {
        this.filterTreeNodes(childrenContainer);
      }
    }
  }

  private applyDiffFilter() {
    this.folders.forEach((_, index) => {
      const treeView = document.getElementById(`folder${index}-tree`)!;
      this.filterTreeNodes(treeView);
    });
  }

  private filterTreeNodes(container: HTMLElement) {
    const treeItems = container.querySelectorAll('.dual-tree-item');

    treeItems.forEach(item => {
      const itemContent = item.querySelector('.dual-tree-item-content');
      const isCommon = itemContent?.classList.contains('common');
      const isDirectory = itemContent?.getAttribute('data-type') === 'directory';

      if (isCommon && !isDirectory && this.showDifferencesOnly) {
        (item as HTMLElement).classList.add('filtered');
      } else {
        (item as HTMLElement).classList.remove('filtered');
      }

      if (isDirectory) {
        const childrenContainer = item.querySelector('.dual-tree-children');
        if (childrenContainer) {
          const visibleChildren = Array.from(childrenContainer.querySelectorAll('.dual-tree-item')).filter(
            child => !child.classList.contains('filtered')
          );

          if (visibleChildren.length === 0 && this.showDifferencesOnly && isCommon) {
            (item as HTMLElement).classList.add('filtered');
          } else {
            (item as HTMLElement).classList.remove('filtered');
          }
        }
      }
    });
  }

  private updateSyncButtons() {
    const syncControlsContainer = this.syncButtonsContainer.parentElement!.parentElement!;
    const syncControls = this.syncButtonsContainer.parentElement!;

    // Clear existing content
    this.syncButtonsContainer.innerHTML = '';

    // Remove existing header if present
    const existingHeader = syncControls.querySelector('h5');
    if (existingHeader) {
      existingHeader.remove();
    }

    const foldersWithStructure = this.folders.filter(f => f.structure !== null);
    if (foldersWithStructure.length < 2) {
      // Hide the entire sync controls container if no sync is possible
      syncControlsContainer.style.display = 'none';
      return;
    }

    // Check if there are any differences between folders
    if (!this.hasFolderDifferences()) {
      // Show a message that folders are identical instead of sync controls
      syncControlsContainer.style.display = 'flex';

      const identicalHeader = document.createElement('h5');
      identicalHeader.textContent = '✓ All folders are identical';
      identicalHeader.className = 'folders-identical-message';
      syncControls.insertBefore(identicalHeader, this.syncButtonsContainer);

      // Create a message container instead of sync interface
      const identicalMessage = document.createElement('div');
      identicalMessage.className = 'folders-identical-container';
      identicalMessage.innerHTML = `
        <div class="folders-identical-content">
          <span class="identical-icon">🎉</span>
          <p>No synchronization needed - all folders contain identical files!</p>
        </div>
      `;
      this.syncButtonsContainer.appendChild(identicalMessage);
      return;
    }

    // Show the sync controls container only when there are differences
    syncControlsContainer.style.display = 'flex';

    // Add a header for sync operations
    const syncHeader = document.createElement('h5');
    syncHeader.textContent = 'Sync Folders';
    syncControls.insertBefore(syncHeader, this.syncButtonsContainer);

    // Create the sync dropdown interface
    this.createSyncDropdownInterface();
  }

  private hasFolderDifferences(): boolean {
    // If we don't have comparison results yet, assume there might be differences
    if (!this.lastComparisonResult) {
      return true;
    }

    // Check if there are any differences in the comparison results
    return this.checkForDifferences(this.lastComparisonResult.comparison);
  }

  private updateHeaderButtons() {
    // Always hide the header remove button - we'll use individual X buttons instead
    this.removeFolderBtn.classList.add('hidden');

    // Show/hide repair button based on folder count and differences
    this.updateRepairButton();
  }

  private updateRepairButton() {
    const foldersWithStructure = this.folders.filter(f => f.structure !== null);

    // Show repair button only if:
    // 1. We have 3 or more folders with structure
    // 2. There are differences that can be repaired
    if (foldersWithStructure.length >= 3 && this.hasRepairableItems()) {
      this.repairBtn.classList.remove('hidden');
    } else {
      this.repairBtn.classList.add('hidden');
    }
  }

  private updateLayoutAttributes() {
    const folderCount = this.folders.length;

    // Update drop zones container
    this.dropZonesContainer.setAttribute('data-folder-count', folderCount.toString());
    if (folderCount >= 4) {
      this.dropZonesContainer.setAttribute('data-many-folders', 'true');
    } else {
      this.dropZonesContainer.removeAttribute('data-many-folders');
    }

    // Update tree columns container
    this.treeColumnsContainer.setAttribute('data-folder-count', folderCount.toString());
    if (folderCount >= 4) {
      this.treeColumnsContainer.setAttribute('data-many-folders', 'true');
    } else {
      this.treeColumnsContainer.removeAttribute('data-many-folders');
    }
  }

  private hasRepairableItems(): boolean {
    if (!this.lastComparisonResult) {
      return false;
    }

    // Check if there are minority items that can be repaired
    return this.checkForRepairableItems(this.lastComparisonResult.comparison);
  }

  private checkForRepairableItems(items: FolderComparisonResult[]): boolean {
    for (const item of items) {
      // Items with minority status can potentially be repaired
      if (item.status === 'minority' || item.status === 'modified') {
        return true;
      }
      if (item.children && this.checkForRepairableItems(item.children)) {
        return true;
      }
    }
    return false;
  }

  private showRepairConfirmation() {
    const repairableItems = this.getRepairableItems();

    if (repairableItems.length === 0) {
      this.notificationManager.show({
        type: 'warning',
        title: 'No Items to Repair',
        message: 'All folders are already in sync or no majority consensus found.',
        duration: 4000,
      });
      return;
    }

    // Create custom confirmation dialog for repair
    this.showRepairDialog(repairableItems);
  }

  private showRepairDialog(repairableItems: RepairItem[]) {
    const overlay = document.createElement('div');
    overlay.className = 'confirmation-overlay show';
    overlay.id = 'repair-confirmation-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'confirmation-dialog';

    dialog.innerHTML = `
      <div class="confirmation-header">
        <h3>🔧 Repair Folders - Intelligent Diff</h3>
        <button class="confirmation-close" id="repair-confirm-close">×</button>
      </div>
      <div class="confirmation-body">
        <div class="repair-summary">
          <h4>Items to be repaired (${repairableItems.length} total):</h4>
          <ul class="repair-items-list">
            ${repairableItems
              .slice(0, 10)
              .map(
                item => `
              <li>
                <strong>${item.name}</strong> 
                <span class="repair-action">${item.action}</span>
                <div class="repair-details">
                  Present in: ${item.majorityFolders.map(i => this.folders[i].name || `Folder ${i + 1}`).join(', ')}
                  <br>Missing/Different in: ${item.minorityFolders.map(i => this.folders[i].name || `Folder ${i + 1}`).join(', ')}
                </div>
              </li>
            `
              )
              .join('')}
            ${repairableItems.length > 10 ? `<li><em>... and ${repairableItems.length - 10} more items</em></li>` : ''}
          </ul>
        </div>
        <div class="repair-warning">
          <p><strong>⚠️ WARNING:</strong> This operation will overwrite files when intelligence detects file corruption</p>
        </div>
      </div>
      <div class="confirmation-actions">
        <button class="btn-cancel" id="repair-confirm-cancel">Cancel</button>
        <button class="btn-confirm repair-confirm-btn" id="repair-confirm-proceed">Proceed with Repair</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Event listeners
    const closeBtn = dialog.querySelector('#repair-confirm-close') as HTMLButtonElement;
    const cancelBtn = dialog.querySelector('#repair-confirm-cancel') as HTMLButtonElement;
    const proceedBtn = dialog.querySelector('#repair-confirm-proceed') as HTMLButtonElement;

    const closeDialog = () => {
      overlay.classList.remove('show');
      setTimeout(() => document.body.removeChild(overlay), 300);
    };

    closeBtn.addEventListener('click', closeDialog);
    cancelBtn.addEventListener('click', closeDialog);
    proceedBtn.addEventListener('click', () => {
      closeDialog();
      this.performRepair(repairableItems);
    });

    // Close on overlay click
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeDialog();
    });
  }

  private getRepairableItems(): RepairItem[] {
    if (!this.lastComparisonResult) {
      return [];
    }

    const repairableItems: RepairItem[] = [];
    this.collectRepairableItems(this.lastComparisonResult.comparison, '', repairableItems);
    return repairableItems;
  }

  private collectRepairableItems(items: FolderComparisonResult[], parentPath: string, repairableItems: RepairItem[]) {
    for (const item of items) {
      const fullPath = parentPath ? `${parentPath}/${item.name}` : item.name;

      if (item.presentInFolders && item.presentInFolders.length > 0) {
        const totalFolders = this.folders.filter(f => f.structure !== null).length;
        const presentCount = item.presentInFolders.length;
        const isMajority = presentCount > totalFolders / 2;

        if (isMajority && presentCount < totalFolders) {
          // This item exists in majority but not all folders - can be repaired
          const majorityFolders = item.presentInFolders;
          const minorityFolders: number[] = [];

          for (let i = 0; i < this.folders.length; i++) {
            if (this.folders[i].structure && !majorityFolders.includes(i)) {
              minorityFolders.push(i);
            }
          }

          if (minorityFolders.length > 0) {
            repairableItems.push({
              name: item.name,
              path: fullPath,
              type: item.type,
              action: 'copy',
              majorityFolders,
              minorityFolders,
              sourceFolderIndex: majorityFolders[0], // Use first majority folder as source
            });
          }
        }
      }

      // Handle modified files (same name, different content)
      if (item.status === 'modified' && item.presentInFolders) {
        const totalFolders = this.folders.filter(f => f.structure !== null).length;

        // For modified files, we need to determine which version is the majority
        // This is a simplified approach - in a real implementation, you might want
        // to compare checksums to group identical versions
        if (item.presentInFolders.length > totalFolders / 2) {
          const majorityFolders = item.presentInFolders;
          const minorityFolders: number[] = [];

          for (let i = 0; i < this.folders.length; i++) {
            if (this.folders[i].structure && !majorityFolders.includes(i)) {
              minorityFolders.push(i);
            }
          }

          if (minorityFolders.length > 0) {
            repairableItems.push({
              name: item.name,
              path: fullPath,
              type: item.type,
              action: 'replace',
              majorityFolders,
              minorityFolders,
              sourceFolderIndex: majorityFolders[0],
            });
          }
        }
      }

      // Recursively check children
      if (item.children) {
        this.collectRepairableItems(item.children, fullPath, repairableItems);
      }
    }
  }

  private async performRepair(repairableItems: RepairItem[]) {
    this.repairBtn.classList.add('loading');
    this.repairBtn.disabled = true;

    let repairedCount = 0;
    const errors: string[] = [];

    try {
      for (const item of repairableItems) {
        try {
          await this.repairSingleItem(item);
          repairedCount++;
        } catch (error) {
          const errorMsg = `Failed to repair ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
        }
      }

      // Show results
      if (repairedCount > 0) {
        this.repairBtn.classList.remove('loading');
        this.repairBtn.classList.add('success');

        this.notificationManager.show({
          type: 'success',
          title: 'Repair Complete!',
          message: `Successfully repaired ${repairedCount} items${errors.length > 0 ? ` (${errors.length} errors)` : ''}`,
          duration: 5000,
        });

        // Refresh all folder structures after repair
        await this.refreshAfterRepair();
      } else {
        this.repairBtn.classList.remove('loading');
        this.repairBtn.classList.add('error');

        this.notificationManager.show({
          type: 'error',
          title: 'Repair Failed',
          message: `No items could be repaired. ${errors.length} errors occurred.`,
          duration: 6000,
        });
      }

      // Show detailed errors if any
      if (errors.length > 0 && errors.length <= 5) {
        setTimeout(() => {
          this.notificationManager.show({
            type: 'warning',
            title: 'Repair Errors',
            message: errors.slice(0, 3).join('\n'),
            duration: 8000,
          });
        }, 1000);
      }
    } catch (error) {
      this.repairBtn.classList.remove('loading');
      this.repairBtn.classList.add('error');

      this.notificationManager.show({
        type: 'error',
        title: 'Repair Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred during repair',
        duration: 6000,
      });
    }

    // Reset button state after delay
    setTimeout(() => {
      this.repairBtn.classList.remove('success', 'error');
      this.repairBtn.disabled = false;
    }, 3000);
  }

  private async repairSingleItem(item: RepairItem): Promise<void> {
    const sourceFolder = this.folders[item.sourceFolderIndex];
    const _sourcePath = `${sourceFolder.path}/${item.path}`;

    // Copy/replace the item to each minority folder
    for (const targetFolderIndex of item.minorityFolders) {
      const targetFolder = this.folders[targetFolderIndex];
      const _targetPath = `${targetFolder.path}/${item.path}`;

      if (item.type === 'file') {
        // Use the existing sync API to copy the file
        await window.fileSystemAPI.syncFoldersLeftToRight(sourceFolder.path, targetFolder.path);
      } else {
        // For directories, the sync API should handle recursive copying
        await window.fileSystemAPI.syncFoldersLeftToRight(sourceFolder.path, targetFolder.path);
      }
    }
  }

  private async refreshAfterRepair() {
    try {
      // Reload all folder structures
      for (let i = 0; i < this.folders.length; i++) {
        if (this.folders[i].path) {
          await this.loadFolderStructure(i);
        }
      }

      // Perform new comparison
      const foldersWithStructure = this.folders.filter(f => f.structure !== null);
      if (foldersWithStructure.length >= 2) {
        await this.performNWayComparison();
      }
    } catch (error) {
      this.notificationManager.show({
        type: 'error',
        title: 'Refresh Error',
        message: 'Could not refresh folder views after repair',
        duration: 4000,
      });
    }
  }

  private createSyncDropdownInterface() {
    // Create the sync interface container
    const syncInterface = document.createElement('div');
    syncInterface.className = 'sync-dropdown-interface';

    // Create "From" dropdown
    const fromContainer = document.createElement('div');
    fromContainer.className = 'sync-dropdown-container';

    const fromLabel = document.createElement('label');
    fromLabel.textContent = 'From:';
    fromLabel.className = 'sync-dropdown-label';

    const fromSelect = document.createElement('select');
    fromSelect.className = 'sync-dropdown';
    fromSelect.id = 'sync-from-select';

    fromContainer.appendChild(fromLabel);
    fromContainer.appendChild(fromSelect);

    // Create arrow
    const arrowContainer = document.createElement('div');
    arrowContainer.className = 'sync-arrow-container';
    arrowContainer.innerHTML = '<span class="sync-arrow-large">→</span>';

    // Create "To" dropdown
    const toContainer = document.createElement('div');
    toContainer.className = 'sync-dropdown-container';

    const toLabel = document.createElement('label');
    toLabel.textContent = 'To:';
    toLabel.className = 'sync-dropdown-label';

    const toSelect = document.createElement('select');
    toSelect.className = 'sync-dropdown';
    toSelect.id = 'sync-to-select';

    toContainer.appendChild(toLabel);
    toContainer.appendChild(toSelect);

    // Create sync button
    const syncButton = document.createElement('button');
    syncButton.className = 'sync-execute-btn';
    syncButton.textContent = 'Sync';
    syncButton.disabled = true;

    // Assemble the interface
    syncInterface.appendChild(fromContainer);
    syncInterface.appendChild(arrowContainer);
    syncInterface.appendChild(toContainer);
    syncInterface.appendChild(syncButton);

    this.syncButtonsContainer.appendChild(syncInterface);

    // Populate dropdowns and setup event listeners
    this.populateSyncDropdowns(fromSelect, toSelect, syncButton);
  }

  private populateSyncDropdowns(
    fromSelect: HTMLSelectElement,
    toSelect: HTMLSelectElement,
    syncButton: HTMLButtonElement
  ) {
    // Clear existing options
    fromSelect.innerHTML = '<option value="">Select source folder</option>';
    toSelect.innerHTML = '<option value="">Select destination folder</option>';

    // Add options for folders with structure
    this.folders.forEach((folder, index) => {
      if (folder.structure) {
        const displayName = folder.name || `Folder ${index + 1}`;

        const fromOption = document.createElement('option');
        fromOption.value = index.toString();
        fromOption.textContent = displayName;
        fromSelect.appendChild(fromOption);

        const toOption = document.createElement('option');
        toOption.value = index.toString();
        toOption.textContent = displayName;
        toSelect.appendChild(toOption);
      }
    });

    // Pre-fill with Folder 1 → Folder 2 if available
    const foldersWithStructure = this.folders.filter(f => f.structure !== null);
    if (foldersWithStructure.length >= 2) {
      fromSelect.value = '0'; // First folder
      this.updateToDropdownOptions(fromSelect, toSelect);
      toSelect.value = '1'; // Second folder
    }

    // Setup event listeners
    const updateSyncButton = () => {
      const fromIndex = fromSelect.value;
      const toIndex = toSelect.value;

      // Enable sync button only if both dropdowns have valid selections and they're different
      syncButton.disabled = !fromIndex || !toIndex || fromIndex === toIndex;

      // Update the "To" dropdown to exclude the selected "From" folder
      this.updateToDropdownOptions(fromSelect, toSelect);
    };

    fromSelect.addEventListener('change', updateSyncButton);
    toSelect.addEventListener('change', updateSyncButton);

    // Initial update to set correct button state
    updateSyncButton();

    // Sync button click handler
    syncButton.addEventListener('click', () => {
      const fromIndex = parseInt(fromSelect.value);
      const toIndex = parseInt(toSelect.value);

      if (!isNaN(fromIndex) && !isNaN(toIndex) && fromIndex !== toIndex) {
        this.showSyncConfirmation(fromIndex, toIndex);
      }
    });
  }

  private updateToDropdownOptions(fromSelect: HTMLSelectElement, toSelect: HTMLSelectElement) {
    const selectedFromIndex = fromSelect.value;
    const currentToValue = toSelect.value;

    // Clear and repopulate "To" dropdown
    toSelect.innerHTML = '<option value="">Select destination folder</option>';

    this.folders.forEach((folder, index) => {
      if (folder.structure && index.toString() !== selectedFromIndex) {
        const displayName = folder.name || `Folder ${index + 1}`;

        const toOption = document.createElement('option');
        toOption.value = index.toString();
        toOption.textContent = displayName;
        toSelect.appendChild(toOption);
      }
    });

    // Restore the previous selection if it's still valid
    if (currentToValue && currentToValue !== selectedFromIndex) {
      toSelect.value = currentToValue;
    }
  }

  private truncateName(name: string, maxLength: number): string {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  }

  private showSyncConfirmation(fromIndex: number, toIndex: number) {
    const fromFolder = this.folders[fromIndex];
    const toFolder = this.folders[toIndex];

    if (!fromFolder.path || !toFolder.path) return;

    this.confirmationDialog.show(fromFolder.path, toFolder.path, 'left-to-right', () =>
      this.performSync(fromIndex, toIndex)
    );
  }

  private async performSync(fromIndex: number, toIndex: number) {
    const fromFolder = this.folders[fromIndex];
    const toFolder = this.folders[toIndex];

    if (!fromFolder.path || !toFolder.path) return;

    // Find the sync execute button
    const syncButton = this.syncButtonsContainer.querySelector('.sync-execute-btn') as HTMLButtonElement;
    if (!syncButton) return;

    try {
      syncButton.classList.add('loading');
      syncButton.disabled = true;
      syncButton.textContent = '';

      const result = await window.fileSystemAPI.syncFoldersLeftToRight(fromFolder.path, toFolder.path);

      if (result.success) {
        syncButton.classList.remove('loading');
        syncButton.classList.add('success');
        syncButton.textContent = 'Success!';

        this.notificationManager.show({
          type: 'success',
          title: 'Sync Complete!',
          message: `Successfully copied ${result.copied} items from ${fromFolder.name || `Folder ${fromIndex + 1}`} to ${toFolder.name || `Folder ${toIndex + 1}`}`,
          duration: 4000,
        });

        await this.refreshAfterSync();
      } else {
        syncButton.classList.remove('loading');
        syncButton.classList.add('error');
        syncButton.textContent = 'Failed';

        this.notificationManager.show({
          type: 'error',
          title: 'Sync Failed',
          message: result.message,
          duration: 6000,
        });
      }

      setTimeout(() => {
        syncButton.classList.remove('success', 'error');
        syncButton.textContent = 'Sync';
        syncButton.disabled = false;
      }, 3000);
    } catch (error) {
      syncButton.classList.remove('loading');
      syncButton.classList.add('error');
      syncButton.textContent = 'Error';

      setTimeout(() => {
        syncButton.classList.remove('error');
        syncButton.textContent = 'Sync';
        syncButton.disabled = false;
      }, 3000);

      this.notificationManager.show({
        type: 'error',
        title: 'Sync Error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        duration: 6000,
      });
    }
  }

  private async refreshAfterSync() {
    try {
      for (let i = 0; i < this.folders.length; i++) {
        if (this.folders[i].path) {
          await this.loadFolderStructure(i);
        }
      }

      const foldersWithStructure = this.folders.filter(f => f.structure !== null);
      if (foldersWithStructure.length >= 2) {
        await this.performNWayComparison();
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

  private async showFolderPicker(_index: number) {
    // Future enhancement placeholder
  }

  private getBaseName(filePath: string): string {
    // Handle both Unix and Windows path separators
    const unixParts = filePath.split('/');
    const windowsParts = filePath.split('\\');

    // Use the split that resulted in more parts (indicating the correct separator was used)
    const parts = unixParts.length > windowsParts.length ? unixParts : windowsParts;

    return parts[parts.length - 1] || filePath;
  }

  private createElement(tag: string, className?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) element.className = className;
    return element;
  }
}
