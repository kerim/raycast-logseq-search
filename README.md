# Logseq Search

Search your Logseq DB graphs from your launcher.

This is a Raycast-format extension. It runs in any launcher that can run Raycast extensions, such as [Raycast](https://www.raycast.com/), [Tinycast](https://github.com/abue-ammar/tinycast) or [SuperCmd](https://github.com/SuperCmdLabs/SuperCmd).

![Raycast extension](https://img.shields.io/badge/Raycast-Extension-red)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- 🔍 **Real-time search** - Results update as you type
- 📊 **Graph selector** - Pick any of your graphs from a dropdown
- 💾 **Remembers selection** - Your last selected graph is kept between sessions
- 🚀 **No server to run** - Talks to the Logseq CLI directly
- 🔗 **Deep linking** - Open pages directly in Logseq
- 📋 **Quick actions** - Copy page links and titles

## Prerequisites

1. **A launcher that runs Raycast extensions** - for example Raycast, Tinycast or SuperCmd.

2. **Logseq desktop app** - It includes the `logseq` command-line tool this extension uses, usually at `~/.local/bin/logseq` (if yours is somewhere else, set **Logseq CLI Path** in the extension's preferences). Logseq doesn't need to be open for searching; it is only needed to open a result.

3. **A Logseq DB graph** - The extension works with Logseq DB (database) graphs only.

   Check that the CLI can see your graphs:
   ```bash
   logseq graph list --output json
   ```

## Installation

### Tinycast

Tinycast can install the extension straight from GitHub; you don't need to download or build anything yourself.

1. In Tinycast, choose **Install from GitHub**
2. Enter `kerim/raycast-logseq-search`

Tinycast downloads and builds it for you. To update later, install from GitHub again.

### Raycast

First build the extension:

```bash
git clone https://github.com/kerim/raycast-logseq-search.git
cd raycast-logseq-search
npm install
npm run build
```

Then:

1. Open Raycast Settings (⌘,) and go to the Extensions tab
2. Click "+" → "Add Local Extension"
3. Select the `raycast-logseq-search` folder

For development, `npm run dev` opens Raycast with the extension loaded and reloads it as you edit.

### Other launchers (SuperCmd and others)

If your launcher can install from GitHub, give it `kerim/raycast-logseq-search`. Otherwise, build the extension as in the Raycast steps and use your launcher's option for adding a local Raycast extension. See your launcher's documentation for the exact steps.

### Trying a local change in Tinycast

Tinycast has no "reload extension" command. To test changes you haven't pushed to GitHub, build into a folder, copy it into Tinycast's extensions folder, then quit and reopen Tinycast:

```bash
npx ray build -e dist -o build
mkdir -p ~/Library/Application\ Support/com.abueammar.tinycast/extensions/logseq-search
cp -R build/assets build/package.json build/search-logseq.js ~/Library/Application\ Support/com.abueammar.tinycast/extensions/logseq-search/
```

## Usage

1. Open your launcher and run **Search Logseq**
2. Pick a graph from the dropdown (top-right); it is remembered next time
3. Type to search page names
4. Press Enter to open the page in Logseq

### Keyboard Shortcuts

- **Enter** - Open page in Logseq
- **⌘ C** - Copy page link to clipboard
- **⌘ ⇧ C** - Copy page title to clipboard

"Open Extension Preferences" is in the action panel (⌘ K).

## Configuration

The extension has minimal configuration needed. All settings are optional:

- **Default Graph Name** - Graph to use the first time; after that the graph last picked in the dropdown is remembered
- **Logseq CLI Path** - Full path to the bundled logseq binary (default: `~/.local/bin/logseq`)
- **Max Results** - Maximum search results to display (default: `20`)

Open preferences from the action panel (⌘ K → Open Extension Preferences) or from your launcher's extension settings.

## Dependencies

### Extension Dependencies

- `@raycast/api` (^2.12.1) - Raycast extension API

### External Dependencies

- **Logseq CLI** - The bundled `logseq` binary (included with Logseq.app), default path `~/.local/bin/logseq`

## How It Works

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Launcher   │ ◄─────► │   This Extension │ ◄─────► │   Logseq CLI    │
│     UI      │  User   │   (TypeScript)   │  execFile│   DB Graphs     │
└─────────────┘  Input  └──────────────────┘         └─────────────────┘
```

1. Extension runs `logseq graph list --output json` to fetch available graphs
2. User selects graph and types search query
3. Extension runs `logseq query --graph <g> --query <edn> --output json`
4. Results are displayed in the launcher
5. User opens page using `logseq://` URL scheme

## CLI Commands Used

The extension runs these two commands:

- `logseq graph list --output json` - Fetch available Logseq graphs
- `logseq query --graph <graph> --query <edn> --output json` - Search pages in a graph

## Troubleshooting

### "Cannot find the Logseq CLI"

**Cause:** The `logseq` binary was not found at the configured path

**Solution:**
1. Check that Logseq.app is installed and the CLI is available at `~/.local/bin/logseq`
2. If the binary is at a different path, update "Logseq CLI Path" in extension preferences

Verify the binary works:
```bash
~/.local/bin/logseq graph list --output json
```

### "No graphs available" in dropdown

**Possible causes:**
- Incorrect Logseq CLI path in preferences
- No Logseq DB graphs exist

**Solutions:**
1. Verify graphs exist: `logseq graph list --output json`
2. Check Logseq CLI Path in extension preferences

### Extension not appearing in your launcher

**Solution:**
1. Rebuild the extension: `npm run build`
2. Quit and reopen the launcher
3. Check that the extension is listed in the launcher's extension settings (for Tinycast, that the folder above contains `search-logseq.js`)

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

### v1.3.0 (2026-11-17)

**Fixed:**
- The first graph in the dropdown could not be picked again once another graph was selected.
- The "Default Graph Name" preference was ignored.
- Typing quickly could show results for an earlier search; each new search now cancels the previous one.
- "No results" was shown as an error, and errors from the Logseq CLI showed as "[object Object]".
- Changing graph cleared the results but left the old text in the search bar.

**Changed:**
- Results are ranked: exact match, then names starting with the search text, then the rest.
- The Logseq CLI path preference accepts `~`.
- Updated to `@raycast/api` 2.x, removed the unused `@raycast/utils`, added the missing `eslint.config.js` so `ray lint` works.
- Documented installing into Tinycast and other launchers that run Raycast extensions.

### v1.2.1 (2026-06-12)

**Fixed:**
- Removed the reserved `Cmd+,` keyboard shortcut from the "Open Preferences" action, which logged a warning on every render (Raycast reserves `Cmd+,`). The action is still available in the action panel.

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
