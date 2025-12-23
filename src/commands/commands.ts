import type ZettelizerPlugin from '../main'
import { registerZettelizeCommand } from './zettelizeCommand'

export function registerCommands(plugin: ZettelizerPlugin) {
	registerZettelizeCommand(plugin)
}
