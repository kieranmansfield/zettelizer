const DEFAULT_TIMESTAMP_FORMAT = 'YYYYMMDDHHmmssSSS'

/**
 * Formats `now` with the tokens YYYY MM DD HH mm ss SSS. Characters that are illegal in file
 * names are dropped; an empty format (or one that sanitizes to nothing) uses the default.
 */
export function generateTimestamp(now: Date = new Date(), format: string = DEFAULT_TIMESTAMP_FORMAT): string {
	const p = (n: number, len = 2) => String(n).padStart(len, '0')
	const tokens: Record<string, string> = {
		YYYY: String(now.getFullYear()),
		MM: p(now.getMonth() + 1),
		DD: p(now.getDate()),
		HH: p(now.getHours()),
		mm: p(now.getMinutes()),
		ss: p(now.getSeconds()),
		SSS: p(now.getMilliseconds(), 3),
	}
	const out = format
		.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, (t) => tokens[t])
		.replace(/[\\/:*?"<>|]/g, '')
		.trim()
	return out || (format === DEFAULT_TIMESTAMP_FORMAT ? '' : generateTimestamp(now))
}
