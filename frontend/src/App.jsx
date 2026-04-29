import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPortal from './pages/LoginPortal/LoginPortal';
import AdminDashboard from './pages/AdminDashboard/AdminDashboard';
import HodDashboard from './pages/HodDashboard/HodDashboard';
import FacultyDashboard from './pages/FacultyDashboard/FacultyDashboard';
import StudentDashboard from './pages/StudentDashboard/StudentDashboard';

function ProtectedRoute({ children, allowedRole }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (allowedRole && user.role !== allowedRole) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to={`/${user.role}`} replace /> : <LoginPortal />}
      />

      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/hod/*"
        element={
          <ProtectedRoute allowedRole="hod">
            <HodDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/faculty/*"
        element={
          <ProtectedRoute allowedRole="faculty">
            <FacultyDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/student/*"
        element={
          <ProtectedRoute allowedRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;