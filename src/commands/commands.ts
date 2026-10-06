import type ZettelizerPlugin from '../main'
import { registerZettelizeCommand } from './zettelizeCommand'
import { registerSmartMatchCommand } from './smartMatchCommand'

export function registerCommands(plugin: ZettelizerPlugin) {
	registerZettelizeCommand(plugin)
	registerSmartMatchCommand(plugin)
}
