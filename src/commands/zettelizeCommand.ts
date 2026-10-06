import { Notice, TFile } from 'obsidian'
import {
	ReadwiseFileModal,
	createZettel,
	loadZettelContext,
	selectHighlights,
	withActiveFile,
} from './shared'
import { Highlight } from '../types'
import type ZettelizerPlugin from '../main'

export function registerZettelizeCommand(plugin: ZettelizerPlugin) {
	// Command to zettelize current active file
	plugin.addCommand({
		id: 'zettelize-readwise-highlights',
		name: 'Zettelize Readwise highlights',
		callback: () => withActiveFile(plugin, (file) => zettelizeFile(plugin, file)),
	})

	// Command to open file picker and then zettelize
	plugin.addCommand({
		id: 'open',
		name: 'Open file picker',
		callback: () => {
			new ReadwiseFileModal(plugin, (file) => void zettelizeFile(plugin, file)).open()
		},
	})
}

function zettelizeFile(plugin: ZettelizerPlugin, file: TFile) {
	return selectHighlights(plugin, file, (highlights) => {
		void createZettels(plugin, file, highlights)
	})
}

async function createZettels(plugin: ZettelizerPlugin, sourceFile: TFile, highlights: Highlight[]) {
	const context = await loadZettelContext(plugin)
	if (!context) return

	let created = 0
	const withBlockId = highlights.filter((h) => h.blockId)

	for (const highlight of withBlockId) {
		if (await createZettel(plugin, sourceFile, highlight, context)) created++
	}

	const skipped = withBlockId.length - created
	new Notice(`Created ${created} zettel(s). Skipped ${skipped} (already exist).`)
}
