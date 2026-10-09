/**
 * Generates a timestamp in the format YYYYMMDDHHmmssSSS
 * @returns Timestamp string with milliseconds
 */
export function generateTimestamp(now: Date = new Date()): string {
	const p = (n: number, len = 2) => String(n).padStart(len, '0')
	return (
		`${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}` +
		`${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}${p(now.getMilliseconds(), 3)}`
	)
}
