import React, { createContext, useContext, useState, useEffect } from 'react';
import { loginTeam, logoutTeam, getMySession } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [team, setTeam] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('teamToken'));
  const [cart, setCart] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Validate session on mount or token change
  useEffect(() => {
    const initAuth = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getMySession(token);
        setTeam(data.team);
      } catch (err) {
        console.error("Session verification failed:", err.message);
        // Clear stale session
        localStorage.removeItem('teamToken');
        setToken(null);
        setTeam(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [token]);

  const login = async (teamName) => {
    setError(null);
    try {
      const data = await loginTeam(teamName);
      localStorage.setItem('teamToken', data.token);
      setToken(data.token);
      setTeam(data.team);
      setCart({}); // Reset cart on login
      return data.team;
    } catch (err) {
      setError(err.message || 'Failed to login');
      throw err;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutTeam(token);
      }
    } catch (err) {
      console.error("Logout request failed:", err.message);
    } finally {
      localStorage.removeItem('teamToken');
      setToken(null);
      setTeam(null);
      setCart({}); // Reset cart on logout
      setError(null);
    }
  };

  const value = {
    team,
    token,
    cart,
    setCart,
    loading,
    error,
    login,
    logout,
    setError
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
