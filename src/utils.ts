// Define API constants
export const USER_AGENT = 'PDB-Analysis-Tool/1.0';
export const DEFAULT_API_TIMEOUT = 30000; // 30 seconds
export const RCSB_PDB_DATA_API = 'https://data.rcsb.org/rest/v1';
export const RCSB_PDB_SEARCH_API = 'https://search.rcsb.org/rcsbsearch/v2/query';
export const PDBE_API_BASE = 'https://www.ebi.ac.uk/pdbe/api';
export const UNIPROT_API_BASE = 'https://rest.uniprot.org/uniprotkb';

/**
 * Make an API request with retry logic and error handling
 * 
 * @param url The URL to make the request to
 * @param method The HTTP method to use (GET, POST, etc.)
 * @param body Optional request body for POST requests
 * @param timeout Timeout in milliseconds
 * @returns The parsed JSON response, or null if the request failed
 */
export async function makeApiRequest(
    url: string, 
    method: string = 'GET', 
    body?: Record<string, unknown>, 
    timeout: number = DEFAULT_API_TIMEOUT
): Promise<unknown> {
    const headers: Record<string, string> = {
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
        console.error(`Making ${method} request to: ${url}`);
        if (body) {
            console.error(`Request body: ${JSON.stringify(body).substring(0, 200)}...`);
        }
        
        // Maximum of 3 retry attempts for transient network issues
        let response: Response | undefined;
        let retries = 0;
        const maxRetries = 3;
        
        while (retries < maxRetries) {
            try {
                // Create AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                options.signal = controller.signal;
                
                response = await fetch(url, options);
                clearTimeout(timeoutId);
                break;
            } catch (fetchError: unknown) {
                retries++;
                
                // Check if this was a timeout
                if (fetchError instanceof Error && fetchError.name === "AbortError") {
                    console.error(`Request timeout (attempt ${retries}/${maxRetries}) for: ${url}`);
                } else {
                    console.error(`Fetch error (attempt ${retries}/${maxRetries}):`, fetchError);
                }
                
                if (retries >= maxRetries) throw fetchError;
                
                // Exponential backoff
                const backoffTime = 1000 * Math.pow(2, retries - 1);
                console.error(`Retrying after ${backoffTime}ms`);
                await new Promise(resolve => setTimeout(resolve, backoffTime));
            }
        }
        
        if (!response) {
            throw new Error("Failed to get a response after retries");
        }
        
        console.error(`Response status: ${response.status}`);
        
        // For 404 errors with specific PDB IDs, try an alternative URL format
        if (response.status === 404 && url.includes('/core/entry/')) {
            const pdbId = url.split('/').pop()?.toUpperCase();
            // Try alternative endpoint for older entries
            if (pdbId && pdbId.length === 4) {
                console.error(`Entry not found, trying alternative GraphQL approach for PDB ID: ${pdbId}`);
                
                const graphqlUrl = 'https://data.rcsb.org/graphql';
                const graphqlQuery = {
                    query: `{ entry(entry_id:"${pdbId}") { rcsb_id struct { title } } }`
                };
                
                // Create new AbortController for this request
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const graphqlResponse = await fetch(graphqlUrl, {
                    method: 'POST',
                    headers: {
                        "User-Agent": USER_AGENT,
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    body: JSON.stringify(graphqlQuery),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (graphqlResponse.ok) {
                    const graphqlData = await graphqlResponse.json();
                    if (graphqlData?.data?.entry) {
                        console.error(`Successfully retrieved data via GraphQL`);
                        return graphqlData.data.entry;
                    }
                }
                console.error(`GraphQL approach also failed`);
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error response body: ${errorText.substring(0, 200)}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseText = await response.text();
        console.error(`Response body first 300 chars: ${responseText.substring(0, 300)}`);
        
        try {
            const data = JSON.parse(responseText);
            return data;
        } catch (parseError) {
            console.error(`JSON parse error: ${parseError}`);
            
            // If parsing fails but we have response text, try to salvage the data
            if (responseText && responseText.length > 0) {
                console.error(`Attempting to salvage partial data`);
                try {
                    // Create minimal structure with title from response text
                    const titleMatch = responseText.match(/"title"\s*:\s*"([^"]+)"/);
                    if (titleMatch && titleMatch[1]) {
                        return {
                            struct: {
                                title: titleMatch[1]
                            }
                        };
                    }
                } catch (salvageError) {
                    console.error(`Failed to salvage data:`, salvageError);
                }
            }
            
            return null;
        }
    } catch (error) {
        console.error(`Error making API request to ${url}:`, error);
        return null;
    }
}
