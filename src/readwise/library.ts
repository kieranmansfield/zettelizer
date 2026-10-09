import type { ZettelizerSettings } from '../settings'
import type { NoteRef, UiPort } from '../intake/ports'
import { DEFAULT_FILENAME_TEMPLATE, DEFAULT_FILENAME_TEMPLATE_NO_AUTHOR, fill, renderDocument, safeName } from './render'

const BASE = 'https://readwise.io/api/v2'

/** Concurrent /books/ requests; Readwise rate-limits, so keep this small. */
const PARALLEL_PAGES = 4
const PAGE_SIZE = 1000
/** Size of the very first request on an empty cache, kept small so the picker fills quickly. */
const FIRST_PAGE = 50

export const STATUSES = ['process', 'processing', 'processed']

export interface RwDocument {
	id: number
	title: string
	author: string
	category: string
	num_highlights: number
}

export interface RwExport {
	user_book_id: number
	title: string
	author: string
	category: string
	cover_image_url?: string
	source_url?: string
	/** Tags on the document itself (not on its highlights). */
	book_tags?: { name: string }[]
	highlights: { id: number; text: string; note?: string; tags?: { name: string }[] }[]
}

/** The document list as last synced, so later sessions only fetch what changed. */
export interface DocCache {
	docs: RwDocument[]
	/** ISO time the sync started; the next sync asks Readwise for documents updated after it. */
	syncedAt: string
}

export interface DocCacheStore {
	load(): Promise<DocCache | null>
	save(cache: DocCache): Promise<void>
}

interface RwTag {
	id: number
	name: string
}

/** Seam over the network. `json` is undefined for empty or 204 responses. */
export interface HttpPort {
	request(req: { method: string; url: string; headers: Record<string, string>; body?: string }): Promise<{ status: number; json: unknown }>
}

export interface LibraryVault {
	exists(path: string): Promise<boolean>
	createFolder(path: string): Promise<void>
	find(path: string): NoteRef | null
	/** The imported note for this Readwise document id, wherever it lives in the vault. */
	findByReadwiseId(id: number): NoteRef | null
	create(path: string, content: string): Promise<NoteRef>
	modify(note: NoteRef, content: string): Promise<void>
	/** Mirrors the status into the note's `status` property. */
	setStatusProperty(note: NoteRef, status: string): Promise<void>
}

export type LibrarySettings = Pick<ZettelizerSettings, 'readwiseFolder' | 'skipExisting' | 'readwiseNoteTemplate' | 'readwiseHighlightTemplate' | 'readwiseFilenameTemplate'>

export interface LibraryDeps {
	http: HttpPort
	vault: LibraryVault
	ui: Pick<UiPort, 'notify' | 'open'>
	settings: LibrarySettings
	/** The Readwise token, or null if none is set. */
	getToken(): string | null
	cache: DocCacheStore
}

/** Readwise id and current status from a note's frontmatter; null if it is not an imported Readwise note. */
export function readwiseNoteInfo(fm: Record<string, unknown> | undefined): { id: number; status?: string } | null {
	const id = Number(fm?.id)
	if (!id || !String(fm?.type ?? '').startsWith('readwise-')) return null
	return { id, status: typeof fm?.status === 'string' ? fm.status : undefined }
}

/** Renders an export; the status tag lives in `status`, every other document tag stays a tag. */
function renderExport(data: RwExport, settings: LibrarySettings): string {
	const bookTags = (data.book_tags ?? []).map((t) => t.name)
	const status = bookTags.find((t) => STATUSES.includes(t)) ?? 'process'
	return renderDocument(data, bookTags.filter((t) => !STATUSES.includes(t)), status, {
		note: settings.readwiseNoteTemplate,
		highlight: settings.readwiseHighlightTemplate,
	})
}

/**
 * Readwise library: lists documents (cached on disk, refreshed incrementally), imports one into the vault,
 * and syncs its status tag to Readwise and the note. Failures surface as notices.
 */
