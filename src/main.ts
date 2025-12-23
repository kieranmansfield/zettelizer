import { addIcon, Plugin } from 'obsidian'
import { ZettelizerSettings, DEFAULT_SETTINGS } from './settings'
import { registerCommands } from './commands/commands'
import ZettelizerSettingTab from './ui/SettingsTab'

export default class ZettelizerPlugin extends Plugin {
	settings!: ZettelizerSettings

	async onload() {
		addIcon(
			'zettelizer-icon',
			`<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
				<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
					<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11"/>
				</g>
			</svg>`
		)

		await this.loadSettings()

		// Register all commands
		registerCommands(this)

		// Register settings tab
		this.addSettingTab(new ZettelizerSettingTab(this.app, this))
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as ZettelizerSettings
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
