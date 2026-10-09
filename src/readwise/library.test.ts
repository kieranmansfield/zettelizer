import { describe, expect, it } from 'vitest'
import { createLibrary, readwiseNoteInfo, type DocCache, type LibrarySettings, type RwDocument } from './library'
import type { NoteRef } from '../intake/ports'
import { parseHighlightsFromContent } from '../utils/parser'

type Req = { method: string; path: string; body?: unknown }

const DOC: RwDocument = { id: 7, title: 'My: Book', author: 'A', category: 'books', num_highlights: 1 }
const EXPORT = { user_book_id: 7, title: 'My: Book', author: 'A', category: 'books', highlights: [{ id: 1, text: 'hello' }] }

function setup(opts: { routes?: Record<string, (r: Req) => { status: number; json?: unknown }>; files?: Record<string, string>; settings?: Partial<LibrarySettings>; token?: string | null; cached?: DocCache } = {}) {
	const reqs: Req[] = []
	const files = { ...opts.files }
	const messages: string[] = []
	const opened: string[] = []
	const statusProps: string[] = []
	const saved: DocCache[] = []
	const ref = (p: string): NoteRef => ({ path: p, basename: p.split('/').pop()!.replace(/\.md$/, '') })
	const lib = createLibrary({
		http: {
			request: async ({ method, url, body }) => {
				const path = url.replace('https://readwise.io/api/v2', '')
				const r = { method, path, body: body ? JSON.parse(body) : undefined }
				reqs.push(r)
				const route = Object.entries(opts.routes ?? {}).find(([k]) => `${method} ${path}`.startsWith(k))
				const out = route ? route[1](r) : { status: 404 }
				return { status: out.status, json: out.json }
			},
		},
		vault: {
			exists: async (p) => p in files || p === 'Readwise',
			createFolder: async () => {},
			find: (p) => (p in files ? ref(p) : null),
			create: async (p, c) => ((files[p] = c), ref(p)),
			modify: async (n, c) => void (files[n.path] = c),
			setStatusProperty: async (_n, s) => void statusProps.push(s),
		},
		ui: { notify: (m) => void messages.push(m), open: async (n) => void opened.push(n.path) },
		settings: { readwiseFolder: 'Readwise', skipExisting: true, readwiseNoteTemplate: '', readwiseHighlightTemplate: '', ...opts.settings },
		cache: { load: async () => opts.cached ?? null, save: async (c) => void saved.push(c) },
		getToken: () => (opts.token === undefined ? 'tok' : opts.token),
	})
	return { lib, reqs, files, messages, opened, statusProps, saved }
}

