import type { Highlight } from '../types'
import { parseHighlightsFromContent } from '../utils/parser'
import { blockLink, createTemplateVariables, processTemplate } from '../utils/template'
import { generateTimestamp } from '../utils/timestamp'
import type { Destination, IntakeDeps, Mode, NoteRef, TagMatch, TitledNote, VaultPort } from './ports'

type Outcome = { kind: 'created' | 'skipped' } | { kind: 'appended'; note: NoteRef }

/** Titled notes whose title overlaps any of `tags` (tags are lowercase), best match first. */
function matchNotes(notes: TitledNote[], tags: string[]): TagMatch[] {
	return notes
		.flatMap(({ note, title }) => {
			const t = title.toLowerCase().trim()
			const matchingTags = tags.filter((tag) => t.includes(tag) || tag.includes(t))
			if (!t || matchingTags.length === 0) return []
			return [{ note, matchingTags, matchPercentage: (matchingTags.length / tags.length) * 100 }]
		})
		.sort((a, b) => b.matchPercentage - a.matchPercentage)
}

/** Timestamp path that is free in the vault; a taken name gets a -2, -3, … suffix. */
async function freePath(vault: VaultPort, folder: string, format: string): Promise<string> {
	const base = `${folder}/${generateTimestamp(new Date(), format)}`
	let path = `${base}.md`
	for (let n = 2; await vault.exists(path); n++) path = `${base}-${n}.md`
	return path
}

function zettelContent(source: NoteRef, blockId: string, text: string, template: string | null, notify: (m: string) => void) {
	const fallback = blockLink(source, blockId)
	if (!template) return fallback
	const content = processTemplate(template, createTemplateVariables(text, source, blockId))
	if (content.trim()) return content
	notify('Warning: template produced empty content. Check template variables')
	return fallback
}

async function append(vault: VaultPort, target: NoteRef, link: string) {
	let content = await vault.read(target)
	if (content.length > 0 && !content.endsWith('\n')) content += '\n'
	await vault.modify(target, `${content}\n---\n${link}\n`)
}

async function destinationFor(
	{ vault, ui }: IntakeDeps,
	mode: Mode,
	highlight: Highlight
): Promise<Destination | null> {
	if (mode === 'plain') return 'new'
	const matches = matchNotes(vault.notesWithTitles(), highlight.tags ?? [])
	return matches.length === 0 ? 'new' : ui.chooseDestination(highlight, matches)
}

function summarize(counts: Record<Outcome['kind'], number>): string {
	const parts = []
	if (counts.created > 0) parts.push(`Created ${counts.created} zettel(s)`)
	if (counts.appended > 0) parts.push(`Appended ${counts.appended} to existing notes`)
	if (counts.skipped > 0) parts.push(`Skipped ${counts.skipped}`)
	return parts.length ? parts.join('. ') + '.' : 'Nothing to do.'
}

/** Zettel folder check and template load. Null (after notifying) when the folder is missing. */
async function loadTemplate({ vault, ui, settings }: IntakeDeps): Promise<{ template: string | null } | null> {
	if (!(await vault.exists(settings.zettelFolder))) {
		ui.notify(`Zettel folder "${settings.zettelFolder}" does not exist. Please create it or update settings.`)
		return null
	}
	if (!settings.templatePath) return { template: null }
	const template = await vault.readTemplate(settings.templatePath)
	if (template === null) ui.notify(`Template file not found: ${settings.templatePath}`)
	return { template }
}

async function processHighlight(
	source: NoteRef,
	mode: Mode,
	h: Highlight & { blockId: string },
	template: string | null,
	deps: IntakeDeps
): Promise<Outcome> {
	const { vault, ui, settings } = deps
	const dest = await destinationFor(deps, mode, h)
	if (dest === null) return { kind: 'skipped' }
	if (dest === 'new') {
		const path = await freePath(vault, settings.zettelFolder, settings.timestampFormat)
		await vault.create(path, zettelContent(source, h.blockId, h.text, template, ui.notify))
		return { kind: 'created' }
	}
	await append(vault, dest, blockLink(source, h.blockId))
	return { kind: 'appended', note: dest }
}

/**
 * Highlight intake: parse a Source note, let the user pick Highlights, then turn each into
 * a new Zettel or an append to an existing note, and report the result.
 */
export async function intake(source: NoteRef, mode: Mode, deps: IntakeDeps): Promise<void> {
	const { vault, ui, settings } = deps

	const highlights = parseHighlightsFromContent(await vault.read(source))
	if (highlights.length === 0) return ui.notify('No highlights with block ids found in this file')

	const selected = await ui.selectHighlights(highlights)
	if (!selected?.length) return

	const context = await loadTemplate(deps)
	if (!context) return

	const counts = { created: 0, appended: 0, skipped: 0 }
	const appended: NoteRef[] = []

	// Sequential: each highlight may open a modal.
	for (const h of selected) {
		if (!h.blockId) continue
		const outcome = await processHighlight(source, mode, { ...h, blockId: h.blockId }, context.template, deps)
		counts[outcome.kind]++
		if (outcome.kind === 'appended') appended.push(outcome.note)
	}

	ui.notify(summarize(counts))
	if (settings.autoOpenAppendedNotes && appended.length) await ui.open(appended[0])
}
