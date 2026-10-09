import type ZettelizerPlugin from '../main'
import { intake } from '../intake/intake'
import { noteRef, obsidianUi, obsidianVault } from '../intake/obsidian'
import { createLibrary, readwiseNoteInfo } from '../readwise/library'
import { ImportModal } from '../readwise/ImportModal'
import { docCacheStore, obsidianHttp, readwiseVault } from '../readwise/obsidian'
import { StatusModal } from '../readwise/StatusModal'

export function registerReadwiseCommands(plugin: ZettelizerPlugin) {
	const library = createLibrary({
		http: obsidianHttp,
		vault: readwiseVault(plugin.app),
		ui: obsidianUi(plugin),
		settings: plugin.settings,
		cache: docCacheStore(plugin.app, plugin.manifest.id),
		getToken: () => plugin.app.secretStorage.getSecret(plugin.settings.readwiseTokenSecret),
	})

	plugin.addCommand({
		id: 'import-readwise-document',
		name: 'Import Readwise document',
		callback: () => {
			new ImportModal(plugin.app, library.subscribe, (d) => void library.importDocument(d)).open()
			void library.sync()
		},
	})

	plugin.addCommand({
		id: 'import-and-zettelize-readwise-document',
		name: 'Import and zettelize Readwise document',
		callback: () => {
			new ImportModal(plugin.app, library.subscribe, async (d) => {
				const note = await library.importDocument(d)
				if (note) await intake(note, 'plain', { vault: obsidianVault(plugin.app), ui: obsidianUi(plugin), settings: plugin.settings })
			}).open()
			void library.sync()
		},
	})

	// Warm the document list once the workspace is ready so the picker opens with it already loaded.
	if (plugin.settings.syncOnStartup) plugin.app.workspace.onLayoutReady(() => void library.warm())

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
