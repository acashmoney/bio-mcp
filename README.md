# BioMCP

![BioMCP](cover.png)

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
