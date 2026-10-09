import type { NoteRef } from "../intake/ports";

/** Block transclusion of a Highlight in its Source note. */
export const blockLink = (source: NoteRef, blockId: string) => `![[${source.basename}#^${blockId}]]`;

export interface TemplateVariables {
	highlight: string;
	source: string;
	sourceFile: string;
	blockId: string;
	link: string;
	sourceBlock: string;
	date: string;
	time: string;
	title: string;
}

/**
 * Process a template string with variables
 * @param template Template content with {{variable}} placeholders
 * @param variables Object containing variable values
 * @returns Processed template string
 */
export function processTemplate(
	template: string,
	variables: TemplateVariables
): string {
	// Single pass: values are inserted verbatim and never re-scanned for placeholders.
	return template.replace(/{{(\w+)}}/g, (match, key: string) =>
		Object.prototype.hasOwnProperty.call(variables, key) ? variables[key as keyof TemplateVariables] : match
	);
}

/**
 * Create template variables object from highlight data
 * @param highlightText The highlight text
 * @param sourceFile The source file
 * @param blockId The block ID
 * @returns TemplateVariables object
 */
export function createTemplateVariables(
	highlightText: string,
	sourceFile: NoteRef,
	blockId: string
): TemplateVariables {
	const now = new Date();
	const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
	const time = now.toTimeString().split(" ")[0]; // HH:mm:ss

	// Create a title from the first few words of the highlight
	const words = highlightText.split(/\s+/);
	const titleWords = words.slice(0, 5).join(" ");
	const title = titleWords.length < highlightText.length
		? titleWords + "..."
		: titleWords;

	return {
		highlight: highlightText,
		source: sourceFile.basename,
		sourceFile: sourceFile.path.split("/").pop() ?? sourceFile.path,
		blockId: blockId,
		link: blockLink(sourceFile, blockId),
		sourceBlock: `[[${sourceFile.basename}#^${blockId}]]`,
		date: date,
		time: time,
		title: title,
	};
}

/** Stock zettel template, written to the vault by "Create stock zettel template". */
export const STOCK_TEMPLATE = `---
created: {{date}}
sources:
  - {{sourceBlock}}
title: {{title}}
---

{{highlight}}

---
tags: #zettel`;
