import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function isAdminEmail(email) {
  return false; // فعلاً Admin نداریم
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('authToken'));

  // Check if user is logged in
  useEffect(() => {
    async function verifyToken() {
      const storedToken = localStorage.getItem('authToken');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser({
            uid: data.user.id.toString(),
            name: data.user.name,
            email: data.user.email,
            isAdmin: data.user.isAdmin || false
          });
          setToken(storedToken);
        } else {
          // Token invalid
          localStorage.removeItem('authToken');
          setToken(null);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        localStorage.removeItem('authToken');
        setToken(null);
        setCurrentUser(null);
      }

      setLoading(false);
    }

    verifyToken();
  }, []);

  // Login function
  async function login(email, password) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Save token
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setCurrentUser({
        uid: data.user.id.toString(),
        name: data.user.name,
        email: data.user.email,
        isAdmin: data.user.isAdmin || false
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Register function
  async function register(name, email, password, inviteCode) {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, inviteCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Save token
      localStorage.setItem('authToken', data.token);
      setToken(data.token);
      setCurrentUser({
        uid: data.user.id.toString(),
        name: data.user.name,
        email: data.user.email,
        isAdmin: data.user.isAdmin || false
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Logout function
  function logout() {
    localStorage.removeItem('authToken');
    setToken(null);
    setCurrentUser(null);
  }

  const value = {
    currentUser,
    token,
    loading,
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
