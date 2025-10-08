import { NWayFolderComparisonManager } from '../components/NWayFolderComparisonManager';
import { NotificationManager } from '../components/NotificationManager';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { FileItem, FolderComparisonResult, FolderInfo } from '../types';

// Mock dependencies
jest.mock('../components/NotificationManager');
jest.mock('../components/ConfirmationDialog');

describe('NWayFolderComparisonManager', () => {
  let nwayManager: NWayFolderComparisonManager;
  let mockNotificationManager: jest.Mocked<NotificationManager>;
  let mockConfirmationDialog: jest.Mocked<ConfirmationDialog>;

  // DOM elements
  let dropZonesContainer: HTMLElement;
  let syncButtonsContainer: HTMLElement;
  let treeColumnsContainer: HTMLElement;
  let addFolderBtn: HTMLButtonElement;
  let removeFolderBtn: HTMLButtonElement;
  let diffOnlyToggle: HTMLInputElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div class="folder-controls">
        <div class="folder-controls-header">
          <h4>Folders to Compare</h4>
          <div class="folder-controls-buttons">
            <button class="remove-folder-header-btn hidden" id="remove-folder-btn" title="Remove a folder">
              <span class="remove-icon">−</span>
            </button>
            <button class="add-folder-btn" id="add-folder-btn" title="Add another folder">
              <span class="add-icon">+</span>
            </button>
          </div>
        </div>
        <div class="drop-zones" id="drop-zones-container">
          <!-- Folder drop zones will be dynamically added here -->
        </div>
      </div>

      <div class="sync-controls-container">
        <div class="sync-controls">
          <div class="sync-buttons" id="sync-buttons-container">
            <!-- Sync buttons will be dynamically added here -->
          </div>
        </div>
      </div>

      <div class="nway-tree-container" id="nway-tree-container">
        <div class="tree-columns" id="tree-columns-container">
          <!-- Tree columns will be dynamically added here -->
        </div>
      </div>

      <input type="checkbox" id="diff-only-toggle" checked>
    `;

    // Get DOM elements
    dropZonesContainer = document.getElementById('drop-zones-container')!;
    syncButtonsContainer = document.getElementById('sync-buttons-container')!;
    treeColumnsContainer = document.getElementById('tree-columns-container')!;
    addFolderBtn = document.getElementById('add-folder-btn') as HTMLButtonElement;
    removeFolderBtn = document.getElementById('remove-folder-btn') as HTMLButtonElement;
    diffOnlyToggle = document.getElementById('diff-only-toggle') as HTMLInputElement;

    // Mock window.fileSystemAPI
    (window as any).fileSystemAPI = {
      scanDirectoryRecursive: jest.fn(),
      compareNWayFolders: jest.fn(),
      syncFoldersLeftToRight: jest.fn(),
      syncFoldersRightToLeft: jest.fn(),
      checkPath: jest.fn(),
    };

    // Setup NotificationManager mock
    mockNotificationManager = new NotificationManager() as jest.Mocked<NotificationManager>;
    mockNotificationManager.show = jest.fn();
    (NotificationManager as jest.MockedClass<typeof NotificationManager>).mockImplementation(
      () => mockNotificationManager
    );

    // Setup ConfirmationDialog mock
    mockConfirmationDialog = new ConfirmationDialog() as jest.Mocked<ConfirmationDialog>;
    mockConfirmationDialog.show = jest.fn();
    (ConfirmationDialog as jest.MockedClass<typeof ConfirmationDialog>).mockImplementation(
      () => mockConfirmationDialog
    );

    nwayManager = new NWayFolderComparisonManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with correct DOM elements', () => {
      expect(nwayManager['dropZonesContainer']).toBe(dropZonesContainer);
      expect(nwayManager['syncButtonsContainer']).toBe(syncButtonsContainer);
      expect(nwayManager['treeColumnsContainer']).toBe(treeColumnsContainer);
      expect(nwayManager['addFolderBtn']).toBe(addFolderBtn);
      expect(nwayManager['diffOnlyToggle']).toBe(diffOnlyToggle);
    });

    it('should initialize notification manager and confirmation dialog', () => {
      expect(nwayManager['notificationManager']).toBe(mockNotificationManager);
      expect(nwayManager['confirmationDialog']).toBe(mockConfirmationDialog);
    });

    it('should start with 2 empty folders', () => {
      const folders = nwayManager['folders'];
      expect(folders).toHaveLength(2);
      expect(folders[0].path).toBe('');
      expect(folders[0].name).toBe('');
      expect(folders[0].structure).toBeNull();
      expect(folders[1].path).toBe('');
      expect(folders[1].name).toBe('');
      expect(folders[1].structure).toBeNull();
    });

    it('should create initial drop zones and tree columns', () => {
      expect(dropZonesContainer.children).toHaveLength(2);
      expect(treeColumnsContainer.children).toHaveLength(2);
    });

    it('should initialize toggle switch to checked state', () => {
      expect(diffOnlyToggle.checked).toBe(true);
      expect(nwayManager['showDifferencesOnly']).toBe(true);
    });

    it('should setup add and remove folder button event listeners', () => {
      const addEventListenerSpy = jest.spyOn(addFolderBtn, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(removeFolderBtn, 'addEventListener');
      // Create a new instance to test initialization
      new NWayFolderComparisonManager();
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('should initialize with remove button hidden', () => {
      expect(removeFolderBtn.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Add/Remove Folder Functionality', () => {
    it('should add a new folder when add button is clicked', () => {
      const initialFolderCount = nwayManager['folders'].length;

      addFolderBtn.click();

      const newFolderCount = nwayManager['folders'].length;
      expect(newFolderCount).toBe(initialFolderCount + 1);
      expect(dropZonesContainer.children).toHaveLength(newFolderCount);
      expect(treeColumnsContainer.children).toHaveLength(newFolderCount);
    });

    it('should create drop zone with correct structure', () => {
      addFolderBtn.click();

      const lastDropZone = dropZonesContainer.lastElementChild as HTMLElement;
      expect(lastDropZone.classList.contains('drop-zone')).toBe(true);
      expect(lastDropZone.querySelector('.drop-zone-content')).not.toBeNull();
      expect(lastDropZone.querySelector('.remove-folder-btn')).not.toBeNull();
    });

    it('should create tree column with correct structure', () => {
      addFolderBtn.click();

      const lastTreeColumn = treeColumnsContainer.lastElementChild as HTMLElement;
      expect(lastTreeColumn.classList.contains('tree-column')).toBe(true);
      expect(lastTreeColumn.querySelector('.tree-column-header')).not.toBeNull();
      expect(lastTreeColumn.querySelector('.tree-view')).not.toBeNull();
    });

    it('should prevent removing folders when only 2 remain', () => {
      // Try to remove a folder when we have only 2
      const removeBtn = dropZonesContainer.querySelector('.remove-folder-btn') as HTMLButtonElement;
      removeBtn.click();

      // Should still have 2 folders
      expect(nwayManager['folders']).toHaveLength(2);
      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'warning',
        title: 'Minimum Folders Required',
        message: 'At least 2 folders are required for comparison.',
        duration: 3000,
      });
    });

    it('should allow removing folders using individual X buttons when more than 2 exist', () => {
      // Add a third folder first
      addFolderBtn.click();
      expect(nwayManager['folders']).toHaveLength(3);

      // Now remove one using individual X button
      const removeBtn = dropZonesContainer.querySelector('.remove-folder-btn') as HTMLButtonElement;
      removeBtn.click();

      expect(nwayManager['folders']).toHaveLength(2);
      expect(dropZonesContainer.children).toHaveLength(2);
      expect(treeColumnsContainer.children).toHaveLength(2);
    });

    it('should show individual X buttons when more than 2 folders exist', () => {
      // Add a third folder
      addFolderBtn.click();

      // Individual remove buttons should be visible
      const removeButtons = dropZonesContainer.querySelectorAll('.remove-folder-btn');
      removeButtons.forEach(btn => {
        expect(btn.classList.contains('hidden')).toBe(false);
      });
    });

    it('should hide individual X buttons when only 2 folders exist', () => {
      // Initially with 2 folders, X buttons should be hidden
      const removeButtons = dropZonesContainer.querySelectorAll('.remove-folder-btn');
      removeButtons.forEach(btn => {
        expect(btn.classList.contains('hidden')).toBe(true);
      });
    });

    it('should keep header remove button always hidden', () => {
      // Header remove button should always be hidden
      expect(removeFolderBtn.classList.contains('hidden')).toBe(true);

      // Even after adding folders
      addFolderBtn.click();
      expect(removeFolderBtn.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Drag and Drop Handling', () => {
    let dropZone: HTMLElement;

    beforeEach(() => {
      dropZone = dropZonesContainer.firstElementChild as HTMLElement;
    });

    it('should add drag-over class on dragover', () => {
      const dragEvent = new Event('dragover') as DragEvent;
      dragEvent.preventDefault = jest.fn();

      dropZone.dispatchEvent(dragEvent);

      expect(dropZone.classList.contains('drag-over')).toBe(true);
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });

    it('should remove drag-over class on dragleave', () => {
      dropZone.classList.add('drag-over');

      const dragEvent = new Event('dragleave') as DragEvent;
      dragEvent.preventDefault = jest.fn();
      (dragEvent as any).relatedTarget = document.body; // Outside the zone

      dropZone.dispatchEvent(dragEvent);

      expect(dropZone.classList.contains('drag-over')).toBe(false);
      expect(dragEvent.preventDefault).toHaveBeenCalled();
    });

    it('should process valid folder drop', async () => {
      const folderPath = '/Users/test/Documents';
      const mockDataTransfer = {
        getData: (type: string) => (type === 'application/x-folder-path' ? folderPath : ''),
        files: [] as unknown[],
      };

      (window as any).fileSystemAPI.checkPath.mockResolvedValue({ exists: true, isDirectory: true });
      (window as any).fileSystemAPI.scanDirectoryRecursive.mockResolvedValue([
        { name: 'file1.txt', path: 'file1.txt', type: 'file' },
      ]);

      const dropEvent = {
        dataTransfer: mockDataTransfer,
        preventDefault: jest.fn(),
      } as unknown as DragEvent;

      await (nwayManager as any).handleDrop(dropEvent, 0);

      expect(nwayManager['folders'][0].path).toBe(folderPath);
      expect(nwayManager['folders'][0].name).toBe('Documents');
      expect(dropZone.classList.contains('has-folder')).toBe(true);
    });

    it('should show error for invalid file drop', async () => {
      const filePath = '/Users/test/document.txt';
      const mockDataTransfer = {
        getData: () => '',
        files: [{ path: filePath }],
      };

      (window as any).fileSystemAPI.checkPath.mockResolvedValue({ exists: true, isDirectory: false });

      const dropEvent = {
        dataTransfer: mockDataTransfer,
        preventDefault: jest.fn(),
      } as unknown as DragEvent;

      await (nwayManager as any).handleDrop(dropEvent, 0);

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'error',
        title: 'Invalid Drop',
        message: 'Please drop a folder, not a file or invalid path.',
        duration: 4000,
      });
    });
  });

  describe('N-Way Comparison', () => {
    beforeEach(() => {
      // Setup test folders with structures
      nwayManager['folders'] = [
        {
          path: '/folder1',
          name: 'folder1',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            { name: 'unique1.txt', path: 'unique1.txt', type: 'file' },
          ],
        },
        {
          path: '/folder2',
          name: 'folder2',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            { name: 'unique2.txt', path: 'unique2.txt', type: 'file' },
          ],
        },
        {
          path: '/folder3',
          name: 'folder3',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            { name: 'unique3.txt', path: 'unique3.txt', type: 'file' },
          ],
        },
      ];
    });

    it('should perform n-way comparison when folders have structures', async () => {
      const mockComparisonResult: FolderComparisonResult[] = [
        {
          name: 'common.txt',
          path: 'common.txt',
          type: 'file',
          status: 'common',
          presentInFolders: [0, 1, 2],
        },
        {
          name: 'unique1.txt',
          path: 'unique1.txt',
          type: 'file',
          status: 'minority',
          presentInFolders: [0],
          majorityStatus: 'minority',
        },
        {
          name: 'unique2.txt',
          path: 'unique2.txt',
          type: 'file',
          status: 'minority',
          presentInFolders: [1],
          majorityStatus: 'minority',
        },
        {
          name: 'unique3.txt',
          path: 'unique3.txt',
          type: 'file',
          status: 'minority',
          presentInFolders: [2],
          majorityStatus: 'minority',
        },
      ];

      (window as any).fileSystemAPI.compareNWayFolders.mockResolvedValue(mockComparisonResult);

      await (nwayManager as any).performNWayComparison();

      expect((window as any).fileSystemAPI.compareNWayFolders).toHaveBeenCalledWith([
        { path: '/folder1', structure: nwayManager['folders'][0].structure },
        { path: '/folder2', structure: nwayManager['folders'][1].structure },
        { path: '/folder3', structure: nwayManager['folders'][2].structure },
      ]);

      expect(nwayManager['lastComparisonResult']).not.toBeNull();
      expect(nwayManager['lastComparisonResult']!.comparison).toBe(mockComparisonResult);
    });

    it('should detect differences correctly', () => {
      const comparisonResult: FolderComparisonResult[] = [
        { name: 'common.txt', path: 'common.txt', type: 'file', status: 'common' },
        { name: 'different.txt', path: 'different.txt', type: 'file', status: 'majority' },
      ];

      const hasDifferences = (nwayManager as any).checkForDifferences(comparisonResult);
      expect(hasDifferences).toBe(true);
    });

    it('should detect no differences when all files are common', () => {
      const comparisonResult: FolderComparisonResult[] = [
        { name: 'common1.txt', path: 'common1.txt', type: 'file', status: 'common' },
        { name: 'common2.txt', path: 'common2.txt', type: 'file', status: 'common' },
      ];

      const hasDifferences = (nwayManager as any).checkForDifferences(comparisonResult);
      expect(hasDifferences).toBe(false);
    });

    it('should handle comparison errors', async () => {
      (window as any).fileSystemAPI.compareNWayFolders.mockRejectedValue(new Error('Comparison failed'));

      await (nwayManager as any).performNWayComparison();

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'error',
        title: 'Comparison Error',
        message: 'Could not compare folders: Comparison failed',
        duration: 5000,
      });
    });
  });

  describe('Tree View Building', () => {
    it('should build status map correctly for n-way comparison', () => {
      const comparisonResult: FolderComparisonResult[] = [
        {
          name: 'file1.txt',
          path: 'file1.txt',
          type: 'file',
          status: 'majority',
          presentInFolders: [0, 1],
          majorityStatus: 'majority',
        },
        {
          name: 'file2.txt',
          path: 'file2.txt',
          type: 'file',
          status: 'minority',
          presentInFolders: [2],
          majorityStatus: 'minority',
        },
      ];

      const statusMap = (nwayManager as any).buildStatusMap(comparisonResult, 0);

      expect(statusMap.get('file1.txt')).toBe('majority');
      expect(statusMap.get('file2.txt')).toBe('missing');
    });

    it('should create n-way tree nodes with correct status', () => {
      const fileItem: FileItem = {
        name: 'test.txt',
        path: 'test.txt',
        type: 'file',
      };

      const statusMap = new Map<string, string>();
      statusMap.set('test.txt', 'majority');

      const node = (nwayManager as any).createNWayTreeNode(fileItem, 0, statusMap, 0);

      expect(node.item).toBe(fileItem);
      expect(node.status).toBe('majority');
      expect(node.element).toBeInstanceOf(HTMLElement);

      const content = node.element.querySelector('.dual-tree-item-content');
      expect(content!.classList.contains('majority')).toBe(true);
    });

    it('should handle directory nodes with children', () => {
      const dirItem: FileItem = {
        name: 'folder',
        path: 'folder',
        type: 'directory',
        children: [{ name: 'child.txt', path: 'folder/child.txt', type: 'file' }],
      };

      const statusMap = new Map<string, string>();
      statusMap.set('folder', 'common');
      statusMap.set('folder/child.txt', 'minority');

      const node = (nwayManager as any).createNWayTreeNode(dirItem, 0, statusMap, 0);

      expect(node.childrenContainer).toBeInstanceOf(HTMLElement);
      expect(node.childrenContainer!.children.length).toBe(1);
    });
  });

  describe('Sync Button Management', () => {
    beforeEach(() => {
      // Setup folders with structures
      nwayManager['folders'] = [
        { path: '/folder1', name: 'folder1', structure: [{ name: 'file1.txt', path: 'file1.txt', type: 'file' }] },
        { path: '/folder2', name: 'folder2', structure: [{ name: 'file2.txt', path: 'file2.txt', type: 'file' }] },
        { path: '/folder3', name: 'folder3', structure: [{ name: 'file3.txt', path: 'file3.txt', type: 'file' }] },
      ];
    });

    it('should create sync dropdown interface when there are differences', () => {
      // Mock that there are differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(true);

      (nwayManager as any).updateSyncButtons();

      const syncInterface = syncButtonsContainer.querySelector('.sync-dropdown-interface');
      expect(syncInterface).not.toBeNull();

      const fromSelect = syncInterface?.querySelector('#sync-from-select');
      const toSelect = syncInterface?.querySelector('#sync-to-select');
      const syncButton = syncInterface?.querySelector('.sync-execute-btn');

      expect(fromSelect).not.toBeNull();
      expect(toSelect).not.toBeNull();
      expect(syncButton).not.toBeNull();
    });

    it('should show identical message when folders are the same', () => {
      // Mock that there are no differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(false);

      (nwayManager as any).updateSyncButtons();

      const identicalMessage = syncButtonsContainer.querySelector('.folders-identical-container');
      const syncInterface = syncButtonsContainer.querySelector('.sync-dropdown-interface');

      expect(identicalMessage).not.toBeNull();
      expect(syncInterface).toBeNull();
      expect(identicalMessage?.textContent).toContain('No synchronization needed');
    });

    it('should populate dropdowns with folder options when there are differences', () => {
      // Mock that there are differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(true);

      (nwayManager as any).updateSyncButtons();

      const fromSelect = syncButtonsContainer.querySelector('#sync-from-select') as HTMLSelectElement;
      const toSelect = syncButtonsContainer.querySelector('#sync-to-select') as HTMLSelectElement;

      // Should have 4 options each (1 default + 3 folders)
      expect(fromSelect.options.length).toBe(4);
      expect(toSelect.options.length).toBe(4);

      // Check that folder names are included
      expect(fromSelect.options[1].textContent).toBe('folder1');
      expect(fromSelect.options[2].textContent).toBe('folder2');
      expect(fromSelect.options[3].textContent).toBe('folder3');
    });

    it('should disable sync button when no selection is made', () => {
      // Mock that there are differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(true);

      (nwayManager as any).updateSyncButtons();

      const syncButton = syncButtonsContainer.querySelector('.sync-execute-btn') as HTMLButtonElement;
      expect(syncButton.disabled).toBe(true);
    });

    it('should pre-fill dropdowns with Folder 1 → Folder 2', () => {
      // Mock that there are differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(true);

      (nwayManager as any).updateSyncButtons();

      const fromSelect = syncButtonsContainer.querySelector('#sync-from-select') as HTMLSelectElement;
      const toSelect = syncButtonsContainer.querySelector('#sync-to-select') as HTMLSelectElement;
      const syncButton = syncButtonsContainer.querySelector('.sync-execute-btn') as HTMLButtonElement;

      // Should be pre-filled with first two folders
      expect(fromSelect.value).toBe('0');
      expect(toSelect.value).toBe('1');
      expect(syncButton.disabled).toBe(false);
    });

    it('should enable sync button when valid selections are made', () => {
      // Mock that there are differences
      jest.spyOn(nwayManager as any, 'hasFolderDifferences').mockReturnValue(true);

      (nwayManager as any).updateSyncButtons();

      const fromSelect = syncButtonsContainer.querySelector('#sync-from-select') as HTMLSelectElement;
      const toSelect = syncButtonsContainer.querySelector('#sync-to-select') as HTMLSelectElement;
      const syncButton = syncButtonsContainer.querySelector('.sync-execute-btn') as HTMLButtonElement;

      // Clear selections first
      fromSelect.value = '';
      toSelect.value = '';
      fromSelect.dispatchEvent(new Event('change'));

      // Select different folders
      fromSelect.value = '0';
      fromSelect.dispatchEvent(new Event('change'));
      toSelect.value = '1';
      toSelect.dispatchEvent(new Event('change'));

      expect(syncButton.disabled).toBe(false);
    });
  });

  describe('Diff Filter Functionality', () => {
    beforeEach(() => {
      // Setup tree view with mock content
      treeColumnsContainer.innerHTML = `
        <div class="tree-column">
          <div class="tree-view" id="folder0-tree">
            <div class="dual-tree-item">
              <div class="dual-tree-item-content common" data-type="file">
                <span class="dual-tree-item-label">common.txt</span>
              </div>
            </div>
            <div class="dual-tree-item">
              <div class="dual-tree-item-content majority" data-type="file">
                <span class="dual-tree-item-label">majority.txt</span>
              </div>
            </div>
          </div>
        </div>
        <div class="tree-column">
          <div class="tree-view" id="folder1-tree">
            <div class="dual-tree-item">
              <div class="dual-tree-item-content common" data-type="file">
                <span class="dual-tree-item-label">common.txt</span>
              </div>
            </div>
            <div class="dual-tree-item">
              <div class="dual-tree-item-content minority" data-type="file">
                <span class="dual-tree-item-label">minority.txt</span>
              </div>
            </div>
          </div>
        </div>
      `;

      nwayManager['folders'] = [
        { path: '/folder1', name: 'folder1', structure: [] },
        { path: '/folder2', name: 'folder2', structure: [] },
      ];
    });

    it('should filter common files when showDifferencesOnly is true', () => {
      nwayManager['showDifferencesOnly'] = true;

      (nwayManager as any).applyDiffFilter();

      const commonItems = document.querySelectorAll('.dual-tree-item-content.common');
      commonItems.forEach(item => {
        expect(item.closest('.dual-tree-item')!.classList.contains('filtered')).toBe(true);
      });
    });

    it('should show all files when showDifferencesOnly is false', () => {
      nwayManager['showDifferencesOnly'] = false;

      (nwayManager as any).applyDiffFilter();

      const allItems = document.querySelectorAll('.dual-tree-item');
      allItems.forEach(item => {
        expect(item.classList.contains('filtered')).toBe(false);
      });
    });

    it('should update filter when toggle changes', () => {
      const applyFilterSpy = jest.spyOn(nwayManager as any, 'applyDiffFilter');

      // Mock having comparison result
      nwayManager['lastComparisonResult'] = {
        folders: [],
        comparison: [],
      };

      diffOnlyToggle.checked = false;
      diffOnlyToggle.dispatchEvent(new Event('change'));

      expect(nwayManager['showDifferencesOnly']).toBe(false);
      expect(applyFilterSpy).toHaveBeenCalled();
    });
  });

  describe('Sync Operations', () => {
    beforeEach(() => {
      nwayManager['folders'] = [
        { path: '/folder1', name: 'folder1', structure: [] },
        { path: '/folder2', name: 'folder2', structure: [] },
      ];

      // Create mock sync dropdown interface
      syncButtonsContainer.innerHTML = `
        <div class="sync-dropdown-interface">
          <button class="sync-execute-btn">Sync</button>
        </div>
      `;
    });

    it('should show confirmation dialog when sync button is clicked', () => {
      (nwayManager as any).showSyncConfirmation(0, 1);

      expect(mockConfirmationDialog.show).toHaveBeenCalledWith(
        '/folder1',
        '/folder2',
        'left-to-right',
        expect.any(Function)
      );
    });

    it('should perform sync operation successfully', async () => {
      const mockSyncResult = {
        success: true,
        copied: 5,
        errors: [] as string[],
        message: 'Sync completed successfully',
      };

      (window as any).fileSystemAPI.syncFoldersLeftToRight.mockResolvedValue(mockSyncResult);

      await (nwayManager as any).performSync(0, 1);

      expect((window as any).fileSystemAPI.syncFoldersLeftToRight).toHaveBeenCalledWith('/folder1', '/folder2');
      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'success',
        title: 'Sync Complete!',
        message: 'Successfully copied 5 items from Folder 1 to Folder 2',
        duration: 4000,
      });
    });

    it('should handle sync operation failure', async () => {
      const mockSyncResult = {
        success: false,
        copied: 0,
        errors: ['Permission denied'] as string[],
        message: 'Sync failed',
      };

      (window as any).fileSystemAPI.syncFoldersLeftToRight.mockResolvedValue(mockSyncResult);

      await (nwayManager as any).performSync(0, 1);

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'error',
        title: 'Sync Failed',
        message: 'Sync failed',
        duration: 6000,
      });
    });

    it('should handle sync operation exception', async () => {
      (window as any).fileSystemAPI.syncFoldersLeftToRight.mockRejectedValue(new Error('Network error'));

      await (nwayManager as any).performSync(0, 1);

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'error',
        title: 'Sync Error',
        message: 'Network error',
        duration: 6000,
      });
    });
  });

  describe('Utility Functions', () => {
    it('should extract base name from file path correctly', () => {
      expect((nwayManager as any).getBaseName('/Users/test/Documents')).toBe('Documents');
      expect((nwayManager as any).getBaseName('C:\\Users\\test\\Documents')).toBe('Documents');
      expect((nwayManager as any).getBaseName('simple-folder')).toBe('simple-folder');
      expect((nwayManager as any).getBaseName('/single')).toBe('single');
      expect((nwayManager as any).getBaseName('C:\\single')).toBe('single');
    });

    it('should create HTML elements with correct class names', () => {
      const element = (nwayManager as any).createElement('div', 'test-class');
      expect(element.tagName).toBe('DIV');
      expect(element.className).toBe('test-class');
    });

    it('should create HTML elements without class names', () => {
      const element = (nwayManager as any).createElement('span');
      expect(element.tagName).toBe('SPAN');
      expect(element.className).toBe('');
    });

    it('should truncate long folder names correctly', () => {
      expect((nwayManager as any).truncateName('VeryLongFolderName', 8)).toBe('VeryLon…');
      expect((nwayManager as any).truncateName('Short', 8)).toBe('Short');
      expect((nwayManager as any).truncateName('Exactly8', 8)).toBe('Exactly8');
    });
  });

  describe('Repair Functionality', () => {
    let repairBtn: HTMLButtonElement;

    beforeEach(() => {
      // Add repair button to DOM
      document.body.innerHTML += `
        <button class="repair-btn hidden" id="repair-btn">
          <span class="repair-icon">🔧</span>
          <span class="repair-text">Repair</span>
        </button>
      `;

      repairBtn = document.getElementById('repair-btn') as HTMLButtonElement;
      nwayManager['repairBtn'] = repairBtn;

      // Setup 3 folders for repair testing
      nwayManager['folders'] = [
        {
          path: '/folder1',
          name: 'folder1',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            { name: 'majority.txt', path: 'majority.txt', type: 'file' },
            { name: 'modified.txt', path: 'modified.txt', type: 'file' },
          ],
        },
        {
          path: '/folder2',
          name: 'folder2',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            { name: 'majority.txt', path: 'majority.txt', type: 'file' },
            { name: 'modified.txt', path: 'modified.txt', type: 'file' },
          ],
        },
        {
          path: '/folder3',
          name: 'folder3',
          structure: [
            { name: 'common.txt', path: 'common.txt', type: 'file' },
            // missing majority.txt - can be repaired
            { name: 'different.txt', path: 'different.txt', type: 'file' }, // different version
          ],
        },
      ];
    });

    it('should hide repair button when less than 3 folders', () => {
      nwayManager['folders'] = [
        { path: '/folder1', name: 'folder1', structure: [] },
        { path: '/folder2', name: 'folder2', structure: [] },
      ];

      (nwayManager as any).updateRepairButton();
      expect(repairBtn.classList.contains('hidden')).toBe(true);
    });

    it('should show repair button when 3+ folders with repairable items', () => {
      // Mock comparison result with repairable items
      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'majority.txt',
            path: 'majority.txt',
            type: 'file',
            status: 'minority',
            presentInFolders: [0, 1], // Present in folders 0 and 1, missing in 2
            majorityStatus: 'majority',
          },
        ],
      };

      (nwayManager as any).updateRepairButton();
      expect(repairBtn.classList.contains('hidden')).toBe(false);
    });

    it('should hide repair button when no repairable items', () => {
      // Mock comparison result with no repairable items (all common)
      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'common.txt',
            path: 'common.txt',
            type: 'file',
            status: 'common',
            presentInFolders: [0, 1, 2],
          },
        ],
      };

      (nwayManager as any).updateRepairButton();
      expect(repairBtn.classList.contains('hidden')).toBe(true);
    });

    it('should identify repairable items correctly', () => {
      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'majority.txt',
            path: 'majority.txt',
            type: 'file',
            status: 'minority',
            presentInFolders: [0, 1], // Majority (2 out of 3)
            majorityStatus: 'majority',
          },
          {
            name: 'modified.txt',
            path: 'modified.txt',
            type: 'file',
            status: 'modified',
            presentInFolders: [0, 1, 2], // Present everywhere but different
          },
        ],
      };

      const repairableItems = (nwayManager as any).getRepairableItems();

      expect(repairableItems).toHaveLength(2);
      expect(repairableItems[0].name).toBe('majority.txt');
      expect(repairableItems[0].action).toBe('copy');
      expect(repairableItems[0].majorityFolders).toEqual([0, 1]);
      expect(repairableItems[0].minorityFolders).toEqual([2]);

      expect(repairableItems[1].name).toBe('modified.txt');
      expect(repairableItems[1].action).toBe('replace');
    });

    it('should not identify items as repairable when no majority exists', () => {
      nwayManager['folders'] = [
        { path: '/folder1', name: 'folder1', structure: [] },
        { path: '/folder2', name: 'folder2', structure: [] },
        { path: '/folder3', name: 'folder3', structure: [] },
        { path: '/folder4', name: 'folder4', structure: [] },
      ];

      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'split.txt',
            path: 'split.txt',
            type: 'file',
            status: 'minority',
            presentInFolders: [0, 1], // Only 2 out of 4 - not majority
            majorityStatus: 'minority',
          },
        ],
      };

      const repairableItems = (nwayManager as any).getRepairableItems();
      expect(repairableItems).toHaveLength(0);
    });

    it('should handle nested repairable items', () => {
      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'subfolder',
            path: 'subfolder',
            type: 'directory',
            status: 'common',
            presentInFolders: [0, 1, 2],
            children: [
              {
                name: 'nested.txt',
                path: 'subfolder/nested.txt',
                type: 'file',
                status: 'minority',
                presentInFolders: [0, 1],
                majorityStatus: 'majority',
              },
            ],
          },
        ],
      };

      const repairableItems = (nwayManager as any).getRepairableItems();

      expect(repairableItems).toHaveLength(1);
      expect(repairableItems[0].name).toBe('nested.txt');
      expect(repairableItems[0].path).toBe('subfolder/nested.txt');
    });

    it('should show repair confirmation dialog', () => {
      const mockRepairableItems = [
        {
          name: 'test.txt',
          path: 'test.txt',
          type: 'file' as const,
          action: 'copy' as const,
          majorityFolders: [0, 1],
          minorityFolders: [2],
          sourceFolderIndex: 0,
        },
      ];

      jest.spyOn(nwayManager as any, 'getRepairableItems').mockReturnValue(mockRepairableItems);
      jest.spyOn(nwayManager as any, 'showRepairDialog').mockImplementation(() => {
        // Mock implementation
      });

      (nwayManager as any).showRepairConfirmation();

      expect((nwayManager as any).showRepairDialog).toHaveBeenCalledWith(mockRepairableItems);
    });

    it('should show warning when no repairable items found', () => {
      jest.spyOn(nwayManager as any, 'getRepairableItems').mockReturnValue([]);

      (nwayManager as any).showRepairConfirmation();

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'warning',
        title: 'No Items to Repair',
        message: 'All folders are already in sync or no majority consensus found.',
        duration: 4000,
      });
    });

    it('should perform repair operation successfully', async () => {
      const mockRepairableItems = [
        {
          name: 'test.txt',
          path: 'test.txt',
          type: 'file' as const,
          action: 'copy' as const,
          majorityFolders: [0, 1],
          minorityFolders: [2],
          sourceFolderIndex: 0,
        },
      ];

      (window as any).fileSystemAPI.syncFoldersLeftToRight.mockResolvedValue({
        success: true,
        copied: 1,
        errors: [],
        message: 'Success',
      });

      jest.spyOn(nwayManager as any, 'refreshAfterRepair').mockResolvedValue(undefined);

      await (nwayManager as any).performRepair(mockRepairableItems);

      expect((window as any).fileSystemAPI.syncFoldersLeftToRight).toHaveBeenCalledWith('/folder1', '/folder3');
      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'success',
        title: 'Repair Complete!',
        message: 'Successfully repaired 1 items',
        duration: 5000,
      });
    });

    it('should handle repair errors gracefully', async () => {
      const mockRepairableItems = [
        {
          name: 'test.txt',
          path: 'test.txt',
          type: 'file' as const,
          action: 'copy' as const,
          majorityFolders: [0, 1],
          minorityFolders: [2],
          sourceFolderIndex: 0,
        },
      ];

      (window as any).fileSystemAPI.syncFoldersLeftToRight.mockRejectedValue(new Error('Sync failed'));

      await (nwayManager as any).performRepair(mockRepairableItems);

      expect(mockNotificationManager.show).toHaveBeenCalledWith({
        type: 'error',
        title: 'Repair Failed',
        message: 'No items could be repaired. 1 errors occurred.',
        duration: 6000,
      });
    });

    it('should correctly determine majority vs minority with different folder counts', () => {
      // Test with 5 folders
      nwayManager['folders'] = Array(5)
        .fill(null)
        .map((_, i) => ({
          path: `/folder${i}`,
          name: `folder${i}`,
          structure: [],
        }));

      nwayManager['lastComparisonResult'] = {
        folders: nwayManager['folders'],
        comparison: [
          {
            name: 'majority.txt',
            path: 'majority.txt',
            type: 'file',
            status: 'minority',
            presentInFolders: [0, 1, 2], // 3 out of 5 = majority
            majorityStatus: 'majority',
          },
          {
            name: 'minority.txt',
            path: 'minority.txt',
            type: 'file',
            status: 'minority',
            presentInFolders: [0, 1], // 2 out of 5 = minority
            majorityStatus: 'minority',
          },
        ],
      };

      const repairableItems = (nwayManager as any).getRepairableItems();

      // Only the majority item should be repairable
      expect(repairableItems).toHaveLength(1);
      expect(repairableItems[0].name).toBe('majority.txt');
      expect(repairableItems[0].minorityFolders).toEqual([3, 4]);
    });
  });
});
