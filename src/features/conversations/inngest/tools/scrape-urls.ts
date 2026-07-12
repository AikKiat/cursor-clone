import { createTool } from "@inngest/agent-kit";
import { z } from "zod";
import { firecrawl } from "@/lib/firecrawl";

const paramsSchema = z.object({
	urls: z
		.array(z.url("Invalid url format"))
		.min(1, "Provide at least one URL to scrape"),
});

export const createScrapeUrlsTool = () => {
	return createTool({
		name: "scrapeUrls",
		description:
			"Scrape content from URLs to get documentaton or reference material. \
            Use this when the user provides URLs or referneces external documentation. Returns \
            markdown content from the scraped pages.",
		parameters: z.object({
			urls: z.array(z.string()).describe("Array of URLs to scrape for content"),
		}),
		handler: async (params, { step: toolStep }) => {
			const parsed = paramsSchema.safeParse(params);
			if (!parsed.success) {
				return `[INNGEST SCRAPE URLS TOOL] Error. ${parsed.error.issues[0].message}`;
			}

			const { urls } = parsed.data;

			try {
				return await toolStep?.run("scrape-urls", async () => {
					const results: { url: string; content: string }[] = [];
					for (const url of urls) {
						try {
							const result = await firecrawl.scrape(url, {
								formats: ["markdown"],
							});

							if (result.markdown) {
								results.push({
									url,
									content: result.markdown,
								});
							}
						} catch {
							results.push({
								url,
								content: `Failed to scrape URL: ${url}`,
							});
						}
					}
					if (results.length === 0) {
						return `[INNGEST SCRAP URLS TOOL] Error. No content could be scrapped fromthe provided URLs.`;
					}

					return JSON.stringify(results);
				});
			} catch (error) {
				return `[INNGEST SCRAP URLS TOOL] Error scraping URLs: ${error instanceof Error ? error.message : "Unknown error"}`;
			}
		},
	});
};
