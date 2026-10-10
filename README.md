# Zettelizer

An Obsidian plugin that creates zettelkasten notes from Readwise footnotes while leaving the original highlights untouched.

> **Zettelizer works through footnotes.** It reads the footnote-style block IDs (`^blockid`) at the end of each Readwise highlight, so the highlights have to carry them. The import template does this for you; if you use another Readwise export, make sure every highlight ends with a `^blockid`.

It's based on a [QuickAdd](https://github.com/chhoumann/quickadd) script created by [chhoumann](https://github.com/chhoumann) called the [zettelizer](https://quickadd.obsidian.guide/docs/Examples/Macro_Zettelizer).

## Features

-   **Interactive highlight selection**: Fuzzy search modal with multi-select support
-   **Footnote (block ID) based**: Works through the `^blockid` footnotes on Readwise highlights; highlights without one are ignored
-   **Smart search**: Search by highlight text or block ID
-   **Truncated display**: Configurable text truncation for long highlights
-   **Timestamp filenames**: Creates unique files using `YYYYMMDDHHmmssSSS` format
-   **Preserve original content**: Leaves your Readwise highlights file completely untouched
-   **Transclusion links**: Each zettel automatically links back to the original highlight using block references
-   **Smart match**: Append a highlight to an existing note whose title matches its tags, or create a new zettel
-   **Readwise import**: Pick one document from your Readwise library and import it, without syncing everything
-   **Import and zettelize**: Import a document and zettelize its highlights in one command
-   **Readwise status**: Set a document's `process` / `processing` / `processed` status in Readwise and in the note
-   **Customisable templates**: Templates for zettels, imported notes, highlights and imported file names

## How it works

1. Open a file containing Readwise highlights with block IDs
2. Run the command: **Zettelize Readwise Highlights**
3. A fuzzy search modal appears showing all highlights with block IDs
4. Use arrow keys to navigate, Space to select/deselect, Enter to confirm
5. Selected highlights are converted to individual zettel notes

### Example

**Original Readwise file:**

```markdown
-   This is an important insight about productivity ^abc123
-   Another key concept from the book ^def456
-   A third interesting highlight ^ghi789
```

**Using the modal:**

1. Modal shows all three highlights with their block IDs
2. You can search by text or ID (e.g., type "abc123" or "productivity")
3. Press Space to select the first and third highlights
4. Press Enter to create zettels

**Created zettels:**

-   `20231119203045123.md` → Contains: `![[Readwise File#^abc123]]`
-   `20231119203045456.md` → Contains: `![[Readwise File#^ghi789]]`

## Usage

### Command Palette

1. Open a file with Readwise highlights (with block IDs)
2. Press `Cmd/Ctrl + P` to open the command palette
3. Search for "Zettelize Readwise Highlights"
4. Execute the command

### Commands

| Command | What it does |
| --- | --- |
| Zettelize Readwise highlights | Zettelize the highlights in the active file |
| Open file picker | Pick a Readwise file, then zettelize it |
| Smart Match Readwise highlights | Like zettelize, but offers to append to notes whose title matches the highlight's tags |
| Smart Match: Open file picker | Pick a Readwise file, then smart match it |
| Import Readwise document | Pick a document from your Readwise library and import it |
| Import and zettelize Readwise document | Import a document, then zettelize its highlights |
| Set Readwise status | Set `process`, `processing` or `processed` on the active imported note and its Readwise document |
| Create stock zettel template | Write the stock zettel template to `Templates/Zettel Template.md` and use it |

### Readwise import

Set your API token in **Settings → Zettelizer → Readwise import**. It is kept in Obsidian's secret storage, not in `data.json`, and is only sent to readwise.io when you run an import or status command (or at startup if **Sync document list on startup** is on).

-   Notes are written to the Readwise folder, named `<title> by <author> highlights` by default.
-   Existing notes are matched by the Readwise document `id` in their frontmatter, never by file name. Two documents with the same title are imported as separate notes; the second one gets its id in front of the name (`123 Title by Author highlights`).
-   With **Skip existing notes** on, importing a document you already have just opens its note.
-   The document list is cached, so the picker opens instantly and later syncs only fetch what changed.

See [READWISE-IMPORT.md](READWISE-IMPORT.md) for the design.

### Templates

**Zettel template.** With no template set, new zettels use the stock template:

```markdown
---
created: {{date}}
sources:
  - {{sourceBlock}}
title: {{title}}
---

{{highlight}}

---
tags: #zettel
```

Run **Create stock zettel template** (or use the button in settings) to write it to `Templates/Zettel Template.md` and edit it. Variables: `{{highlight}}`, `{{title}}`, `{{source}}`, `{{sourceFile}}`, `{{blockId}}`, `{{link}}`, `{{sourceBlock}}`, `{{date}}`, `{{time}}`.

**Readwise export template.** Under **Settings → Zettelizer → Readwise import → Export template** you can edit how imported notes are written: one template for the whole note and one repeated for each highlight. Leave a template empty to use the default. The variables are listed on that page. Changes apply to documents you import afterwards.

**File name template.** **File name template** sets the name of imported notes. Variables: `{{title}}`, `{{author}}`, `{{category}}`, `{{id}}`.

### Keyboard Shortcuts

**In the fuzzy modal:**

-   **Arrow Up/Down**: Navigate through highlights
-   **Space**: Select/deselect current highlight
-   **Enter**: Confirm selection and create zettels
-   **Esc**: Cancel and close modal
-   **Type**: Search by highlight text or block ID

### Settings

Access plugin settings via **Settings → Zettelizer**:

-   **Readwise folder**: Folder containing Readwise highlights (default: `Readwise`)
-   **Zettel folder**: Folder where zettel notes will be created (default: `Zettelkasten`)
-   **Timestamp format**: Format for zettel filenames (default: `YYYYMMDDHHmmssSSS`)
-   **Zettel template**: Template file for new zettels (empty: stock template), plus a button to create the stock template
-   **Truncate length**: Maximum character length for display in modal (default: `100`)
-   **Auto-open appended notes**: Open notes after appending highlights with smart match
-   **Readwise API token**, **Sync document list on startup**, **Skip existing notes**, **File name template** and **Export template**: see [Readwise import](#readwise-import)

## Installation

### Development Installation

1. Clone this repository into your vault's `.obsidian/plugins/zettelizer` folder
2. Run `npm install` to install dependencies
3. Run `npm run dev` for development with hot reload
4. Run `npm run build` for production build

## Development

Built with TypeScript following Obsidian plugin best practices:

-   **Organized structure**: Modular code split into `commands/`, `utils/`, and core files
-   **Type safety**: Full TypeScript support with strict mode
-   **Minimal footprint**: Lightweight with no external dependencies

### Project Structure

```
src/
  main.ts                    # Plugin lifecycle and registration
  settings.ts                # Settings interface and defaults
  types.ts                   # TypeScript interfaces
  commands/                  # Command registration (intake, Readwise, templates)
  intake/                    # Zettelizing logic and its vault/UI ports
  readwise/                  # Readwise API client, rendering, import and status modals
  ui/                        # Settings tab and shared modals
  utils/                     # Block ID parser, template variables, timestamps
```

## License

MIT
