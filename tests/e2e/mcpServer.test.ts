import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { analyzeActiveSite, analyzeActiveSiteSchema } from "../../src/tools/analyzeActiveSite.js";
import { searchDiseaseProteins, searchDiseaseProteinsSchema } from "../../src/tools/searchDiseaseProteins.js";
import { mockPdbData, mockUniprotData, mockDiseaseSearchResults } from "../mocks/pdbData";
import { jest } from '@jest/globals';

// Before all tests, mock the RCSB_PDB_SEARCH_API constant
beforeAll(() => {
  // We'll use more direct mocking
  jest.spyOn(global, 'fetch').mockImplementation((url, options) => {
    // Convert URL to string if it's a URL object
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.includes('rcsbsearch/v2/query')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          result_set: [
            { identifier: '6LU7', title: 'SARS-CoV-2 main protease' },
            { identifier: '7L0D', title: 'SARS-CoV-2 spike protein' }
          ],
          total_count: 2
        }),
        text: () => Promise.resolve(JSON.stringify({
          result_set: [
            { identifier: '6LU7', title: 'SARS-CoV-2 main protease' },
            { identifier: '7L0D', title: 'SARS-CoV-2 spike protein' }
          ],
          total_count: 2
        }))
      } as unknown as Response);
    }
    
    if (urlString.includes('/core/entry/')) {
      // Extract PDB ID 
      const pdbId = urlString.split('/').pop()?.split('?')[0];
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          struct: { title: `${pdbId} protein structure` },
          rcsb_primary_citation: { title: `Structure of ${pdbId}`, journal_abbrev: 'Science', year: 2020 }
        }),
        text: () => Promise.resolve(JSON.stringify({
          struct: { title: `${pdbId} protein structure` },
          rcsb_primary_citation: { title: `Structure of ${pdbId}`, journal_abbrev: 'Science', year: 2020 }
        }))
      } as unknown as Response);
    }
    
    // Default fallback
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found')
    } as unknown as Response);
  });
});

// Before the mock for makeApiRequest, add these constants
jest.mock('../../src/utils', () => ({
  RCSB_PDB_DATA_API: 'https://data.rcsb.org/rest/v1',
  UNIPROT_API_BASE: 'https://rest.uniprot.org/uniprotkb',
  RCSB_PDB_SEARCH_API: 'https://search.rcsb.org/rcsbsearch/v2/query',
  makeApiRequest: jest.fn(async (url: string, method?: string, body?: Record<string, unknown>) => {
    // Handle REST API requests for PDB entries
    if (url.includes('/core/entry/')) {
      // Extract PDB ID and endpoint
      const urlParts = url.split('/');
      const pdbIdIndex = urlParts.indexOf('entry') + 1;
      const pdbId = urlParts[pdbIdIndex]?.toUpperCase();
      const endpoint = urlParts[pdbIdIndex + 1];
      
      if (pdbId) {
        // Handle specific endpoints
        if (endpoint === 'struct_site') {
          if (pdbId === '6LU7') {
            return [
              {
                id: "AC1",
                details: "ACTIVE SITE",
                pdbx_evidence_code: "Software",
                pdbx_site_details: "Catalytic dyad: HIS41, CYS145"
              }
            ];
          }
          return [];
        } else if (endpoint === 'struct_site_gen') {
          return []; // Mock empty site gen data
        } else if (endpoint === 'nonpolymer_entity' || endpoint === 'ligands') {
          if (pdbId === '6LU7') {
            return [
              {
                pdbx_entity_nonpoly: {
                  comp_id: "N3",
                  name: "Inhibitor N3"
                }
              }
            ];
          }
          return [];
        } else if (endpoint === 'polymer_entity') {
          if (pdbId === '6LU7') {
            return [
              {
                rcsb_polymer_entity_container_identifiers: {
                  uniprot_ids: ["P0DTD1"]
                }
              }
            ];
          }
          return [];
        } else {
          // Basic entry data
          if (pdbId === '6LU7') {
            return {
              struct: {
                title: 'SARS-CoV-2 main protease in complex with an inhibitor N3'
              },
              rcsb_primary_citation: {
                title: 'Crystal structure of SARS-CoV-2 main protease',
                journal_abbrev: 'Science',
                year: 2020
              },
              rcsb_entry_info: {
                molecular_weight: 34371.26,
                deposited_polymer_monomer_count: 306,
                deposited_atom_count: 2486,
                polymer_entity_count_protein: 1,
                ligand_count: 3
              }
            };
          } else if (pdbId === '7L0D') {
            return {
              struct: {
                title: 'SARS-CoV-2 spike protein'
              },
              rcsb_primary_citation: {
                title: 'Structure of SARS-CoV-2 spike protein',
                journal_abbrev: 'Nature',
                year: 2020
              }
            };
          }
        }
      }
      
      return null;
    }
    
    // Handle UniProt API requests
    if (url.includes('uniprot.org')) {
      const uniprotId = url.split('/').pop();
      if (uniprotId === 'P0DTD1') {
        return {
          comments: [
            {
              commentType: "FUNCTION",
              texts: [
                {
                  value: "Cleaves the polyprotein at the 3C-like protease self-cleavage site."
                }
              ]
            }
          ]
        };
      }
      return null;
    }
    
    // Handle search API requests
    if (url.includes('rcsbsearch/v2/query') && method === 'POST') {
      return {
        result_set: [
          { 
            identifier: '6LU7',
            title: 'SARS-CoV-2 main protease in complex with an inhibitor N3' 
          },
          { 
            identifier: '7L0D',
            title: 'SARS-CoV-2 spike protein' 
          }
        ],
        total_count: 2
      };
    }
    
    return null;
  })
}));

