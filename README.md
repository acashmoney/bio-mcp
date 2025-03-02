# Bio-MCP

## Overview

Bio-MCP is a Model Context Protocol (MCP) server designed to enhance large language models with protein structure analysis capabilities. It provides tools for analyzing protein active sites and searching for disease-related proteins by interfacing with established protein databases.

## Features

- **Active Site Analysis**: Examine the binding sites and functional residues of proteins using PDB IDs
- **Disease-Protein Search**: Find protein structures associated with specific diseases or medical conditions
- **Integrated Data Access**: Connect seamlessly with RCSB PDB, PDBe, and UniProt databases

## Technical Details

Bio-MCP implements the Model Context Protocol, allowing language models to access specialized protein structure knowledge without requiring this information to be part of their training data. The server handles API connections, data formatting, and error handling to provide reliable protein structure insights.

## API Endpoints

Bio-MCP exposes two primary tool endpoints:

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

## Example Usage

When integrated with a compatible language model, Bio-MCP enables queries like:

- "What are the key residues in the active site of PDB structure 6LU7?"
- "Find proteins related to Alzheimer's disease"

## Requirements

- Node.js 20.0.0 or higher
- TypeScript 5.0+
- Compatible MCP client implementation
