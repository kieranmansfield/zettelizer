import { FuzzySuggestModal, Notice, TFile, type App } from 'obsidian'
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

export function obsidianUi(plugin: ZettelizerPlugin): UiPort {
	const { app } = plugin
	return {
		selectHighlights: (highlights) =>
			new FuzzyHighlightModal(app, highlights, plugin.settings.truncateLength).prompt(),
		chooseDestination: async (highlight, matches) => {
			const choice = await new DestinationModal(
				app,
				highlight,
				matches.map((m) => ({ ...m, file: fileAt(app, m.note.path) }))
			).prompt()
			return choice instanceof TFile ? noteRef(choice) : choice
		},
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
