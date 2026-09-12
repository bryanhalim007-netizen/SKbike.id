import { createContext, useContext, useState } from "react";
import * as store from "../lib/store";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => store.getUser() || false);

  const login = (email, password) => {
    const res = store.login(email, password);
    if (res.ok) setUser(res.user);
    return res;
  };

  const logout = () => {
    store.logout();
    setUser(false);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
