// Create this file to set up global jest timeout
beforeAll(() => {
  jest.setTimeout(10000); // Set global timeout to 10 seconds
});

afterAll(() => {
  // Clean up any lingering handles
  jest.useRealTimers();
}); 