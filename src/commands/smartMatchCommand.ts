import { Notice, TFile } from 'obsidian'
import { DestinationModal } from '../ui/DestinationModal'
import { findMatchingNotes, type MatchedNote } from '../utils/noteMatcher'
import { appendHighlightToNote } from '../utils/fileAppender'
import {
	ReadwiseFileModal,
	createZettel,
	loadZettelContext,
	type ZettelContext,
	selectHighlights,
	withActiveFile,
} from './shared'
import { Highlight } from '../types'
import type ZettelizerPlugin from '../main'

export function registerSmartMatchCommand(plugin: ZettelizerPlugin) {
	// Command to smart match current active file
	plugin.addCommand({
		id: 'smart-match-readwise-highlights',
		name: 'Smart Match Readwise highlights',
		callback: () => withActiveFile(plugin, (file) => smartMatchFile(plugin, file)),
	})

	// Command to open file picker and then smart match
	plugin.addCommand({
		id: 'smart-match-open-file-picker',
		name: 'Smart Match: Open file picker',
		callback: () => {
			new ReadwiseFileModal(plugin, (file) => void smartMatchFile(plugin, file)).open()
		},
	})
}

function smartMatchFile(plugin: ZettelizerPlugin, file: TFile) {
	return selectHighlights(plugin, file, (highlights) => {
		void processHighlightsWithSmartMatch(plugin, file, highlights)
	})
}

type Outcome = { kind: 'created' | 'skipped' } | { kind: 'appended'; file: TFile }

/** Picks where a highlight goes: 'new' when nothing matches, null if the user cancels. */
async function chooseDestination(
	plugin: ZettelizerPlugin,
	highlight: Highlight
): Promise<'new' | TFile | null> {
	const matchedNotes = findMatchingNotes(plugin.app, highlight.tags ?? [])
	if (matchedNotes.length === 0) return 'new'
	return showDestinationModal(plugin, highlight, matchedNotes)
}

async function processHighlight(
	plugin: ZettelizerPlugin,
	sourceFile: TFile,
	highlight: Highlight & { blockId: string },
	context: ZettelContext
): Promise<Outcome> {
	const destination = await chooseDestination(plugin, highlight)

	if (destination === null) return { kind: 'skipped' }
	if (destination === 'new') {
		const created = await createZettel(plugin, sourceFile, highlight, context)
		return { kind: created ? 'created' : 'skipped' }
	}

	await appendHighlightToNote(plugin.app, destination, sourceFile, highlight.blockId)
	return { kind: 'appended', file: destination }
}

function summarize(counts: Record<Outcome['kind'], number>): string {
	const summary = []
	if (counts.created > 0) summary.push(`Created ${counts.created} zettel(s)`)
	if (counts.appended > 0) summary.push(`Appended ${counts.appended} to existing notes`)
	if (counts.skipped > 0) summary.push(`Skipped ${counts.skipped}`)
	return summary.join('. ') + '.'
}

async function openFirstAppended(plugin: ZettelizerPlugin, files: TFile[]) {
	if (!plugin.settings.autoOpenAppendedNotes || files.length === 0) return
	await plugin.app.workspace.getLeaf(false).openFile(files[0])
}

async function processHighlightsWithSmartMatch(
	plugin: ZettelizerPlugin,
	sourceFile: TFile,
	highlights: Highlight[]
) {
	const context = await loadZettelContext(plugin)
	if (!context) return

	const counts = { created: 0, appended: 0, skipped: 0 }
	const appendedFiles: TFile[] = []
	const withBlockId = highlights.filter((h): h is Highlight & { blockId: string } => !!h.blockId)

	// Process each highlight sequentially (each may open a modal)
	for (const highlight of withBlockId) {
		const outcome = await processHighlight(plugin, sourceFile, highlight, context)
		counts[outcome.kind]++
		if (outcome.kind === 'appended') appendedFiles.push(outcome.file)
	}

	new Notice(summarize(counts))
	await openFirstAppended(plugin, appendedFiles)
}

/**
 * Shows the destination modal and returns the user's choice
 * Returns null if user cancels
 */
function showDestinationModal(
	plugin: ZettelizerPlugin,
	highlight: Highlight,
	matchedNotes: MatchedNote[]
): Promise<'new' | TFile | null> {
	return new Promise((resolve) => {
		let hasResolved = false

		const modal = new DestinationModal(plugin.app, highlight, matchedNotes, (destination) => {
			if (!hasResolved) {
				hasResolved = true
				resolve(destination)
			}
		})

		// Handle modal close without selection
		const originalClose = modal.close.bind(modal)
		modal.close = function () {
			originalClose()
			// If closing without having made a choice, resolve with null
			if (!hasResolved) {
				hasResolved = true
				resolve(null)
			}
		}

		modal.open()
	})
}
