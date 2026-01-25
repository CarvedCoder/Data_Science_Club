import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, MapPin, Users, X, BookOpen, Presentation
} from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { events as eventsApi, member } from '../../services/api';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

export const EventCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      // Try member events first, fall back to general events
      let response;
      try {
        response = await member.getMyEvents();
      } catch {
        response = await eventsApi.getAll();
      }
      
      const eventsData = response.data?.events || response.data || [];
      // Normalize event data
      const normalized = eventsData.map(e => ({
        ...e,
        date: new Date(e.scheduled_at || e.date),
        type: e.type || (e.is_workshop ? 'class' : 'event'),
        attended: e.attended || false
      }));
      setEvents(normalized);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calendar calculations
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    if (viewMode === 'month') {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startPadding = firstDay.getDay();
      const totalDays = lastDay.getDate();
      
      const days = [];
      
      // Previous month padding
      const prevMonth = new Date(year, month, 0);
      for (let i = startPadding - 1; i >= 0; i--) {
        days.push({
          date: new Date(year, month - 1, prevMonth.getDate() - i),
          isCurrentMonth: false
        });
      }
      
      // Current month
      for (let i = 1; i <= totalDays; i++) {
        days.push({
          date: new Date(year, month, i),
          isCurrentMonth: true
        });
      }
      
      // Next month padding
      const remaining = 42 - days.length;
      for (let i = 1; i <= remaining; i++) {
        days.push({
          date: new Date(year, month + 1, i),
          isCurrentMonth: false
        });
      }
      
      return days;
    } else {
      // Week view
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      
      const days = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        days.push({ date, isCurrentMonth: true });
      }
      return days;
    }
  }, [currentDate, viewMode]);

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const navigatePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const navigateNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setSelectedEvent(null);
  };

  const handleEventClick = (event, e) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold mb-1">Calendar</h1>
        <p className="text-slate-400">Your events and classes schedule</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar Grid */}
        <div className="xl:col-span-3">
          <GlassCard>
            {/* Calendar Controls */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={navigatePrev}
                  className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h2 className="text-xl font-semibold min-w-[200px] text-center">
                  {viewMode === 'month' 
                    ? `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`
                    : `Week of ${currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                  }
                </h2>
                <button
                  onClick={navigateNext}
                  className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
                <div className="flex rounded-lg overflow-hidden border border-slate-700">
                  <button
                    onClick={() => setViewMode('month')}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      viewMode === 'month' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    Month
                  </button>
                  <button
                    onClick={() => setViewMode('week')}
                    className={`px-3 py-1.5 text-sm transition-colors ${
                      viewMode === 'week' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700/50'
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(day => (
                <div key={day} className="text-center text-sm font-medium text-slate-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className={`grid grid-cols-7 gap-1 ${viewMode === 'week' ? 'min-h-[400px]' : ''}`}>
              {calendarData.map((day, index) => {
                const dayEvents = getEventsForDate(day.date);
                const isSelected = selectedDate?.toDateString() === day.date.toDateString();
                
                return (
                  <motion.div
                    key={index}
                    onClick={() => handleDateClick(day.date)}
                    className={`
                      ${viewMode === 'month' ? 'aspect-square' : 'min-h-[100px]'} 
                      p-1 rounded-lg cursor-pointer transition-all duration-200
                      ${day.isCurrentMonth ? '' : 'opacity-40'}
                      ${isToday(day.date) ? 'ring-2 ring-indigo-500' : ''}
                      ${isSelected ? 'bg-indigo-600/30' : 'hover:bg-slate-700/30'}
                      ${dayEvents.length > 0 ? 'bg-slate-700/20' : ''}
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={`text-sm font-medium mb-1 ${
                      isToday(day.date) ? 'text-indigo-400' : day.isCurrentMonth ? '' : 'text-slate-500'
                    }`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Event Indicators */}
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, viewMode === 'week' ? 5 : 2).map((event, i) => (
                        <div
                          key={i}
                          onClick={(e) => handleEventClick(event, e)}
                          className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer
                            ${event.type === 'class' 
                              ? 'bg-emerald-500/30 text-emerald-300' 
                              : 'bg-indigo-500/30 text-indigo-300'
                            }
                            ${event.attended ? 'border-l-2 border-emerald-400' : ''}
                          `}
                          title={event.title}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > (viewMode === 'week' ? 5 : 2) && (
                        <div className="text-xs text-slate-400">
                          +{dayEvents.length - (viewMode === 'week' ? 5 : 2)} more
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-indigo-500/50"></div>
                <span className="text-slate-400">Events</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-emerald-500/50"></div>
                <span className="text-slate-400">Classes/Workshops</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded bg-slate-600 border-l-2 border-emerald-400"></div>
                <span className="text-slate-400">Attended</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar - Event Details / Day Events */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          {selectedDate && (
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-2">
                  {getEventsForDate(selectedDate).map((event, i) => (
                    <motion.div
                      key={i}
                      onClick={() => setSelectedEvent(event)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors
                        ${selectedEvent?.id === event.id ? 'bg-indigo-600/30 ring-1 ring-indigo-500' : 'bg-slate-700/30 hover:bg-slate-700/50'}
                      `}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-start gap-2">
                        {event.type === 'class' ? (
                          <BookOpen size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                        ) : (
                          <Presentation size={16} className="text-indigo-400 mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{event.title}</p>
                          <p className="text-sm text-slate-400">
                            {new Date(event.date).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        {event.attended && (
                          <span className="status-badge success flex-shrink-0">Attended</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm text-center py-4">
                  No events on this day
                </p>
              )}
            </GlassCard>
          )}

          {/* Selected Event Details */}
          <AnimatePresence>
            {selectedEvent && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
              >
                <GlassCard>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Event Details</h3>
                    <button 
                      onClick={() => setSelectedEvent(null)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {selectedEvent.type === 'class' ? (
                          <span className="status-badge success">Workshop</span>
                        ) : (
                          <span className="status-badge info">Event</span>
                        )}
                        {selectedEvent.attended && (
                          <span className="status-badge success">✓ Attended</span>
                        )}
                      </div>
                      <h4 className="text-lg font-semibold">{selectedEvent.title}</h4>
                    </div>

                    {selectedEvent.description && (
                      <p className="text-slate-300 text-sm">{selectedEvent.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-400">
                        <CalendarIcon size={16} />
                        {new Date(selectedEvent.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={16} />
                        {new Date(selectedEvent.date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      {selectedEvent.location && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin size={16} />
                          {selectedEvent.location}
                        </div>
                      )}
                      {selectedEvent.attendee_count !== undefined && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users size={16} />
                          {selectedEvent.attendee_count} attendees
                        </div>
                      )}
                    </div>

                    {selectedEvent.notes && (
                      <div className="pt-3 border-t border-slate-700">
                        <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Notes</p>
                        <p className="text-sm text-slate-300">{selectedEvent.notes}</p>
                      </div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upcoming Events Quick View */}
          <GlassCard>
            <h3 className="font-semibold mb-4">Upcoming</h3>
            <div className="space-y-2">
              {events
                .filter(e => new Date(e.date) >= new Date())
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 5)
                .map((event, i) => (
                  <div 
                    key={i}
                    onClick={() => {
                      setSelectedDate(new Date(event.date));
                      setSelectedEvent(event);
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'class' ? 'bg-emerald-400' : 'bg-indigo-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                ))
              }
              {events.filter(e => new Date(e.date) >= new Date()).length === 0 && (
                <p className="text-sm text-slate-500 text-center py-2">No upcoming events</p>
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
};
