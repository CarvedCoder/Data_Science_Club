import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Dashboard as MemberDashboard } from './components/member/Dashboard';
import { Calendar } from './components/member/Calendar';
import { EventCalendar } from './components/member/EventCalendar';
import { Profile } from './components/member/Profile';
import { AttendanceHistory } from './components/member/AttendanceHistory';
import { Resources } from './components/member/Resources';
import { ScanQR } from './components/member/ScanQR';
import { AdminDashboard } from './components/admin/Dashboard';
import { PendingRequests } from './components/admin/PendingRequests';
import { MemberManagement } from './components/admin/MemberManagement';
import { EventManagement } from './components/admin/EventManagement';
import { QRAttendance } from './components/admin/QRAttendance';
import { ResourceManagement } from './components/admin/ResourceManagement';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading, approvalStatus } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  
  // Normalize role comparison (backend uses ADMIN/STUDENT, frontend uses admin/student)
  const userRole = user.role?.toLowerCase();
  const required = requiredRole?.toLowerCase();
  
  // Map 'student' to 'member' for route matching
  const effectiveRole = userRole === 'student' ? 'member' : userRole;
  
  if (required && effectiveRole !== required) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Member Routes */}
          <Route path="/dashboard" element={<PrivateRoute requiredRole="member"><MemberDashboard /></PrivateRoute>} />
          <Route path="/calendar" element={<PrivateRoute requiredRole="member"><EventCalendar /></PrivateRoute>} />
          <Route path="/scan-qr" element={<PrivateRoute requiredRole="member"><ScanQR /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute requiredRole="member"><AttendanceHistory /></PrivateRoute>} />
          <Route path="/resources" element={<PrivateRoute requiredRole="member"><Resources /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute requiredRole="member"><Profile /></PrivateRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/events" element={<PrivateRoute requiredRole="admin"><EventManagement /></PrivateRoute>} />
          <Route path="/admin/members" element={<PrivateRoute requiredRole="admin"><MemberManagement /></PrivateRoute>} />
          <Route path="/admin/pending" element={<PrivateRoute requiredRole="admin"><PendingRequests /></PrivateRoute>} />
          <Route path="/admin/resources" element={<PrivateRoute requiredRole="admin"><ResourceManagement /></PrivateRoute>} />
          <Route path="/admin/qr/:eventId" element={<PrivateRoute requiredRole="admin"><QRAttendance /></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requiredRole="admin"><div className="p-8">Settings (Coming Soon)</div></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;