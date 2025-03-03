import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { 
    analyzeActiveSite, 
    analyzeActiveSiteSchema 
} from "./tools/analyzeActiveSite.js";

import { 
    searchDiseaseProteins, 
    searchDiseaseProteinsSchema 
} from "./tools/searchDiseaseProteins.js";

// Keep-alive interval (ms) - Keep this under 30 seconds to prevent timeouts
const KEEP_ALIVE_INTERVAL = 25000;

/**
 * Create and configure the MCP server
 */
export function createServer() {
    const server = new McpServer({
        name: "pdb-analysis",
        version: "1.0.0",
    });

    // Register the analyze-active-site tool
    server.tool(
        "analyze-active-site",
        "Analyze the active site of a protein structure",
        analyzeActiveSiteSchema,
        analyzeActiveSite
    );

    // Register the search-disease-proteins tool
    server.tool(
        "search-disease-proteins",
        "Search for proteins related to a disease",
        searchDiseaseProteinsSchema,
        searchDiseaseProteins
    );

    return server;
}

// Keep track of connection state and timers
let keepAliveInterval: NodeJS.Timeout | null = null;
let transport: StdioServerTransport | null = null;

/**
 * Send a keep-alive message by executing a no-op ping that forces the transport to stay active
 */
function sendKeepAlive() {
    console.error("Sending keep-alive ping");
    console.error(`Keep-alive ping at ${new Date().toISOString()}`);
}

/**
 * Clean up resources when shutting down
 */
function cleanup() {
    console.error("Cleaning up resources...");
    
    if (keepAliveInterval) {
        clearInterval(keepAliveInterval);
        keepAliveInterval = null;
    }
    
    if (transport) {
        try {
            server.close().catch(error => {
                console.error("Error during close in cleanup:", error);
            });
        } catch (error) {
            console.error("Error during cleanup:", error);
        }
    }
}

/**
 * Set up signal handlers for graceful shutdown
 */
process.on('SIGINT', () => {
    console.error("Received SIGINT signal");
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.error("Received SIGTERM signal");
    cleanup();
    process.exit(0);
});

// Create the server instance
const server = createServer();

/**
 * Main function to start the server
 */
async function main() {
    try {
        transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("PDB Analysis MCP Server running on stdio");
        
        // Set up keep-alive interval
        keepAliveInterval = setInterval(sendKeepAlive, KEEP_ALIVE_INTERVAL);
    } catch (error) {
        console.error("Fatal error in main():", error);
        process.exit(1);
    }
}

// Check if this file is being run directly
if (import.meta.url.endsWith(process.argv[1].replace(/^file:\/\//, ''))) {
  // This is being run directly
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

// Export for testing
export { server };