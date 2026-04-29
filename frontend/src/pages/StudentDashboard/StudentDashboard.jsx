import { useCallback, useEffect, useMemo, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../../components/DashboardLayout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { announcementsAPI, attendanceAPI } from '../../services/api';
import { formatYear } from '../../data/sampleData';

const NAV_ITEMS = [
  { path: '/student', label: 'Overview', icon: '📊', end: true },
  { path: '/student/attendance', label: 'Attendance', icon: '📅' },
  { path: '/student/announcements', label: 'Announcements', icon: '📢' },
  { path: '/student/profile', label: 'Profile', icon: '👤' }
];

function StudentDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState({ total: 0, present: 0, absent: 0, percentage: 0 });
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [attendanceRes, summaryRes, announcementRes] = await Promise.all([
        attendanceAPI.list({ studentId: user.id }),
        attendanceAPI.summary({ studentId: user.id }),
        announcementsAPI.list({ role: 'student', branch: user.branch })
      ]);

      setAttendanceRecords(attendanceRes.records || []);
      setSummary(summaryRes || { total: 0, present: 0, absent: 0, percentage: 0 });
      setAnnouncements(announcementRes.announcements || []);
    } catch (error) {
      showToast(error.message || 'Failed to load student dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    loadData();
    const id = setInterval(loadData, 6000);
    return () => clearInterval(id);
  }, [loadData]);

  return (
    <DashboardLayout title="Student Central" icon="📖" navItems={NAV_ITEMS} accentColor="#a855f7">
      {loading ? (
        <div className="loading-box">Loading student dashboard...</div>
      ) : (
        <Routes>
          <Route index element={<StudentHome summary={summary} announcements={announcements} records={attendanceRecords} />} />
          <Route path="attendance" element={<Attendance records={attendanceRecords} summary={summary} onRefresh={loadData} />} />
          <Route path="announcements" element={<Announcements announcements={announcements} onRefresh={loadData} />} />
          <Route path="profile" element={<Profile />} />
        </Routes>
      )}
    </DashboardLayout>
  );
}

