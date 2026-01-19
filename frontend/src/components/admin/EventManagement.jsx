import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Edit, Trash2, QrCode } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { events as eventsApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export const EventManagement = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    instructor: '',
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await eventsApi.getAll();
      setEvents(response.data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await eventsApi.create(formData);
      setShowModal(false);
      setFormData({ title: '', description: '', date: '', instructor: '' });
      await loadEvents();
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsApi.delete(id);
        await loadEvents();
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex items-center justify-between"
      >
        <div>
          <h1 className="text-4xl font-bold mb-2">Event Management</h1>
          <p className="text-gray-400">Create and manage events</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2" size={20} />
          Create Event
        </Button>
      </motion.div>

      <div className="space-y-4">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                  <p className="text-gray-400 mb-2">{event.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{new Date(event.date).toLocaleString()}</span>
                    {event.instructor && <span>Instructor: {event.instructor}</span>}
                    <span className={`px-2 py-1 rounded-full ${
                      event.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                      event.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {event.status}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {event.status === 'scheduled' && (
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/admin/qr/${event.id}`)}
                    >
                      <QrCode size={18} className="mr-2" />
                      Start Session
                    </Button>
                  )}
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="p-2 glass rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <GlassCard className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Event</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg glass border border-white/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg glass border border-white/20 outline-none"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date & Time</label>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg glass border border-white/20 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Instructor</label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg glass border border-white/20 outline-none"
                />
              </div>
              <div className="flex gap-3">
                <Button type="submit" className="flex-1">Create Event</Button>
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
};