import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const UserContext = createContext();

const ACTIVE_USER_KEY = 'fitstore_active_user_id';

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getUsers();
      setUsers(data);

      const savedUserId = localStorage.getItem(ACTIVE_USER_KEY);
      const targetId = savedUserId ? parseInt(savedUserId, 10) : 2; // Cliente demo 1 por defecto (Carlos Mendoza)
      
      const found = data.find((u) => u.id === targetId) || data.find((u) => u.role === 'client') || data[0];
      setCurrentUser(found);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const switchUser = (userId) => {
    const user = users.find((u) => u.id === parseInt(userId, 10));
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(ACTIVE_USER_KEY, user.id.toString());
    }
  };

  const updateCurrentUser = async (userData) => {
    if (!currentUser) return;
    const updated = await api.updateUser(currentUser.id, userData);
    setCurrentUser(updated);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    return updated;
  };

  const registerUser = async (newUserData) => {
    const created = await api.createUser(newUserData);
    setUsers((prev) => [...prev, created]);
    setCurrentUser(created);
    localStorage.setItem(ACTIVE_USER_KEY, created.id.toString());
    return created;
  };

  return (
    <UserContext.Provider
      value={{
        users,
        currentUser,
        loading,
        error,
        switchUser,
        updateCurrentUser,
        registerUser,
        refreshUsers: loadUsers,
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

