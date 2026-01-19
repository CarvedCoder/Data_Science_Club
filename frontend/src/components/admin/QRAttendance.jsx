import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import QRCode from 'qrcode.react';
import { X, Users, CheckCircle } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { attendance, events as eventsApi } from '../../services/api';

export const QRAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [event, setEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);

  useEffect(() => {
    startSession();
    const interval = setInterval(() => {
      loadAttendance();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const startSession = async () => {
    try {
      const eventRes = await eventsApi.getOne(eventId);
      setEvent(eventRes.data);
      
      const sessionRes = await attendance.startSession(parseInt(eventId));
      setSession(sessionRes.data);
      await loadAttendance();
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await attendance.getEventAttendance(eventId);
      setAttendanceData(response.data);
    } catch (error) {
      console.error('Failed to load attendance:', error);
    }
  };

  const handleStop = async () => {
    try {
      await attendance.stopSession(session.session_id);
      navigate('/admin/events');
    } catch (error) {
      console.error('Failed to stop session:', error);
    }
  };

  if (!session || !event) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold mb-2">{event.title}</h1>
        <p className="text-gray-400">Attendance Session Active</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="flex flex-col items-center justify-center p-8">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="bg-white p-8 rounded-2xl mb-6"
          >
            <QRCode value={session.token} size={300} />
          </motion.div>
          <p className="text-gray-400 mb-4">Scan to mark attendance</p>
          <Button variant="danger" onClick={handleStop}>
            <X className="mr-2" size={20} />
            Stop Session
          </Button>
        </GlassCard>

        {attendanceData && (
          <div className="space-y-4">
            <GlassCard>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Statistics</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 glass rounded-lg">
                  <Users size={32} className="mx-auto mb-2 text-blue-400" />
                  <p className="text-3xl font-bold">{attendanceData.total}</p>
                  <p className="text-sm text-gray-400">Total Members</p>
                </div>
                <div className="text-center p-4 glass rounded-lg">
                  <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
                  <p className="text-3xl font-bold">{attendanceData.present.length}</p>
                  <p className="text-sm text-gray-400">Present</p>
                </div>
              </div>
              <div className="mt-4 text-center">
                <p className="text-3xl font-bold text-purple-400">{attendanceData.percentage}%</p>
                <p className="text-sm text-gray-400">Attendance Rate</p>
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="text-xl font-semibold mb-4">Present ({attendanceData.present.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {attendanceData.present.map((user) => (
                  <div key={user.id} className="p-3 glass rounded-lg flex items-center gap-3">
                    <CheckCircle size={20} className="text-green-400" />
                    <div>
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
};