export function createLibrary({ http, vault, ui, settings, getToken, cache }: LibraryDeps) {
	let docs: RwDocument[] | undefined
	let syncedAt: string | undefined
	let running: Promise<void> | undefined
	const listeners = new Set<(docs: RwDocument[]) => void>()

	async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
		const token = getToken()
		if (!token) throw new Error('Readwise token is not set (Settings → Zettelizer).')
		const res = await http.request({
			method,
			url: BASE + path,
			headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body),
		})
		if (res.status < 200 || res.status >= 300) throw new Error(`Readwise ${method} ${path} failed (${res.status})`)
		return res.json as T
	}

	const books = (pageSize: number, page: number, since?: string) =>
		call<{ results: RwDocument[]; count: number }>(
			'GET',
			`/books/?page_size=${pageSize}&page=${page}` + (since ? `&updated__gt=${encodeURIComponent(since)}` : '')
		)

	function publish(next: RwDocument[]) {
		docs = next
		for (const l of listeners) l(next)
	}

	function merge(fresh: RwDocument[]) {
		const byId = new Map((docs ?? []).map((d) => [d.id, d]))
		for (const d of fresh) byId.set(d.id, d)
		publish([...byId.values()])
	}

	/** Fetches documents updated after `since` (all of them if omitted), publishing the merged list after each batch. */
	async function pull(since?: string): Promise<void> {
		// Cold start: a small first page so the picker has something to show right away.
		if (!since) merge((await books(FIRST_PAGE, 1)).results)
		const first = await books(PAGE_SIZE, 1, since)
		merge(first.results)
		const pages = first.results.length ? Math.ceil(first.count / first.results.length) : 0
		for (let n = 2; n <= pages; n += PARALLEL_PAGES) {
			const batch = Array.from({ length: Math.min(PARALLEL_PAGES, pages - n + 1) }, (_, i) => books(PAGE_SIZE, n + i, since))
			merge((await Promise.all(batch)).flatMap((r) => r.results))
		}
	}

	// ponytail: documents deleted in Readwise linger in the cache, delete readwise-cache.json to resync
	/** Loads the cached list, then pulls only what changed since the last sync. One sync runs at a time. */
	function runSync(): Promise<void> {
		return (running ??= (async () => {
			const startedAt = new Date().toISOString()
			if (!docs) {
				const cached = await cache.load()
				if (cached) {
					publish(cached.docs)
					syncedAt = cached.syncedAt
				}
			}
			await pull(syncedAt)
			syncedAt = startedAt
			await cache.save({ docs: docs ?? [], syncedAt })
		})().finally(() => (running = undefined)))
	}

	async function exportDocument(id: number): Promise<RwExport | undefined> {
		let doc: RwExport | undefined
		let cursor: string | null = null
		do {
			const q: string = `/export/?ids=${id}` + (cursor ? `&pageCursor=${encodeURIComponent(cursor)}` : '')
			const r: { results: RwExport[]; nextPageCursor: string | null } = await call('GET', q)
			const part = r.results[0]
			if (part) {
				if (doc) doc.highlights.push(...part.highlights)
				else doc = part
			}
			cursor = r.nextPageCursor
		} while (cursor)
		return doc
	}

	async function listTags(id: number): Promise<RwTag[]> {
		const r = await call<RwTag[] | { results: RwTag[] }>('GET', `/books/${id}/tags?page_size=1000`)
		return Array.isArray(r) ? r : r.results
	}

	/** Runs `fn`, reporting any failure as a notice. */
	async function guarded<T>(fn: () => Promise<T>): Promise<T | null> {
		try {
			return await fn()
		} catch (e) {
			ui.notify(`Readwise: ${e instanceof Error ? e.message : String(e)}`)
			return null
		}
	}

	/** Note path from the filename template; a name taken by another document gets the id prepended. */
	function freePath(doc: RwDocument): string {
		const name = safeName(
			fill(settings.readwiseFilenameTemplate || (doc.author ? DEFAULT_FILENAME_TEMPLATE : DEFAULT_FILENAME_TEMPLATE_NO_AUTHOR), {
				title: doc.title,
				author: doc.author ?? '',
				category: doc.category,
				id: String(doc.id),
			})
		)
		const file = name || `${safeName(doc.title)} highlights`
		const path = `${settings.readwiseFolder}/${file}.md`
		return vault.find(path) ? `${settings.readwiseFolder}/${doc.id} ${file}.md` : path
	}

	return {
		/** Calls `listener` with the document list now (if loaded) and again whenever it grows or changes. */
		subscribe(listener: (docs: RwDocument[]) => void): () => void {
			listeners.add(listener)
			if (docs) listener(docs)
			return () => void listeners.delete(listener)
		},

		/** Syncs the document list; failures surface as a notice. */
		sync: async (): Promise<void> => void (await guarded(runSync)),

		/** Same sync, but failures are silent: for background use. */
		warm: () => runSync().catch(() => {}),

		/** Imports (or finds, with skipExisting) the document's note and opens it. Null on failure. */
		async importDocument(doc: RwDocument): Promise<NoteRef | null> {
			return guarded(async () => {
				// Identity is the Readwise id, never the name: two documents may share a title.
				const existing = vault.findByReadwiseId(doc.id)
				if (existing && settings.skipExisting) {
					ui.notify('Note already exists, opening it.')
					await ui.open(existing)
					return existing
				}
				const path = existing?.path ?? freePath(doc)
				const data = await exportDocument(doc.id)
				if (!data) throw new Error('Document not found in export.')
				const md = renderExport(data, settings)
				if (!(await vault.exists(settings.readwiseFolder))) await vault.createFolder(settings.readwiseFolder)
				let note = existing
				if (note) await vault.modify(note, md)
				else note = await vault.create(path, md)
				ui.notify(`Imported "${doc.title}".`)
				await ui.open(note)
				return note
			})
		},

		/** Makes `status` the only status tag on the Readwise document and mirrors it to the note. */
		async setStatus(note: NoteRef, id: number, status: string): Promise<void> {
			await guarded(async () => {
				const tags = await listTags(id)
				for (const t of tags) {
					if (STATUSES.includes(t.name) && t.name !== status) await call('DELETE', `/books/${id}/tags/${t.id}`)
				}
				if (!tags.some((t) => t.name === status)) await call('POST', `/books/${id}/tags/`, { name: status })
				await vault.setStatusProperty(note, status)
				ui.notify(`Readwise status: ${status}`)
			})
		},
	}
}
