import type ZettelizerPlugin from '../main'
import { noteRef, obsidianUi } from '../intake/obsidian'
import { createLibrary, readwiseNoteInfo } from '../readwise/library'
import { ImportModal } from '../readwise/ImportModal'
import { obsidianHttp, readwiseVault } from '../readwise/obsidian'
import { StatusModal } from '../readwise/StatusModal'

export function registerReadwiseCommands(plugin: ZettelizerPlugin) {
	const library = createLibrary({
		http: obsidianHttp,
		vault: readwiseVault(plugin.app),
		ui: obsidianUi(plugin),
		settings: plugin.settings,
	})

	plugin.addCommand({
		id: 'import-readwise-document',
		name: 'Import Readwise document',
		callback: async () => {
			const docs = await library.documents()
			if (docs) new ImportModal(plugin.app, docs, (d) => void library.importDocument(d)).open()
		},
	})

	plugin.addCommand({
		id: 'set-readwise-status',
		name: 'Set Readwise status',
		// fallow-ignore-next-line complexity -- Obsidian command glue; the logic is in readwiseNoteInfo
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile()
			if (!file) return false
			const info = readwiseNoteInfo(plugin.app.metadataCache.getFileCache(file)?.frontmatter)
			if (!info) return false
			if (!checking) {
				new StatusModal(plugin.app, info.status, (s) => void library.setStatus(noteRef(file), info.id, s)).open()
			}
			return true
		},
	})
}
