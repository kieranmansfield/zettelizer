import { Notice, type TFile } from 'obsidian'
import type ZettelizerPlugin from '../main'
import { intake } from '../intake/intake'
import { noteRef, obsidianUi, obsidianVault, ReadwiseFileModal } from '../intake/obsidian'
import type { Mode } from '../intake/ports'

export function registerIntakeCommands(plugin: ZettelizerPlugin) {
	const run = (file: TFile, mode: Mode) =>
		intake(noteRef(file), mode, {
			vault: obsidianVault(plugin.app),
			ui: obsidianUi(plugin),
			settings: plugin.settings,
		})

	const variants: [mode: Mode, activeId: string, activeName: string, pickerId: string, pickerName: string][] = [
		['plain', 'zettelize-readwise-highlights', 'Zettelize Readwise highlights', 'open', 'Open file picker'],
		['smart', 'smart-match-readwise-highlights', 'Smart Match Readwise highlights', 'smart-match-open-file-picker', 'Smart Match: Open file picker'],
	]
	for (const [mode, activeId, activeName, pickerId, pickerName] of variants) {
		plugin.addCommand({
			id: activeId,
			name: activeName,
			callback: () => {
				const file = plugin.app.workspace.getActiveFile()
				if (!file) return void new Notice('No active file.')
				return run(file, mode)
			},
		})
		plugin.addCommand({
			id: pickerId,
			name: pickerName,
			callback: () => void new ReadwiseFileModal(plugin, (file) => void run(file, mode)).open(),
		})
	}
}
