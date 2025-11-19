import { Highlight } from "../types";

/**
 * Parses markdown content to extract blocks with block IDs
 * @param content The markdown content to parse
 * @returns Array of Highlight objects with text and blockId
 */
export function parseHighlightsFromContent(content: string): Highlight[] {
	const highlights: Highlight[] = [];
	const lines = content.split("\n");

	// Regex to match block IDs: ^blockid at the end of a line
	const blockIdRegex = /\s*\^([\w-]+)\s*$/;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const match = line.match(blockIdRegex);

		if (match) {
			const blockId = match[1];

			// Look backwards to find the start of this highlight block
			// Readwise highlights are typically blockquotes (>) or continuous text
			let startIndex = i;

			// Check if current line is a blockquote
			const isBlockquote = line.trim().startsWith(">");

			if (isBlockquote) {
				// For blockquotes, find where the blockquote starts
				while (startIndex > 0 && lines[startIndex - 1].trim().startsWith(">")) {
					startIndex--;
				}
			} else {
				// For regular text, look for empty lines or separators
				while (
					startIndex > 0 &&
					lines[startIndex - 1].trim() !== "" &&
					!lines[startIndex - 1].trim().startsWith("#") &&
					!lines[startIndex - 1].trim().startsWith("---")
				) {
					startIndex--;
				}
			}

			// Collect all lines from start to current (with block ID)
			const textLines: string[] = [];
			for (let j = startIndex; j <= i; j++) {
				let textLine = lines[j];

				// Remove blockquote markers
				if (textLine.trim().startsWith(">")) {
					textLine = textLine.replace(/^\s*>\s?/, "");
				}

				// Remove block ID from the last line
				if (j === i) {
					textLine = textLine.replace(blockIdRegex, "");
				}

				// Remove markdown formatting (==highlights==, **bold**, etc.)
				textLine = textLine
					.replace(/==/g, "")
					.replace(/\*\*/g, "")
					.replace(/__/g, "")
					.trim();

				if (textLine.length > 0) {
					textLines.push(textLine);
				}
			}

			const text = textLines.join(" ").trim();

			// Skip empty highlights
			if (text.length > 0) {
				highlights.push({
					text,
					blockId,
				});
			}
		}
	}

	return highlights;
}

/**
 * Sanitizes a filename by removing invalid characters
 * @param filename The filename to sanitize
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
	return filename.replace(/[\\,#%&\{\}\/*<>$\'\":@|?]/g, "");
}
