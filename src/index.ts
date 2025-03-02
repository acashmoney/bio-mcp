import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Correct API base URLs
const RCSB_PDB_DATA_API = "https://data.rcsb.org/rest/v1";  // For specific entry data
const RCSB_PDB_SEARCH_API = "https://search.rcsb.org/rcsbsearch/v2/query";  // For searching entries
const PDBE_API_BASE = "https://www.ebi.ac.uk/pdbe/api";
const UNIPROT_API_BASE = "https://rest.uniprot.org/uniprotkb";
const USER_AGENT = "pdb-analysis-mcp-server/1.0";

const server = new McpServer({
    name: "pdb-analysis",
    version: "1.0.0",
});

async function makeApiRequest<T>(url: string, method: string = 'GET', body?: any): Promise<T | null> {
    const headers: HeadersInit = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
    };
    
    if (body) {
        headers["Content-Type"] = "application/json";
    }

    const options: RequestInit = { 
        method,
        headers,
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        console.error(`DEBUG: Making ${method} request to: ${url}`);
        if (body) {
            console.error(`DEBUG: Request body: ${JSON.stringify(body).substring(0, 200)}...`);
        }
        
        // Maximum of 3 retry attempts for transient network issues
        let response: Response | undefined;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
            try {
                response = await fetch(url, options);
                break;
            } catch (fetchError) {
                retries++;
                console.error(`DEBUG: Fetch error (attempt ${retries}/${maxRetries}):`, fetchError);
                if (retries >= maxRetries) throw fetchError;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
            }
        }
        
        if (!response) {
            throw new Error("Failed to get a response after retries");
        }
        
        console.error(`DEBUG: Response status: ${response.status}`);
        
        // For 404 errors with specific PDB IDs, try an alternative URL format
        if (response.status === 404 && url.includes('/core/entry/')) {
            const pdbId = url.split('/').pop()?.toUpperCase();
            // Try alternative endpoint for older entries
            if (pdbId && pdbId.length === 4) {
                console.error(`DEBUG: Entry not found, trying alternative GraphQL approach for PDB ID: ${pdbId}`);
                
                const graphqlUrl = 'https://data.rcsb.org/graphql';
                const graphqlQuery = {
                    query: `{ entry(entry_id:"${pdbId}") { rcsb_id struct { title } } }`
                };
                
                const graphqlResponse = await fetch(graphqlUrl, {
                    method: 'POST',
                    headers: {
                        "User-Agent": USER_AGENT,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(graphqlQuery)
                });
                
                if (graphqlResponse.ok) {
                    const graphqlData = await graphqlResponse.json();
                    if (graphqlData?.data?.entry) {
                        console.error(`DEBUG: Successfully retrieved data via GraphQL`);
                        return graphqlData.data.entry as T;
                    }
                }
                console.error(`DEBUG: GraphQL approach also failed`);
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`DEBUG: Error response body: ${errorText.substring(0, 200)}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.error(`DEBUG: Response body first 100 chars: ${responseText.substring(0, 100)}`);
        
        try {
            const data = JSON.parse(responseText) as T;
            return data;
        } catch (parseError) {
            console.error(`DEBUG: JSON parse error: ${parseError}`);
            
            // If parsing fails but we have response text, try to salvage the data
            if (responseText && responseText.length > 0) {
                console.error(`DEBUG: Attempting to salvage partial data`);
                try {
                    // Create minimal structure with title from response text
                    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
                    if (titleMatch && titleMatch[1]) {
                        return {
                            struct: {
                                title: titleMatch[1]
                            }
                        } as unknown as T;
                    }
                } catch (salvageError) {
                    console.error(`DEBUG: Failed to salvage data:`, salvageError);
                }
            }
            
            return null;
        }
    } catch (error) {
        console.error(`DEBUG: Error making API request to ${url}:`, error);
        return null;
    }
}

interface PdbStructureMetadata {
    struct?: {
        title?: string;
        pdbx_descriptor?: string; // Alternative title field
    };
    rcsb_primary_citation?: {
        title?: string;
        journal_abbrev?: string;
        year?: number;
    };
    rcsb_polymer_entity_container_identifiers?: {
        uniprot_ids?: string[];
    };
    // Add any field that exists to ensure we catch all possible structure variants
    [key: string]: any;
}

interface PdbeBindingSiteResponse {
    [pdbId: string]: {
        site_data?: Array<{
            site_id?: string;
            site_residues?: Array<{
                chain_id?: string;
                res_num?: number;
                res_name?: string;
            }>;
            ligands?: Array<{
                chem_comp_id?: string;
            }>;
        }>;
    };
}

server.tool(
    "analyze-active-site",
    "Analyze the active site of a protein structure",
    {
        pdbId: z.string().describe("The PDB ID of the protein structure to analyze (e.g., 6LU7)"),
    },
    async ({ pdbId }) => {
        console.error(`DEBUG: Processing analyze-active-site request for PDB ID: ${pdbId}`);
        
        // Normalize PDB ID format (uppercase)
        pdbId = pdbId.toUpperCase();
        console.error(`DEBUG: Normalized PDB ID to: ${pdbId}`);
        
        // Use correct Data API URL format
        const structureUrl = `${RCSB_PDB_DATA_API}/core/entry/${pdbId}`;
        console.error(`DEBUG: Requesting structure data from: ${structureUrl}`);
        
        const structureData = await makeApiRequest<PdbStructureMetadata>(structureUrl);

        if (!structureData) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Failed to retrieve structure data for PDB ID: ${pdbId}. Please verify this is a valid PDB ID.`,
                    },
                ],
            };
        }

        // Get binding site data from PDBe
        const bindingSiteUrl = `${PDBE_API_BASE}/pdb/entry/binding_sites/${pdbId.toLowerCase()}`;
        console.error(`DEBUG: Requesting binding site data from: ${bindingSiteUrl}`);
        const bindingSiteData = await makeApiRequest<PdbeBindingSiteResponse>(bindingSiteUrl);

        // Extract title with fallback options
        const title = structureData.struct?.title || 
                      structureData.struct?.pdbx_descriptor || 
                      (structureData.citation && structureData.citation[0]?.title) ||
                      "Unknown protein";
        console.error(`DEBUG: Retrieved structure title: ${title}`);
        console.error(`DEBUG: Available structure data fields: ${Object.keys(structureData).join(', ')}`);

        let activeSiteText = `Analysis of ${pdbId}: ${title}\n\n`;

        if (!bindingSiteData || !bindingSiteData[pdbId.toLowerCase()]?.site_data) {
            activeSiteText += "No binding site information available for this structure.\n\n";
            
            // Add summary information even if no binding sites
            activeSiteText += `Structure Summary:\n`;
            activeSiteText += `Title: ${title}\n`;
            if (structureData.rcsb_primary_citation) {
                const citation = structureData.rcsb_primary_citation;
                activeSiteText += `Publication: ${citation.title || "Unknown"} (${citation.journal_abbrev || "Unknown"}, ${citation.year || "Unknown"})\n`;
            }
        } else {
            const siteData = bindingSiteData[pdbId.toLowerCase()].site_data;
            if (!siteData) {
                activeSiteText += "No binding site data available for this structure.\n\n";
            } else {
                activeSiteText += `Found ${siteData.length} binding sites in the structure.\n\n`;

                siteData.forEach((site, index) => {
                    activeSiteText += `Site ${index + 1} (${site.site_id || "Unknown ID"}):\n`;

                    if (site.site_residues && site.site_residues.length > 0) {
                        activeSiteText += "Key residues:\n";
                        site.site_residues.forEach((residue) => {
                            activeSiteText += `- ${residue.res_name || "?"} ${residue.res_num || "?"} (Chain ${residue.chain_id || "?"})\n`;
                        });
                    }

                    if (site.ligands && site.ligands.length > 0) {
                        activeSiteText += "Bound ligands:\n";
                        site.ligands.forEach((ligand) => {
                            activeSiteText += `- ${ligand.chem_comp_id || "Unknown ligand"}\n`;
                        });
                    }

                    activeSiteText += "\n";
                });
            }
        }

        // Try to get UniProt data if available
        const uniprotIds = structureData.rcsb_polymer_entity_container_identifiers?.uniprot_ids || [];
        if (uniprotIds.length > 0) {
            const uniprotId = uniprotIds[0];
            console.error(`DEBUG: Found UniProt ID: ${uniprotId}, fetching details`);
            const uniprotUrl = `${UNIPROT_API_BASE}/${uniprotId}`;
            const uniprotData = await makeApiRequest<any>(uniprotUrl);

            if (uniprotData) {
                activeSiteText += `\nProtein Function (from UniProt ${uniprotId}):\n`;
                try {
                    if (uniprotData.comments) {
                        const functionComments = uniprotData.comments.filter((c: any) => c.commentType === "FUNCTION") || [];
                        if (functionComments.length > 0 && functionComments[0].texts && functionComments[0].texts.length > 0) {
                            activeSiteText += functionComments[0].texts[0].value;
                        } else {
                            activeSiteText += "No function information available in UniProt.";
                        }
                    } else {
                        activeSiteText += "Function information not available.";
                    }
                } catch (error) {
                    console.error("DEBUG: Error processing UniProt data:", error);
                    activeSiteText += "Error processing UniProt data.";
                }
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: activeSiteText,
                },
            ],
        };
    },
);

server.tool(
    "search-disease-proteins",
    "Search for proteins related to a disease",
    {
        disease: z.string().describe("Disease name (e.g., 'covid', 'alzheimer's')"),
    },
    async ({ disease }) => {
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
        const searchData = await makeApiRequest<any>(RCSB_PDB_SEARCH_API, 'POST', searchQuery);

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
            const altSearchData = await makeApiRequest<any>(RCSB_PDB_SEARCH_API, 'POST', altSearchQuery);
            
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
                const structureData = await makeApiRequest<PdbStructureMetadata>(structureUrl);

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
            const structureData = await makeApiRequest<PdbStructureMetadata>(structureUrl);

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
    },
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("PDB Analysis MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});