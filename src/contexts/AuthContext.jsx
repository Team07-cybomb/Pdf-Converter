import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('pdfpro_user');
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, []);

  const loginBackend = (userData, token) => {
    setUser(userData);
    localStorage.setItem('pdfpro_user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pdfpro_user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, loginBackend, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
