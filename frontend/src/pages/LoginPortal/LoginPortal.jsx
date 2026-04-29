import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { ROLE_CONFIG, DEMO_HINTS } from '../../data/sampleData';
import './LoginPortal.css';

function LoginPortal() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [liveTime, setLiveTime] = useState('--:--:--');

  useEffect(() => {
    const update = () => {
      setLiveTime(new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'Asia/Kolkata'
      }));
    };

    update();
    const id = setInterval(update, 1000);

    return () => clearInterval(id);
  }, []);

  const roleList = useMemo(() => ['admin', 'hod', 'faculty', 'student'], []);

  const openModal = (role) => {
    setSelectedRole(role);
    setUsername('');
    setPassword('');
    setIsAuthenticating(false);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (isAuthenticating) return;

    setModalOpen(false);
    setSelectedRole(null);
    setUsername('');
    setPassword('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedRole) return;

    if (!username.trim()) {
      showToast('Please enter username', 'error');
      return;
    }

    if (!password) {
      showToast('Please enter password', 'error');
      return;
    }

    setIsAuthenticating(true);
    showToast(`Authenticating as ${selectedRole.toUpperCase()}...`);

    try {
      const loggedUser = await login(selectedRole, username.trim(), password);

      if (rememberMe) {
        localStorage.setItem('vemu_last_role', selectedRole);
      }

      showToast(`Welcome ${loggedUser.displayName || loggedUser.username}`, 'success');

      navigate(`/${loggedUser.role}`, { replace: true });
    } catch (error) {
      showToast(error.message || 'Login failed', 'error');
      setIsAuthenticating(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    showToast('Ask Admin to reset your password from User Directory.', 'info');
  };

  const demoHint = selectedRole ? DEMO_HINTS[selectedRole] : '';

  return (
    <div className="login-portal">
      <div className="orb orb1" />
      <div className="orb orb2" />
      <div className="orb orb3" />

      <div className="main-container slide-down">
        <header className="portal-header">
  <div className="logo-wrapper">
    <div className="logo-text-box">VEMU IT</div>
  </div>

  <h1>VEMU IT · Unified Access Hub</h1>

  <div className="sub">
    🛡️ Secure &amp; Intelligent Portal | Role-based Authentication
  </div>
</header>

        <div className="role-grid">
          {roleList.map((role) => {
            const cfg = ROLE_CONFIG[role];

            return (
              <div
                key={role}
                className="role-card"
                onClick={() => openModal(role)}
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && openModal(role)}
              >
                <div className="avatar">
                  <img src={cfg.image} alt={cfg.name} loading="lazy" />
                </div>
                <h3>{cfg.name}</h3>
                <div className="role-badge">{cfg.icon} {cfg.badge}</div>
                <button
                  type="button"
                  className="login-btn-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModal(role);
                  }}
                >
                  🔑 {cfg.name} Login
                </button>
              </div>
            );
          })}
        </div>

        <div className="live-info">
          <span>🕐 {liveTime} IST</span>
          <span>🟢 Backend Live Ready</span>
          <span>🛡️ Role Access Control</span>
        </div>

        <div className="footer-note">
          VEMU Institute of Technology · Digital Attendance Portal © {new Date().getFullYear()}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="login-modal slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                👤 Login as <span className="role-highlight">{ROLE_CONFIG[selectedRole]?.name}</span>
              </h2>
              <button type="button" className="close-modal" onClick={closeModal}>✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="input-group login-field">
                <label>📧 Username</label>
                <div className="input-wrapper">
                  <span className="input-icon">👤</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={`Enter ${selectedRole} username`}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="input-group login-field">
                <label>🔒 Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔑</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <div className="forgot-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember role</span>
                </label>

                <a href="#" className="forgot-link" onClick={handleForgotPassword}>
                  Forgot password?
                </a>
              </div>

              <button type="submit" className="submit-login" disabled={isAuthenticating}>
                {isAuthenticating ? (
                  <>
                    <span className="spinner-small" /> Authenticating...
                  </>
                ) : (
                  <>➡️ Authenticate & Access</>
                )}
              </button>

              <div className="demo-hint">
                Demo: {demoHint}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default LoginPortal;