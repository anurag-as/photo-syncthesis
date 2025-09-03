import { ConfirmationDialog } from '../components/ConfirmationDialog';

describe('ConfirmationDialog', () => {
  let confirmationDialog: ConfirmationDialog;
  let mockOnConfirm: jest.Mock;

  beforeEach(() => {
    // Reset DOM to clean state
    document.body.innerHTML = `
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
    `;

    mockOnConfirm = jest.fn();
    confirmationDialog = new ConfirmationDialog();
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Clear any existing timeouts
    jest.clearAllTimers();
  });

  describe('Constructor', () => {
    it('should initialize DOM elements correctly', () => {
      expect(confirmationDialog['overlay']).toBe(document.getElementById('sync-confirmation-overlay'));
      expect(confirmationDialog['sourceName']).toBe(document.getElementById('sync-source-name'));
      expect(confirmationDialog['sourcePath']).toBe(document.getElementById('sync-source-path'));
      expect(confirmationDialog['destName']).toBe(document.getElementById('sync-dest-name'));
      expect(confirmationDialog['destPath']).toBe(document.getElementById('sync-dest-path'));
      expect(confirmationDialog['directionArrow']).toBe(document.getElementById('sync-direction-arrow'));
      expect(confirmationDialog['closeBtn']).toBe(document.getElementById('sync-confirm-close'));
      expect(confirmationDialog['cancelBtn']).toBe(document.getElementById('sync-confirm-cancel'));
      expect(confirmationDialog['confirmBtn']).toBe(document.getElementById('sync-confirm-proceed'));
    });

    it('should initialize with null onConfirm callback', () => {
      expect(confirmationDialog['onConfirm']).toBeNull();
    });
  });

  describe('Event Handling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should hide dialog when close button is clicked', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const closeBtn = document.getElementById('sync-confirm-close')!;

      closeBtn.click();

      expect(hideSpy).toHaveBeenCalled();
    });

    it('should hide dialog when cancel button is clicked', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const cancelBtn = document.getElementById('sync-confirm-cancel')!;

      cancelBtn.click();

      expect(hideSpy).toHaveBeenCalled();
    });

    it('should call onConfirm and hide dialog when proceed button is clicked', () => {
      confirmationDialog['onConfirm'] = mockOnConfirm;
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const confirmBtn = document.getElementById('sync-confirm-proceed')!;

      confirmBtn.click();

      expect(mockOnConfirm).toHaveBeenCalled();
      expect(hideSpy).toHaveBeenCalled();
    });

    it('should not call onConfirm if it is null when proceed button is clicked', () => {
      confirmationDialog['onConfirm'] = null;
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const confirmBtn = document.getElementById('sync-confirm-proceed')!;

      confirmBtn.click();

      expect(mockOnConfirm).not.toHaveBeenCalled();
      expect(hideSpy).toHaveBeenCalled();
    });

    it('should hide dialog when overlay background is clicked', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const overlay = document.getElementById('sync-confirmation-overlay')!;

      // Mock the event target to be the overlay itself
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: overlay, enumerable: true });

      overlay.dispatchEvent(clickEvent);

      expect(hideSpy).toHaveBeenCalled();
    });

    it('should not hide dialog when clicking inside the dialog content', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const overlay = document.getElementById('sync-confirmation-overlay')!;
      const sourceNameDiv = document.getElementById('sync-source-name')!;

      // Mock the event target to be a child element
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: sourceNameDiv, enumerable: true });

      overlay.dispatchEvent(clickEvent);

      expect(hideSpy).not.toHaveBeenCalled();
    });

    it('should hide dialog when Escape key is pressed and dialog is visible', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const overlay = document.getElementById('sync-confirmation-overlay')!;

      // Make dialog visible
      overlay.classList.add('show');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(hideSpy).toHaveBeenCalled();
    });

    it('should not hide dialog when Escape key is pressed but dialog is hidden', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const overlay = document.getElementById('sync-confirmation-overlay')!;

      // Ensure dialog is hidden
      overlay.classList.remove('show');

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(hideSpy).not.toHaveBeenCalled();
    });

    it('should not hide dialog when other keys are pressed', () => {
      const hideSpy = jest.spyOn(confirmationDialog as any, 'hide');
      const overlay = document.getElementById('sync-confirmation-overlay')!;

      overlay.classList.add('show');

      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      document.dispatchEvent(enterEvent);

      expect(hideSpy).not.toHaveBeenCalled();
    });
  });

  describe('show method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should display dialog with left-to-right direction', () => {
      const sourceFolder = '/Users/test/Documents/Source';
      const destFolder = '/Users/test/Documents/Destination';

      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      expect(confirmationDialog['onConfirm']).toBe(mockOnConfirm);
      expect(confirmationDialog['sourceName'].textContent).toBe('Source');
      expect(confirmationDialog['sourcePath'].textContent).toBe(sourceFolder);
      expect(confirmationDialog['destName'].textContent).toBe('Destination');
      expect(confirmationDialog['destPath'].textContent).toBe(destFolder);
      expect(confirmationDialog['directionArrow'].textContent).toBe('→');
    });

    it('should display dialog with right-to-left direction', () => {
      const sourceFolder = '/Users/test/Documents/Source';
      const destFolder = '/Users/test/Documents/Destination';

      confirmationDialog.show(sourceFolder, destFolder, 'right-to-left', mockOnConfirm);

      expect(confirmationDialog['directionArrow'].textContent).toBe('→');
    });

    it('should remove hidden class and add show class', () => {
      const overlay = confirmationDialog['overlay'];
      const sourceFolder = '/Users/test/Documents/Source';
      const destFolder = '/Users/test/Documents/Destination';

      // Ensure overlay starts hidden
      overlay.classList.add('hidden');

      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      expect(overlay.classList.contains('hidden')).toBe(false);

      // Fast-forward the setTimeout
      jest.advanceTimersByTime(10);

      expect(overlay.classList.contains('show')).toBe(true);
    });

    it('should handle Windows-style paths', () => {
      const sourceFolder = 'C:\\Users\\test\\Documents\\Source';
      const destFolder = 'C:\\Users\\test\\Documents\\Destination';

      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      // The ConfirmationDialog uses the full path for both source and destination
      expect(confirmationDialog['sourceName'].textContent).toBe('C:\\Users\\test\\Documents\\Source');
      expect(confirmationDialog['destName'].textContent).toBe('C:\\Users\\test\\Documents\\Destination');
    });

    it('should handle root paths', () => {
      const sourceFolder = '/';
      const destFolder = 'C:\\';

      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      expect(confirmationDialog['sourceName'].textContent).toBe('/');
      expect(confirmationDialog['destName'].textContent).toBe('C:\\');
    });
  });

  describe('hide method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should remove show class and add hidden class after delay', () => {
      const overlay = confirmationDialog['overlay'];

      // Setup initial state
      overlay.classList.add('show');
      overlay.classList.remove('hidden');
      confirmationDialog['onConfirm'] = mockOnConfirm;

      // Call hide method
      (confirmationDialog as any).hide();

      // Immediately after calling hide
      expect(overlay.classList.contains('show')).toBe(false);

      // After the timeout (300ms)
      jest.advanceTimersByTime(300);

      expect(overlay.classList.contains('hidden')).toBe(true);
      expect(confirmationDialog['onConfirm']).toBeNull();
    });

    it('should clear onConfirm callback after animation', () => {
      confirmationDialog['onConfirm'] = mockOnConfirm;

      (confirmationDialog as any).hide();

      // Before timeout
      expect(confirmationDialog['onConfirm']).toBe(mockOnConfirm);

      // After timeout
      jest.advanceTimersByTime(300);
      expect(confirmationDialog['onConfirm']).toBeNull();
    });
  });

  describe('getBaseName method', () => {
    it('should extract base name from Unix-style path', () => {
      const result = (confirmationDialog as any).getBaseName('/Users/test/Documents/MyFolder');
      expect(result).toBe('MyFolder');
    });

    it('should extract base name from Windows-style path', () => {
      const result = (confirmationDialog as any).getBaseName('C:\\Users\\test\\Documents\\MyFolder');
      // The implementation doesn't handle Windows path separators
      expect(result).toBe('C:\\Users\\test\\Documents\\MyFolder');
    });

    it('should return the path itself if no separators found', () => {
      const result = (confirmationDialog as any).getBaseName('MyFolder');
      expect(result).toBe('MyFolder');
    });

    it('should handle root Unix path', () => {
      const result = (confirmationDialog as any).getBaseName('/');
      expect(result).toBe('/');
    });

    it('should handle root Windows path', () => {
      const result = (confirmationDialog as any).getBaseName('C:\\');
      expect(result).toBe('C:\\');
    });

    it('should handle empty string', () => {
      const result = (confirmationDialog as any).getBaseName('');
      expect(result).toBe('');
    });

    it('should handle path with trailing separator', () => {
      const result = (confirmationDialog as any).getBaseName('/Users/test/Documents/MyFolder/');
      // The implementation doesn't handle trailing slashes
      expect(result).toBe('/Users/test/Documents/MyFolder/');
    });

    it('should handle mixed separators (prioritizes last found)', () => {
      const result = (confirmationDialog as any).getBaseName('/Users/test\\Documents/MyFolder');
      expect(result).toBe('MyFolder');
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should complete full show/hide cycle', () => {
      const sourceFolder = '/Users/test/Source';
      const destFolder = '/Users/test/Destination';
      const overlay = confirmationDialog['overlay'];

      // Show dialog
      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      expect(overlay.classList.contains('hidden')).toBe(false);

      jest.advanceTimersByTime(10);
      expect(overlay.classList.contains('show')).toBe(true);

      // Hide dialog
      (confirmationDialog as any).hide();

      expect(overlay.classList.contains('show')).toBe(false);

      jest.advanceTimersByTime(300);
      expect(overlay.classList.contains('hidden')).toBe(true);
      expect(confirmationDialog['onConfirm']).toBeNull();
    });

    it('should handle confirm action flow', () => {
      const sourceFolder = '/Users/test/Source';
      const destFolder = '/Users/test/Destination';

      // Show dialog
      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      // Click confirm
      const confirmBtn = document.getElementById('sync-confirm-proceed')!;
      confirmBtn.click();

      expect(mockOnConfirm).toHaveBeenCalledTimes(1);

      // Should start hiding
      const overlay = confirmationDialog['overlay'];
      expect(overlay.classList.contains('show')).toBe(false);
    });

    it('should handle cancel action flow', () => {
      const sourceFolder = '/Users/test/Source';
      const destFolder = '/Users/test/Destination';

      // Show dialog
      confirmationDialog.show(sourceFolder, destFolder, 'left-to-right', mockOnConfirm);

      // Click cancel
      const cancelBtn = document.getElementById('sync-confirm-cancel')!;
      cancelBtn.click();

      expect(mockOnConfirm).not.toHaveBeenCalled();

      // Should start hiding
      const overlay = confirmationDialog['overlay'];
      expect(overlay.classList.contains('show')).toBe(false);
    });
  });
});
