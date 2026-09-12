import { createContext, useContext, useEffect, useState } from "react";
import { api, formatApiErrorDetail } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking
  const [token, setToken] = useState(localStorage.getItem("velox_token") || null);

  useEffect(() => {
    const check = async () => {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const { data } = await api.get("/auth/me", { headers });
        setUser(data);
      } catch {
        setUser(false);
      }
    };
    check();
  }, [token]);

  const login = async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      if (data.token) {
        localStorage.setItem("velox_token", data.token);
        setToken(data.token);
      }
      setUser(data);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: formatApiErrorDetail(e.response?.data?.detail) || e.message };
    }
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("velox_token");
    setToken(null);
    setUser(false);
  };

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  return (
    <AuthContext.Provider value={{ user, token, login, logout, authHeaders }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
