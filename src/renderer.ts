import './index.css';
import { FileTreeManager } from './components/FileTreeManager';
import { FolderComparisonManager } from './components/FolderComparisonManager';

document.addEventListener('DOMContentLoaded', () => {
  new FileTreeManager();
  new FolderComparisonManager();
});
