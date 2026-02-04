import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  History, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Award,
  Filter,
  Search,
  ChevronDown,
  BarChart3
} from 'lucide-react';
import { attendance } from '../../services/api';

export const AttendanceHistory = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, present, absent
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, event

  useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const fetchAttendanceHistory = async () => {
    try {
      setLoading(true);
      const response = await attendance.getMyAttendance();
      // Transform API response to match component's expected format
      const attendanceData = response.data?.attendance || [];
      const formattedRecords = attendanceData.map((record, index) => ({
        id: index + 1,
        event_title: record.event?.title || 'Unknown Event',
        event_date: record.event?.scheduled_at || record.marked_at,
        check_in_time: record.marked_at ? new Date(record.marked_at).toLocaleTimeString('en-US', { hour12: false }) : null,
        status: 'present', // All records from my-attendance are attended events
        event_type: record.event?.type || 'Other'
      }));
      setRecords(formattedRecords);
    } catch (err) {
      console.error('Error fetching attendance history:', err);
      setError('Failed to load attendance history');
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const stats = {
    total: records.length,
    present: records.filter(r => r.status === 'present').length,
    absent: records.filter(r => r.status === 'absent').length,
    attendanceRate: records.length > 0 
      ? Math.round((records.filter(r => r.status === 'present').length / records.length) * 100) 
      : 0,
  };

  // Filter and search
  const filteredRecords = records
    .filter(record => {
      if (filter === 'all') return true;
      return record.status === filter;
    })
    .filter(record => {
      if (!searchQuery) return true;
      return record.event_title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.event_date) - new Date(a.event_date);
      }
      return a.event_title.localeCompare(b.event_title);
    });

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getEventTypeBadge = (type) => {
    const styles = {
      'Workshop': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      'Lecture': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      'Hackathon': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      'Meetup': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      'Other': 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };
    return styles[type] || styles['Other'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading attendance history...</p>
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <History className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Attendance History</h1>
        </div>
        <p className="text-slate-400 ml-12">Track your event participation and attendance record</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-700 rounded-lg">
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Events</p>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Present</p>
              <p className="text-2xl font-bold text-emerald-400">{stats.present}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <XCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Absent</p>
              <p className="text-2xl font-bold text-red-400">{stats.absent}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Attendance Rate</p>
              <p className="text-2xl font-bold text-indigo-400">{stats.attendanceRate}%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Attendance Streak */}
      {stats.attendanceRate >= 80 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 mb-8"
        >
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-amber-400" />
            <div>
              <p className="text-amber-400 font-semibold">Great Attendance!</p>
              <p className="text-amber-300/70 text-sm">You have an excellent attendance rate. Keep it up!</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Filters and Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Records</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <ChevronDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="date">Sort by Date</option>
              <option value="event">Sort by Event</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Records Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Event</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Type</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Check-in Time</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                    <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No attendance records found</p>
                    {searchQuery && <p className="text-sm mt-1">Try adjusting your search query</p>}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => (
                  <motion.tr
                    key={record.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-medium text-white">{record.event_title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEventTypeBadge(record.event_type)}`}>
                        {record.event_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {formatDate(record.event_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        {formatTime(record.check_in_time)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {record.status === 'present' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
                          <XCircle className="w-4 h-4" />
                          Absent
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Summary Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-4 text-center text-sm text-slate-400"
      >
        Showing {filteredRecords.length} of {records.length} records
      </motion.div>
    </div>
  );
};
