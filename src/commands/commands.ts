import type ZettelizerPlugin from '../main'
import { registerIntakeCommands } from './intakeCommands'
import { registerTemplateCommand } from './createTemplate'
import { registerReadwiseCommands } from './readwiseCommands'

export function registerCommands(plugin: ZettelizerPlugin) {
	registerIntakeCommands(plugin)
	registerReadwiseCommands(plugin)
	registerTemplateCommand(plugin)
}
