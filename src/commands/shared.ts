import { FuzzySuggestModal, Notice, TFile } from 'obsidian'
import { FuzzyHighlightModal } from '../ui/FuzzyHighlightModal'
import { parseHighlightsFromContent } from '../utils/parser'
import { generateTimestamp } from '../utils/timestamp'
import { processTemplate, createTemplateVariables } from '../utils/template'
import { Highlight } from '../types'
import type ZettelizerPlugin from '../main'

/** Fuzzy picker over the markdown files in the Readwise folder. */
export class ReadwiseFileModal extends FuzzySuggestModal<TFile> {
	constructor(
		private plugin: ZettelizerPlugin,
		private onChoose: (file: TFile) => void
	) {
		super(plugin.app)
	}

	getItems(): TFile[] {
		const prefix = this.plugin.settings.readwiseFolder + '/'
		return this.app.vault.getMarkdownFiles().filter((file) => file.path.startsWith(prefix))
	}

	getItemText(file: TFile): string {
		return file.basename
	}

	onChooseItem(file: TFile): void {
		this.onChoose(file)
	}
}

/** Runs `handler` on the active file, or shows a notice if none is open. */
export async function withActiveFile(
	plugin: ZettelizerPlugin,
	handler: (file: TFile) => Promise<void>
) {
	const activeFile = plugin.app.workspace.getActiveFile()
	if (!activeFile) {
		new Notice('No active file.')
		return
	}
	await handler(activeFile)
}

/** Parses highlights from `file` and lets the user pick which to process. */
export async function selectHighlights(
	plugin: ZettelizerPlugin,
	file: TFile,
	onSelect: (highlights: Highlight[]) => void
) {
	const highlights = parseHighlightsFromContent(await plugin.app.vault.read(file))

	if (highlights.length === 0) {
		new Notice('No highlights with block ids found in this file')
		return
	}

	new FuzzyHighlightModal(plugin.app, highlights, plugin.settings.truncateLength, onSelect).open()
}

export interface ZettelContext {
	zettelFolder: string
	templateContent: string | null
}

/** Validates the zettel folder and loads the template. Returns null if the folder is missing. */
export async function loadZettelContext(plugin: ZettelizerPlugin): Promise<ZettelContext | null> {
	const { zettelFolder, templatePath } = plugin.settings

	if (!(await plugin.app.vault.adapter.exists(zettelFolder))) {
		new Notice(
			`Zettel folder "${zettelFolder}" does not exist. Please create it or update settings.`
		)
		return null
	}

	let templateContent: string | null = null
	if (templatePath) {
		const templateFile = plugin.app.vault.getAbstractFileByPath(templatePath)
		if (templateFile instanceof TFile) {
			templateContent = await plugin.app.vault.read(templateFile)
		} else {
			new Notice(`Template file not found: ${templatePath}`)
		}
	}

	return { zettelFolder, templateContent }
}

function buildZettelContent(
	sourceFile: TFile,
	highlight: Highlight,
	blockId: string,
	templateContent: string | null
): string {
	const defaultContent = `![[${sourceFile.basename}#^${blockId}]]`
	if (!templateContent) return defaultContent

	const content = processTemplate(
		templateContent,
		createTemplateVariables(highlight.text, sourceFile, blockId)
	)
	if (content.trim()) return content

	new Notice('Warning: template produced empty content. Check template variables')
	return defaultContent
}

/** Creates a zettel file for a highlight. Returns false if skipped. */
export async function createZettel(
	plugin: ZettelizerPlugin,
	sourceFile: TFile,
	highlight: Highlight,
	{ zettelFolder, templateContent }: ZettelContext
): Promise<boolean> {
	if (!highlight.blockId) return false

	const filepath = `${zettelFolder}/${generateTimestamp()}.md`
	if (await plugin.app.vault.adapter.exists(filepath)) return false

	const content = buildZettelContent(sourceFile, highlight, highlight.blockId, templateContent)
	await plugin.app.vault.create(filepath, content)
	return true
}
