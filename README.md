# Photo Syncthesis

A beautiful, dark-themed photo folder comparison and synchronization tool built with Electron. Now with **N-Way Diff** support for comparing multiple folders simultaneously!

## Features

- 🌙 **Beautiful Dark Mode Interface**
- 📁 **Drag & Drop Folder Comparison**
- 🔢 **N-Way Folder Comparison** - Compare 2, 3, 4, or more folders at once
- 🎨 **Smart Color Coding** - Majority (green) vs Minority (red) file detection
- 🔄 **Multi-Directional Synchronization** - Sync between any folder pairs
- ➕ **Dynamic Folder Management** - Add/remove folders with + and × buttons
- 🎯 **Enhanced Diff Icons** (−, +, =, ✓, !)
- 🔍 **Show/Hide Common Files** toggle for focused comparison
- 🔔 **Color-coded Notifications** (success, warning, error)
- 🔒 **CRC32 Checksum Verification** for file integrity
- 🚀 **Optimized for Large Folders** with thousands of files
- 🌳 **Hierarchical Tree Views** with responsive layout
- 🖥️ **Cross-Platform Support** (macOS, Windows, Linux)

## Building for All Platforms

### Prerequisites
- **Node.js and npm** installed
- **Platform-specific tools**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Windows SDK and Visual Studio Build Tools
  - **Linux**: Standard build tools (`build-essential` on Debian/Ubuntu)

### Build Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the application:**
   ```bash
   npm run make
   ```

3. **Built applications will be in:**
   ```
   out/make/zip/darwin/x64/           # macOS (.app in .zip)
   out/make/squirrel.windows/x64/     # Windows (.exe installer)
   out/make/deb/x64/                  # Linux Debian (.deb package)
   out/make/rpm/x64/                  # Linux Red Hat (.rpm package)
   ```

### macOS Permissions Setup

When you first run the app on macOS, it may lack file system permissions. Follow these steps:

1. **Install the app** from the built `.zip` file
2. **Run the app** - it will show permission dialogs if needed
3. **Grant Full Disk Access:**
   - Open **System Preferences** > **Security & Privacy** > **Privacy**
   - Select **"Full Disk Access"** from the left sidebar
   - Click the **lock icon** to unlock (enter your password)
   - Click the **"+"** button
   - Navigate to `/Applications` and select **"Photo Syncthesis"**
   - Check the checkbox next to the app
   - **Restart the app**

### Alternative: Manual Permission Grant

If the app doesn't automatically prompt for permissions:

1. Open **System Preferences** > **Security & Privacy** > **Privacy**
2. Select **"Files and Folders"** from the left sidebar
3. Find **"Photo Syncthesis"** and ensure all folders are checked
4. Also grant **"Full Disk Access"** following the steps above

## Development

### Start in development mode:
```bash
npm start
```

### Features in Development Mode:
- Developer tools automatically open
- Hot reload enabled
- Debug logging active

## Troubleshooting

### Permission Issues

#### **macOS:**
- Ensure "Full Disk Access" is granted in System Preferences
- Try restarting the app after granting permissions
- Check that the app is not quarantined: `xattr -d com.apple.quarantine /Applications/Photo\ Syncthesis.app`

#### **Windows:**
- Run as administrator for system folders
- Check Windows Defender hasn't blocked the app
- Ensure antivirus isn't interfering with file operations

#### **Linux:**
- Use `sudo` for system directory access
- Check file permissions: `ls -la /path/to/folder`
- Ensure user is in appropriate groups for folder access

### Performance Tips
- **Large Folders**: The app is optimized for thousands of files, but very large folders (50k+ files) may take time to scan
- **Network Drives**: Local folders perform better than network/cloud drives
- **Memory Usage**: Each additional folder increases memory usage - close other apps if comparing many large folders

### Build Issues
- **macOS**: Ensure Xcode Command Line Tools are installed
- **Windows**: Install Visual Studio Build Tools or Visual Studio
- **Linux**: Install build essentials (`sudo apt-get install build-essential`)
- **All platforms**: Check that Node.js version is compatible (14.0.0+)

## Testing

Run the comprehensive test suite:
```bash
npm test
```

Tests cover:
- N-way comparison algorithms
- UI component behavior
- File system operations
- Error handling scenarios
- Cross-platform compatibility

## How to Use

### Basic 2-Way Comparison
1. **Launch the app** - starts with 2 empty folder slots
2. **Drag folders** into the drop zones or click to browse
3. **View differences** - files are color-coded:
   - **Gray**: Common files (identical across folders)
   - **Red**: Files missing from this folder
   - **Green**: Files unique to this folder
   - **Yellow**: Modified files (different content)
4. **Sync folders** using the arrow buttons between folders
5. **Toggle "Diff"** to show only differences or all files

### N-Way Comparison (3+ Folders)
1. **Click the + button** to add more folders (up to your system's limits)
2. **Drag folders** into each slot
3. **Smart color coding** shows:
   - **Green (Majority)**: Files present in most folders
   - **Red (Minority)**: Files present in fewer folders
   - **Gray (Common)**: Files present in all folders and identical
4. **Multiple sync options** - buttons appear for each folder pair
5. **Remove folders** with the × button (minimum 2 required)

### Advanced Features
- **Responsive Layout**: Interface adapts to screen size and folder count
- **Checksum Verification**: Files are compared by content, not just name
- **Large Folder Support**: Efficiently handles thousands of files
- **Permission Handling**: Automatic prompts for system folder access

## Use Cases

- **Photo Library Management**: Compare multiple photo backup locations
- **Code Repository Sync**: Keep multiple development environments in sync
- **Document Organization**: Merge scattered document folders
- **Backup Verification**: Ensure all backups contain the same files
- **Team Collaboration**: Sync project folders across team members
- **Migration Projects**: Compare old vs new system folders

## Architecture

- **Main Process**: [`src/index.ts`](src/index.ts) - File system operations, IPC handlers
- **Renderer Process**: [`src/renderer.ts`](src/renderer.ts) - UI logic, n-way tree management  
- **N-Way Manager**: [`src/components/NWayFolderComparisonManager.ts`](src/components/NWayFolderComparisonManager.ts) - Multi-folder comparison logic
- **File System Service**: [`src/services/FileSystemService.ts`](src/services/FileSystemService.ts) - N-way diff algorithms
- **Preload Script**: [`src/preload.ts`](src/preload.ts) - Secure API bridge
- **Entitlements**: [`entitlements.mac.plist`](entitlements.mac.plist) - macOS permissions

## License

MIT License - see package.json for details.
