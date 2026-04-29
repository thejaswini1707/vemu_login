import { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { announcementsAPI, attendanceAPI, auditAPI, usersAPI } from '../../services/api';
import { BRANCHES, YEARS, SECTIONS, formatYear, roleLabel } from '../../data/sampleData';

const NAV_ITEMS = [
  { path: '/hod', label: 'Overview', icon: '📊', end: true },
  { path: '/hod/faculty', label: 'Faculty', icon: '👩‍🏫' },
  { path: '/hod/students', label: 'Students', icon: '🎓' },
  { path: '/hod/attendance', label: 'Attendance', icon: '📅' },
  { path: '/hod/announcements', label: 'Announcements', icon: '📢' },
  { path: '/hod/activity', label: 'Activity Log', icon: '📜' }
];

function HodDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [faculty, setFaculty] = useState([]);
  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const branch = user?.branch || '';

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [facultyRes, studentsRes, announcementsRes, logsRes, summaryRes] = await Promise.all([
        usersAPI.list({ role: 'faculty', branch }),
        usersAPI.list({ role: 'student', branch }),
        announcementsAPI.list({ role: 'hod', branch }),
        auditAPI.list(80),
        attendanceAPI.summary({ branch, date: today })
      ]);

      setFaculty(facultyRes.users || []);
      setStudents(studentsRes.users || []);
      setAnnouncements(announcementsRes.announcements || []);
      setLogs(logsRes.logs || []);
      setSummary(summaryRes || { total: 0, present: 0, absent: 0, percentage: 0 });
    } catch (error) {
      showToast(error.message || 'Failed to load HOD dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [branch, showToast]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 6000);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <DashboardLayout title="HOD Center" icon="🎓" navItems={NAV_ITEMS} accentColor="#1e3a8a">
      {loading ? (
        <div className="loading-box">Loading HOD dashboard...</div>
      ) : (
        <Routes>
          <Route index element={<HodHome faculty={faculty} students={students} summary={summary} branch={branch} />} />
          <Route path="faculty" element={<FacultySection faculty={faculty} onSaved={loadData} branch={branch} />} />
          <Route path="students" element={<StudentSection students={students} onSaved={loadData} branch={branch} />} />
          <Route path="attendance" element={<AttendanceSection students={students} onSaved={loadData} branch={branch} />} />
          <Route path="announcements" element={<AnnouncementsSection announcements={announcements} onSaved={loadData} branch={branch} />} />
          <Route path="activity" element={<ActivitySection logs={logs} onRefresh={loadData} />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

function HodHome({ faculty, students, summary, branch }) {
  const activeStudents = students.filter((s) => s.status === 'Active').length;
  const blockedStudents = students.filter((s) => s.status === 'Blocked').length;

  return (
    <div className="fade-in">
      <div className="welcome-banner" style={{ borderLeftColor: '#1e3a8a' }}>
        <h3>👋 Welcome, HOD</h3>
        <p>Branch: <strong>{branch || 'All'}</strong>. Manage faculty, students, attendance and announcements with live backend data.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Faculty</div><div className="stat-number">{faculty.length}</div></div>
        <div className="stat-card"><div className="stat-title">Students</div><div className="stat-number" style={{ color: '#2563eb' }}>{students.length}</div></div>
        <div className="stat-card"><div className="stat-title">Active Students</div><div className="stat-number" style={{ color: '#16a34a' }}>{activeStudents}</div></div>
        <div className="stat-card"><div className="stat-title">Blocked</div><div className="stat-number" style={{ color: '#ef4444' }}>{blockedStudents}</div></div>
      </div>

      <div className="card-panel">
        <h2>📅 Today's Attendance Summary</h2>
        <div className="stats-grid" style={{ marginBottom: 0 }}>
          <div className="stat-card"><div className="stat-title">Marked Records</div><div className="stat-number">{summary.total || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Present</div><div className="stat-number" style={{ color: '#16a34a' }}>{summary.present || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Absent</div><div className="stat-number" style={{ color: '#f59e0b' }}>{summary.absent || 0}</div></div>
          <div className="stat-card"><div className="stat-title">Percentage</div><div className="stat-number">{summary.percentage || 0}%</div></div>
        </div>
      </div>
    </div>
  );
}

function FacultySection({ faculty, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Faculty@123');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return faculty.filter((item) =>
      (item.displayName || '').toLowerCase().includes(term) ||
      (item.username || '').toLowerCase().includes(term) ||
      (item.email || '').toLowerCase().includes(term)
    );
  }, [faculty, search]);

  const addFaculty = async () => {
    if (!username.trim() || !displayName.trim() || !password.trim()) {
      showToast('Faculty name, username and password are required', 'error');
      return;
    }

    setSaving(true);

    try {
      await usersAPI.create({
        role: 'faculty',
        username: username.trim(),
        displayName: displayName.trim(),
        email,
        password,
        branch,
        actor: user
      });

      showToast('Faculty added and login enabled', 'success');
      setDisplayName('');
      setUsername('');
      setEmail('');
      setPassword('Faculty@123');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Failed to add faculty', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (item) => {
    const nextStatus = item.status === 'Active' ? 'Blocked' : 'Active';

    try {
      await usersAPI.updateStatus(item.id, nextStatus, user);
      showToast(`Faculty ${nextStatus === 'Blocked' ? 'blocked' : 'unblocked'}`, 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Status update failed', 'error');
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete faculty ${item.displayName || item.username}?`)) return;

    try {
      await usersAPI.remove(item.id, user);
      showToast('Faculty deleted', 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Delete failed', 'error');
    }
  };

  const resetPassword = async (item) => {
    const newPassword = window.prompt(`New password for ${item.username}`);

    if (!newPassword) return;

    if (newPassword.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    try {
      await usersAPI.resetPassword(item.id, newPassword, user);
      showToast('Faculty password reset', 'success');
    } catch (error) {
      showToast(error.message || 'Password reset failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">👩‍🏫 Faculty Management</h2>
      <p className="page-subtitle">Add, block, delete and reset faculty accounts for your branch.</p>

      <div className="card-panel">
        <h2>➕ Add Faculty</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input className="form-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Faculty name" />
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input className="form-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="login username" />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="faculty@college.edu" />
          </div>

          <div className="form-group">
            <label>Password *</label>
            <input className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={addFaculty} disabled={saving}>
          {saving ? 'Adding...' : '➕ Add Faculty'}
        </button>
      </div>

      <div className="card-panel">
        <h2>📋 Faculty Directory</h2>

        <div className="filter-bar">
          <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search faculty..." />
          <button className="btn btn-secondary btn-sm" onClick={onSaved}>↻ Refresh</button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Email</th><th>Branch</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No faculty found</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.displayName || item.username}</strong></td>
                  <td>{item.username}</td>
                  <td>{item.email || 'N/A'}</td>
                  <td>{item.branch || branch}</td>
                  <td><span className={`badge ${item.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>{item.status}</span></td>
                  <td>
                    <div className="action-group">
                      <button className={`btn btn-sm ${item.status === 'Active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(item)}>
                        {item.status === 'Active' ? '🚫 Block' : '🔓 Unblock'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(item)}>🔑 Reset</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(item)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StudentSection({ students, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    displayName: '',
    username: '',
    email: '',
    password: 'student@123',
    year: '1',
    section: 'A',
    rollNumber: ''
  });

  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('all');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        (student.displayName || '').toLowerCase().includes(term) ||
        (student.username || '').toLowerCase().includes(term) ||
        (student.rollNumber || '').toLowerCase().includes(term);

      const matchesYear = yearFilter === 'all' || student.year === yearFilter;
      const matchesSection = sectionFilter === 'all' || student.section === sectionFilter;

      return matchesSearch && matchesYear && matchesSection;
    });
  }, [students, search, yearFilter, sectionFilter]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addStudent = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.rollNumber.trim()) {
      showToast('Name, username and roll number are required', 'error');
      return;
    }

    setSaving(true);

    try {
      await usersAPI.create({
        role: 'student',
        displayName: form.displayName.trim(),
        username: form.username.trim(),
        email: form.email,
        password: form.password,
        branch,
        year: form.year,
        section: form.section,
        rollNumber: form.rollNumber.trim(),
        actor: user
      });

      showToast('Student added and login enabled', 'success');
      setForm({
        displayName: '',
        username: '',
        email: '',
        password: 'student@123',
        year: '1',
        section: 'A',
        rollNumber: ''
      });
      onSaved();
    } catch (error) {
      showToast(error.message || 'Failed to add student', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (student) => {
    const nextStatus = student.status === 'Active' ? 'Blocked' : 'Active';

    try {
      await usersAPI.updateStatus(student.id, nextStatus, user);
      showToast(`Student ${nextStatus === 'Blocked' ? 'blocked' : 'unblocked'}`, 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Status update failed', 'error');
    }
  };

  const remove = async (student) => {
    if (!window.confirm(`Delete student ${student.displayName || student.username}?`)) return;

    try {
      await usersAPI.remove(student.id, user);
      showToast('Student deleted', 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">🎓 Student Management</h2>

      <div className="card-panel">
        <h2>➕ Enroll Student</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Full Name *</label>
            <input className="form-input" value={form.displayName} onChange={(e) => updateForm('displayName', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Username *</label>
            <input className="form-input" value={form.username} onChange={(e) => updateForm('username', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Roll Number *</label>
            <input className="form-input" value={form.rollNumber} onChange={(e) => updateForm('rollNumber', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input className="form-input" type="email" value={form.email} onChange={(e) => updateForm('email', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="form-input" value={form.password} onChange={(e) => updateForm('password', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year</label>
            <select className="form-select" value={form.year} onChange={(e) => updateForm('year', e.target.value)}>
              {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select className="form-select" value={form.section} onChange={(e) => updateForm('section', e.target.value)}>
              {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" disabled={saving} onClick={addStudent}>
          {saving ? 'Saving...' : '🎓 Enroll Student'}
        </button>
      </div>

      <div className="card-panel">
        <h2>📋 Student Directory</h2>

        <div className="filter-bar">
          <input className="form-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, username, roll..." />

          <select className="form-select" value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
          </select>

          <select className="form-select" value={sectionFilter} onChange={(e) => setSectionFilter(e.target.value)}>
            <option value="all">All Sections</option>
            {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={onSaved}>↻ Refresh</button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Roll</th><th>Year</th><th>Section</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No students found</td></tr>
              ) : filtered.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.displayName || student.username}</strong></td>
                  <td>{student.username}</td>
                  <td>{student.rollNumber || 'N/A'}</td>
                  <td>{formatYear(student.year)}</td>
                  <td>{student.section || 'N/A'}</td>
                  <td><span className={`badge ${student.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>{student.status}</span></td>
                  <td>
                    <div className="action-group">
                      <button className={`btn btn-sm ${student.status === 'Active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(student)}>
                        {student.status === 'Active' ? '🚫 Block' : '🔓 Unblock'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(student)}>🗑 Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AttendanceSection({ students, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [year, setYear] = useState('all');
  const [section, setSection] = useState('all');
  const [rollSearch, setRollSearch] = useState('');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [loadingRecords, setLoadingRecords] = useState(false);

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesYear = year === 'all' || student.year === year;
      const matchesSection = section === 'all' || student.section === section;
      const matchesRoll = !rollSearch || (student.rollNumber || '').toLowerCase().includes(rollSearch.toLowerCase());
      return matchesYear && matchesSection && matchesRoll && student.status === 'Active';
    });
  }, [students, year, section, rollSearch]);

  const loadAttendance = useCallback(async () => {
    if (!date) return;

    setLoadingRecords(true);

    try {
      const res = await attendanceAPI.list({ date, branch });
      const map = {};

      (res.records || []).forEach((record) => {
        map[record.student] = record.status;
      });

      setAttendanceMap(map);
    } catch (error) {
      showToast(error.message || 'Failed to load attendance', 'error');
    } finally {
      setLoadingRecords(false);
    }
  }, [date, branch, showToast]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const setStatus = (studentId, status) => {
    setAttendanceMap((prev) => ({ ...prev, [studentId]: status }));
  };

  const markAll = (status) => {
    const next = { ...attendanceMap };
    filteredStudents.forEach((student) => {
      next[student.id] = status;
    });
    setAttendanceMap(next);
  };

  const saveAttendance = async () => {
    if (!date) {
      showToast('Select date first', 'error');
      return;
    }

    if (filteredStudents.length === 0) {
      showToast('No active students found for selected filters', 'error');
      return;
    }

    const records = filteredStudents.map((student) => ({
      studentId: student.id,
      status: attendanceMap[student.id] || 'absent'
    }));

    try {
      await attendanceAPI.mark({
        date,
        records,
        markedBy: user
      });

      showToast('Attendance saved to backend', 'success');
      onSaved();
      loadAttendance();
    } catch (error) {
      showToast(error.message || 'Attendance save failed', 'error');
    }
  };

  const presentCount = filteredStudents.filter((student) => attendanceMap[student.id] === 'present').length;

  return (
    <div className="fade-in">
      <h2 className="page-title">📅 Mark Attendance</h2>

      <div className="card-panel">
        <h2>🔍 Select Date & Filters</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Date</label>
            <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year</label>
            <select className="form-select" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="all">All Years</option>
              {YEARS.map((item) => <option key={item} value={item}>{formatYear(item)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select className="form-select" value={section} onChange={(e) => setSection(e.target.value)}>
              <option value="all">All Sections</option>
              {SECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Roll Number</label>
            <input className="form-input" value={rollSearch} onChange={(e) => setRollSearch(e.target.value)} placeholder="Search roll" />
          </div>
        </div>

        <div className="action-group">
          <button className="btn btn-success" onClick={() => markAll('present')}>✅ Mark All Present</button>
          <button className="btn btn-warning" onClick={() => markAll('absent')}>❌ Mark All Absent</button>
          <button className="btn btn-secondary" onClick={loadAttendance}>↻ Reload</button>
          <button className="btn btn-primary" onClick={saveAttendance}>💾 Save Attendance</button>
        </div>
      </div>

      <div className="card-panel">
        <h2>👥 Students Attendance</h2>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="info-chip">📌 Total: {filteredStudents.length}</span>
          <span className="info-chip">✅ Present: {presentCount}</span>
          <span className="info-chip">❌ Absent: {filteredStudents.length - presentCount}</span>
          {loadingRecords && <span className="info-chip">Loading saved attendance...</span>}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Roll</th><th>Name</th><th>Year</th><th>Section</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No active students found</td></tr>
              ) : filteredStudents.map((student) => {
                const status = attendanceMap[student.id] || 'absent';

                return (
                  <tr key={student.id}>
                    <td>{student.rollNumber}</td>
                    <td><strong>{student.displayName || student.username}</strong></td>
                    <td>{formatYear(student.year)}</td>
                    <td>{student.section}</td>
                    <td>
                      <span className={`badge ${status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                        {status === 'present' ? '✅ Present' : '❌ Absent'}
                      </span>
                    </td>
                    <td>
                      <div className="action-group">
                        <button className="btn btn-sm btn-success" onClick={() => setStatus(student.id, 'present')}>Present</button>
                        <button className="btn btn-sm btn-warning" onClick={() => setStatus(student.id, 'absent')}>Absent</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AnnouncementsSection({ announcements, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [type, setType] = useState('General');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('student');

  const publish = async () => {
    if (!title.trim()) {
      showToast('Announcement title is required', 'error');
      return;
    }

    try {
      await announcementsAPI.create({
        title: title.trim(),
        description,
        type,
        targetRoles: target === 'all' ? ['student', 'faculty'] : [target],
        branch,
        createdBy: user
      });

      showToast('Announcement published', 'success');
      setTitle('');
      setDescription('');
      setType('General');
      setTarget('student');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Failed to publish announcement', 'error');
    }
  };

  const remove = async (announcement) => {
    if (!window.confirm(`Delete announcement "${announcement.title}"?`)) return;

    try {
      await announcementsAPI.remove(announcement._id, user);
      showToast('Announcement deleted', 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Delete failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">📢 Announcements</h2>

      <div className="card-panel">
        <h2>📤 Publish Announcement</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="General">General</option>
              <option value="Assignment">Assignment</option>
              <option value="Holiday">Holiday</option>
              <option value="Event">Event</option>
              <option value="Exam">Exam</option>
              <option value="Notice">Notice</option>
            </select>
          </div>

          <div className="form-group">
            <label>Target</label>
            <select className="form-select" value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="student">Students</option>
              <option value="faculty">Faculty</option>
              <option value="all">Faculty & Students</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Title *</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." />
          </div>
        </div>

        <button className="btn btn-primary" onClick={publish}>📤 Publish</button>
      </div>

      <div className="card-panel">
        <h2>📌 Published Announcements</h2>

        {announcements.length === 0 ? (
          <div className="empty-state">No announcements found</div>
        ) : announcements.map((announcement) => (
          <div className="notice-card" key={announcement._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>[{announcement.type}] {announcement.title}</strong>
                <div className="notice-meta">
                  {new Date(announcement.createdAt).toLocaleString()} · Target: {announcement.targetRoles?.join(', ')}
                </div>
                {announcement.description && <p style={{ marginTop: 8 }}>{announcement.description}</p>}
              </div>

              <button className="btn btn-sm btn-danger" onClick={() => remove(announcement)}>🗑 Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection({ logs, onRefresh }) {
  return (
    <div className="fade-in">
      <h2 className="page-title">📜 Activity Log</h2>

      <div className="card-panel">
        <div className="action-group" style={{ marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={onRefresh}>↻ Refresh</button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Time</th><th>Actor</th><th>Action</th><th>Message</th></tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="4" className="empty-state">No activity found</td></tr>
              ) : logs.map((log) => (
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
      </div>
    </div>
  );
}

export default HodDashboard;