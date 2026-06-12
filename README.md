# Logseq Search - Raycast Extension

Search your Logseq DB graphs directly from Raycast.

![Raycast](https://img.shields.io/badge/Raycast-Extension-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🔍 **Real-time search** - Search as you type with intelligent debouncing
- 📊 **Graph selector** - Automatic detection and dropdown selection of available graphs
- 💾 **Remembers selection** - Your last selected graph is saved between sessions
- 🚀 **Fast** - Direct CLI integration with Logseq
- 🔗 **Deep linking** - Open pages directly in Logseq
- 📋 **Quick actions** - Copy page links and titles
- ⚡ **No Logseq Desktop required** - Works with Logseq CLI and DB graphs

## Screenshots

![Search Interface](https://via.placeholder.com/800x450?text=Search+Interface)
*Search interface with graph selector dropdown*

## Prerequisites

### Required

1. **[Raycast](https://www.raycast.com/)** - Download and install Raycast

2. **Logseq CLI** - The extension shells out to the bundled `logseq` binary at `~/.local/bin/logseq` (configurable via the Logseq CLI Path preference)

3. **Logseq DB Graph** - The extension works with Logseq DB (database) graphs only

   Verify your graphs:
   ```bash
   logseq graph list --output json
   ```

## Installation

### Option 1: Install from Source

1. Clone this repository:
   ```bash
   git clone https://github.com/kerim/raycast-logseq-search.git
   cd raycast-logseq-search
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Import in Raycast:
   - Open Raycast Settings (⌘,)
   - Go to Extensions tab
   - Click "+" → "Add Local Extension"
   - Select the `raycast-logseq-search` folder
   - Click "Add"

### Option 2: Development Mode

For development or testing:

```bash
git clone https://github.com/kerim/raycast-logseq-search.git
cd raycast-logseq-search
npm install
npm run dev
```

This opens Raycast with the extension loaded in development mode.

## Usage

### First Time Setup

1. **Open Raycast** (⌘ Space)

2. **Search for "Search Logseq"**

3. **Select your graph** from the dropdown (top-right)

4. **Start searching!** Your graph selection will be remembered

### Daily Use

1. Open Raycast (⌘ Space)
2. Type "Search Logseq"
3. Start typing your search query
4. Press Enter to open in Logseq

### Keyboard Shortcuts

- **Enter** - Open page in Logseq
- **⌘ C** - Copy page link to clipboard
- **⌘ ⇧ C** - Copy page title to clipboard
- **⌘ ,** - Open extension preferences

## Configuration

The extension has minimal configuration needed. All settings are optional:

- **Default Graph Name** - Optional default graph for first launch
- **Logseq CLI Path** - Full path to the bundled logseq binary (default: `/Users/niyaro/.local/bin/logseq`)
- **Max Results** - Maximum search results to display (default: `20`)

Access preferences: Raycast → Extensions → Logseq Search → Configure

## Dependencies

### Extension Dependencies

- `@raycast/api` (^1.98.2) - Raycast extension API
- `@raycast/utils` (^1.17.0) - Raycast utilities

### External Dependencies

- **Logseq CLI** - The bundled `logseq` binary (included with Logseq.app), default path `~/.local/bin/logseq`

## How It Works

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Raycast   │ ◄─────► │   This Extension │ ◄─────► │   Logseq CLI    │
│     UI      │  User   │   (TypeScript)   │  execFile│   DB Graphs     │
└─────────────┘  Input  └──────────────────┘         └─────────────────┘
```

1. Extension runs `logseq graph list --output json` to fetch available graphs
2. User selects graph and types search query
3. Extension runs `logseq query --graph <g> --query <edn> --output json`
4. Results are displayed in Raycast
5. User opens page using `logseq://` URL scheme

## CLI Commands Used

The extension runs these two commands:

- `logseq graph list --output json` - Fetch available Logseq graphs
- `logseq query --graph <graph> --query <edn> --output json` - Search pages in a graph

## Troubleshooting

### "Cannot run logseq CLI"

**Cause:** The `logseq` binary was not found at the configured path

**Solution:**
1. Check that Logseq.app is installed and the CLI is available at `~/.local/bin/logseq`
2. If the binary is at a different path, update "Logseq CLI Path" in extension preferences

Verify the binary works:
```bash
/Users/niyaro/.local/bin/logseq graph list --output json
```

### "No graphs available" in dropdown

**Possible causes:**
- Incorrect Logseq CLI path in preferences
- No Logseq DB graphs exist

**Solutions:**
1. Verify graphs exist: `logseq graph list --output json`
2. Check Logseq CLI Path in extension preferences

### Extension not appearing in Raycast

**Solution:**
1. Rebuild the extension: `npm run build`
2. Restart Raycast: ⌘ Q then reopen
3. Check Extensions tab in Raycast settings

## Development

### Project Structure

```
raycast-logseq-search/
├── src/
│   └── search-logseq.tsx      # Main extension component
├── assets/
│   └── extension-icon.png     # Extension icon
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript configuration
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

### Build Commands

```bash
# Development mode (hot reload)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Fix lint issues
npm run fix-lint
```

### Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and fix any issues
5. Submit a pull request

## Related Projects

- **[logseq-db-sidekick](https://github.com/kerim/logseq-db-sidekick)** - Browser extension for Logseq search

## Changelog

### v1.2.0 (2026-06-12)

**Changed:**
- Migrated from the Python HTTP server to the bundled Logseq CLI (`logseq graph list` / `logseq query`); removed the Server URL preference and added a Logseq CLI Path preference.
- Search results now exclude journal pages (only named pages are returned).

### v1.1.0 (2025-XX-XX)

**Fixed:**
- **Graph Selection Persistence**: Fixed issue where saved graph selection was reset to first graph on extension reload
- The `List.Dropdown` component was calling `onChange` with the first graph during initialization
- Added robust detection to ignore spurious Dropdown initialization calls while preserving user selections

**Technical Details:**
- Added `firstGraph` state to track the first graph in the list
- Enhanced `handleGraphChange` with logic to detect and ignore Dropdown initialization calls
- Maintains backward compatibility and all existing functionality

### v1.0.0 (Initial Release)

Initial release with core functionality:
- Real-time search across Logseq DB graphs
- Graph selection dropdown with automatic detection
- Deep linking to Logseq using `logseq://` URLs
- Configurable server URL and max results

## License

MIT License - see [LICENSE](LICENSE) file for details

## Author

Created by [Kerim Friedman](https://github.com/kerim)

## Acknowledgments

- Built with [Raycast API](https://developers.raycast.com/)
- Powered by the bundled Logseq CLI
