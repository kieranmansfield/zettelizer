import { App, PluginSettingTab, Setting } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { FolderSuggest } from './FolderSuggest'
import { FileSuggest } from './FileSuggest'

export default class ZettelizerSettingTab extends PluginSettingTab {
	plugin: ZettelizerPlugin
	icon = 'inbox'

	constructor(app: App, plugin: ZettelizerPlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const { containerEl } = this

		containerEl.empty()

		// Readwise Folder
		new Setting(containerEl)
			.setName('Readwise folder')
			.setDesc('Folder containing your Readwise highlights')
			.addText((text) => {
				text
					.setPlaceholder('Readwise')
					.setValue(this.plugin.settings.readwiseFolder)
					.onChange(async (value) => {
						this.plugin.settings.readwiseFolder = value
						await this.plugin.saveSettings()
					})
				new FolderSuggest(this.app, text.inputEl)
			})

		// Zettel Folder
		new Setting(containerEl)
			.setName('Zettel folder')
			.setDesc('Folder where zettel notes will be created')
			.addText((text) => {
				text
					.setPlaceholder('Zettelkasten')
					.setValue(this.plugin.settings.zettelFolder)
					.onChange(async (value) => {
						this.plugin.settings.zettelFolder = value
						await this.plugin.saveSettings()
					})
				new FolderSuggest(this.app, text.inputEl)
			})

		// Timestamp Format
		new Setting(containerEl)
			.setName('Timestamp format')
			.setDesc('Format for zettel filenames')
			.addText((text) =>
				text
					.setPlaceholder('Timestamp format pattern')
					.setValue(this.plugin.settings.timestampFormat)
					.onChange(async (value) => {
						this.plugin.settings.timestampFormat = value
						await this.plugin.saveSettings()
					})
			)

		// Truncate Length
		new Setting(containerEl)
			.setName('Truncate length')
			.setDesc('Maximum characters to display for each highlight in the selection modal')
			.addText((text) =>
				text
					.setPlaceholder('100')
					.setValue(String(this.plugin.settings.truncateLength))
					.onChange(async (value) => {
						const num = parseInt(value)
						if (!isNaN(num) && num > 0) {
							this.plugin.settings.truncateLength = num
							await this.plugin.saveSettings()
						}
					})
			)

		// Template Path
		new Setting(containerEl)
			.setName('Zettel template')
			.setDesc(
				'Path to template file for new zettels (optional). Leave empty to use default format.'
			)
			.addText((text) => {
				text
					.setPlaceholder('Templates/Zettel Template.md')
					.setValue(this.plugin.settings.templatePath)
					.onChange(async (value) => {
						this.plugin.settings.templatePath = value
						await this.plugin.saveSettings()
					})
				new FileSuggest(this.app, text.inputEl)
			})

		// Source Property
		new Setting(containerEl)
			.setName('Source property name')
			.setDesc(
				"Name of the frontmatter property for source backlinks (e.g., 'sources', 'from', 'references')"
			)
			.addText((text) =>
				text
					.setPlaceholder('Example: sources')
					.setValue(this.plugin.settings.sourceProperty)
					.onChange(async (value) => {
						this.plugin.settings.sourceProperty = value
						await this.plugin.saveSettings()
					})
			)

		// Info section
		new Setting(containerEl).setName('Template variables').setHeading()
		containerEl.createEl('p', {
			text: 'Available variables in your template:',
		})
		const list = containerEl.createEl('ul')
		list.createEl('li', {
			text: '{{highlight}} - The raw highlight text (without block ID)',
		})
		list.createEl('li', {
			text: '{{title}} - Auto-generated title (first 5 words of highlight)',
		})
		list.createEl('li', {
			text: '{{source}} - Source file name (without extension)',
		})
		list.createEl('li', {
			text: '{{sourceFile}} - Full source file name',
		})
		list.createEl('li', { text: '{{blockId}} - Block ID of the highlight' })
		list.createEl('li', {
			text: '{{link}} - Block transclusion: ![[file#^blockid]]',
		})
		list.createEl('li', {
			text: '{{sourceBlock}} - Source backlink: [[file#^blockid]]',
		})
		list.createEl('li', { text: '{{date}} - Current date (YYYY-MM-DD)' })
		list.createEl('li', { text: '{{time}} - Current time (HH:mm:ss)' })

		// Example template
		new Setting(containerEl).setName('Example template').setHeading()
		const pre = containerEl.createEl('pre')
		pre.createEl('code', {
			text: `---
created: {{date}}
sources:
  - {{sourceBlock}}
title: {{title}}
---

{{highlight}}

---
tags: #zettel`,
		})
	}
}
