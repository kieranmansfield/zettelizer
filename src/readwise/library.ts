import type { ZettelizerSettings } from '../settings'
import type { NoteRef, UiPort } from '../intake/ports'
import { renderDocument, safeName } from './render'

const BASE = 'https://readwise.io/api/v2'

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
	highlights: { id: number; text: string; note?: string; tags?: { name: string }[] }[]
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
	create(path: string, content: string): Promise<NoteRef>
	modify(note: NoteRef, content: string): Promise<void>
	/** Mirrors the status into the note's `status` property. */
	setStatusProperty(note: NoteRef, status: string): Promise<void>
}

export type LibrarySettings = Pick<ZettelizerSettings, 'readwiseToken' | 'readwiseFolder' | 'skipExisting'>

export interface LibraryDeps {
	http: HttpPort
	vault: LibraryVault
	ui: Pick<UiPort, 'notify' | 'open'>
	settings: LibrarySettings
}

/** Readwise id and current status from a note's frontmatter; null if it is not an imported Readwise note. */
export function readwiseNoteInfo(fm: Record<string, unknown> | undefined): { id: number; status?: string } | null {
	const id = Number(fm?.id)
	if (!id || !String(fm?.type ?? '').startsWith('readwise-')) return null
	return { id, status: typeof fm?.status === 'string' ? fm.status : undefined }
}

/**
 * Readwise library: lists documents (cached for the session), imports one into the vault,
 * and syncs its status tag to Readwise and the note. Failures surface as notices.
 */
export function createLibrary({ http, vault, ui, settings }: LibraryDeps) {
	let docCache: RwDocument[] | undefined

	async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
		const token = settings.readwiseToken
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

	async function fetchDocuments(): Promise<RwDocument[]> {
		const docs: RwDocument[] = []
		for (let page = 1; ; page++) {
			const r = await call<{ results: RwDocument[]; next: string | null }>('GET', `/books/?page_size=1000&page=${page}`)
			docs.push(...r.results)
			if (!r.next) return docs
		}
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

	return {
		/** All documents in the Readwise library; null (after a notice) on failure. */
		documents: () => guarded(async () => (docCache ??= await fetchDocuments())),

		async importDocument(doc: RwDocument): Promise<void> {
			await guarded(async () => {
				const path = `${settings.readwiseFolder}/${safeName(doc.title)} Highlights.md`
				const existing = vault.find(path)
				if (existing && settings.skipExisting) {
					ui.notify('Note already exists, opening it.')
					return ui.open(existing)
				}
				const data = await exportDocument(doc.id)
				if (!data) throw new Error('Document not found in export.')
				const md = renderDocument(data)
				if (!(await vault.exists(settings.readwiseFolder))) await vault.createFolder(settings.readwiseFolder)
				let note = existing
				if (note) await vault.modify(note, md)
				else note = await vault.create(path, md)
				ui.notify(`Imported "${doc.title}".`)
				await ui.open(note)
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
