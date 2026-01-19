import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, Bell, TrendingUp } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { StatCard } from '../common/StatCard';
import { Button } from '../common/Button';
import { admin } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await admin.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">Manage your club activities</p>
      </motion.div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            icon={Users}
            label="Total Members"
            value={stats.total_members}
            color="text-blue-400"
          />
          <StatCard
            icon={Bell}
            label="Pending Requests"
            value={stats.pending_users}
            color="text-yellow-400"
          />
          <StatCard
            icon={Calendar}
            label="Total Events"
            value={stats.total_events}
            color="text-purple-400"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GlassCard hover onClick={() => navigate('/admin/events')} className="cursor-pointer">
          <h3 className="text-xl font-semibold mb-2">Event Management</h3>
          <p className="text-gray-400 mb-4">Create and manage events, start attendance sessions</p>
          <Button>Manage Events</Button>
        </GlassCard>

        <GlassCard hover onClick={() => navigate('/admin/pending')} className="cursor-pointer">
          <h3 className="text-xl font-semibold mb-2">Pending Approvals</h3>
          <p className="text-gray-400 mb-4">Review and approve new member registrations</p>
          <Button>View Requests</Button>
        </GlassCard>

        <GlassCard hover onClick={() => navigate('/admin/members')} className="cursor-pointer">
          <h3 className="text-xl font-semibold mb-2">Member Management</h3>
          <p className="text-gray-400 mb-4">View member details and attendance records</p>
          <Button>View Members</Button>
        </GlassCard>
      </div>
    </div>
  );
};