# Photo Syncthesis

A beautiful, dark-themed photo folder comparison and synchronization tool built with Electron.

## Features

- 🌙 **Beautiful Dark Mode Interface**
- 📁 **Drag & Drop Folder Comparison**
- 🔄 **Two-Way Folder Synchronization**
- 🎯 **Diff Icons** (−, +, =)
- 🔍 **Show/Hide Common Files** toggle for focused comparison
- 🔔 **Color-coded Notifications** (success, warning, error)
- 🔒 **CRC32 Checksum Verification** for file integrity
- 🚀 **Optimized for Large Folders** with thousands of files
- 🌳 **Hierarchical Tree Views**
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

### Build Issues
- **macOS**: Ensure Xcode Command Line Tools are installed
- **Windows**: Install Visual Studio Build Tools or Visual Studio
- **Linux**: Install build essentials (`sudo apt-get install build-essential`)
- **All platforms**: Check that Node.js version is compatible (14.0.0+)

## Architecture

- **Main Process**: [`src/index.ts`](src/index.ts) - File system operations, IPC handlers
- **Renderer Process**: [`src/renderer.ts`](src/renderer.ts) - UI logic, tree management  
- **Preload Script**: [`src/preload.ts`](src/preload.ts) - Secure API bridge
- **Entitlements**: [`entitlements.mac.plist`](entitlements.mac.plist) - macOS permissions

## License

MIT License - see package.json for details.
