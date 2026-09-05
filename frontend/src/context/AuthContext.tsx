import { createContext, useContext, useState, useMemo, type ReactNode } from "react";
import axios from "axios";
import type { Role } from "../lib/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface AuthContextType {
  token: string;
  role: Role;
  api: ReturnType<typeof axios.create>;
  message: string;
  setMessage: (msg: string) => void;
  setAuth: (token: string, role: Role) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [role, setRole] = useState<Role>(
    (localStorage.getItem("role") as Role) || "EMPLOYEE"
  );
  const [message, setMessage] = useState("");

  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API_BASE });

    instance.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          localStorage.removeItem("token");
          localStorage.removeItem("role");
          setToken("");
          setMessage("Session expired. Please sign in again.");
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }, [token]);

  function setAuth(newToken: string, newRole: Role) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("role", newRole);
    setToken(newToken);
    setRole(newRole);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken("");
    setMessage("");
  }

  return (
    <AuthContext.Provider
      value={{ token, role, api, message, setMessage, setAuth, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
