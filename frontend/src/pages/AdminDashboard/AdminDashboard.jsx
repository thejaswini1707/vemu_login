import { useEffect, useMemo, useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { usersAPI, auditAPI } from '../../services/api';
import { BRANCHES, YEARS, SECTIONS, formatYear, roleLabel } from '../../data/sampleData';

const NAV_ITEMS = [
  { path: '/admin', label: 'Dashboard', icon: '📊', end: true },
  { path: '/admin/create', label: 'Create Account', icon: '👥' },
  { path: '/admin/directory', label: 'User Directory', icon: '📋' },
  { path: '/admin/settings', label: 'Settings & Logs', icon: '⚙️' }
];

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      const [userRes, statRes, logRes] = await Promise.all([
        usersAPI.list(),
        usersAPI.stats(),
        auditAPI.list(80)
      ]);

      setUsers(userRes.users || []);
      setStats(statRes);
      setLogs(logRes.logs || []);
    } catch (error) {
      showToast(error.message || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 6000);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <DashboardLayout title="Admin Control" icon="👑" navItems={NAV_ITEMS} accentColor="#3b82f6">
      {loading ? (
        <div className="loading-box">Loading admin dashboard...</div>
      ) : (
        <Routes>
          <Route index element={<DashboardHome users={users} stats={stats} />} />
          <Route path="create" element={<CreateAccount onSaved={loadData} existingUsers={users} />} />
          <Route path="directory" element={<UserDirectory users={users} onSaved={loadData} />} />
          <Route path="settings" element={<Settings users={users} logs={logs} onRefresh={loadData} />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

function DashboardHome({ users, stats }) {
  const fallbackStats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'Active').length,
    blocked: users.filter((u) => u.status === 'Blocked').length,
    admins: users.filter((u) => u.role === 'admin').length,
    hods: users.filter((u) => u.role === 'hod').length,
    faculties: users.filter((u) => u.role === 'faculty').length,
    students: users.filter((u) => u.role === 'student').length
  }), [users]);

  const data = stats || fallbackStats;

  return (
    <div className="fade-in">
      <div className="welcome-banner" style={{ borderLeftColor: '#3b82f6' }}>
        <h3>👋 Welcome, Administrator</h3>
        <p>Manage users, reset passwords, block accounts and track system activity from MongoDB.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Total Users</div><div className="stat-number">{data.total}</div></div>
        <div className="stat-card"><div className="stat-title">Active</div><div className="stat-number" style={{ color: '#16a34a' }}>{data.active}</div></div>
        <div className="stat-card"><div className="stat-title">Blocked</div><div className="stat-number" style={{ color: '#ef4444' }}>{data.blocked}</div></div>
        <div className="stat-card"><div className="stat-title">Students</div><div className="stat-number" style={{ color: '#8b5cf6' }}>{data.students}</div></div>
      </div>

      <div className="card-panel">
        <h2>📌 Role Summary</h2>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card"><div className="stat-title">Admins</div><div className="stat-number">{data.admins}</div></div>
          <div className="stat-card"><div className="stat-title">HODs</div><div className="stat-number">{data.hods}</div></div>
          <div className="stat-card"><div className="stat-title">Faculty</div><div className="stat-number">{data.faculties}</div></div>
          <div className="stat-card"><div className="stat-title">Students</div><div className="stat-number">{data.students}</div></div>
        </div>
      </div>
    </div>
  );
}

