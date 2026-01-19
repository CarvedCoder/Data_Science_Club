import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle, TrendingUp, QrCode } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { attendance, events as eventsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
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
    }
  };

  const handleScanQR = () => {
    navigate('/scan-qr');
  };

  return (
    <div className="p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2">Welcome Back! 👋</h1>
        <p className="text-gray-400">Here's your attendance overview</p>
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Calendar}
            label="Total Events"
            value={stats.total_events}
            color="text-blue-400"
          />
          <StatCard
            icon={CheckCircle}
            label="Classes Attended"
            value={stats.attended}
            color="text-green-400"
          />
          <StatCard
            icon={TrendingUp}
            label="Attendance Rate"
            value={`${stats.percentage}%`}
            color="text-purple-400"
          />
        </div>
      )}

      {activeSession?.active && (
        <GlassCard>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold mb-2">Active Session</h3>
              <p className="text-gray-400">{activeSession.event.title}</p>
            </div>
            <Button onClick={handleScanQR}>
              <QrCode className="mr-2" size={20} />
              Mark Attendance
            </Button>
          </div>
        </GlassCard>
      )}

      <GlassCard>
        <h3 className="text-xl font-semibold mb-4">Recent Events</h3>
        <div className="space-y-3">
          {recentEvents.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ scale: 1.02 }}
              className="p-4 glass rounded-lg flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold">{event.title}</h4>
                <p className="text-sm text-gray-400">
                  {new Date(event.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                {event.attended ? (
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                    Attended
                  </span>
                ) : event.status === 'completed' ? (
                  <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                    Missed
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                    Upcoming
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};