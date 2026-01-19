import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, CheckCircle, BookOpen, User, Users, Settings, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();

  const memberLinks = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' },
    { to: '/calendar', icon: Calendar, label: 'Calendar' },
    { to: '/attendance', icon: CheckCircle, label: 'Attendance' },
    { to: '/resources', icon: BookOpen, label: 'Resources' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const adminLinks = [
    { to: '/admin', icon: Home, label: 'Dashboard' },
    { to: '/admin/events', icon: Calendar, label: 'Events' },
    { to: '/admin/members', icon: Users, label: 'Members' },
    { to: '/admin/pending', icon: Bell, label: 'Pending Requests' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  const links = user?.role === 'admin' ? adminLinks : memberLinks;

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: 0 }}
      className="w-64 h-screen glass border-r border-white/20 p-6 flex flex-col"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          DS Club
        </h1>
        <p className="text-sm text-gray-400 mt-1">{user?.name}</p>
      </div>

      <nav className="flex-1 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                  : 'hover:bg-white/10'
              }`
            }
          >
            <link.icon size={20} />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        onClick={logout}
        className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600/20 transition-all text-red-400"
      >
        <LogOut size={20} />
        <span>Logout</span>
      </button>
    </motion.div>
  );
};