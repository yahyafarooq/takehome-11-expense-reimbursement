import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../lib/types";

export default function LoginPage() {
  const { token, api, setAuth, message, setMessage } = useAuth();
  const navigate = useNavigate();

  const [authMode, setAuthMode] = useState<"LOGIN" | "REGISTER">("LOGIN");
  const [email, setEmail] = useState("approver@example.com");
  const [password, setPassword] = useState("Password123");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState<Role>("EMPLOYEE");

  useEffect(() => {
    if (token) {
      navigate("/", { replace: true });
    }
  }, [token, navigate]);

  function fillDemoPreset(presetRole: Role) {
    if (presetRole === "EMPLOYEE") {
      setEmail("employee@example.com");
      setPassword("Password123");
    } else {
      setEmail("approver@example.com");
      setPassword("Password123");
    }
    setAuthMode("LOGIN");
  }

  async function login() {
    try {
      const response = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      setAuth(response.data.token, response.data.user.role as Role);
      setMessage("Login successful");
      navigate("/");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Login failed");
    }
  }

  async function registerUserAccount() {
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim()) {
      setMessage("Please fill in all registration fields");
      return;
    }
    try {
      await api.post("/auth/register", {
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
        role: regRole,
      });
      setMessage("Registration successful! Signing in...");
      const loginRes = await api.post("/auth/login", {
        email: regEmail.trim(),
        password: regPassword.trim(),
      });
      setAuth(loginRes.data.token, loginRes.data.user.role as Role);
      navigate("/");
    } catch (error: any) {
      setMessage(error.response?.data?.message || "Registration failed");
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Expense Reimbursement</h1>
        <p>Sign in or create an account to continue</p>

        <div className="tab-group">
          <button
            className={authMode === "LOGIN" ? "active" : ""}
            onClick={() => setAuthMode("LOGIN")}
          >
            Sign In
          </button>
          <button
            className={authMode === "REGISTER" ? "active" : ""}
            onClick={() => setAuthMode("REGISTER")}
          >
            Sign Up
          </button>
        </div>

        {authMode === "LOGIN" ? (
          <>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button onClick={login}>Sign In</button>
          </>
        ) : (
          <>
            <input
              placeholder="Full Name"
              value={regName}
              onChange={(e) => setRegName(e.target.value)}
            />
            <input
              placeholder="Email Address"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
            />
            <select
              value={regRole}
              onChange={(e) => setRegRole(e.target.value as Role)}
            >
              <option value="EMPLOYEE">Employee</option>
              <option value="APPROVER">Approver</option>
            </select>
            <button onClick={registerUserAccount}>Create Account</button>
          </>
        )}

        {message && <p className="message">{message}</p>}

        <div className="demo-presets">
          <small>Demo Quick Fill:</small>
          <div>
            <button onClick={() => fillDemoPreset("EMPLOYEE")}>
              Employee Demo
            </button>
            <button onClick={() => fillDemoPreset("APPROVER")}>
              Approver Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
