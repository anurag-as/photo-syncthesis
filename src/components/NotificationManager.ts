import { NotificationOptions } from '../types';

export class NotificationManager {
  private container: HTMLElement;
  private notifications: Set<HTMLElement> = new Set();

  constructor() {
    this.container = document.getElementById('notification-container')!;
  }

  show(options: NotificationOptions): HTMLElement {
    const notification = this.createNotification(options);
    this.container.appendChild(notification);
    this.notifications.add(notification);

    setTimeout(() => notification.classList.add('show'), 10);

    if (options.autoHide !== false) {
      const duration = options.duration || 4000;
      notification.classList.add('auto-hide');
      setTimeout(() => this.hide(notification), duration);
    }

    return notification;
  }

  private createNotification(options: NotificationOptions): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `notification ${options.type}`;

    const iconMap = { success: '✅', error: '❌', warning: '⚠️' };

    notification.innerHTML = `
      <div class="notification-header">
        <span class="notification-icon">${iconMap[options.type]}</span>
        <span class="notification-title">${options.title}</span>
        <button class="notification-close">×</button>
      </div>
      ${options.message ? `<div class="notification-body">${options.message}</div>` : ''}
      ${options.autoHide !== false ? '<div class="notification-progress"><div class="notification-progress-bar"></div></div>' : ''}
    `;

    const closeBtn = notification.querySelector('.notification-close')!;
    closeBtn.addEventListener('click', () => this.hide(notification));

    return notification;
  }

  private hide(notification: HTMLElement) {
    notification.classList.remove('show');
    notification.classList.add('hide');

    setTimeout(() => {
      if (notification.parentElement) {
        notification.parentElement.removeChild(notification);
      }
      this.notifications.delete(notification);
    }, 300);
  }

  hideAll() {
    this.notifications.forEach(notification => this.hide(notification));
  }
}
