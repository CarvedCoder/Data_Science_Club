import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, User } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { events as eventsApi } from '../../services/api';

export const Calendar = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);

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

  const getStatusColor = (event) => {
    if (event.attended) return 'border-green-500 bg-green-500/10';
    if (event.status === 'completed') return 'border-red-500 bg-red-500/10';
    if (event.status === 'cancelled') return 'border-gray-500 bg-gray-500/10';
    return 'border-blue-500 bg-blue-500/10';
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold mb-2">Event Calendar</h1>
        <p className="text-gray-400">View all events and your attendance</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {events.map((event) => (
            <motion.div
              key={event.id}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedEvent(event)}
              className="cursor-pointer"
            >
              <GlassCard className={`border-l-4 ${getStatusColor(event)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={16} />
                        {new Date(event.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock size={16} />
                        {new Date(event.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {event.instructor && (
                        <div className="flex items-center gap-1">
                          <User size={16} />
                          {event.instructor}
                        </div>
                      )}
                    </div>
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
                    ) : event.status === 'cancelled' ? (
                      <span className="px-3 py-1 bg-gray-500/20 text-gray-400 rounded-full text-sm">
                        Cancelled
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm">
                        Upcoming
                      </span>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {selectedEvent && (
          <div>
            <GlassCard>
              <h3 className="text-xl font-semibold mb-4">Event Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400">Title</p>
                  <p className="font-semibold">{selectedEvent.title}</p>
                </div>
                {selectedEvent.description && (
                  <div>
                    <p className="text-sm text-gray-400">Description</p>
                    <p>{selectedEvent.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-400">Date & Time</p>
                  <p className="font-semibold">
                    {new Date(selectedEvent.date).toLocaleString()}
                  </p>
                </div>
                {selectedEvent.what_was_taught && (
                  <div>
                    <p className="text-sm text-gray-400">What Was Taught</p>
                    <p>{selectedEvent.what_was_taught}</p>
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};