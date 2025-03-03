# BioMCP

## Overview

BioMCP is a Model Context Protocol [(MCP)](https://modelcontextprotocol.io/introduction) server designed to enhance large language models with protein structure analysis capabilities. It provides tools for analyzing protein active sites and searching for disease-related proteins by interfacing with established protein databases. 

Future work will be centered around enabling agents to utilize the BioMCP.

## Features

- **Active Site Analysis**: Examine the binding sites and functional residues of proteins using PDB IDs
- **Disease-Protein Search**: Find protein structures associated with specific diseases or medical conditions
- **Integrated Data Access**: Connect seamlessly with RCSB Protein Data Bank [(PDB)](https://www.rcsb.org/)

## Technical Details

BioMCP implements the Model Context Protocol, allowing language models to access specialized protein structure knowledge without requiring this information to be part of their training data. The server handles API connections, data formatting, and error handling to provide reliable protein structure insights.

## API Endpoints

BioMCP exposes two primary tools:

1. `analyze-active-site`: Provides detailed information about protein binding sites using a PDB ID
2. `search-disease-proteins`: Returns proteins related to specified diseases or medical conditions

## Getting Started

```bash
# Clone the repository
git clone https://github.com/acashmoney/bio-mcp.git

# Install dependencies
npm install

# Start the server
npm start
```

## Setup Instructions

### Running the MCP Inspector

1. Start the BioMCP server:
   ```bash
   npm start
   ```

2. In a separate terminal, install the MCP Inspector globally (if not already installed):
   ```bash
   npm install -g @anthropic-ai/mcp-inspector
   ```

3. Launch the MCP Inspector and connect to your local BioMCP server:
   ```bash
   mcp-inspector --server-url http://localhost:3000
   ```

4. Use the inspector interface to test tools and view responses.

### Using with Claude Desktop

1. Build the BioMCP server:
   ```bash
   npm run build
   ```

2. Configure Claude Desktop to launch the MCP server:

    a. Locate your Claude Desktop config.json file

    b. Edit the config.json to include the BioMCP server path. Example configuration:
    ```json
    {
        "mcpServers": {
            "bio-mcp": {
                "command": "node",
                "args": [
                    "/path/to/your/build/index.js"
                ]
            }
        }
    }
    ```

    c. Replace `/path/to/your/build/index.js` with your actual path to the project directory.

3. Restart Claude Desktop for the changes to take effect.

4. You can now ask Claude questions that utilize the BioMCP tools:
   - "What are the key residues in the active site of PDB structure 6LU7?"
   - "Find proteins related to Alzheimer's disease"

## Example Usage

When integrated with a compatible language model, Bio-MCP enables queries like:

- "What are the key residues in the active site of PDB structure 6LU7?"
- "Find proteins related to Alzheimer's disease"

## Requirements

- Node.js 20.0.0 or higher
- TypeScript 5.0+
- Compatible MCP client implementation

## Testing

BioMCP includes a comprehensive testing suite with unit, integration, and end-to-end tests.

### Running Tests

Run all tests:
```bash
npm test
```

Run specific test suites:
```bash
# Unit tests only
npm run test:unit

# Integration tests only (API interactions)
npm run test:integration

# End-to-end tests only
npm run test:e2e
```

### Linting

Check code quality:
```bash
npm run lint
```

Fix linting issues automatically:
```bash
npm run lint:fix
```

## Roadmap

- Expand level of detail for active site descriptions
- Leverage existing 3D coordinates from RCSB 
- Tools for interfacing with literature
- Tools for interfacing with computational biology models:
  - RFdiffusion
  - ProteinMPNN
  - ColabFold
  - Additional protein design and structure prediction tools
- Agent-based research pipelines
- Introduce client with protein visualization tools
