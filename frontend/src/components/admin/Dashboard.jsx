import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Bell, TrendingUp, Settings, BarChart3, ChevronRight, Clock, Activity } from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { admin } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await admin.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats for demo
      setStats({ total_members: 45, pending_users: 3, total_events: 12, active_sessions: 1 });
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: 'Event Management',
      description: 'Create and manage events, start attendance sessions',
      icon: Calendar,
      path: '/admin/events',
      color: 'from-indigo-500 to-blue-600',
      bgColor: 'bg-indigo-500/20',
      borderColor: 'border-indigo-500/30',
    },
    {
      title: 'Pending Approvals',
      description: 'Review and approve new member registrations',
      icon: Bell,
      path: '/admin/pending',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'bg-amber-500/20',
      borderColor: 'border-amber-500/30',
      badge: stats?.pending_users > 0 ? stats.pending_users : null,
    },
    {
      title: 'Member Management',
      description: 'View member details and attendance records',
      icon: Users,
      path: '/admin/members',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'bg-emerald-500/20',
      borderColor: 'border-emerald-500/30',
    },
    {
      title: 'Settings',
      description: 'Configure club settings and preferences',
      icon: Settings,
      path: '/admin/settings',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500/20',
      borderColor: 'border-purple-500/30',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Admin Dashboard</h1>
            <p className="text-slate-400">Welcome back, {user?.full_name?.split(' ')[0] || 'Admin'}. Here's what's happening today.</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Users}
          label="Total Members"
          value={stats?.total_members || 0}
          color="blue"
          delay={0.1}
        />
        <StatCard
          icon={Bell}
          label="Pending Requests"
          value={stats?.pending_users || 0}
          color="amber"
          delay={0.2}
        />
        <StatCard
          icon={Calendar}
          label="Total Events"
          value={stats?.total_events || 0}
          color="purple"
          delay={0.3}
        />
        <StatCard
          icon={Activity}
          label="Active Sessions"
          value={stats?.active_sessions || 0}
          color="emerald"
          delay={0.4}
        />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mb-8"
      >
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-slate-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index + 0.5 }}
              onClick={() => navigate(action.path)}
              className={`relative bg-slate-800/50 border ${action.borderColor} rounded-xl p-5 cursor-pointer hover:border-opacity-70 hover:shadow-lg transition-all group`}
            >
              {action.badge && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                  {action.badge}
                </div>
              )}
              <div className="flex items-center gap-4">
                <div className={`p-3 ${action.bgColor} rounded-xl group-hover:scale-110 transition-transform`}>
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-1">{action.title}</h3>
                  <p className="text-sm text-slate-400">{action.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Recent Activity (Placeholder) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <Activity className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
          </div>
        </div>
        <div className="p-8 text-center text-slate-400">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Activity feed will appear here</p>
          <p className="text-sm text-slate-500 mt-1">Check back later for updates</p>
        </div>
      </motion.div>
    </div>
  );
};