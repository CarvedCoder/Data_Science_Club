import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { Login } from './components/auth/Login';
import { Signup } from './components/auth/Signup';
import { Dashboard as MemberDashboard } from './components/member/Dashboard';
import { Calendar } from './components/member/Calendar';
import { ScanQR } from './components/member/ScanQR';
import { AdminDashboard } from './components/admin/Dashboard';
import { PendingRequests } from './components/admin/PendingRequests';
import { MemberManagement } from './components/admin/MemberManagement';
import { EventManagement } from './components/admin/EventManagement';
import { QRAttendance } from './components/admin/QRAttendance';

const PrivateRoute = ({ children, requiredRole }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
  
  if (!user) return <Navigate to="/login" />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/login" />;
  if (user.role === 'pending') return (
    <div className="flex items-center justify-center h-screen text-center p-8">
      <div className="max-w-md">
        <div className="mb-6 text-yellow-400">
          <svg className="w-24 h-24 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-bold mb-4">Account Pending Approval</h2>
        <p className="text-gray-400 mb-4">
          Your account is awaiting admin approval. You'll receive access once an administrator reviews your request.
        </p>
        <p className="text-sm text-gray-500">
          This usually takes 24-48 hours. Thank you for your patience!
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all"
        >
          Back to Login
        </button>
      </div>
    </div>
  );

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
          <Route path="/calendar" element={<PrivateRoute requiredRole="member"><Calendar /></PrivateRoute>} />
          <Route path="/scan-qr" element={<PrivateRoute requiredRole="member"><ScanQR /></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute requiredRole="member"><div className="p-8">Attendance History (Coming Soon)</div></PrivateRoute>} />
          <Route path="/resources" element={<PrivateRoute requiredRole="member"><div className="p-8">Resources (Coming Soon)</div></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute requiredRole="member"><div className="p-8">Profile (Coming Soon)</div></PrivateRoute>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
          <Route path="/admin/events" element={<PrivateRoute requiredRole="admin"><EventManagement /></PrivateRoute>} />
          <Route path="/admin/members" element={<PrivateRoute requiredRole="admin"><MemberManagement /></PrivateRoute>} />
          <Route path="/admin/pending" element={<PrivateRoute requiredRole="admin"><PendingRequests /></PrivateRoute>} />
          <Route path="/admin/qr/:eventId" element={<PrivateRoute requiredRole="admin"><QRAttendance /></PrivateRoute>} />
          <Route path="/admin/settings" element={<PrivateRoute requiredRole="admin"><div className="p-8">Settings (Coming Soon)</div></PrivateRoute>} />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;