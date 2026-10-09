import { Notice } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { STOCK_TEMPLATE } from '../utils/template'

const STOCK_PATH = 'Templates/Zettel Template.md'

/** Writes the stock template (unless the file exists) and points the Zettel template setting at it. */
export async function createStockTemplate(plugin: ZettelizerPlugin): Promise<void> {
	const { vault } = plugin.app
	if (!(await vault.adapter.exists(STOCK_PATH))) {
		if (!(await vault.adapter.exists('Templates'))) await vault.createFolder('Templates')
		await vault.create(STOCK_PATH, STOCK_TEMPLATE)
	}
	plugin.settings.templatePath = STOCK_PATH
	await plugin.saveSettings()
	new Notice(`Zettel template set to ${STOCK_PATH}.`)
}

export function registerTemplateCommand(plugin: ZettelizerPlugin) {
	plugin.addCommand({
		id: 'create-stock-zettel-template',
		name: 'Create stock zettel template',
		callback: () => void createStockTemplate(plugin),
	})
}
