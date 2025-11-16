// API Client - برای ارتباط با Vercel API Routes
const API_BASE = ''; // Same origin - no need for full URL

// Helper: Get auth token from localStorage
function getAuthToken() {
  try {
    const session = localStorage.getItem('supabase.auth.token');
    if (session) {
      const parsed = JSON.parse(session);
      return parsed.access_token || parsed.currentSession?.access_token;
    }
  } catch (e) {
    console.error('Error getting auth token:', e);
  }
  return null;
}

// Helper: Make API request
async function apiRequest(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ==================== AUTH APIs ====================

export const authAPI = {
  async login(email, password) {
    const result = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // Store session in localStorage
    if (result.data?.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
    }

    return result;
  },

  async signup(email, password, username, isAdmin = false) {
    const result = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, username, isAdmin })
    });

    if (result.data?.session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(result.data.session));
    }

    return result;
  },

  async logout() {
    await apiRequest('/api/auth/logout', {
      method: 'POST'
    });

    localStorage.removeItem('supabase.auth.token');
  },

  async getSession() {
    try {
      return await apiRequest('/api/auth/session');
    } catch (error) {
      console.error('Get session error:', error);
      return { data: { session: null } };
    }
  }
};

// ==================== DATA APIs ====================

export const dataAPI = {
  async loadUserData() {
    const result = await apiRequest('/api/data/load');
    return result.data;
  },

  async saveUserData(updates) {
    return await apiRequest('/api/data/save', {
      method: 'POST',
      body: JSON.stringify(updates)
    });
  }
};

// ==================== Export default ====================

export default {
  auth: authAPI,
  data: dataAPI
};
