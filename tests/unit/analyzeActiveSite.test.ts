import { mockPdbData, mockUniprotData } from '../mocks/pdbData';
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";

// Update all modules to point to server utils
jest.mock('../../src/utils', () => {
  return require('../../src/server/utils');
});

// Mock the makeApiRequest function
jest.mock('../../src/server/utils', () => ({
  makeApiRequest: jest.fn(async (url, method, body) => {
    // Handle different REST API endpoints
    if (url.includes('/core/entry/')) {
      // Extract PDB ID and endpoint type
      const urlParts = url.split('/');
      const pdbId = urlParts[urlParts.length - 2]?.toUpperCase();
      const endpoint = urlParts[urlParts.length - 1];
      
      // If URL format is /core/entry/{pdbId}/{endpoint}
      if (pdbId && endpoint && pdbId in mockPdbData) {
        const pdbDataKey = pdbId as keyof typeof mockPdbData;
        // Return specific data based on endpoint
        if (endpoint === 'struct_site') {
          return mockPdbData[pdbDataKey]?.pdbx_struct_site || [];
        } else if (endpoint === 'struct_site_gen') {
          return []; // Mock empty site gen data
        } else if (endpoint === 'nonpolymer_entity' || endpoint === 'ligands') {
          return mockPdbData[pdbDataKey]?.nonpolymer_entities || [];
        } else if (endpoint === 'polymer_entity') {
          return mockPdbData[pdbDataKey]?.polymer_entities || [];
        }
      }
      
      // If URL format is /core/entry/{pdbId}
      const simplePdbId = urlParts[urlParts.length - 1]?.toUpperCase();
      if (simplePdbId && simplePdbId in mockPdbData) {
        return mockPdbData[simplePdbId as keyof typeof mockPdbData];
      }
      
      return null;
    } else if (url.includes('uniprot.org')) {
      const uniprotId = url.split('/').pop();
      if (uniprotId && uniprotId in mockUniprotData) {
        return mockUniprotData[uniprotId as keyof typeof mockUniprotData];
      }
      return null;
    }
    return null;
  })
}));

// Import the actual tool implementation
import { analyzeActiveSite } from '../../src/tools/analyzeActiveSite';

// Mock RequestHandlerExtra
const mockExtra = {
  context: {},
  sendPartialResponse: jest.fn(),
  signal: new AbortController().signal
} as RequestHandlerExtra;

describe('Analyze Active Site Tool', () => {
  it('should provide active site information for a valid PDB ID', async () => {
    const result = await analyzeActiveSite({ pdbId: '6LU7' }, mockExtra);
    
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    // Updated to match the actual mock data format
    expect(result.content[0].text).toContain("SARS-CoV-2");
  });
  
  it('should handle invalid PDB IDs gracefully', async () => {
    const result = await analyzeActiveSite({ pdbId: 'XXXX' }, mockExtra);
    
    expect(result.content).toBeDefined();
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("Failed to retrieve structure data");
  });
});
