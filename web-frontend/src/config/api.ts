// API Configuration
// This handles different base URLs for development vs production

const getApiBaseUrl = (): string => {
  // In production build, use relative paths (works for emilydensmore.com)
  // In development, Vite proxy handles the routing to localhost:5000
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function for making API calls
export const apiCall = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  return fetch(url, options);
};

export default {
  API_BASE_URL,
  apiCall,
};
