# Zettelizer domain

- **Source note** — a Readwise note (in `readwiseFolder`) whose highlights carry block ids.
- **Highlight** — a block in a Source note ending in `^blockid`; optional inline `#tags`.
- **Zettel** — a new note in `zettelFolder` created for one Highlight; content is the template or a block transclusion `![[source#^blockid]]`.
- **Destination** — where a Highlight goes: a new Zettel, or an existing note appended to (matched by tag against frontmatter `title`).
- **Mode** — `plain` always creates a new Zettel; `smart` offers tag-matched existing notes first.
- **Highlight intake** — the module that runs the whole flow for a Source note: parse, select, choose Destination, create or append, report. Lives in `src/intake/`.
  - **vault port** — narrow interface over the vault (`exists`, `create`, `read`, `modify`, `notesWithTitles`). Adapters: Obsidian, in-memory.
  - **ui port** — user-facing surface (`selectHighlights`, `chooseDestination`, `notify`, `open`). Adapters: Obsidian modals, scripted fake.
