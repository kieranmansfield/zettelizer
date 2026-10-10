# Readwise import and status: planned additions

Status: proposal, nothing built yet.

## Why

Zettelizer already works on Readwise notes (`readwiseFolder` setting, block-ID highlights). The official Readwise plugin can only sync everything, with no way to pick one document. These additions let you choose a document from your Readwise library, import just that one, then zettelize its highlights, all in one workflow.

A QuickAdd-script prototype (`Utilities/Scripts/readwiseStatus.js` in the ZK2026 vault) proved the API calls but failed silently inside QuickAdd, so this moves into the plugin, which gives real commands, a settings UI and error handling.

## Scope

1. **Import Readwise document** (command): fuzzy-pick a document, write it to `readwiseFolder`.
2. **Set Readwise status** (command, second phase): push `process` / `processing` / `processed` as a Readwise book tag and mirror it to the note's `status:` property.

## Readwise API (v2, `Authorization: Token <token>`)

| Purpose | Request | Notes |
| --- | --- | --- |
| List documents | `GET /api/v2/books/?page_size=1000&page=N` | `id`, `title`, `author`, `category`, `num_highlights`; paginated, filter with `category=` |
| Export one document | `GET /api/v2/export/?ids=<id>` | highlights + metadata; paginated via `pageCursor` |
| List tags on a document | `GET /api/v2/books/<id>/tags?page_size=1000` | returns a bare array (verified), handle `results` too |
| Add tag | `POST /api/v2/books/<id>/tags/` body `{"name": "..."}` | 200 or 201 |
| Delete tag | `DELETE /api/v2/books/<id>/tags/<tag_id>` | 204 |

Use Obsidian's `requestUrl` (no CORS issues), with `throw: false` and explicit status checks.

## Files

```
src/readwise/
  api.ts           listDocuments(), exportDocument(id), listTags/addTag/deleteTag
  render.ts        document -> markdown (frontmatter + highlights)
  ImportModal.ts   FuzzySuggestModal of documents
  statusModal.ts   FuzzySuggestModal for process / processing / processed (phase 2)
src/commands/commands.ts   register the two new commands
src/settings.ts            add readwiseToken, skipExisting
src/ui/SettingsTab.ts      token field, skip-existing toggle
```

Keep `src/readwise/` separate from the zettelize code so the import layer has no dependency on the highlight parser.

## Settings additions

```ts
readwiseToken: string   // default ''
skipExisting: boolean   // default true: don't overwrite an existing note
```

Token lives in the plugin's `data.json`. Confirm `data.json` is gitignored before pasting a token. Optionally fall back to reading `readwise-official`'s stored token if this one is empty.

## Import command behaviour

1. Fetch all documents (page through `/books/`), cache for the session.
2. Modal rows: `Title — Author · category · N highlights`; type to filter, Enter to select.
3. Fetch the document via `/export/?ids=<id>`.
4. Render to `<readwiseFolder>/<Title> by <Author> highlights.md` (configurable file name template).
5. If the file exists and `skipExisting` is on, open it instead of overwriting.
6. Show a Notice for every outcome (imported, skipped, failed with cause).

## Note format (match existing exports)

Frontmatter, copied from current exported notes:

```yaml
---
tags:
  - keywords/<tag>
title: "<title>"
type: readwise-<category>      # readwise-book, readwise-article, ...
status: process                # default for a fresh import
authors:
  - "<author>"
id: "<document id>"
image: "<cover url>"
sources:
  - "<source url>"
  - "https://readwise.io/bookreview/<id>"
---
```

Body, one block per highlight (the zettelizer parser depends on the trailing block ID):

```markdown
# Highlights
> ==highlight text== ^<highlight id>


---
```

The `^<highlight id>` must be the Readwise highlight ID exactly, or zettelizer's block-reference links won't resolve. Verify against a real exported note before finalising `render.ts`.

## Status command (phase 2)

1. Read `id` from the active note's frontmatter; require `type` to start with `readwise-`.
2. Fuzzy modal for `process` / `processing` / `processed`, showing the current value.
3. `GET` tags, delete any other status tag, add the chosen one if missing.
4. Only if the API calls succeed, write `status:` via `app.fileManager.processFrontMatter`.
5. Notice on success or failure.

Known quirk: exported tags carry a `keywords/` prefix from the official plugin's template, so a Readwise tag `processing` may reappear as `keywords/processing` after an official-plugin resync.

## Caveats

- Turn off the official plugin's auto-sync, or it re-exports everything and may overwrite or duplicate imported notes.
- Rendering is a re-implementation of the official plugin's template, so output will be close but not byte-identical.
- Resync of an already-imported document is out of scope for v1 (skip-existing only).

## Build order

1. `api.ts` + token setting.
2. `ImportModal.ts` + `render.ts` + import command.
3. `npm run build` and lint clean; test on one document in the dev vault.
4. Status command.

## Open questions

- Fall back to the official plugin's token, or require entering one?
- Should import apply a default `status: process`, or leave it unset?
- Filter the modal by category (book / article / tweet / podcast), or show everything?
