import { Notice, TFile } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { addTag, deleteTag, exportDocument, listDocuments, listTags, type RwDocument } from '../readwise/api'
import { ImportModal } from '../readwise/ImportModal'
import { StatusModal, STATUSES } from '../readwise/StatusModal'
import { renderDocument, safeName } from '../readwise/render'

let docCache: RwDocument[] | undefined // session cache

const fail = (e: unknown) => new Notice(`Readwise: ${e instanceof Error ? e.message : String(e)}`)

// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
async function importDocument(plugin: ZettelizerPlugin, doc: RwDocument) {
	const { app, settings } = plugin
	try {
		const path = `${settings.readwiseFolder}/${safeName(doc.title)} Highlights.md`
		const existing = app.vault.getAbstractFileByPath(path)
		if (existing instanceof TFile && settings.skipExisting) {
			new Notice('Note already exists, opening it.')
			await app.workspace.getLeaf(false).openFile(existing)
			return
		}
		const data = await exportDocument(settings.readwiseToken, doc.id)
		if (!data) throw new Error('Document not found in export.')
		const md = renderDocument(data)
		if (!(await app.vault.adapter.exists(settings.readwiseFolder))) {
			await app.vault.createFolder(settings.readwiseFolder)
		}
		const file = existing instanceof TFile ? existing : null
		const out = file ? (await app.vault.modify(file, md), file) : await app.vault.create(path, md)
		new Notice(`Imported "${doc.title}".`)
		await app.workspace.getLeaf(false).openFile(out)
	} catch (e) {
		fail(e)
	}
}

// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
async function setStatus(plugin: ZettelizerPlugin, file: TFile, id: number, status: string) {
	const { app, settings } = plugin
	try {
		const token = settings.readwiseToken
		const tags = await listTags(token, id)
		for (const t of tags) if (STATUSES.includes(t.name) && t.name !== status) await deleteTag(token, id, t.id)
		if (!tags.some((t) => t.name === status)) await addTag(token, id, status)
		await app.fileManager.processFrontMatter(file, (fm: Record<string, unknown>) => {
			fm.status = status
		})
		new Notice(`Readwise status: ${status}`)
	} catch (e) {
		fail(e)
	}
}

export function registerReadwiseCommands(plugin: ZettelizerPlugin) {
	plugin.addCommand({
		id: 'import-readwise-document',
		name: 'Import Readwise document',
		callback: async () => {
			try {
				docCache ??= await listDocuments(plugin.settings.readwiseToken)
				new ImportModal(plugin.app, docCache, (d) => void importDocument(plugin, d)).open()
			} catch (e) {
				fail(e)
			}
		},
	})

	plugin.addCommand({
		id: 'set-readwise-status',
		name: 'Set Readwise status',
		// fallow-ignore-next-line complexity -- no test harness in this plugin; thin API glue
		checkCallback: (checking) => {
			const file = plugin.app.workspace.getActiveFile()
			if (!file) return false
			const fm = plugin.app.metadataCache.getFileCache(file)?.frontmatter
			const id = Number(fm?.id)
			if (!id || !String(fm?.type ?? '').startsWith('readwise-')) return false
			if (!checking) {
				new StatusModal(plugin.app, typeof fm?.status === 'string' ? fm.status : undefined, (s) => void setStatus(plugin, file, id, s)).open()
			}
			return true
		},
	})
}