// Need to modify the server code to be importable for testing
// or create a test instance of the server

describe('MCP Server E2E Tests', () => {
  let server: McpServer;
  let client: Client;
  let serverTransport: InMemoryTransport;
  let clientTransport: InMemoryTransport;
  
  beforeAll(async () => {
    // Set up a test server instance
    server = new McpServer({
      name: "bio-mcp-test",
      version: "0.1.0",
    });
    
    // Add tools directly from our implementation
    server.tool(
      "analyze-active-site",
      "Analyze the active site of a protein structure",
      analyzeActiveSiteSchema,
      analyzeActiveSite
    );
    
    server.tool(
      "search-disease-proteins",
      "Search for proteins related to a disease",
      searchDiseaseProteinsSchema,
      searchDiseaseProteins
    );
    
    // Create a linked pair of in-memory transports
    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    
    // Create the client
    client = new Client({
      name: "test-client",
      version: "1.0.0"
    });
    
    // Connect client and server
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });
  
  afterAll(() => {
    jest.restoreAllMocks();
    
    // Add these to ensure proper cleanup 
    jest.useRealTimers();
    jest.clearAllMocks();
  });
  
  it('should analyze active site for a valid PDB ID', async () => {
    // Timeout to prevent infinite hanging
    jest.setTimeout(5000);
    
    const result = await client.callTool({
      name: "analyze-active-site",
      arguments: {
        pdbId: "6LU7",
      }
    });
    
    expect(result).toBeDefined();
    // Type assertion to help TypeScript understand the structure
    const content = result.content as Array<{type: string, text: string}>;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("6LU7");
    expect(content[0].text).toContain("SARS-CoV-2");
  }, 5000);  // Add explicit timeout
  
  it('should handle invalid PDB IDs gracefully', async () => {
    // Add timeout to prevent test from hanging
    jest.setTimeout(5000);
    
    const result = await client.callTool({
      name: "analyze-active-site",
      arguments: {
        pdbId: "XXXX",
      }
    });
    
    expect(result).toBeDefined();
    // Type assertion to help TypeScript understand the structure
    const content = result.content as Array<{type: string, text: string}>;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("Failed to retrieve structure data");
  }, 5000);  // Add explicit timeout
  
  it('should search for disease proteins', async () => {
    // Add timeout to prevent test from hanging
    jest.setTimeout(5000);
    
    const result = await client.callTool({
      name: "search-disease-proteins",
      arguments: {
        disease: "covid",
      }
    });
    
    expect(result).toBeDefined();
    // Type assertion to help TypeScript understand the structure
    const content = result.content as Array<{type: string, text: string}>;
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toContain("Found");
    expect(content[0].text).toContain("PDB ID");
  }, 5000);  // Add explicit timeout
});
