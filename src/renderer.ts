import './index.css';
import { FileTreeManager } from './components/FileTreeManager';
import { NWayFolderComparisonManager } from './components/NWayFolderComparisonManager';

document.addEventListener('DOMContentLoaded', () => {
  new FileTreeManager();
  new NWayFolderComparisonManager();
});
