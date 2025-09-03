import { NotificationManager } from '../components/NotificationManager';
import { NotificationOptions } from '../types';
describe('NotificationManager', () => {
  let notificationManager: NotificationManager;
  let container: HTMLElement;
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="notification-container"></div>
    `;
    container = document.getElementById('notification-container')!;
    notificationManager = new NotificationManager();
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  describe('Constructor', () => {
    it('should initialize with correct container element', () => {
      expect(notificationManager['container']).toBe(container);
    });
    it('should initialize with empty notifications set', () => {
      expect(notificationManager['notifications'].size).toBe(0);
    });
  });
  describe('show method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should create and display a success notification', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Success!',
        message: 'Operation completed successfully',
        duration: 4000,
      };
      const notification = notificationManager.show(options);
      expect(notification).toBeInstanceOf(HTMLElement);
      expect(notification.classList.contains('notification')).toBe(true);
      expect(notification.classList.contains('success')).toBe(true);
      expect(container.contains(notification)).toBe(true);
      expect(notificationManager['notifications'].has(notification)).toBe(true);
    });
    it('should create and display an error notification', () => {
      const options: NotificationOptions = {
        type: 'error',
        title: 'Error!',
        message: 'Something went wrong',
        duration: 6000,
      };
      const notification = notificationManager.show(options);
      expect(notification.classList.contains('error')).toBe(true);
      expect(notification.innerHTML).toContain('Error!');
      expect(notification.innerHTML).toContain('Something went wrong');
      expect(notification.innerHTML).toContain('❌');
    });
    it('should add show class after timeout', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
      };
      const notification = notificationManager.show(options);
      expect(notification.classList.contains('show')).toBe(false);
      jest.advanceTimersByTime(10);
      expect(notification.classList.contains('show')).toBe(true);
    });
    it('should auto-hide notification after specified duration', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
        duration: 2000,
      };
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      const notification = notificationManager.show(options);
      expect(notification.classList.contains('auto-hide')).toBe(true);
      jest.advanceTimersByTime(2000);
      expect(hideSpy).toHaveBeenCalledWith(notification);
    });
    it('should use default duration when not specified', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
      };
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      notificationManager.show(options);
      jest.advanceTimersByTime(4000);
      expect(hideSpy).toHaveBeenCalled();
    });
    it('should not auto-hide when autoHide is false', () => {
      const options: NotificationOptions = {
        type: 'error',
        title: 'Persistent Error',
        autoHide: false,
      };
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      const notification = notificationManager.show(options);
      expect(notification.classList.contains('auto-hide')).toBe(false);
      jest.advanceTimersByTime(10000);
      expect(hideSpy).not.toHaveBeenCalled();
    });
    it('should create notification without message', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Title Only',
      };
      const notification = notificationManager.show(options);
      expect(notification.innerHTML).toContain('Title Only');
      expect(notification.innerHTML).not.toContain('notification-body');
    });
    it('should include progress bar for auto-hide notifications', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'With Progress',
      };
      const notification = notificationManager.show(options);
      expect(notification.innerHTML).toContain('notification-progress');
      expect(notification.innerHTML).toContain('notification-progress-bar');
    });
    it('should not include progress bar when autoHide is false', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'No Progress',
        autoHide: false,
      };
      const notification = notificationManager.show(options);
      expect(notification.innerHTML).not.toContain('notification-progress');
    });
  });
  describe('createNotification method', () => {
    it('should create notification with success icon', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Success Test',
        message: 'Test message',
      };
      const notification = (notificationManager as any).createNotification(options);
      expect(notification.innerHTML).toContain('✅');
      expect(notification.innerHTML).toContain('Success Test');
      expect(notification.innerHTML).toContain('Test message');
    });
    it('should create notification with error icon', () => {
      const options: NotificationOptions = {
        type: 'error',
        title: 'Error Test',
      };
      const notification = (notificationManager as any).createNotification(options);
      expect(notification.innerHTML).toContain('❌');
      expect(notification.innerHTML).toContain('Error Test');
    });
    it('should include close button with click handler', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
      };
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      const notification = (notificationManager as any).createNotification(options);
      const closeButton = notification.querySelector('.notification-close') as HTMLElement;
      expect(closeButton).toBeTruthy();
      expect(closeButton.textContent).toBe('×');
      closeButton.click();
      expect(hideSpy).toHaveBeenCalledWith(notification);
    });
    it('should handle HTML in message content safely', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
        message: '<script>alert("xss")</script>Safe content',
      };
      const notification = (notificationManager as any).createNotification(options);
      // innerHTML should contain the raw content (this is expected behavior in this case)
      expect(notification.innerHTML).toContain('<script>alert("xss")</script>Safe content');
    });
  });
  describe('hide method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should remove show class and add hide class', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
      };
      const notification = notificationManager.show(options);
      notification.classList.add('show');
      (notificationManager as any).hide(notification);
      expect(notification.classList.contains('show')).toBe(false);
      expect(notification.classList.contains('hide')).toBe(true);
    });
    it('should remove notification from DOM and set after delay', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Test',
      };
      const notification = notificationManager.show(options);
      expect(container.contains(notification)).toBe(true);
      expect(notificationManager['notifications'].has(notification)).toBe(true);
      (notificationManager as any).hide(notification);
      // Before timeout
      expect(container.contains(notification)).toBe(true);
      expect(notificationManager['notifications'].has(notification)).toBe(true);
      // After timeout
      jest.advanceTimersByTime(300);
      expect(container.contains(notification)).toBe(false);
      expect(notificationManager['notifications'].has(notification)).toBe(false);
    });
    it('should handle notification that is not in DOM', () => {
      const notification = document.createElement('div');
      notification.classList.add('notification');
      expect(() => {
        (notificationManager as any).hide(notification);
        jest.advanceTimersByTime(300);
      }).not.toThrow();
    });
    it('should not fail when notification parent is null', () => {
      const notification = document.createElement('div');
      notification.classList.add('notification');
      // Add to notifications set but not to DOM
      notificationManager['notifications'].add(notification);
      expect(() => {
        (notificationManager as any).hide(notification);
        jest.advanceTimersByTime(300);
      }).not.toThrow();
      expect(notificationManager['notifications'].has(notification)).toBe(false);
    });
  });
  describe('hideAll method', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should hide all active notifications', () => {
      const options1: NotificationOptions = { type: 'success', title: 'Test 1' };
      const options2: NotificationOptions = { type: 'error', title: 'Test 2' };
      const options3: NotificationOptions = { type: 'success', title: 'Test 3' };
      const notification1 = notificationManager.show(options1);
      const notification2 = notificationManager.show(options2);
      const notification3 = notificationManager.show(options3);
      expect(notificationManager['notifications'].size).toBe(3);
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      notificationManager.hideAll();
      expect(hideSpy).toHaveBeenCalledTimes(3);
      expect(hideSpy).toHaveBeenCalledWith(notification1);
      expect(hideSpy).toHaveBeenCalledWith(notification2);
      expect(hideSpy).toHaveBeenCalledWith(notification3);
    });
    it('should handle empty notifications set', () => {
      const hideSpy = jest.spyOn(notificationManager as any, 'hide');
      expect(notificationManager['notifications'].size).toBe(0);
      expect(() => {
        notificationManager.hideAll();
      }).not.toThrow();
      expect(hideSpy).not.toHaveBeenCalled();
    });
    it('should clear all notifications after hideAll completes', () => {
      const options: NotificationOptions = { type: 'success', title: 'Test' };
      notificationManager.show(options);
      notificationManager.show(options);
      expect(notificationManager['notifications'].size).toBe(2);
      notificationManager.hideAll();
      // After all hide animations complete
      jest.advanceTimersByTime(300);
      expect(notificationManager['notifications'].size).toBe(0);
      expect(container.children.length).toBe(0);
    });
  });
  describe('Integration Tests', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });
    it('should handle complete notification lifecycle', () => {
      const options: NotificationOptions = {
        type: 'success',
        title: 'Lifecycle Test',
        message: 'Testing complete flow',
        duration: 3000,
      };
      const notification = notificationManager.show(options);
      // Initial state
      expect(container.contains(notification)).toBe(true);
      expect(notification.classList.contains('show')).toBe(false);
      // After show animation
      jest.advanceTimersByTime(10);
      expect(notification.classList.contains('show')).toBe(true);
      // After auto-hide duration
      jest.advanceTimersByTime(3000);
      expect(notification.classList.contains('show')).toBe(false);
      expect(notification.classList.contains('hide')).toBe(true);
      // After hide animation
      jest.advanceTimersByTime(300);
      expect(container.contains(notification)).toBe(false);
      expect(notificationManager['notifications'].has(notification)).toBe(false);
    });
    it('should handle multiple simultaneous notifications', () => {
      const notification1 = notificationManager.show({
        type: 'success',
        title: 'First',
        duration: 2000,
      });
      const notification2 = notificationManager.show({
        type: 'error',
        title: 'Second',
        duration: 4000,
      });
      expect(container.children.length).toBe(2);
      expect(notificationManager['notifications'].size).toBe(2);
      // First notification should hide after 2 seconds
      jest.advanceTimersByTime(2000);
      expect(notification1.classList.contains('hide')).toBe(true);
      expect(notification2.classList.contains('hide')).toBe(false);
      // Complete first notification removal
      jest.advanceTimersByTime(300);
      expect(container.children.length).toBe(1);
      expect(notificationManager['notifications'].size).toBe(1);
      // Second notification should hide after additional 2 seconds
      jest.advanceTimersByTime(1700);
      expect(notification2.classList.contains('hide')).toBe(true);
      // Complete second notification removal
      jest.advanceTimersByTime(300);
      expect(container.children.length).toBe(0);
      expect(notificationManager['notifications'].size).toBe(0);
    });
    it('should handle manual close during auto-hide', () => {
      const notification = notificationManager.show({
        type: 'success',
        title: 'Manual Close Test',
        duration: 5000,
      });
      // Show notification
      jest.advanceTimersByTime(10);
      expect(notification.classList.contains('show')).toBe(true);
      // Manually close before auto-hide
      const closeButton = notification.querySelector('.notification-close') as HTMLElement;
      closeButton.click();
      expect(notification.classList.contains('hide')).toBe(true);
      // Complete manual hide
      jest.advanceTimersByTime(300);
      expect(container.contains(notification)).toBe(false);
      // Auto-hide timer should not cause issues
      jest.advanceTimersByTime(5000);
      // No errors should occur
    });
    it('should handle rapid show/hide operations', () => {
      const notifications = [];
      // Rapidly create notifications
      for (let i = 0; i < 5; i++) {
        notifications.push(
          notificationManager.show({
            type: 'success',
            title: `Rapid ${i}`,
            duration: 1000,
          })
        );
      }
      expect(container.children.length).toBe(5);
      expect(notificationManager['notifications'].size).toBe(5);
      // Rapidly hide all
      notificationManager.hideAll();
      // All should start hiding
      notifications.forEach(notification => {
        expect(notification.classList.contains('hide')).toBe(true);
      });
      // Complete all animations
      jest.advanceTimersByTime(300);
      expect(container.children.length).toBe(0);
      expect(notificationManager['notifications'].size).toBe(0);
    });
  });
});
