import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, CheckCircle, BookOpen, User, Users, Settings, LogOut, Bell, History, BarChart3, QrCode } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const memberLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/attendance', icon: History, label: 'Attendance' },
    { to: '/resources', icon: BookOpen, label: 'Resources' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: BarChart3, label: 'Dashboard' },
    { to: '/admin/events', icon: Calendar, label: 'Events' },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/pending', icon: Bell, label: 'Pending Requests' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  // Handle both uppercase (from DB) and lowercase role values
  const userRole = user?.role?.toLowerCase();
  const links = userRole === 'admin' ? adminLinks : memberLinks;

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      className="w-64 h-screen bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 flex flex-col"
    >
      {/* Logo Area */}
      <div className="p-6 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              DS Club
            </h1>
            <p className="text-xs text-slate-500">Data Science Portal</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.full_name?.charAt(0) || user?.name?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || user?.name || 'User'}
            </p>
            <p className="text-xs text-slate-400 capitalize">
              {userRole === 'admin' ? 'Administrator' : 'Member'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {userRole === 'admin' ? 'Admin Menu' : 'Main Menu'}
        </p>
        {links.map((link, index) => (
          <motion.div
            key={link.to}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <NavLink
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-white'
                }`
              }
            >
              <link.icon className="w-5 h-5" />
              <span>{link.label}</span>
            </NavLink>
          </motion.div>
        ))}

        {/* Quick Actions for Members */}
        {userRole !== 'admin' && (
          <>
            <p className="px-3 py-2 mt-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quick Actions
            </p>
            <NavLink
              to="/scan-qr"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm font-medium ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25'
                    : 'text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30'
                }`
              }
            >
              <QrCode className="w-5 h-5" />
              <span>Scan QR Code</span>
            </NavLink>
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-700/50">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all text-sm font-medium"
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </button>
      </div>
    </motion.div>
  );
};