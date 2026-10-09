import { requestUrl, TFile, type App } from 'obsidian'
import { noteRef } from '../intake/obsidian'
import type { HttpPort, LibraryVault } from './library'

export const obsidianHttp: HttpPort = {
	async request(req) {
		const res = await requestUrl({ ...req, throw: false })
		return { status: res.status, json: res.status === 204 || !res.text ? undefined : res.json }
	},
}

export function readwiseVault(app: App): LibraryVault {
	const file = (path: string) => {
		const f = app.vault.getAbstractFileByPath(path)
		if (!(f instanceof TFile)) throw new Error(`Not a file: ${path}`)
		return f
	}
	return {
		exists: (path) => app.vault.adapter.exists(path),
		createFolder: async (path) => void (await app.vault.createFolder(path)),
		find: (path) => {
			const f = app.vault.getAbstractFileByPath(path)
			return f instanceof TFile ? noteRef(f) : null
		},
		create: async (path, content) => noteRef(await app.vault.create(path, content)),
		modify: (note, content) => app.vault.modify(file(note.path), content),
		setStatusProperty: (note, status) =>
			app.fileManager.processFrontMatter(file(note.path), (fm: Record<string, unknown>) => {
				fm.status = status
			}),
	}
}
