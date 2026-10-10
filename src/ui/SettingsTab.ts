import { App, PluginSettingTab, type Setting, type SettingDefinitionItem } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { createStockTemplate } from '../commands/createTemplate'
import { DEFAULT_HIGHLIGHT_TEMPLATE, DEFAULT_NOTE_TEMPLATE } from '../readwise/render'

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

const NOTE_VARIABLES: [string, string][] = [
	['{{title}}', 'Quoted title'],
	['{{author}}, {{category}}, {{status}}, {{cover}}, {{url}}', 'Plain values'],
	['{{id}}', 'Quoted Readwise ID'],
	['{{tagsYaml}}, {{authorsYaml}}, {{imageYaml}}, {{sourcesYaml}}', 'Ready-made frontmatter entries; a line holding only an empty one is dropped'],
	['{{highlights}}', 'All rendered highlights'],
]

const HIGHLIGHT_VARIABLES: [string, string][] = [
	['{{text}}', 'Highlight text'],
	['{{id}}', 'Highlight ID (the block ID)'],
	['{{tags}}', 'Highlight tags, inline: " #a #b"'],
	['{{note}}', 'Your note on the highlight, if any'],
	['{{noteBlock}}', 'The note as "**Note:** …" after a blank line, or nothing'],
]

const variableList = (vars: [string, string][]) => ({
	name: 'Variables',
	render: (setting: { descEl: HTMLElement }) => {
		const list = setting.descEl.createEl('ul')
		for (const [name, text] of vars) list.createEl('li', { text: `${name} - ${text}` })
	},
})

export default class ZettelizerSettingTab extends PluginSettingTab {
	icon = 'inbox'

	constructor(
		app: App,
		public plugin: ZettelizerPlugin
	) {
		super(app, plugin)
	}

	/** A full-width template editor with its label above it and a reset-to-default button. */
	private templateField(
		name: string,
		desc: string,
		key: 'readwiseNoteTemplate' | 'readwiseHighlightTemplate',
		fallback: string,
		rows: number
	) {
		return {
			name,
			desc,
			render: (setting: Setting) => {
				setting.settingEl.addClass('zettelizer-stacked')
				setting.addTextArea((t) => {
					t.inputEl.rows = rows
					t.setValue(this.plugin.settings[key]).onChange(async (v) => {
						this.plugin.settings[key] = v
						await this.plugin.saveSettings()
					})
					setting.addExtraButton((b) =>
						b.setIcon('rotate-ccw').setTooltip('Reset to default').onClick(async () => {
							t.setValue(fallback)
							this.plugin.settings[key] = fallback
							await this.plugin.saveSettings()
						})
					)
				})
			},
		}
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
						desc: 'Path to template file for new zettels. Leave empty to use the stock template.',
						control: {
							type: 'file',
							key: 'templatePath',
							placeholder: 'Templates/Zettel Template.md',
						},
					},
					{
						name: 'Create stock template',
						desc: 'Write the stock zettel template to Templates/Zettel Template.md so you can edit it, and use that file. An existing file is kept.',
						action: () => void createStockTemplate(this.plugin).then(() => this.update()),
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
						desc: 'Used only to call readwise.io when you run the import and status commands. Kept in Obsidian\'s secret storage, not in this plugin\'s data.json.',
						control: { type: 'secret', key: 'readwiseTokenSecret' },
					},
					{
						name: 'Sync document list on startup',
						desc: 'When Obsidian starts, fetch your Readwise document list in the background (sends your token to readwise.io) so the import picker opens instantly. Needs a restart to apply.',
						control: { type: 'toggle', key: 'syncOnStartup' },
					},
					{
						name: 'Skip existing notes',
						desc: 'Open an already-imported note instead of overwriting it',
						control: { type: 'toggle', key: 'skipExisting' },
					},
					{
						name: 'File name template',
						desc: 'Name of imported notes. Variables: {{title}}, {{author}}, {{category}}, {{id}}. With no author, the default drops "by {{author}}". Emptied, it falls back to the default. A name already used by another document gets its id added in front.',
						control: { type: 'text', key: 'readwiseFilenameTemplate', placeholder: '{{title}} by {{author}} highlights' },
					},
					{
						name: 'Include private source links',
						desc: 'Documents you uploaded to Reader (EPUB, PDF) have a private:// source link that cannot be opened. Turn off to leave it out of the sources property.',
						control: { type: 'toggle', key: 'readwisePrivateSources' },
					},
					{
						type: 'page',
						name: 'Export template',
						desc: 'Customise how imported Readwise notes are written.',
						items: [
							{
								type: 'group',
								heading: 'Note',
								items: [
									this.templateField('Note template', 'Whole note. Empty falls back to the default.', 'readwiseNoteTemplate', DEFAULT_NOTE_TEMPLATE, 18),
									variableList(NOTE_VARIABLES),
								],
							},
							{
								type: 'group',
								heading: 'Highlight',
								items: [
									this.templateField('Highlight template', 'Repeated for each highlight. Empty falls back to the default.', 'readwiseHighlightTemplate', DEFAULT_HIGHLIGHT_TEMPLATE, 6),
									variableList(HIGHLIGHT_VARIABLES),
								],
							},
						],
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
				],
			},
		]
	}
}
