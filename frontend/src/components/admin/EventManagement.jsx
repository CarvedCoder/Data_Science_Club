import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Edit, 
  Trash2, 
  QrCode, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  X,
  Search,
  Filter,
  ChevronDown,
  Users,
  CheckCircle,
  AlertCircle,
  CheckSquare,
  RotateCcw
} from 'lucide-react';
import { Button } from '../common/Button';
import { events as eventsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    instructor: '',
    event_type: 'Lecture',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getAll();
      // API returns { events: [...] }
      const eventsData = response.data?.events || response.data || [];
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (error) {
      console.error('Failed to load events:', error);
      // Mock data for demo
      setEvents([
        { id: 1, title: 'Machine Learning Workshop', description: 'Intro to ML algorithms', date: '2026-01-28', time: '10:00', location: 'Room 301', instructor: 'Dr. Smith', status: 'scheduled', event_type: 'Workshop', attendee_count: 0 },
        { id: 2, title: 'Python for Data Science', description: 'Advanced Python techniques', date: '2026-01-25', time: '14:00', location: 'Lab 2', instructor: 'Prof. Johnson', status: 'completed', event_type: 'Lecture', attendee_count: 32 },
        { id: 3, title: 'Neural Networks Deep Dive', description: 'Understanding neural network architectures', date: '2026-02-01', time: '11:00', location: 'Auditorium', instructor: 'Dr. Chen', status: 'scheduled', event_type: 'Workshop', attendee_count: 0 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const eventData = {
        ...formData,
        scheduled_at: `${formData.date}T${formData.time || '00:00'}:00`,
      };
      
      if (editingEvent) {
        await eventsApi.update(editingEvent.id, eventData);
        setSuccess('Event updated successfully!');
      } else {
        await eventsApi.create(eventData);
        setSuccess('Event created successfully!');
      }
      
      setShowModal(false);
      setEditingEvent(null);
      setFormData({ title: '', description: '', date: '', time: '', location: '', instructor: '', event_type: 'Lecture' });
      await loadEvents();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to save event:', error);
      setError(error.response?.data?.detail || 'Failed to save event');
    }
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title || '',
      description: event.description || '',
      date: event.date || event.scheduled_at?.split('T')[0] || '',
      time: event.time || event.scheduled_at?.split('T')[1]?.substring(0, 5) || '',
      location: event.location || '',
      instructor: event.instructor || '',
      event_type: event.event_type || 'Lecture',
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        setSuccess('Event deleted successfully!');
        await loadEvents();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Failed to delete event:', error);
        setError('Failed to delete event');
      }
    }
  };

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({ title: '', description: '', date: '', time: '', location: '', instructor: '', event_type: 'Lecture' });
    setShowModal(true);
  };

  // Helper to calculate event status from date or use backend status
  const getEventStatus = (event) => {
    // If backend provides a status, use it
    if (event.status) return event.status;
    
    // Fallback to calculating from date
    const eventDate = new Date(event.date || event.scheduled_at);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
    
    if (eventDay < today) return 'completed';
    if (eventDay.getTime() === today.getTime()) return 'active';
    return 'scheduled';
  };

  // Mark event as completed
  const handleMarkComplete = async (id) => {
    try {
      await eventsApi.markComplete(id);
      setSuccess('Event marked as completed!');
      await loadEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to mark event as complete:', error);
      setError('Failed to update event status');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Revert event to scheduled
  const handleRevertToScheduled = async (id) => {
    try {
      await eventsApi.markScheduled(id);
      setSuccess('Event reverted to scheduled!');
      await loadEvents();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Failed to revert event:', error);
      setError('Failed to update event status');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Filter events
  const filteredEvents = events
    .filter(event => {
      const eventStatus = getEventStatus(event);
      if (statusFilter !== 'all' && eventStatus !== statusFilter) return false;
      if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => new Date(b.date || b.scheduled_at) - new Date(a.date || a.scheduled_at));

  const getStatusStyle = (status) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'completed': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getEventTypeStyle = (type) => {
    switch (type) {
      case 'Workshop': return 'bg-purple-500/20 text-purple-400';
      case 'Lecture': return 'bg-blue-500/20 text-blue-400';
      case 'Hackathon': return 'bg-orange-500/20 text-orange-400';
      case 'Meetup': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading events...</p>
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
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-500/20 rounded-lg">
                <Calendar className="w-6 h-6 text-indigo-400" />
              </div>
              <h1 className="text-3xl font-bold text-white">Event Management</h1>
            </div>
            <p className="text-slate-400 ml-12">Create, manage, and track club events</p>
          </div>
          <Button onClick={openCreateModal} icon={Plus} size="lg">
            Create Event
          </Button>
        </div>
      </motion.div>

      {/* Success/Error Messages */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center gap-3"
          >
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-400">{success}</span>
          </motion.div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Upcoming</p>
              <p className="text-2xl font-bold text-white">{events.filter(e => e.status === 'scheduled').length}</p>
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
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Completed</p>
              <p className="text-2xl font-bold text-white">{events.filter(e => e.status === 'completed').length}</p>
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
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Attendees</p>
              <p className="text-2xl font-bold text-white">{events.reduce((sum, e) => sum + (e.attendee_count || 0), 0)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center"
          >
            <Calendar className="w-12 h-12 mx-auto mb-4 text-slate-500" />
            <h3 className="text-lg font-semibold text-white mb-2">No events found</h3>
            <p className="text-slate-400 mb-4">
              {searchQuery ? 'Try adjusting your search query' : 'Create your first event to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateModal} icon={Plus}>
                Create Event
              </Button>
            )}
          </motion.div>
        ) : (
          filteredEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getEventTypeStyle(event.event_type)}`}>
                      {event.event_type || 'Event'}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(getEventStatus(event))}`}>
                      {getEventStatus(event)}
                    </span>
                  </div>
                  
                  {event.description && (
                    <p className="text-slate-400 text-sm mb-3">{event.description}</p>
                  )}
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(event.date || event.scheduled_at)}</span>
                    </div>
                    {(event.time || event.scheduled_at) && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span>{event.time || event.scheduled_at?.split('T')[1]?.substring(0, 5)}</span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4" />
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.instructor && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        <span>{event.instructor}</span>
                      </div>
                    )}
                    {event.attendee_count > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4" />
                        <span>{event.attendee_count} attendees</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  {getEventStatus(event) !== 'completed' ? (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => navigate(`/admin/qr/${event.id}`)}
                        icon={QrCode}
                      >
                        Start Session
                      </Button>
                      <button
                        onClick={() => handleMarkComplete(event.id)}
                        className="p-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 hover:text-emerald-300 transition-all"
                        title="Mark as completed"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleRevertToScheduled(event.id)}
                      className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-blue-400 hover:text-blue-300 transition-all"
                      title="Revert to scheduled"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(event)}
                    className="p-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-slate-400 hover:text-white transition-all"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 bg-slate-700/50 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
              
              {/* Modal Body */}
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Event Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Machine Learning Workshop"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    rows="3"
                    placeholder="Brief description of the event..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Date *</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Time</label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., Room 301"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Event Type</label>
                    <select
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Lecture">Lecture</option>
                      <option value="Workshop">Workshop</option>
                      <option value="Hackathon">Hackathon</option>
                      <option value="Meetup">Meetup</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Instructor / Host</label>
                  <input
                    type="text"
                    value={formData.instructor}
                    onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., Dr. Smith"
                  />
                </div>
                
                {/* Modal Footer */}
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1" icon={editingEvent ? Edit : Plus}>
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};