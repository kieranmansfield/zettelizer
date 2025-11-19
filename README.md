# Zettelizer

An Obsidian plugin that creates zettelkasten notes from Readwise footnotes while leaving the original highlights untouched.

## Features

- **Interactive highlight selection**: Fuzzy search modal with multi-select support
- **Block ID-based**: Works with Readwise highlights that have block IDs (`^blockid`)
- **Smart search**: Search by highlight text or block ID
- **Truncated display**: Configurable text truncation for long highlights
- **Timestamp filenames**: Creates unique files using `YYYYMMDDHHmmssSSS` format
- **Preserve original content**: Leaves your Readwise highlights file completely untouched
- **Transclusion links**: Each zettel automatically links back to the original highlight using block references

## How it works

1. Open a file containing Readwise highlights with block IDs
2. Run the command: **Zettelize Readwise Highlights**
3. A fuzzy search modal appears showing all highlights with block IDs
4. Use arrow keys to navigate, Space to select/deselect, Enter to confirm
5. Selected highlights are converted to individual zettel notes

### Example

**Original Readwise file:**
```markdown
- This is an important insight about productivity ^abc123
- Another key concept from the book ^def456
- A third interesting highlight ^ghi789
```

**Using the modal:**
1. Modal shows all three highlights with their block IDs
2. You can search by text or ID (e.g., type "abc123" or "productivity")
3. Press Space to select the first and third highlights
4. Press Enter to create zettels

**Created zettels:**
- `20231119203045123.md` → Contains: `![[Readwise File#^abc123]]`
- `20231119203045456.md` → Contains: `![[Readwise File#^ghi789]]`

## Usage

### Command Palette
1. Open a file with Readwise highlights (with block IDs)
2. Press `Cmd/Ctrl + P` to open the command palette
3. Search for "Zettelize Readwise Highlights"
4. Execute the command

### Keyboard Shortcuts

**In the fuzzy modal:**
- **Arrow Up/Down**: Navigate through highlights
- **Space**: Select/deselect current highlight
- **Enter**: Confirm selection and create zettels
- **Esc**: Cancel and close modal
- **Type**: Search by highlight text or block ID

### Settings

Access plugin settings via **Settings → Zettelizer**:

- **Readwise Folder**: Folder containing Readwise highlights (default: `Readwise`)
- **Zettel Folder**: Folder where zettel notes will be created (default: `Zettelkasten`)
- **Truncate Length**: Maximum character length for display in modal (default: `100`)
- **Timestamp Format**: Format for zettel filenames (default: `YYYYMMDDHHmmss`)

## Installation

### Development Installation
1. Clone this repository into your vault's `.obsidian/plugins/zettelizer` folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development with hot reload
4. Run `npm run build` for production build

## Development

Built with TypeScript following Obsidian plugin best practices:

- **Organized structure**: Modular code split into `commands/`, `utils/`, and core files
- **Type safety**: Full TypeScript support with strict mode
- **Minimal footprint**: Lightweight with no external dependencies

### Project Structure
```
src/
  main.ts                    # Plugin lifecycle and registration
  settings.ts                # Settings interface and defaults
  types.ts                   # TypeScript interfaces
  commands/
    commands.ts              # Command registration orchestrator
    zettelizeCommand.ts      # Main zettelization logic
  ui/
    FuzzyHighlightModal.ts   # Multi-select fuzzy modal
    MultiSelectHighlightModal.ts  # Legacy modal (for reference)
  utils/
    parser.ts                # Block ID parsing utilities
    timestamp.ts             # Timestamp generation
```

## License

MIT
