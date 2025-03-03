import { z } from "zod";
import {
    makeApiRequest,
    RCSB_PDB_DATA_API,
    RCSB_PDB_SEARCH_API
} from "../utils.js";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Define the tool schema
export const searchDiseaseProteinsSchema = {
    disease: z.string().describe("Disease name (e.g., 'covid', 'alzheimer's')"),
};

/**
 * Search for proteins related to a disease
 */
export async function searchDiseaseProteins({ disease }: { disease: string }, extra: RequestHandlerExtra): Promise<CallToolResult> {
    console.error(`DEBUG: Processing search-disease-proteins request for disease: ${disease}`);
    
    // Build a proper search query based on the curl example
    const searchQuery = {
        query: {
            type: "group",
            nodes: [
                {
                    type: "group",
                    nodes: [
                        {
                            type: "group",
                            nodes: [
                                {
                                    type: "terminal",
                                    service: "full_text",
                                    parameters: {
                                        value: disease
                                    }
                                }
                            ],
                            logical_operator: "and"
                        }
                    ],
                    logical_operator: "and",
                    label: "full_text"
                }
            ],
            logical_operator: "and"
        },
        return_type: "entry",
        request_options: {
            paginate: {
                start: 0,
                rows: 25
            },
            results_content_type: [
                "experimental"
            ],
            sort: [
                {
                    sort_by: "score",
                    direction: "desc"
                }
            ],
            scoring_strategy: "combined"
        }
    };
    
    console.error(`DEBUG: Using POST request to search API`);
    // Make a POST request with the properly structured query
    const searchData: any = await makeApiRequest(RCSB_PDB_SEARCH_API, 'POST', searchQuery);

    if (!searchData || !searchData.result_set) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to search for proteins related to: ${disease}. The search API might be temporarily unavailable.`,
                },
            ],
        };
    }

    // Check if we have results
    const results = searchData.result_set || [];
    console.error(`DEBUG: Found ${results.length} results for disease: ${disease}`);

    if (results.length === 0) {
        // Try alternative search with broader criteria
        const altSearchQuery = {
            query: {
                type: "group",
                nodes: [
                    {
                        type: "group",
                        nodes: [
                            {
                                type: "terminal",
                                service: "text",
                                parameters: {
                                    attribute: "text",
                                    operator: "contains_phrase",
                                    value: disease
                                }
                            }
                        ],
                        logical_operator: "and"
                    }
                ],
                logical_operator: "and"
            },
            return_type: "entry",
            request_options: {
                paginate: {
                    start: 0,
                    rows: 25
                },
                sort: [
                    {
                        sort_by: "score",
                        direction: "desc"
                    }
                ]
            }
        };
        
        console.error(`DEBUG: No results with specific search, trying broader search with POST request`);
        const altSearchData: any = await makeApiRequest(RCSB_PDB_SEARCH_API, 'POST', altSearchQuery);
        
        if (!altSearchData || !altSearchData.result_set || altSearchData.result_set.length === 0) {
            return {
                content: [
                    {
                        type: "text",
                        text: `No proteins found related to: ${disease}. Try using a different disease name or more general terms.`,
                    },
                ],
            };
        }
        
        const altResults = altSearchData.result_set;
        console.error(`DEBUG: Found ${altResults.length} results with broader search`);
        
        let resultsText = `Found ${altResults.length} proteins that might be related to: "${disease}"\n\n`;
        
        // Process the alternative results
        const topResults = altResults.slice(0, 5);
        for (const result of topResults) {
            const pdbId = result.identifier;
            console.error(`DEBUG: Fetching details for PDB ID: ${pdbId}`);
            
            const structureUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}`;
            const structureData: any = await makeApiRequest(structureUrl);

            if (!structureData) {
                resultsText += `PDB ID: ${pdbId} (Error fetching details)\n---\n\n`;
                continue;
            }

            resultsText += `PDB ID: ${pdbId}\n`;
            resultsText += `Title: ${structureData?.struct?.title || "Unknown"}\n`;

            if (structureData?.rcsb_primary_citation) {
                const citation = structureData.rcsb_primary_citation;
                resultsText += `Publication: ${citation.title || "Unknown"} (${citation.journal_abbrev || "Unknown"}, ${citation.year || "Unknown"})\n`;
            }

            resultsText += "---\n\n";
        }
        
        resultsText += "To analyze any of these structures in detail, you can use the analyze-active-site tool with the PDB ID.";
        
        return {
            content: [
                {
                    type: "text",
                    text: resultsText,
                },
            ],
        };
    }

    let resultsText = `Found ${results.length} proteins related to: "${disease}"\n\n`;

    // Get detailed info for top 5 results
    const topResults = results.slice(0, 5);
    for (const result of topResults) {
        const pdbId = result.identifier;
        console.error(`DEBUG: Fetching details for PDB ID: ${pdbId}`);
        
        const structureUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}`;
        const structureData: any = await makeApiRequest(structureUrl);

        if (!structureData) {
            resultsText += `PDB ID: ${pdbId} (Error fetching details)\n---\n\n`;
            continue;
        }

        resultsText += `PDB ID: ${pdbId}\n`;
        resultsText += `Title: ${structureData?.struct?.title || "Unknown"}\n`;

        if (structureData?.rcsb_primary_citation) {
            const citation = structureData.rcsb_primary_citation;
            resultsText += `Publication: ${citation.title || "Unknown"} (${citation.journal_abbrev || "Unknown"}, ${citation.year || "Unknown"})\n`;
        }

        resultsText += "---\n\n";
    }

    // Add note about how to analyze structures
    resultsText += "To analyze any of these structures in detail, you can use the analyze-active-site tool with the PDB ID.";

    return {
        content: [
            {
                type: "text",
                text: resultsText,
            },
        ],
    };
}
