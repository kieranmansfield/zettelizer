import type ZettelizerPlugin from '../main'
import { registerIntakeCommands } from './intakeCommands'
import { registerReadwiseCommands } from './readwiseCommands'

export function registerCommands(plugin: ZettelizerPlugin) {
	registerIntakeCommands(plugin)
	registerReadwiseCommands(plugin)
}
