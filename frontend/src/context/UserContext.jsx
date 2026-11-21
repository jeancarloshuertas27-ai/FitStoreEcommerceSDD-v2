import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const UserContext = createContext();

const SESSION_KEY = 'fitstore_customer_session';

export function UserProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Restaurar sesión real solo si el usuario ya inició sesión previamente
  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) {
          if (mounted) setLoading(false);
          return;
        }
        const parsed = JSON.parse(raw);
        if (!parsed?.id) {
          localStorage.removeItem(SESSION_KEY);
          if (mounted) setLoading(false);
          return;
        }

        const freshUser = await api.getUserById(parsed.id);
        if (mounted && freshUser && freshUser.role === 'client') {
          setCurrentUser(freshUser);
          localStorage.setItem(SESSION_KEY, JSON.stringify(freshUser));
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      } catch {
        localStorage.removeItem(SESSION_KEY);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email, password) => {
    setError(null);
    const res = await api.loginClient({ email, password });
    const user = res.user || res;
    setCurrentUser(user);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  };

  const register = async (newUserData) => {
    setError(null);
    const res = await api.registerClient(newUserData);
    const created = res.user || res;
    setCurrentUser(created);
    localStorage.setItem(SESSION_KEY, JSON.stringify(created));
    return created;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  const updateCurrentUser = async (userData) => {
    if (!currentUser) return null;
    const updated = await api.updateUser(currentUser.id, userData);
    setCurrentUser(updated);
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        loading,
        error,
        login,
        register,
        logout,
        updateCurrentUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe ser usado dentro de un UserProvider');
  }
  return context;
}

export default UserContext;
