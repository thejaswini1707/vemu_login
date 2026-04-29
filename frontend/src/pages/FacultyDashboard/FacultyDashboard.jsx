import { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { announcementsAPI, attendanceAPI, usersAPI } from '../../services/api';
import { YEARS, SECTIONS, formatYear } from '../../data/sampleData';

const NAV_ITEMS = [
  { path: '/faculty', label: 'Overview', icon: '📊', end: true },
  { path: '/faculty/students', label: 'Manage Students', icon: '👥' },
  { path: '/faculty/attendance', label: 'Mark Attendance', icon: '📅' },
  { path: '/faculty/records', label: 'Records', icon: '📋' },
  { path: '/faculty/announcements', label: 'Announcements', icon: '📢' }
];

function FacultyDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const branch = user?.branch || '';

  const loadData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [studentsRes, announcementsRes, summaryRes] = await Promise.all([
        usersAPI.list({ role: 'student', branch }),
        announcementsAPI.list({ role: 'faculty', branch }),
        attendanceAPI.summary({ branch, date: today })
      ]);

      setStudents(studentsRes.users || []);
      setAnnouncements(announcementsRes.announcements || []);
      setSummary(summaryRes || { total: 0, present: 0, absent: 0, percentage: 0 });
    } catch (error) {
      showToast(error.message || 'Failed to load faculty dashboard', 'error');
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
    <DashboardLayout title="Faculty Hub" icon="📚" navItems={NAV_ITEMS} accentColor="#22c55e">
      {loading ? (
        <div className="loading-box">Loading faculty dashboard...</div>
      ) : (
        <Routes>
          <Route index element={<FacultyHome students={students} summary={summary} branch={branch} />} />
          <Route path="students" element={<ManageStudents students={students} onSaved={loadData} branch={branch} />} />
          <Route path="attendance" element={<MarkAttendance students={students} onSaved={loadData} branch={branch} />} />
          <Route path="records" element={<StudentRecords students={students} branch={branch} />} />
          <Route path="announcements" element={<Announcements announcements={announcements} onSaved={loadData} branch={branch} />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

function FacultyHome({ students, summary, branch }) {
  const navigate = useNavigate();

  const active = students.filter((student) => student.status === 'Active').length;
  const blocked = students.filter((student) => student.status === 'Blocked').length;

  return (
    <div className="fade-in">
      <div className="welcome-banner" style={{ borderLeftColor: '#22c55e' }}>
        <h3>👋 Welcome, Faculty</h3>
        <p>Branch: <strong>{branch || 'All'}</strong>. Manage student attendance using backend-connected records.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Total Students</div><div className="stat-number">{students.length}</div></div>
        <div className="stat-card"><div className="stat-title">Active Students</div><div className="stat-number" style={{ color: '#16a34a' }}>{active}</div></div>
        <div className="stat-card"><div className="stat-title">Blocked</div><div className="stat-number" style={{ color: '#ef4444' }}>{blocked}</div></div>
        <div className="stat-card"><div className="stat-title">Today %</div><div className="stat-number" style={{ color: '#2563eb' }}>{summary.percentage || 0}%</div></div>
      </div>

      <div className="card-panel">
        <h2>⚡ Quick Actions</h2>
        <div className="action-group">
          <button className="btn btn-primary" onClick={() => navigate('/faculty/students')}>➕ Add Student</button>
          <button className="btn btn-success" onClick={() => navigate('/faculty/attendance')}>📅 Mark Attendance</button>
          <button className="btn btn-secondary" onClick={() => navigate('/faculty/records')}>📋 View Records</button>
        </div>
      </div>
    </div>
  );
}

function ManageStudents({ students, onSaved, branch }) {
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

  const [filters, setFilters] = useState({ year: 'all', section: 'all', search: '' });
  const [saving, setSaving] = useState(false);

  const filteredStudents = useMemo(() => {
    const term = filters.search.toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        (student.displayName || '').toLowerCase().includes(term) ||
        (student.username || '').toLowerCase().includes(term) ||
        (student.rollNumber || '').toLowerCase().includes(term);

      const matchesYear = filters.year === 'all' || student.year === filters.year;
      const matchesSection = filters.section === 'all' || student.section === filters.section;

      return matchesSearch && matchesYear && matchesSection;
    });
  }, [students, filters]);

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addStudent = async () => {
    if (!form.displayName.trim() || !form.username.trim() || !form.rollNumber.trim()) {
      showToast('Name, username and roll number are required', 'error');
      return;
    }

    if (!form.password || form.password.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
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

  const toggleBlockStudent = async (student) => {
    const nextStatus = student.status === 'Active' ? 'Blocked' : 'Active';

    try {
      await usersAPI.updateStatus(student.id, nextStatus, user);
      showToast(`Student ${nextStatus === 'Blocked' ? 'blocked' : 'unblocked'}`, 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Status update failed', 'error');
    }
  };

  const removeStudent = async (student) => {
    if (!window.confirm(`Remove ${student.displayName || student.username}?`)) return;

    try {
      await usersAPI.remove(student.id, user);
      showToast('Student removed', 'success');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Remove failed', 'error');
    }
  };

  const resetPassword = async (student) => {
    const newPassword = window.prompt(`Enter new password for ${student.username}`);

    if (!newPassword) return;

    if (newPassword.length < 4) {
      showToast('Password must be at least 4 characters', 'error');
      return;
    }

    try {
      await usersAPI.resetPassword(student.id, newPassword, user);
      showToast('Password reset successfully', 'success');
    } catch (error) {
      showToast(error.message || 'Password reset failed', 'error');
    }
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">👥 Manage Students</h2>

      <div className="card-panel">
        <h2>➕ Add New Student</h2>

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
            <label>Password *</label>
            <input className="form-input" value={form.password} onChange={(e) => updateForm('password', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year *</label>
            <select className="form-select" value={form.year} onChange={(e) => updateForm('year', e.target.value)}>
              {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Section *</label>
            <select className="form-select" value={form.section} onChange={(e) => updateForm('section', e.target.value)}>
              {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>
        </div>

        <button className="btn btn-primary" disabled={saving} onClick={addStudent}>
          {saving ? 'Adding...' : '➕ Add Student'}
        </button>
      </div>

      <div className="card-panel">
        <h2>📋 Student List</h2>

        <div className="filter-bar">
          <input
            className="form-input"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            placeholder="Search name, username, roll..."
          />

          <select className="form-select" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="all">All Years</option>
            {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
          </select>

          <select className="form-select" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
            <option value="all">All Sections</option>
            {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={onSaved}>↻ Refresh</button>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Username</th><th>Roll No</th><th>Year</th><th>Section</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No students found</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td><strong>{student.displayName || student.username}</strong></td>
                  <td>{student.username}</td>
                  <td>{student.rollNumber}</td>
                  <td>{formatYear(student.year)}</td>
                  <td>{student.section}</td>
                  <td><span className={`badge ${student.status === 'Active' ? 'badge-active' : 'badge-blocked'}`}>{student.status}</span></td>
                  <td>
                    <div className="action-group">
                      <button className={`btn btn-sm ${student.status === 'Active' ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleBlockStudent(student)}>
                        {student.status === 'Active' ? '🚫 Block' : '🔓 Unblock'}
                      </button>
                      <button className="btn btn-sm btn-secondary" onClick={() => resetPassword(student)}>🔑 Reset</button>
                      <button className="btn btn-sm btn-danger" onClick={() => removeStudent(student)}>🗑 Remove</button>
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

function MarkAttendance({ students, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filters, setFilters] = useState({ year: 'all', section: 'all', rollNo: '' });
  const [attendanceMap, setAttendanceMap] = useState({});

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesYear = filters.year === 'all' || student.year === filters.year;
      const matchesSection = filters.section === 'all' || student.section === filters.section;
      const matchesRoll = !filters.rollNo || (student.rollNumber || '').toLowerCase().includes(filters.rollNo.toLowerCase());
      return matchesYear && matchesSection && matchesRoll && student.status === 'Active';
    });
  }, [students, filters]);

  const loadAttendance = useCallback(async () => {
    try {
      const res = await attendanceAPI.list({ date: selectedDate, branch });
      const map = {};

      (res.records || []).forEach((record) => {
        map[record.student] = record.status;
      });

      setAttendanceMap(map);
    } catch (error) {
      showToast(error.message || 'Failed to load attendance', 'error');
    }
  }, [selectedDate, branch, showToast]);

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
    if (filteredStudents.length === 0) {
      showToast('No active students found', 'error');
      return;
    }

    try {
      await attendanceAPI.mark({
        date: selectedDate,
        records: filteredStudents.map((student) => ({
          studentId: student.id,
          status: attendanceMap[student.id] || 'absent'
        })),
        markedBy: user
      });

      showToast('Attendance saved successfully', 'success');
      onSaved();
      loadAttendance();
    } catch (error) {
      showToast(error.message || 'Failed to save attendance', 'error');
    }
  };

  const present = filteredStudents.filter((student) => attendanceMap[student.id] === 'present').length;

  return (
    <div className="fade-in">
      <h2 className="page-title">📅 Mark Attendance</h2>

      <div className="card-panel">
        <h2>🔍 Filters</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Date</label>
            <input className="form-input" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Year</label>
            <select className="form-select" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
              <option value="all">All Years</option>
              {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Section</label>
            <select className="form-select" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
              <option value="all">All Sections</option>
              {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Roll Number</label>
            <input className="form-input" value={filters.rollNo} onChange={(e) => setFilters({ ...filters, rollNo: e.target.value })} placeholder="Search roll" />
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
        <h2>👥 Attendance Sheet</h2>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="info-chip">Total: {filteredStudents.length}</span>
          <span className="info-chip">Present: {present}</span>
          <span className="info-chip">Absent: {filteredStudents.length - present}</span>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Roll</th><th>Name</th><th>Year</th><th>Section</th><th>Attendance</th><th>Actions</th></tr>
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
                    <td><span className={`badge ${status === 'present' ? 'badge-present' : 'badge-absent'}`}>{status === 'present' ? '✅ Present' : '❌ Absent'}</span></td>
                    <td>
                      <div className="attendance-buttons">
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

function StudentRecords({ students, branch }) {
  const { showToast } = useToast();

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [filters, setFilters] = useState({ year: 'all', section: 'all' });

  const loadRecords = useCallback(async () => {
    try {
      const [recordsRes, summaryRes] = await Promise.all([
        attendanceAPI.list({ date, branch, year: filters.year, section: filters.section }),
        attendanceAPI.summary({ date, branch, year: filters.year, section: filters.section })
      ]);

      setRecords(recordsRes.records || []);
      setSummary(summaryRes || { total: 0, present: 0, absent: 0, percentage: 0 });
    } catch (error) {
      showToast(error.message || 'Failed to load records', 'error');
    }
  }, [date, branch, filters, showToast]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const downloadCSV = () => {
    const rows = [
      ['Date', 'Roll Number', 'Student Name', 'Branch', 'Year', 'Section', 'Status'],
      ...records.map((record) => [
        record.date,
        record.rollNumber,
        record.studentName,
        record.branch,
        record.year,
        record.section,
        record.status
      ])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `attendance_${date}.csv`;
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">📋 Student Records</h2>

      <div className="card-panel">
        <h2>🔍 Filter Records</h2>

        <div className="filter-bar">
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

          <select className="form-select" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })}>
            <option value="all">All Years</option>
            {YEARS.map((year) => <option key={year} value={year}>{formatYear(year)}</option>)}
          </select>

          <select className="form-select" value={filters.section} onChange={(e) => setFilters({ ...filters, section: e.target.value })}>
            <option value="all">All Sections</option>
            {SECTIONS.map((section) => <option key={section} value={section}>{section}</option>)}
          </select>

          <button className="btn btn-secondary" onClick={loadRecords}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={downloadCSV}>⬇️ Download CSV</button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Total Marked</div><div className="stat-number">{summary.total}</div></div>
        <div className="stat-card"><div className="stat-title">Present</div><div className="stat-number" style={{ color: '#16a34a' }}>{summary.present}</div></div>
        <div className="stat-card"><div className="stat-title">Absent</div><div className="stat-number" style={{ color: '#f59e0b' }}>{summary.absent}</div></div>
        <div className="stat-card"><div className="stat-title">Percentage</div><div className="stat-number">{summary.percentage}%</div></div>
      </div>

      <div className="card-panel">
        <h2>📄 Attendance Records</h2>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Roll</th><th>Name</th><th>Year</th><th>Section</th><th>Status</th><th>Marked By</th></tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr><td colSpan="7" className="empty-state">No attendance records for selected date</td></tr>
              ) : records.map((record) => (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>{record.rollNumber}</td>
                  <td><strong>{record.studentName}</strong></td>
                  <td>{formatYear(record.year)}</td>
                  <td>{record.section}</td>
                  <td><span className={`badge ${record.status === 'present' ? 'badge-present' : 'badge-absent'}`}>{record.status}</span></td>
                  <td>{record.markedByName || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {students.length === 0 && (
        <div className="card-panel">
          <div className="empty-state">No students are available in your branch yet.</div>
        </div>
      )}
    </div>
  );
}

function Announcements({ announcements, onSaved, branch }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('General');

  const publish = async () => {
    if (!title.trim()) {
      showToast('Title is required', 'error');
      return;
    }

    try {
      await announcementsAPI.create({
        title: title.trim(),
        description,
        type,
        targetRoles: ['student'],
        branch,
        createdBy: user
      });

      showToast('Announcement sent to students', 'success');
      setTitle('');
      setDescription('');
      setType('General');
      onSaved();
    } catch (error) {
      showToast(error.message || 'Announcement failed', 'error');
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
        <h2>📤 Send Announcement to Students</h2>

        <div className="form-grid">
          <div className="form-group">
            <label>Type</label>
            <select className="form-select" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="General">General</option>
              <option value="Assignment">Assignment</option>
              <option value="Exam">Exam</option>
              <option value="Notice">Notice</option>
              <option value="Event">Event</option>
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Title *</label>
            <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        <button className="btn btn-primary" onClick={publish}>📤 Publish</button>
      </div>

      <div className="card-panel">
        <h2>📌 Announcements</h2>

        {announcements.length === 0 ? (
          <div className="empty-state">No announcements found</div>
        ) : announcements.map((announcement) => (
          <div className="notice-card" key={announcement._id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <strong>[{announcement.type}] {announcement.title}</strong>
                <div className="notice-meta">{new Date(announcement.createdAt).toLocaleString()}</div>
                {announcement.description && <p style={{ marginTop: 8 }}>{announcement.description}</p>}
              </div>

              {announcement.createdByRole === 'faculty' && (
                <button className="btn btn-sm btn-danger" onClick={() => remove(announcement)}>🗑 Delete</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FacultyDashboard;