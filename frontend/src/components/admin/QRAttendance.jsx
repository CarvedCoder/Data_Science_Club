import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode.react';
import { 
  X, 
  Users, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Wifi,
  WifiOff,
  Calendar,
  MapPin,
  Shield,
  Zap,
  UserCheck,
  TrendingUp,
  Copy,
  Eye,
  EyeOff,
  Check
} from 'lucide-react';
import { Button } from '../common/Button';
import { attendance, events as eventsApi } from '../../services/api';

export const QRAttendance = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  // State
  const [session, setSession] = useState(null);
  const [event, setEvent] = useState(null);
  const [attendanceData, setAttendanceData] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [recentScans, setRecentScans] = useState([]);
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Refs for cleanup
  const countdownRef = useRef(null);
  const pollRef = useRef(null);
  const previousAttendanceCount = useRef(0);

  // Start session on mount
  useEffect(() => {
    startSession();
    
    // Poll for attendance updates every 3 seconds
    pollRef.current = setInterval(loadAttendance, 3000);
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [eventId]);

  // QR countdown timer
  useEffect(() => {
    if (!session) return;
    
    countdownRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          refreshQR();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [session?.session_id]);

  const startSession = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get event details
      const eventRes = await eventsApi.getOne(eventId);
      setEvent(eventRes.data);
      
      // Start QR session
      const sessionRes = await attendance.startSession(eventId);
      setSession(sessionRes.data);
      setTimeRemaining(sessionRes.data.expires_in_seconds || 60);
      
      // Load initial attendance
      await loadAttendance();
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to start session:', err);
      setError(err.response?.data?.detail || 'Failed to start attendance session');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const response = await attendance.getEventAttendance(eventId);
      const newData = response.data;
      
      // Detect new scans for animation
      if (newData && newData.present) {
        const newCount = newData.present.length;
        if (newCount > previousAttendanceCount.current) {
          // New student marked attendance
          const newStudents = newData.present.slice(previousAttendanceCount.current);
          setRecentScans(prev => [...newStudents.map(s => ({ ...s, timestamp: Date.now() })), ...prev].slice(0, 5));
        }
        previousAttendanceCount.current = newCount;
      }
      
      setAttendanceData(newData);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to load attendance:', err);
      setConnectionStatus('disconnected');
    }
  };

  const refreshQR = async () => {
    if (!session || isRefreshing) return;
    
    try {
      setIsRefreshing(true);
      const sessionRes = await attendance.refreshQR(session.session_id);
      setSession(prev => ({ 
        ...prev, 
        session_id: sessionRes.data.session_id,
        qr_payload: sessionRes.data.qr_payload 
      }));
      setTimeRemaining(sessionRes.data.expires_in_seconds || 60);
      setConnectionStatus('connected');
    } catch (err) {
      console.error('Failed to refresh QR:', err);
      // If refresh fails, try starting a new session
      try {
        const sessionRes = await attendance.startSession(eventId);
        setSession(sessionRes.data);
        setTimeRemaining(sessionRes.data.expires_in_seconds || 60);
      } catch (retryErr) {
        setConnectionStatus('error');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    setTimeRemaining(60);
    await refreshQR();
  };

  const handleStop = async () => {
    if (!confirm('Are you sure you want to end this attendance session?')) return;
    
    try {
      if (session?.session_id) {
        await attendance.stopSession(session.session_id);
      }
      navigate('/admin/events');
    } catch (err) {
      console.error('Failed to stop session:', err);
      navigate('/admin/events');
    }
  };

  const copyCode = async () => {
    if (!session?.qr_payload) return;
    
    try {
      await navigator.clipboard.writeText(session.qr_payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getTimeColor = () => {
    if (timeRemaining <= 10) return 'text-red-400';
    if (timeRemaining <= 30) return 'text-amber-400';
    return 'text-emerald-400';
  };

  const getProgressPercentage = () => {
    return (timeRemaining / 60) * 100;
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Starting attendance session...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-slate-900 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Failed to Start Session</h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={startSession} icon={RefreshCw}>Try Again</Button>
            <Button variant="secondary" onClick={() => navigate('/admin/events')}>Back to Events</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">{event?.title || 'Attendance Session'}</h1>
                <div className="flex items-center gap-4 mt-1">
                  <span className="flex items-center gap-1.5 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    {event?.scheduled_at ? new Date(event.scheduled_at).toLocaleDateString() : 'Today'}
                  </span>
                  {event?.location && (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      <MapPin className="w-4 h-4" />
                      {event.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              connectionStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400' :
              connectionStatus === 'disconnected' ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {connectionStatus === 'connected' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              {connectionStatus === 'connected' ? 'Live' : connectionStatus === 'disconnected' ? 'Reconnecting...' : 'Error'}
            </div>
            <Button variant="danger" onClick={handleStop} icon={X}>
              End Session
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* QR Code Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="xl:col-span-2"
        >
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row gap-8 items-center">
              {/* QR Code */}
              <div className="relative">
                {/* Progress ring */}
                <svg className="absolute -inset-4 w-[calc(100%+32px)] h-[calc(100%+32px)]" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke="rgba(100,116,139,0.2)"
                    strokeWidth="2"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    fill="none"
                    stroke={timeRemaining <= 10 ? '#f87171' : timeRemaining <= 30 ? '#fbbf24' : '#34d399'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={`${getProgressPercentage() * 3.02} 302`}
                    transform="rotate(-90 50 50)"
                    className="transition-all duration-1000"
                  />
                </svg>
                
                <motion.div
                  animate={isRefreshing ? { scale: [1, 0.95, 1] } : {}}
                  transition={{ duration: 0.3 }}
                  className="bg-white p-6 rounded-2xl shadow-2xl relative z-10"
                >
                  {session?.qr_payload ? (
                    <QRCode 
                      value={session.qr_payload} 
                      size={280}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-[280px] h-[280px] flex items-center justify-center bg-slate-100">
                      <RefreshCw className="w-12 h-12 text-slate-400 animate-spin" />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* QR Info */}
              <div className="flex-1 text-center lg:text-left">
                <div className="mb-6">
                  <p className="text-slate-400 text-sm mb-1">QR Code Status</p>
                  <div className="flex items-center justify-center lg:justify-start gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${timeRemaining <= 10 ? 'bg-red-400 animate-pulse' : 'bg-emerald-400'}`}></span>
                    <span className="text-lg font-semibold text-white">
                      {timeRemaining <= 10 ? 'Expiring Soon' : 'Active'}
                    </span>
                  </div>
                </div>

                <div className="mb-6">
                  <p className="text-slate-400 text-sm mb-2">Time Remaining</p>
                  <p className={`text-5xl font-mono font-bold ${getTimeColor()}`}>
                    {String(Math.floor(timeRemaining / 60)).padStart(2, '0')}:{String(timeRemaining % 60).padStart(2, '0')}
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      onClick={handleManualRefresh} 
                      icon={RefreshCw}
                      loading={isRefreshing}
                      className="flex-1 lg:flex-none"
                    >
                      Generate New QR
                    </Button>
                    <Button 
                      onClick={() => setShowCode(!showCode)}
                      variant="secondary"
                      icon={showCode ? EyeOff : Eye}
                      className="flex-1 lg:flex-none"
                    >
                      {showCode ? 'Hide Code' : 'Show Code'}
                    </Button>
                  </div>
                  
                  {/* Manual Code Display for members who can't scan */}
                  <AnimatePresence>
                    {showCode && session?.qr_payload && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-600">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-slate-400">Attendance Code (for manual entry)</p>
                            <button
                              onClick={copyCode}
                              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                              {copied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied!
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                          <div className="bg-slate-950 rounded p-2 font-mono text-xs text-emerald-400 break-all select-all">
                            {session.qr_payload}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-2">
                            Share this code with students who can't scan the QR code
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <p className="text-xs text-slate-500">
                    <Shield className="w-3 h-3 inline mr-1" />
                    QR auto-refreshes every 60s for security
                  </p>
                </div>
              </div>
            </div>

            {/* Security info */}
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <Clock className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">60s Expiry</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">Signed & Encrypted</p>
                </div>
                <div className="p-3 bg-slate-700/30 rounded-lg">
                  <UserCheck className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <p className="text-xs text-slate-400">One-time Use</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats & Attendance Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          {/* Stats Cards */}
          {attendanceData && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{attendanceData.total || 0}</p>
                      <p className="text-xs text-slate-400">Total Members</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{attendanceData.present?.length || 0}</p>
                      <p className="text-xs text-slate-400">Present</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Rate */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">Attendance Rate</span>
                  <span className="text-lg font-bold text-purple-400">{attendanceData.percentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${attendanceData.percentage || 0}%` }}
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full"
                  />
                </div>
              </div>
            </>
          )}

          {/* Recent Scans - Live Feed */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <div className="p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white">Live Feed</h3>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  Real-time
                </span>
              </div>
            </div>
            
            <div className="max-h-64 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {recentScans.length > 0 ? (
                  recentScans.map((scan, index) => (
                    <motion.div
                      key={scan.id || scan.timestamp}
                      initial={{ opacity: 0, x: -20, backgroundColor: 'rgba(34, 197, 94, 0.2)' }}
                      animate={{ opacity: 1, x: 0, backgroundColor: 'transparent' }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="p-3 border-b border-slate-700/30 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{scan.name || scan.full_name}</p>
                          <p className="text-xs text-slate-400">{scan.email}</p>
                        </div>
                        <span className="text-xs text-slate-500">Just now</span>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Waiting for scans...</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Present List */}
          {attendanceData?.present && attendanceData.present.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="font-semibold text-white">Present ({attendanceData.present.length})</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {attendanceData.present.map((user) => (
                  <div key={user.id} className="p-3 border-b border-slate-700/30 last:border-0 flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {(user.name || user.full_name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{user.name || user.full_name}</p>
                      <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};