/**
 * BioMCP - Model Context Protocol for Protein Structure Analysis
 * Main entry point that coordinates server, client, and agent components
 */

// Re-export server components
export * from './server/index.js';

// Import placeholder for future client exports
// export * from './client/index.js';

// Import placeholder for future agent exports
// export * from './agent/index.js';

// Main function that determines which components to launch based on configuration
async function main() {
  // Check command line args to determine which component(s) to launch
  const args = process.argv.slice(2);
  const launchMode = args[0] || 'server'; // Default to server-only mode
  
  try {
    if (launchMode === 'server' || launchMode === 'all') {
      // Import and run server
      const { main: runServer } = await import('./server/index.js');
      await runServer();
    }
    
    // Future client and agent initialization will go here
    // if (launchMode === 'client' || launchMode === 'all') { ... }
    // if (launchMode === 'agent' || launchMode === 'all') { ... }
    
  } catch (error) {
    console.error("Fatal error in BioMCP:", error);
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