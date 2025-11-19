import { TFile } from "obsidian";

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
	let result = template;

	// Replace all variables
	Object.entries(variables).forEach(([key, value]) => {
		const regex = new RegExp(`{{${key}}}`, "g");
		result = result.replace(regex, value);
	});

	return result;
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
	sourceFile: TFile,
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
		sourceFile: sourceFile.name,
		blockId: blockId,
		link: `![[${sourceFile.basename}#^${blockId}]]`,
		sourceBlock: `[[${sourceFile.basename}#^${blockId}]]`,
		date: date,
		time: time,
		title: title,
	};
}
