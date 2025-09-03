export class ConfirmationDialog {
  private overlay: HTMLElement;
  private sourceName: HTMLElement;
  private sourcePath: HTMLElement;
  private destName: HTMLElement;
  private destPath: HTMLElement;
  private directionArrow: HTMLElement;
  private closeBtn: HTMLElement;
  private cancelBtn: HTMLElement;
  private confirmBtn: HTMLElement;
  private onConfirm: (() => void) | null = null;

  constructor() {
    this.overlay = document.getElementById('sync-confirmation-overlay')!;
    this.sourceName = document.getElementById('sync-source-name')!;
    this.sourcePath = document.getElementById('sync-source-path')!;
    this.destName = document.getElementById('sync-dest-name')!;
    this.destPath = document.getElementById('sync-dest-path')!;
    this.directionArrow = document.getElementById('sync-direction-arrow')!;
    this.closeBtn = document.getElementById('sync-confirm-close')!;
    this.cancelBtn = document.getElementById('sync-confirm-cancel')!;
    this.confirmBtn = document.getElementById('sync-confirm-proceed')!;

    this.initializeEvents();
  }

  private initializeEvents() {
    this.closeBtn.addEventListener('click', () => this.hide());
    this.cancelBtn.addEventListener('click', () => this.hide());
    this.confirmBtn.addEventListener('click', () => {
      if (this.onConfirm) this.onConfirm();
      this.hide();
    });

    this.overlay.addEventListener('click', e => {
      if (e.target === this.overlay) this.hide();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.overlay.classList.contains('show')) {
        this.hide();
      }
    });
  }

  show(sourceFolder: string, destFolder: string, direction: 'left-to-right' | 'right-to-left', onConfirm: () => void) {
    this.onConfirm = onConfirm;

    const sourceName = this.getBaseName(sourceFolder);
    const destName = this.getBaseName(destFolder);

    this.sourceName.textContent = sourceName;
    this.sourcePath.textContent = sourceFolder;
    this.destName.textContent = destName;
    this.destPath.textContent = destFolder;
    // Always show right arrow to match the "From -> To" visual layout
    this.directionArrow.textContent = '→';

    this.overlay.classList.remove('hidden');
    setTimeout(() => this.overlay.classList.add('show'), 10);
  }

  private hide() {
    this.overlay.classList.remove('show');
    setTimeout(() => {
      this.overlay.classList.add('hidden');
      this.onConfirm = null;
    }, 300);
  }

  private getBaseName(filePath: string): string {
    return filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
  }
}
