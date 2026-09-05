import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { role, logout, message, setMessage } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="brand-icon">💼</span>
          <h2>ExpenseFlow</h2>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            <span className="nav-icon">📊</span>
            Dashboard
          </NavLink>

          {role === "APPROVER" && (
            <>
              <NavLink
                to="/search"
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <span className="nav-icon">🔍</span>
                Review & Bulk
              </NavLink>
              <NavLink
                to="/analytics"
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                <span className="nav-icon">📈</span>
                Analytics
              </NavLink>
            </>
          )}

          {role === "EMPLOYEE" && (
            <NavLink
              to="/archived"
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              <span className="nav-icon">📦</span>
              Archived
            </NavLink>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <span className="user-avatar">{role === "APPROVER" ? "👑" : "👤"}</span>
            <span className="role-tag">{role}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">
            Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        {message && (
          <div className="message-bar" onClick={() => setMessage("")}>
            <span>{message}</span>
            <span className="msg-close">✕</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