describe('readwise library', () => {
	const listed = (t: ReturnType<typeof setup>) => {
		const seen: number[][] = []
		t.lib.subscribe((docs) => void seen.push(docs.map((d) => d.id)))
		return seen
	}

	it('cold start: small first page, then the full pages, publishing as it goes', async () => {
		const t = setup({
			routes: {
				'GET /books/?page_size=50&page=1': () => ({ status: 200, json: { results: [DOC], count: 2 } }),
				'GET /books/?page_size=1000&page=1': () => ({ status: 200, json: { results: [DOC], count: 2 } }),
				'GET /books/?page_size=1000&page=2': () => ({ status: 200, json: { results: [{ ...DOC, id: 8 }], count: 2 } }),
			},
		})
		const seen = listed(t)
		await t.lib.sync()
		expect(seen).toEqual([[7], [7], [7, 8]])
		expect(t.saved[0].docs.map((d) => d.id)).toEqual([7, 8])
	})

	it('publishes the cached list first and only pulls documents updated since the last sync', async () => {
		const t = setup({
			cached: { docs: [DOC, { ...DOC, id: 8 }], syncedAt: '2026-01-01T00:00:00.000Z' },
			routes: { 'GET /books/?page_size=1000&page=1&updated__gt=2026-01-01T00%3A00%3A00.000Z': () => ({ status: 200, json: { results: [{ ...DOC, num_highlights: 5 }], count: 1 } }) },
		})
		let latest: RwDocument[] = []
		t.lib.subscribe((docs) => (latest = docs))
		await t.lib.sync()
		expect(latest.map((d) => [d.id, d.num_highlights])).toEqual([[7, 5], [8, 1]])
		expect(t.reqs).toHaveLength(1)
		expect(t.saved[0].docs).toHaveLength(2)
	})

	it('runs one sync at a time and keeps the list in memory', async () => {
		const t = setup({ routes: { 'GET /books/': () => ({ status: 200, json: { results: [DOC], count: 1 } }) } })
		await Promise.all([t.lib.sync(), t.lib.warm()])
		expect(t.reqs).toHaveLength(2)
		const seen = listed(t)
		expect(seen).toEqual([[7]])
	})

	it('keeps document tags, highlight tags and highlight notes apart and intact', async () => {
		const tagged = {
			...EXPORT,
			book_tags: [{ name: 'stoicism' }, { name: 'to read' }, { name: 'processed' }],
			highlights: [
				{ id: 1, text: 'first', note: 'my note\nline two\n.fav', tags: [{ name: 'mental health' }, { name: '!core-idea' }, { name: '2024' }, { name: '?!' }] },
				{ id: 2, text: 'second' },
			],
		}
		const t = setup({ routes: { 'GET /export/': () => ({ status: 200, json: { results: [tagged], nextPageCursor: null } }) } })
		await t.lib.importDocument(DOC)
		const md = t.files['Readwise/My Book Highlights.md']
		const fm = md.split('---')[1]
		expect(fm).toContain('tags:\n  - stoicism\n  - to-read\ntitle:')
		expect(fm).not.toContain('mental-health')
		expect(fm).toContain('status: processed')
		expect(md).toContain('<mark>first</mark> #mental-health #core-idea #_2024 ^1\n\n**Note:** my note\nline two\n.fav')
		// the importer's own output still parses: tags land in `tags`, not in the text
		const [first] = parseHighlightsFromContent(md)
		expect(first).toMatchObject({ text: 'first', blockId: '1', tags: ['mental-health', 'core-idea', '_2024'] })
	})

	it('imports a document into a sanitized path and opens it', async () => {
		const t = setup({ routes: { 'GET /export/': () => ({ status: 200, json: { results: [EXPORT], nextPageCursor: null } }) } })
		await t.lib.importDocument(DOC)
		expect(Object.keys(t.files)).toEqual(['Readwise/My Book Highlights.md'])
		expect(t.files['Readwise/My Book Highlights.md']).toContain('<mark>hello</mark> ^1')
		expect(t.opened).toEqual(['Readwise/My Book Highlights.md'])
	})

	it('opens an existing note without calling Readwise when skipExisting is on', async () => {
		const t = setup({ files: { 'Readwise/My Book Highlights.md': 'old' } })
		await t.lib.importDocument(DOC)
		expect(t.reqs).toHaveLength(0)
		expect(t.files['Readwise/My Book Highlights.md']).toBe('old')
		expect(t.opened).toHaveLength(1)
	})

	it('overwrites an existing note when skipExisting is off', async () => {
		const t = setup({
			files: { 'Readwise/My Book Highlights.md': 'old' },
			settings: { skipExisting: false },
			routes: { 'GET /export/': () => ({ status: 200, json: { results: [EXPORT], nextPageCursor: null } }) },
		})
		await t.lib.importDocument(DOC)
		expect(t.files['Readwise/My Book Highlights.md']).toContain('hello')
	})

	it('setStatus removes other status tags, adds the new one, and mirrors it to the note', async () => {
		const t = setup({
			routes: {
				'GET /books/7/tags': () => ({ status: 200, json: [{ id: 1, name: 'process' }, { id: 2, name: 'keep' }] }),
				'DELETE /books/7/tags/1': () => ({ status: 204 }),
				'POST /books/7/tags/': () => ({ status: 201 }),
			},
		})
		await t.lib.setStatus({ path: 'n.md', basename: 'n' }, 7, 'processed')
		expect(t.reqs.map((r) => `${r.method} ${r.path}`)).toEqual(['GET /books/7/tags?page_size=1000', 'DELETE /books/7/tags/1', 'POST /books/7/tags/'])
		expect(t.reqs[2].body).toEqual({ name: 'processed' })
		expect(t.statusProps).toEqual(['processed'])
	})

	it('setStatus does not re-add a tag that is already present', async () => {
		const t = setup({ routes: { 'GET /books/7/tags': () => ({ status: 200, json: { results: [{ id: 3, name: 'processed' }] } }) } })
		await t.lib.setStatus({ path: 'n.md', basename: 'n' }, 7, 'processed')
		expect(t.reqs).toHaveLength(1)
	})

	it('reports a missing token and HTTP failures as notices', async () => {
		const noToken = setup({ token: null })
		await noToken.lib.sync()
		expect(noToken.messages[0]).toMatch(/token is not set/)
		const failing = setup({ routes: { 'GET /export/': () => ({ status: 500 }) } })
		await failing.lib.importDocument(DOC)
		expect(failing.messages).toEqual(['Readwise: Readwise GET /export/?ids=7 failed (500)'])
		expect(failing.opened).toEqual([])
	})
})

describe('readwiseNoteInfo', () => {
	it('reads id and status from imported Readwise notes only', () => {
		expect(readwiseNoteInfo({ id: '7', type: 'readwise-books', status: 'process' })).toEqual({ id: 7, status: 'process' })
		expect(readwiseNoteInfo({ id: '7', type: 'readwise-articles' })).toEqual({ id: 7, status: undefined })
		expect(readwiseNoteInfo({ id: '7', type: 'note' })).toBeNull()
		expect(readwiseNoteInfo({ type: 'readwise-books' })).toBeNull()
		expect(readwiseNoteInfo(undefined)).toBeNull()
	})
})
