import { describe, expect, it } from 'vitest'
import { intake } from './intake'
import type { Destination, IntakeSettings, NoteRef, TitledNote, UiPort, VaultPort } from './ports'
import type { Highlight } from '../types'

const SOURCE: NoteRef = { path: 'Readwise/Book.md', basename: 'Book' }
const settings: IntakeSettings = { zettelFolder: 'Z', templatePath: '', timestampFormat: '', autoOpenAppendedNotes: true }

function setup(opts: {
	files?: Record<string, string>
	titles?: TitledNote[]
	choose?: (h: Highlight) => Destination | null
	settings?: Partial<IntakeSettings>
}) {
	const files: Record<string, string> = { 'Readwise/Book.md': '', ...opts.files }
	const folders = new Set(['Z'])
	const messages: string[] = []
	const opened: string[] = []
	const vault: VaultPort = {
		exists: async (p) => p in files || folders.has(p),
		create: async (p, c) => void (files[p] = c),
		read: async (n) => files[n.path],
		modify: async (n, c) => void (files[n.path] = c),
		readTemplate: async (p) => files[p] ?? null,
		notesWithTitles: () => opts.titles ?? [],
	}
	const ui: UiPort = {
		selectHighlights: async (h) => h,
		chooseDestination: async (h) => (opts.choose ? opts.choose(h) : 'new'),
		notify: (m) => void messages.push(m),
		open: async (n) => void opened.push(n.path),
	}
	const run = (mode: 'plain' | 'smart') => intake(SOURCE, mode, { vault, ui, settings: { ...settings, ...opts.settings } })
	const zettels = () => Object.keys(files).filter((p) => p.startsWith('Z/'))
	return { files, messages, opened, run, zettels }
}

const TWO = '> one ^a1\n\n> two #Alpha ^a2\n'

describe('intake', () => {
	it('plain mode creates one zettel per highlight, even in the same millisecond', async () => {
		const t = setup({ files: { 'Readwise/Book.md': TWO } })
		await t.run('plain')
		expect(t.zettels()).toHaveLength(2)
		expect(t.files[t.zettels()[0]]).toMatch(/^!\[\[Book#\^a\d\]\]$/)
		expect(t.messages).toEqual(['Created 2 zettel(s).'])
	})

	it('names zettels with timestampFormat and suffixes taken names', async () => {
		const t = setup({ files: { 'Readwise/Book.md': TWO }, settings: { timestampFormat: 'YYYY' } })
		await t.run('plain')
		const year = String(new Date().getFullYear())
		expect(t.zettels().sort()).toEqual([`Z/${year}-2.md`, `Z/${year}.md`])
	})

	it('inserts highlight text verbatim in templates', async () => {
		const t = setup({ files: { 'Readwise/Book.md': '> costs $& {{link}} ^a1\n', 'T.md': '{{highlight}}' }, settings: { templatePath: 'T.md' } })
		await t.run('plain')
		expect(t.files[t.zettels()[0]]).toBe('costs $& {{link}}')
	})

	it('smart mode appends to a tag-matched note and opens it', async () => {
		const alpha: NoteRef = { path: 'Alpha.md', basename: 'Alpha' }
		const t = setup({
			files: { 'Readwise/Book.md': TWO, 'Alpha.md': 'body' },
			titles: [{ note: alpha, title: 'Alpha' }],
			choose: () => alpha,
		})
		await t.run('smart')
		expect(t.files['Alpha.md']).toBe('body\n\n---\n![[Book#^a2]]\n')
		expect(t.zettels()).toHaveLength(1) // untagged highlight still gets a zettel
		expect(t.messages).toEqual(['Created 1 zettel(s). Appended 1 to existing notes.'])
		expect(t.opened).toEqual(['Alpha.md'])
	})

	it('cancelling the destination prompt skips that highlight', async () => {
		const alpha: NoteRef = { path: 'Alpha.md', basename: 'Alpha' }
		const t = setup({
			files: { 'Readwise/Book.md': TWO, 'Alpha.md': '' },
			titles: [{ note: alpha, title: 'alpha' }],
			choose: () => null,
		})
		await t.run('smart')
		expect(t.messages).toEqual(['Created 1 zettel(s). Skipped 1.'])
		expect(t.opened).toEqual([])
	})

	it('falls back to the transclusion when the template renders empty', async () => {
		const t = setup({
			files: { 'Readwise/Book.md': TWO, 'T.md': ' \n' },
			settings: { templatePath: 'T.md' },
		})
		await t.run('plain')
		expect(t.messages[0]).toMatch(/template produced empty content/)
		expect(t.files[t.zettels()[0]]).toMatch(/^!\[\[Book#/)
	})

	it('fills template variables', async () => {
		const t = setup({ files: { 'Readwise/Book.md': '> hi ^a1\n', 'T.md': '{{highlight}} / {{link}}' }, settings: { templatePath: 'T.md' } })
		await t.run('plain')
		expect(t.files[t.zettels()[0]]).toBe('hi / ![[Book#^a1]]')
	})

	it('strips <mark> tags from rendered Readwise highlights', async () => {
		const t = setup({ files: { 'Readwise/Book.md': '> <mark>hi there</mark> ^a1\n', 'T.md': '{{highlight}}' }, settings: { templatePath: 'T.md' } })
		await t.run('plain')
		expect(t.files[t.zettels()[0]]).toBe('hi there')
	})

	it('reports a missing zettel folder and a note without highlights', async () => {
		const missing = setup({ files: { 'Readwise/Book.md': TWO }, settings: { zettelFolder: 'Nope' } })
		await missing.run('plain')
		expect(missing.messages[0]).toMatch(/does not exist/)
		const empty = setup({})
		await empty.run('plain')
		expect(empty.messages).toEqual(['No highlights with block ids found in this file'])
	})
})