function CreateAccount({ onSaved, existingUsers }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [role, setRole] = useState('hod');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [branch, setBranch] = useState('CSE');
  const [email, setEmail] = useState('');
  const [year, setYear] = useState('1');
  const [section, setSection] = useState('A');
  const [rollNumber, setRollNumber] = useState('');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setUsername('');
    setDisplayName('');
    setPassword('');
    setEmail('');
    setRollNumber('');
    setYear('1');
    setSection('A');
  };

  const handleCreate = async () => {
    const cleanUsername = username.trim();

    if (!cleanUsername || cleanUsername.length < 2) {
      showToast('Username must be at least 2 characters', 'error');
      return;
    }

    if (!password || password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    if (existingUsers.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.role === role)) {
      showToast('Username already exists for this role', 'error');
      return;
    }

    if (role !== 'admin' && !branch) {
      showToast('Branch is required', 'error');
      return;
    }

    if (role === 'student' && !rollNumber.trim()) {
      showToast('Roll number is required for student', 'error');
      return;
    }

    setSaving(true);

    try {
      await usersAPI.create({
        role,
        username: cleanUsername,
        displayName: displayName.trim() || cleanUsername,
        password,
        email,
        branch: role === 'admin' ? 'Administration' : branch,
        year: role === 'student' ? year : '',
        section: role === 'student' ? section : '',
        rollNumber: role === 'student' ? rollNumber.trim() : '',
        actor: user
      });

      showToast(`${roleLabel(role)} account created and login enabled`, 'success');
      resetForm();
      onSaved();
    } catch (error) {
      showToast(error.message || 'Failed to create user', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">✨ Create Academic Account</h2>
      <p className="page-subtitle">Created users can login immediately from the login page.</p>

      <div className="card-panel">
        <div className="form-grid">
          <div className="form-group">
            <label>Role *</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="hod">HOD</option>
              <option value="faculty">Faculty</option>
              <option value="student">Student</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="login username" />
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="display name" />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minimum 4 characters" />
          </div>

          {role !== 'admin' && (
            <>
              <div className="form-group">
                <label>Branch *</label>
                <select className="form-select" value={branch} onChange={(e) => setBranch(e.target.value)}>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Email</label>
                <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@college.edu" />
              </div>
            </>
          )}

          {role === 'student' && (
            <>
              <div className="form-group">
                <label>Year *</label>
                <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
                  {YEARS.map((y) => <option key={y} value={y}>{formatYear(y)}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Section *</label>
                <select className="form-select" value={section} onChange={(e) => setSection(e.target.value)}>
                  {SECTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Roll Number *</label>
                <input className="form-input" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} placeholder="244M1A0000" />
              </div>
            </>
          )}
        </div>

        <button className="btn btn-primary" disabled={saving} onClick={handleCreate}>
          {saving ? 'Creating...' : '➕ Create Account'}
        </button>
      </div>
    </div>
  );
}

function UserDirectory({ users, onSaved }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return users.filter((u) => {
      const matchesSearch =
        (u.username || '').toLowerCase().includes(term) ||
        (u.displayName || '').toLowerCase().includes(term) ||
        (u.email || '').toLowerCase().includes(term) ||
        (u.branch || '').toLowerCase().includes(term) ||
        (u.rollNumber || '').toLowerCase().includes(term);

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const toggleBlock = async (target) => {
    const nextStatus = target.status === 'Active' ? 'Blocked' : 'Active';

    try {
      await usersAPI.updateStatus(target.id, nextStatus, user);
      showToast(`User ${nextStatus === 'Blocked' ? 'blocked' : 'unblocked'}`, 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Status update failed', 'error');
    }
  };

  const resetPassword = async (target) => {
    const newPassword = window.prompt(`Enter new password for ${target.username}`);

    if (!newPassword) return;

    if (newPassword.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    try {
      await usersAPI.resetPassword(target.id, newPassword, user);
      showToast('Password reset successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Password reset failed', 'error');
    }
  };

  const deleteUser = async (target) => {
    if (!window.confirm(`Delete ${target.username}? This cannot be undone.`)) return;

    try {
      await usersAPI.remove(target.id, user);
      showToast('User deleted successfully', 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Delete failed. Refresh and try again.', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">👥 User Directory</h2>

      <div className="filter-bar">
        <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, branch, roll..." />
        <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hod">HOD</option>
          <option value="faculty">Faculty</option>
          <option value="student">Student</option>
        </select>
        <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="Active">Active</option>
          <option value="Blocked">Blocked</option>
        </select>
        <button className="btn btn-secondary btn-sm" onClick={onSaved}>↻ Refresh</button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Role</th>
              <th>Name</th>
              <th>Username</th>
              <th>Details</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="6" className="empty-state">No users found</td></tr>
            ) : filtered.map((u) => (
              <tr key={u.id}>
                <td><strong>{roleLabel(u.role)}</strong></td>
                <td>{u.displayName || u.username}</td>
                <td>{u.username}</td>
                <td>
                  {u.branch && <span className="info-chip">🏛️ {u.branch}</span>}
                  {u.email && <span className="info-chip">📧 {u.email}</span>}
                  {u.year && <span className="info-chip">📅 {formatYear(u.year)}</span>}
                  {u.section && <span className="info-chip">📘 {u.section}</span>}
                  {u.rollNumber && <span className="info-chip">🔢 {u.rollNumber}</span>}
                </td>
                <td>
                  <span className={`badge ${u.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>
                    {u.status}
                  </span>
                </td>
                <td>
                  <div className="action-group">
                    <button className={`btn btn-sm ${u.status === 'Active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleBlock(u)}>
                      {u.status === 'Active' ? '🚫 Block' : '🔓 Unblock'}
                    </button>
                    <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(u)}>🔑 Reset</button>
                    <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u)}>🗑 Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Settings({ users, logs, onRefresh }) {
  const { showToast } = useToast();

  const downloadCSV = () => {
    const rows = [
      ['Role', 'Display Name', 'Username', 'Email', 'Branch', 'Year', 'Section', 'Roll Number', 'Status'],
      ...users.map((u) => [
        u.role,
        u.displayName,
        u.username,
        u.email,
        u.branch,
        u.year,
        u.section,
        u.rollNumber,
        u.status
      ])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();

    URL.revokeObjectURL(url);
    showToast('Users CSV downloaded', 'success');
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">⚙️ Settings & Audit Logs</h2>

      <div className="card-panel">
        <h2>📁 Data Tools</h2>
        <div className="action-group">
          <button className="btn btn-primary" onClick={downloadCSV}>⬇️ Download Users CSV</button>
          <button className="btn btn-secondary" onClick={onRefresh}>↻ Refresh Backend Data</button>
        </div>
      </div>

      <div className="card-panel">
        <h2>📜 Recent System Activity</h2>
        {logs.length === 0 ? (
          <div className="empty-state">No audit logs found</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td>{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.actorName} ({log.actorRole})</td>
                    <td><span className="info-chip">{log.action}</span></td>
                    <td>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;