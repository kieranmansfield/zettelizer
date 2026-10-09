import { requestUrl } from 'obsidian'

const BASE = 'https://readwise.io/api/v2'

export interface RwDocument {
	id: number
	title: string
	author: string
	category: string
	num_highlights: number
}

export interface RwHighlight {
	id: number
	text: string
	note?: string
	tags?: { name: string }[]
}

export interface RwExport {
	user_book_id: number
	title: string
	author: string
	category: string
	cover_image_url?: string
	source_url?: string
	highlights: RwHighlight[]
}

export interface RwTag {
	id: number
	name: string
}

// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
async function call<T>(token: string, method: string, path: string, body?: unknown): Promise<T> {
	if (!token) throw new Error('Readwise token is not set (Settings → Zettelizer).')
	const res = await requestUrl({
		url: BASE + path,
		method,
		headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
		throw: false,
	})
	if (res.status < 200 || res.status >= 300) {
		throw new Error(`Readwise ${method} ${path} failed (${res.status})`)
	}
	return (res.status === 204 || !res.text ? undefined : res.json) as T
}

export async function listDocuments(token: string): Promise<RwDocument[]> {
	const docs: RwDocument[] = []
	for (let page = 1; ; page++) {
		const r = await call<{ results: RwDocument[]; next: string | null }>(
			token,
			'GET',
			`/books/?page_size=1000&page=${page}`
		)
		docs.push(...r.results)
		if (!r.next) return docs
	}
}

// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
export async function exportDocument(token: string, id: number): Promise<RwExport | undefined> {
	let doc: RwExport | undefined
	let cursor: string | null = null
	do {
		const q: string = `/export/?ids=${id}` + (cursor ? `&pageCursor=${encodeURIComponent(cursor)}` : '')
		const r: { results: RwExport[]; nextPageCursor: string | null } = await call(token, 'GET', q)
		const part = r.results[0]
		if (part) {
			if (doc) doc.highlights.push(...part.highlights)
			else doc = part
		}
		cursor = r.nextPageCursor
	} while (cursor)
	return doc
}

export async function listTags(token: string, id: number): Promise<RwTag[]> {
	const r = await call<RwTag[] | { results: RwTag[] }>(token, 'GET', `/books/${id}/tags?page_size=1000`)
	return Array.isArray(r) ? r : r.results
}

export const addTag = (token: string, id: number, name: string) =>
	call<unknown>(token, 'POST', `/books/${id}/tags/`, { name })

export const deleteTag = (token: string, id: number, tagId: number) =>
	call<unknown>(token, 'DELETE', `/books/${id}/tags/${tagId}`)
