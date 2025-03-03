import { makeApiRequest } from '../../src/utils';

// Need to extract makeApiRequest to a separate file or mock it for testing

// At the top of the file, mock fetch to clear timeouts
const mockFetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    status: 200,
    text: () => Promise.resolve('{"key": "value"}')
  });
});

// Mock global fetch
global.fetch = mockFetch;

// Clear all timeouts after each test
afterEach(() => {
  jest.clearAllTimers();
});

describe('makeApiRequest', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.resetAllMocks();
  });

  it('should successfully fetch data', async () => {
    // Mock successful fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('{"key": "value"}'),
    } as unknown as Response);

    const result = await makeApiRequest('https://example.com/api');
    
    expect(fetch).toHaveBeenCalledWith(
      'https://example.com/api', 
      expect.objectContaining({ method: 'GET' })
    );
    expect(result).toEqual({ key: 'value' });
  });

  it('should retry on network error', async () => {
    // Mock fetch with network error first time, then success
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"key": "value"}'),
      } as unknown as Response);

    const result = await makeApiRequest('https://example.com/api');
    
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle timeout errors', async () => {
    // Mock AbortError (timeout)
    const abortError = new Error('Timeout');
    abortError.name = 'AbortError';
    
    global.fetch = jest.fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"key": "value"}'),
      } as unknown as Response);

    const result = await makeApiRequest('https://example.com/api');
    
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ key: 'value' });
  });

  it('should handle HTTP errors', async () => {
    // Mock 404 error
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue('Not found'),
    } as unknown as Response);

    const result = await makeApiRequest('https://example.com/api');
    
    expect(result).toBeNull();
  });
});
