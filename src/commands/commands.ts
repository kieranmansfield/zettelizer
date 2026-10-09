import type ZettelizerPlugin from '../main'
import { registerZettelizeCommand } from './zettelizeCommand'
import { registerSmartMatchCommand } from './smartMatchCommand'
import { registerReadwiseCommands } from './readwiseCommands'

export function registerCommands(plugin: ZettelizerPlugin) {
	registerZettelizeCommand(plugin)
	registerSmartMatchCommand(plugin)
	registerReadwiseCommands(plugin)
}
