import { FuzzySuggestModal, Notice, TFile } from 'obsidian'
import { FuzzyHighlightModal } from '../ui/FuzzyHighlightModal'
import { parseHighlightsFromContent } from '../utils/parser'
import { generateTimestamp } from '../utils/timestamp'
import { processTemplate, createTemplateVariables } from '../utils/template'
import { Highlight } from '../types'
import type ZettelizerPlugin from '../main'

export function registerZettelizeCommand(plugin: ZettelizerPlugin) {
	// Command to zettelize current active file
	plugin.addCommand({
		id: 'zettelize-readwise-highlights',
		name: 'Zettelize Readwise highlights',
		callback: async () => {
			await zettelizeActiveFile(plugin)
		},
	})

	// Command to open file picker and then zettelize
	plugin.addCommand({
		id: 'open',
		name: 'Open file picker',
		callback: () => {
			new ReadwiseFileModal(plugin).open()
		},
	})
}

class ReadwiseFileModal extends FuzzySuggestModal<TFile> {
	plugin: ZettelizerPlugin

	constructor(plugin: ZettelizerPlugin) {
		super(plugin.app)
		this.plugin = plugin
	}

	getItems(): TFile[] {
		const readwiseFolder = this.plugin.settings.readwiseFolder
		const files: TFile[] = []

		this.app.vault.getMarkdownFiles().forEach((file) => {
			if (file.path.startsWith(readwiseFolder + '/')) {
				files.push(file)
			}
		})

		return files
	}

	getItemText(file: TFile): string {
		return file.basename
	}

	onChooseItem(file: TFile): void {
		void zettelizeFile(this.plugin, file)
	}
}

async function zettelizeActiveFile(plugin: ZettelizerPlugin) {
	// Get the active file
	const activeFile = plugin.app.workspace.getActiveFile()
	if (!activeFile) {
		new Notice('No active file.')
		return
	}

	await zettelizeFile(plugin, activeFile)
}

async function zettelizeFile(plugin: ZettelizerPlugin, file: TFile) {
	// Read file content
	const content = await plugin.app.vault.read(file)

	// Parse highlights from content
	const highlights = parseHighlightsFromContent(content)

	if (highlights.length === 0) {
		new Notice('No highlights with block ids found in this file')
		return
	}

	// Show fuzzy modal to select highlights
	new FuzzyHighlightModal(
		plugin.app,
		highlights,
		plugin.settings.truncateLength,
		(selectedHighlights) => {
			void createZettels(plugin, file, selectedHighlights)
		}
	).open()
}

async function createZettels(plugin: ZettelizerPlugin, sourceFile: TFile, highlights: Highlight[]) {
	const zettelFolder = plugin.settings.zettelFolder

	// Check if zettel folder exists
	const folderExists = await plugin.app.vault.adapter.exists(zettelFolder)
	if (!folderExists) {
		new Notice(
			`Zettel folder "${zettelFolder}" does not exist. Please create it or update settings.`
		)
		return
	}

	// Load template if specified
	let templateContent: string | null = null
	if (plugin.settings.templatePath) {
		const templateFile = plugin.app.vault.getAbstractFileByPath(plugin.settings.templatePath)
		if (templateFile instanceof TFile) {
			templateContent = await plugin.app.vault.read(templateFile)
		} else {
			new Notice(`Template file not found: ${plugin.settings.templatePath}`)
		}
	}

	let created = 0
	let skipped = 0

	for (const highlight of highlights) {
		if (!highlight.blockId) {
			continue
		}

		// Generate timestamp-based filename
		const filename = `${generateTimestamp()}.md`
		const filepath = `${zettelFolder}/${filename}`

		// Check if file already exists
		const exists = await plugin.app.vault.adapter.exists(filepath)
		if (exists) {
			skipped++
			continue
		}

		// Create zettel content
		let content: string

		if (templateContent) {
			// Use template with variables
			const variables = createTemplateVariables(highlight.text, sourceFile, highlight.blockId)

			content = processTemplate(templateContent, variables)

			// Check if content is empty
			if (!content.trim()) {
				new Notice(`Warning: template produced empty content. Check template variables`)
				// Fallback to default
				content = `![[${sourceFile.basename}#^${highlight.blockId}]]`
			}
		} else {
			// Default: just the block reference
			content = `![[${sourceFile.basename}#^${highlight.blockId}]]`
		}

		// Create the file
		await plugin.app.vault.create(filepath, content)
		created++
	}

	new Notice(`Created ${created} zettel(s). Skipped ${skipped} (already exist).`)
}
