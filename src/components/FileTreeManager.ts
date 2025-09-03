import { FileItem, TreeNode } from '../types';
import { NotificationManager } from './NotificationManager';

export class FileTreeManager {
  private treeContainer: HTMLElement;
  private selectedNode: TreeNode | null = null;
  private nodeMap: Map<string, TreeNode> = new Map();
  private notificationManager: NotificationManager;

  constructor() {
    this.treeContainer = document.getElementById('file-tree')!;
    this.notificationManager = new NotificationManager();
    this.initialize();
  }

  private async initialize() {
    try {
      this.treeContainer.innerHTML = '<div class="tree-loading">Loading file system...</div>';

      const homeDir = await window.fileSystemAPI.getHomeDirectory();
      const rootItems = await window.fileSystemAPI.getDirectoryContents(homeDir);

      this.treeContainer.innerHTML = '';

      rootItems.forEach(item => {
        const node = this.createTreeNode(item, 0);
        this.treeContainer.appendChild(node.element);
      });
    } catch (error) {
      this.treeContainer.innerHTML = '<div class="tree-loading">Failed to load file system</div>';

      this.notificationManager.show({
        type: 'error',
        title: 'File System Error',
        message: 'Could not load file system. Please check permissions and try again.',
        duration: 6000,
      });
    }
  }

  private createTreeNode(item: FileItem, level: number): TreeNode {
    const node: TreeNode = {
      item,
      element: this.createElement('div', 'tree-item'),
      isExpanded: false,
      isLoaded: false,
    };

    const content = this.createElement('div', 'tree-item-content');
    content.setAttribute('data-type', item.type);
    content.style.paddingLeft = `${level * 20 + 8}px`;

    if (item.type === 'directory') {
      content.draggable = true;
      content.addEventListener('dragstart', e => this.handleDragStart(e, item));
    }

    const expandIcon = this.createElement('span', 'tree-expand-icon');
    if (item.type === 'directory') {
      expandIcon.classList.add('expandable', 'collapsed');
      expandIcon.addEventListener('click', e => {
        e.stopPropagation();
        this.toggleNode(node);
      });
    } else {
      expandIcon.classList.add('file');
    }

    const label = this.createElement('span', 'tree-item-label');
    label.textContent = item.name;

    content.appendChild(expandIcon);
    content.appendChild(label);
    node.element.appendChild(content);

    content.addEventListener('click', () => this.selectNode(node));

    if (item.type === 'directory') {
      node.childrenContainer = this.createElement('div', 'tree-children');
      node.element.appendChild(node.childrenContainer);
    }

    this.nodeMap.set(item.path, node);
    return node;
  }

  private handleDragStart(e: DragEvent, item: FileItem) {
    if (!e.dataTransfer) return;

    e.dataTransfer.setData('text/plain', item.path);
    e.dataTransfer.setData('application/x-folder-path', item.path);
    e.dataTransfer.effectAllowed = 'copy';

    const dragImage = document.createElement('div');
    dragImage.style.cssText = `
      display: flex; align-items: center; padding: 6px 12px;
      background: #0d7377; color: white; border-radius: 4px; font-size: 13px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2); position: absolute;
      top: -1000px; left: -1000px; z-index: 9999; pointer-events: none;
    `;

    dragImage.innerHTML = `<span style="margin-right: 6px;">📁</span><span>${item.name}</span>`;
    document.body.appendChild(dragImage);

    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => {
      if (document.body.contains(dragImage)) {
        document.body.removeChild(dragImage);
      }
    }, 100);
  }

  private async toggleNode(node: TreeNode) {
    if (node.item.type !== 'directory') return;

    const expandIcon = node.element.querySelector('.tree-expand-icon')!;
    const childrenContainer = node.childrenContainer!;

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

      if (!node.isLoaded) {
        try {
          childrenContainer.innerHTML = '<div class="tree-loading">Loading...</div>';
          const children = await window.fileSystemAPI.getDirectoryContents(node.item.path);
          childrenContainer.innerHTML = '';

          const currentLevel = this.getNodeLevel(node) + 1;
          children.forEach(child => {
            const childNode = this.createTreeNode(child, currentLevel);
            childrenContainer.appendChild(childNode.element);
          });

          node.isLoaded = true;
        } catch (error) {
          childrenContainer.innerHTML = '<div class="tree-loading">Failed to load</div>';

          // Show specific error notification
          let errorMessage = `Could not access "${node.item.name}".`;

          if (node.item.path.includes('.photoslibrary')) {
            errorMessage =
              'Cannot access Photos Library. This is a protected macOS system package. Try using individual photo folders instead.';
          } else if (error instanceof Error && error.message.includes('Permission denied')) {
            errorMessage = `Permission denied for "${node.item.name}". Please grant Full Disk Access in System Preferences.`;
          } else if (error instanceof Error) {
            errorMessage = `Error accessing "${node.item.name}": ${error.message}`;
          }

          this.notificationManager.show({
            type: 'error',
            title: 'Directory Access Error',
            message: errorMessage,
            duration: 6000,
          });
        }
      }
    }
  }

  private selectNode(node: TreeNode) {
    if (this.selectedNode) {
      const prevContent = this.selectedNode.element.querySelector('.tree-item-content');
      prevContent?.classList.remove('selected');
    }

    this.selectedNode = node;
    const content = node.element.querySelector('.tree-item-content');
    content?.classList.add('selected');
  }

  private getNodeLevel(node: TreeNode): number {
    let level = 0;
    let current = node.element.parentElement;

    while (current && current !== this.treeContainer) {
      if (current.classList.contains('tree-children')) {
        level++;
      }
      current = current.parentElement;
    }

    return level;
  }

  private createElement(tag: string, className?: string): HTMLElement {
    const element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    return element;
  }
}
