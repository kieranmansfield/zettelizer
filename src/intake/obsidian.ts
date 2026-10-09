import { FuzzySuggestModal, Notice, TFile, type App, type Modal } from 'obsidian'
import { DestinationModal } from '../ui/DestinationModal'
import { FuzzyHighlightModal } from '../ui/FuzzyHighlightModal'
import type ZettelizerPlugin from '../main'
import type { NoteRef, UiPort, VaultPort } from './ports'

export const noteRef = (f: TFile): NoteRef => ({ path: f.path, basename: f.basename })

function fileAt(app: App, path: string): TFile {
	const f = app.vault.getAbstractFileByPath(path)
	if (!(f instanceof TFile)) throw new Error(`Not a file: ${path}`)
	return f
}

export function obsidianVault(app: App): VaultPort {
	return {
		exists: (path) => app.vault.adapter.exists(path),
		create: async (path, content) => void (await app.vault.create(path, content)),
		read: (note) => app.vault.read(fileAt(app, note.path)),
		modify: (note, content) => app.vault.modify(fileAt(app, note.path), content),
		readTemplate: async (path) => {
			const f = app.vault.getAbstractFileByPath(path)
			return f instanceof TFile ? app.vault.read(f) : null
		},
		notesWithTitles: () =>
			app.vault.getMarkdownFiles().flatMap((f) => {
				const title: unknown = app.metadataCache.getFileCache(f)?.frontmatter?.title
				return typeof title === 'string' && title.trim() ? [{ note: noteRef(f), title }] : []
			}),
	}
}

/** Opens `make`'s modal; resolves with the chosen value, or null if it closes without a choice. */
function prompt<T>(make: (done: (v: T) => void) => Modal): Promise<T | null> {
	return new Promise((resolve) => {
		let settled = false
		const done = (v: T | null) => {
			if (settled) return
			settled = true
			resolve(v)
		}
		const modal = make(done)
		const close = modal.close.bind(modal)
		// Deferred: Obsidian closes the modal before it calls the choose callback.
		modal.close = () => {
			close()
			setTimeout(() => done(null), 0)
		}
		modal.open()
	})
}

export function obsidianUi(plugin: ZettelizerPlugin): UiPort {
	const { app } = plugin
	return {
		selectHighlights: (highlights) =>
			prompt((done) => new FuzzyHighlightModal(app, highlights, plugin.settings.truncateLength, done)),
		chooseDestination: (highlight, matches) =>
			prompt(
				(done) =>
					new DestinationModal(
						app,
						highlight,
						matches.map((m) => ({ ...m, file: fileAt(app, m.note.path) })),
						(d) => done(d === 'new' ? d : noteRef(d))
					)
			),
		notify: (message) => void new Notice(message),
		open: (note) => app.workspace.getLeaf(false).openFile(fileAt(app, note.path)),
	}
}

/** Fuzzy picker over the markdown files in the Readwise folder. */
export class ReadwiseFileModal extends FuzzySuggestModal<TFile> {
	constructor(
		private plugin: ZettelizerPlugin,
		private onChoose: (file: TFile) => void
	) {
		super(plugin.app)
	}

	getItems(): TFile[] {
		const prefix = this.plugin.settings.readwiseFolder + '/'
		return this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix))
	}

	getItemText(file: TFile): string {
		return file.basename
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file)
	}
}
