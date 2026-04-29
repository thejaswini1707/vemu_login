import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import './DashboardLayout.css';

function DashboardLayout({ children, title, icon, navItems, accentColor }) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (!window.confirm('Logout from the portal?')) return;

    logout();
    showToast('Logged out successfully', 'success');
    navigate('/');
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar" style={{ '--accent': accentColor || '#3b82f6' }}>
        <div className="sidebar-brand">
          <span className="brand-icon">{icon}</span>
          <div>
            <h2>{title}</h2>
            <p>Live Campus Portal</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <span className="user-avatar">
              {(user?.displayName || user?.username || '?')[0]?.toUpperCase()}
            </span>
            <div>
              <div className="user-name">{user?.displayName || user?.username || 'User'}</div>
              <div className="user-role">
                {user?.role?.toUpperCase()} {user?.branch ? `· ${user.branch}` : ''}
              </div>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            🚪 Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="top-status-bar">
          <div>
            <strong>{title}</strong>
            <span> · Backend connected dashboard</span>
          </div>
          <span className="live-pill">● Live</span>
        </div>

        {children}
      </main>
    </div>
  );
}

export default DashboardLayout;