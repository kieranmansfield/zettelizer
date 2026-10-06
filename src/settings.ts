export interface ZettelizerSettings {
	readwiseFolder: string
	zettelFolder: string
	timestampFormat: string
	truncateLength: number
	templatePath: string
	sourceProperty: string
	autoOpenAppendedNotes: boolean
}

export const DEFAULT_SETTINGS: ZettelizerSettings = {
	readwiseFolder: 'Readwise',
	zettelFolder: 'Zettelkasten',
	timestampFormat: 'YYYYMMDDHHmmssSSS',
	truncateLength: 100,
	templatePath: '',
	sourceProperty: 'sources',
	autoOpenAppendedNotes: true,
}
