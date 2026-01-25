import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { QrCode, CheckCircle, AlertCircle } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { attendance } from '../../services/api';

export const ScanQR = () => {
  const [qrPayload, setQrPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    try {
      const response = await attendance.getActiveSession();
      if (response.data.active) {
        setActiveSession(response.data);
      } else {
        setError('No active attendance session');
      }
    } catch (err) {
      setError('Failed to check active session');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await attendance.mark(qrPayload);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto"
      >
        <GlassCard>
          <div className="text-center mb-6">
            <div className="inline-block p-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
              <QrCode size={48} />
            </div>
            <h2 className="text-3xl font-bold mb-2">Mark Attendance</h2>
            {activeSession ? (
              <div>
                <p className="text-gray-400">Active Session</p>
                <p className="text-lg font-semibold">{activeSession.event.title}</p>
              </div>
            ) : (
              <p className="text-gray-400">No active session</p>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}

          {success ? (
            <div className="bg-green-500/10 border border-green-500 text-green-500 p-6 rounded-lg text-center">
              <CheckCircle size={48} className="mx-auto mb-3" />
              <p className="text-xl font-semibold mb-2">Attendance Marked!</p>
              <p className="text-sm">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter QR Code Payload
                </label>
                <input
                  type="text"
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value)}
                  placeholder="Paste the QR code content"
                  className="w-full px-4 py-3 rounded-lg glass border border-white/20 focus:border-indigo-500 outline-none transition-all"
                  required
                  disabled={!activeSession}
                />
                <p className="text-xs text-gray-400 mt-2">
                  Scan the QR code displayed by your instructor and paste the content here
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading || !activeSession}
              >
                {loading ? 'Marking...' : 'Mark Attendance'}
              </Button>

              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/dashboard')}
                className="w-full"
              >
                Back to Dashboard
              </Button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};