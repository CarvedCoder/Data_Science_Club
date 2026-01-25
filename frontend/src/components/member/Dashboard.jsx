import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, TrendingUp, QrCode, Clock, ChevronRight, BarChart3, Sparkles } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { attendance, events as eventsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, sessionRes, eventsRes] = await Promise.all([
        attendance.getStats(),
        attendance.getActiveSession(),
        eventsApi.getAll(),
      ]);
      setStats(statsRes.data);
      setActiveSession(sessionRes.data);
      setRecentEvents(eventsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set default stats for demo
      setStats({ total_events: 12, attended: 10, percentage: 83 });
    } finally {
      setLoading(false);
    }
  };

  const handleScanQR = () => {
    navigate('/scan-qr');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

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
            <h1 className="text-3xl font-bold text-white mb-1">
              {getGreeting()}, {user?.full_name?.split(' ')[0] || 'Member'}! 👋
            </h1>
            <p className="text-slate-400">Here's your attendance overview and upcoming events</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <Clock className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Events"
          value={stats?.total_events || 0}
          color="blue"
          delay={0.1}
        />
        <StatCard
          icon={CheckCircle}
          label="Classes Attended"
          value={stats?.attended || 0}
          color="emerald"
          delay={0.2}
        />
        <StatCard
          icon={TrendingUp}
          label="Attendance Rate"
          value={`${stats?.percentage || 0}%`}
          subValue={stats?.percentage >= 80 ? 'Excellent' : stats?.percentage >= 60 ? 'Good' : 'Needs Improvement'}
          color="purple"
          delay={0.3}
        />
      </div>

      {/* Active Session Alert */}
      {activeSession?.active && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8"
        >
          <div className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <QrCode className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">Active Session</h3>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-medium">
                      Live Now
                    </span>
                  </div>
                  <p className="text-slate-300">{activeSession.event?.title || 'Attendance session in progress'}</p>
                </div>
              </div>
              <Button onClick={handleScanQR} variant="success" icon={QrCode}>
                Mark Attendance
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
      >
        <div
          onClick={() => navigate('/scan-qr')}
          className="bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-xl p-5 cursor-pointer hover:border-indigo-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/20 rounded-xl group-hover:bg-indigo-500/30 transition-colors">
              <QrCode className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Scan QR Code</h3>
              <p className="text-sm text-slate-400">Mark your attendance for events</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
          </div>
        </div>

        <div
          onClick={() => navigate('/calendar')}
          className="bg-gradient-to-br from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-5 cursor-pointer hover:border-purple-500/50 transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/20 rounded-xl group-hover:bg-purple-500/30 transition-colors">
              <Calendar className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">View Calendar</h3>
              <p className="text-sm text-slate-400">See upcoming events and classes</p>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-purple-400 transition-colors" />
          </div>
        </div>
      </motion.div>

      {/* Recent Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
      >
        <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">Recent Events</h3>
          </div>
          <button 
            onClick={() => navigate('/attendance')}
            className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View All →
          </button>
        </div>
        
        <div className="divide-y divide-slate-700/50">
          {recentEvents.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events yet</p>
            </div>
          ) : (
            recentEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center text-sm font-medium text-slate-300">
                      {new Date(event.date || event.event_date).getDate()}
                    </div>
                    <div>
                      <h4 className="font-medium text-white">{event.title}</h4>
                      <p className="text-sm text-slate-400">
                        {formatDate(event.date || event.event_date)}
                      </p>
                    </div>
                  </div>
                  <div>
                    {event.attended ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Attended
                      </span>
                    ) : event.status === 'completed' ? (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                        Missed
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>

      {/* Motivation Card */}
      {stats?.percentage >= 80 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-400">Outstanding Attendance!</h3>
              <p className="text-amber-300/70 text-sm">
                You're maintaining an excellent attendance rate. Keep up the great work!
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};