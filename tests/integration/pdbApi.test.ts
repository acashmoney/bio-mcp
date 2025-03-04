import { makeApiRequest } from '../../src/server/utils';

// Mock fetch for integration tests to avoid real network calls
beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url) => {
    // Convert URL to string if it's a URL object
    const urlString = typeof url === 'string' ? url : url.toString();
    
    if (urlString.includes('/core/entry/6LU7')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          struct: { title: 'SARS-CoV-2 main protease COVID-19' }
        }))
      });
    } else if (urlString.includes('/core/entry/XXXX')) {
      return Promise.resolve({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      });
    } else if (urlString.includes('rcsbsearch/v2/query')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify({
          result_set: [
            { identifier: '6LU7' },
            { identifier: '7L0D' }
          ],
          total_count: 2
        }))
      });
    }
    
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('Not found')
    });
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

// Define interfaces for API responses
interface StructureData {
  struct?: {
    title?: string;
  };
}

interface SearchResponse {
  result_set?: unknown[];
  total_count?: number;
}

// This should test real API interactions with timeouts
describe('PDB API Integration', () => {
  jest.setTimeout(15000); // Allow more time for API calls
  
  it('should fetch structure data for a valid PDB ID', async () => {
    const pdbId = '6LU7'; // COVID-19 main protease
    const url = `https://data.rcsb.org/rest/v1/core/entry/${pdbId}`;
    
    const result = await makeApiRequest(url, 'GET', undefined, 30000, true) as StructureData;
    
    expect(result).not.toBeNull();
    expect(result.struct).toBeDefined();
    expect(result.struct?.title).toContain('COVID-19');
  });

  it('should handle non-existent PDB IDs', async () => {
    const pdbId = 'XXXX'; // Invalid ID
    const url = `https://data.rcsb.org/rest/v1/core/entry/${pdbId}`;
    
    const result = await makeApiRequest(url, 'GET', undefined, 30000, true);
    
    expect(result).toBeNull();
  });

  it('should successfully search for disease proteins', async () => {
    const searchUrl = 'https://search.rcsb.org/rcsbsearch/v2/query';
    
    const searchQuery = {
      query: {
        type: "group",
        nodes: [
          {
            type: "terminal",
            service: "full_text",
            parameters: {
              value: "covid"
            }
          }
        ],
        logical_operator: "and"
      },
      return_type: "entry",
      request_options: {
        paginate: {
          start: 0,
          rows: 5
        }
      }
    };
    
    const result = await makeApiRequest(searchUrl, 'POST', searchQuery, 30000, true) as SearchResponse;
    
    expect(result).not.toBeNull();
    expect(result.result_set).toBeDefined();
    expect(Array.isArray(result.result_set)).toBe(true);
    expect(result.result_set?.length).toBeGreaterThan(0);
  });
});
