import { App, PluginSettingTab, SettingDefinitionItem } from 'obsidian'
import type ZettelizerPlugin from '../main'

const TEMPLATE_VARIABLES: [string, string][] = [
	['{{highlight}}', 'The raw highlight text (without block ID)'],
	['{{title}}', 'Auto-generated title (first 5 words of highlight)'],
	['{{source}}', 'Source file name (without extension)'],
	['{{sourceFile}}', 'Full source file name'],
	['{{blockId}}', 'Block ID of the highlight'],
	['{{link}}', 'Block transclusion: ![[file#^blockid]]'],
	['{{sourceBlock}}', 'Source backlink: [[file#^blockid]]'],
	['{{date}}', 'Current date (YYYY-MM-DD)'],
	['{{time}}', 'Current time (HH:mm:ss)'],
]

const EXAMPLE_TEMPLATE = `---
created: {{date}}
sources:
  - {{sourceBlock}}
title: {{title}}
---

{{highlight}}

---
tags: #zettel`

export default class ZettelizerSettingTab extends PluginSettingTab {
	icon = 'inbox'

	constructor(
		app: App,
		public plugin: ZettelizerPlugin
	) {
		super(app, plugin)
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				type: 'group',
				heading: 'Folders',
				items: [
					{
						name: 'Readwise folder',
						desc: 'Folder containing your Readwise highlights',
						control: { type: 'folder', key: 'readwiseFolder', placeholder: 'Readwise' },
					},
					{
						name: 'Zettel folder',
						desc: 'Folder where zettel notes will be created',
						control: { type: 'folder', key: 'zettelFolder', placeholder: 'Zettelkasten' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Zettels',
				items: [
					{
						name: 'Timestamp format',
						desc: 'Format for zettel filenames. Tokens: YYYY MM DD HH mm ss SSS. Leave empty for YYYYMMDDHHmmssSSS.',
						control: {
							type: 'text',
							key: 'timestampFormat',
							placeholder: 'Timestamp format pattern',
						},
					},
					{
						name: 'Zettel template',
						desc: 'Path to template file for new zettels (optional). Leave empty to use default format.',
						control: {
							type: 'file',
							key: 'templatePath',
							placeholder: 'Templates/Zettel Template.md',
						},
					},
				],
			},
			{
				type: 'group',
				heading: 'Selection and matching',
				items: [
					{
						name: 'Truncate length',
						desc: 'Maximum characters to display for each highlight in the selection modal',
						control: { type: 'number', key: 'truncateLength', placeholder: '100', min: 1, step: 1 },
					},
					{
						name: 'Auto-open appended notes',
						desc: 'Automatically open notes after appending highlights (smart match feature)',
						control: { type: 'toggle', key: 'autoOpenAppendedNotes' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Readwise import',
				items: [
					{
						name: 'Readwise API token',
						desc: 'Used only to call readwise.io when you run the import and status commands. Stored in this plugin\'s data.json.',
						control: { type: 'text', key: 'readwiseToken', placeholder: 'Token' },
					},
					{
						name: 'Skip existing notes',
						desc: 'Open an already-imported note instead of overwriting it',
						control: { type: 'toggle', key: 'skipExisting' },
					},
				],
			},
			{
				type: 'group',
				heading: 'Template variables',
				items: [
					{
						name: 'Available variables',
						desc: 'Variables you can use in your template.',
						render: (setting) => {
							const list = setting.descEl.createEl('ul')
							for (const [name, text] of TEMPLATE_VARIABLES) {
								list.createEl('li', { text: `${name} - ${text}` })
							}
						},
					},
					{
						name: 'Example template',
						render: (setting) => {
							setting.descEl.createEl('pre').createEl('code', { text: EXAMPLE_TEMPLATE })
						},
					},
				],
			},
		]
	}
}