function StudentHome({ summary, announcements, records }) {
  const latestRecord = records[0];

  return (
    <div className="fade-in">
      <div className="welcome-banner" style={{ borderLeftColor: '#a855f7' }}>
        <h3>👋 Welcome, Student</h3>
        <p>Track your attendance and read latest announcements from HOD and faculty.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Total Marked</div><div className="stat-number">{summary.total || 0}</div></div>
        <div className="stat-card"><div className="stat-title">Present</div><div className="stat-number" style={{ color: '#16a34a' }}>{summary.present || 0}</div></div>
        <div className="stat-card"><div className="stat-title">Absent</div><div className="stat-number" style={{ color: '#f59e0b' }}>{summary.absent || 0}</div></div>
        <div className="stat-card"><div className="stat-title">Attendance %</div><div className="stat-number" style={{ color: '#8b5cf6' }}>{summary.percentage || 0}%</div></div>
      </div>

      <div className="card-panel">
        <h2>📌 Latest Update</h2>

        {latestRecord ? (
          <div className="notice-card">
            <strong>{latestRecord.date}</strong>
            <p style={{ marginTop: 8 }}>
              Your attendance was marked as{' '}
              <span className={`badge ${latestRecord.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                {latestRecord.status}
              </span>
            </p>
          </div>
        ) : (
          <div className="empty-state">No attendance has been marked yet.</div>
        )}
      </div>

      <div className="card-panel">
        <h2>📢 Recent Announcements</h2>

        {announcements.slice(0, 3).length === 0 ? (
          <div className="empty-state">No announcements yet.</div>
        ) : announcements.slice(0, 3).map((announcement) => (
          <div className="notice-card" key={announcement._id}>
            <strong>[{announcement.type}] {announcement.title}</strong>
            <div className="notice-meta">
              {new Date(announcement.createdAt).toLocaleString()} · By {announcement.createdByName || 'System'}
            </div>
            {announcement.description && <p style={{ marginTop: 8 }}>{announcement.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Attendance({ records, summary, onRefresh }) {
  const [dateFilter, setDateFilter] = useState('');

  const filtered = useMemo(() => {
    if (!dateFilter) return records;
    return records.filter((record) => record.date === dateFilter);
  }, [records, dateFilter]);

  const downloadCSV = () => {
    const rows = [
      ['Date', 'Status', 'Branch', 'Year', 'Section', 'Marked By'],
      ...filtered.map((record) => [
        record.date,
        record.status,
        record.branch,
        record.year,
        record.section,
        record.markedByName
      ])
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = 'my_attendance.csv';
    a.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-in">
      <h2 className="page-title">📅 My Attendance</h2>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-title">Total</div><div className="stat-number">{summary.total}</div></div>
        <div className="stat-card"><div className="stat-title">Present</div><div className="stat-number" style={{ color: '#16a34a' }}>{summary.present}</div></div>
        <div className="stat-card"><div className="stat-title">Absent</div><div className="stat-number" style={{ color: '#f59e0b' }}>{summary.absent}</div></div>
        <div className="stat-card"><div className="stat-title">Percentage</div><div className="stat-number">{summary.percentage}%</div></div>
      </div>

      <div className="card-panel">
        <h2>🔍 Filter & Download</h2>

        <div className="filter-bar">
          <input className="form-input" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => setDateFilter('')}>Clear</button>
          <button className="btn btn-secondary" onClick={onRefresh}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={downloadCSV}>⬇️ Download CSV</button>
        </div>
      </div>

      <div className="card-panel">
        <h2>📄 Attendance Records</h2>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Date</th><th>Status</th><th>Branch</th><th>Year</th><th>Section</th><th>Marked By</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="empty-state">No attendance records found</td></tr>
              ) : filtered.map((record) => (
                <tr key={record._id}>
                  <td>{record.date}</td>
                  <td>
                    <span className={`badge ${record.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                      {record.status === 'present' ? '✅ Present' : '❌ Absent'}
                    </span>
                  </td>
                  <td>{record.branch}</td>
                  <td>{formatYear(record.year)}</td>
                  <td>{record.section}</td>
                  <td>{record.markedByName || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Announcements({ announcements, onRefresh }) {
  return (
    <div className="fade-in">
      <h2 className="page-title">📢 Announcements</h2>

      <div className="card-panel">
        <div className="action-group" style={{ marginBottom: 16 }}>
          <button className="btn btn-secondary" onClick={onRefresh}>↻ Refresh</button>
        </div>

        {announcements.length === 0 ? (
          <div className="empty-state">No announcements found</div>
        ) : announcements.map((announcement) => (
          <div className="notice-card" key={announcement._id}>
            <strong>[{announcement.type}] {announcement.title}</strong>
            <div className="notice-meta">
              {new Date(announcement.createdAt).toLocaleString()} · By {announcement.createdByName || 'System'} ({announcement.createdByRole || 'admin'})
            </div>
            {announcement.description && <p style={{ marginTop: 8 }}>{announcement.description}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

function Profile() {
  const { user } = useAuth();

  return (
    <div className="fade-in">
      <h2 className="page-title">👤 My Profile</h2>

      <div className="card-panel">
        <h2>Student Details</h2>

        <div className="table-wrapper">
          <table className="data-table">
            <tbody>
              <tr><th>Name</th><td>{user?.displayName || user?.username}</td></tr>
              <tr><th>Username</th><td>{user?.username}</td></tr>
              <tr><th>Email</th><td>{user?.email || 'N/A'}</td></tr>
              <tr><th>Branch</th><td>{user?.branch || 'N/A'}</td></tr>
              <tr><th>Year</th><td>{formatYear(user?.year)}</td></tr>
              <tr><th>Section</th><td>{user?.section || 'N/A'}</td></tr>
              <tr><th>Roll Number</th><td>{user?.rollNumber || 'N/A'}</td></tr>
              <tr><th>Status</th><td><span className="badge badge-active">{user?.status || 'Active'}</span></td></tr>
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 16, color: 'var(--text-secondary)' }}>
          For password reset or profile correction, contact Admin/HOD.
        </p>
      </div>
    </div>
  );
}

export default StudentDashboard;