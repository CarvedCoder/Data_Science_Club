import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Camera,
  CameraOff,
  RefreshCw,
  ArrowLeft,
  Clock,
  Shield,
  Wifi,
  WifiOff,
  Zap,
  Calendar,
  XCircle,
  Loader2,
  Keyboard,
  Send
} from 'lucide-react';
import { Button } from '../common/Button';
import { attendance } from '../../services/api';

export const ScanQR = () => {
  const navigate = useNavigate();
  
  // State
  const [mode, setMode] = useState('idle'); // idle, scanning, manual, processing, success, error
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState(null);
  const [scanAttempts, setScanAttempts] = useState(0);
  const [lastScannedPayload, setLastScannedPayload] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [manualCode, setManualCode] = useState('');
  
  // Refs
  const processingRef = useRef(false);
  const cooldownRef = useRef(null);

  // Check for active session on mount
  useEffect(() => {
    checkActiveSession();
    
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, []);

  const checkActiveSession = async () => {
    try {
      setIsCheckingSession(true);
      const response = await attendance.getActiveSession();
      if (response.data.active) {
        setActiveSession(response.data);
        setError('');
      } else {
        setActiveSession(null);
        setError('No active attendance session at the moment');
      }
    } catch (err) {
      console.error('Failed to check session:', err);
      setError('Unable to check for active sessions');
    } finally {
      setIsCheckingSession(false);
    }
  };

  const startScanning = () => {
    setCameraEnabled(true);
    setMode('scanning');
    setError('');
    setCameraError(null);
  };

  const stopScanning = () => {
    setCameraEnabled(false);
    setMode('idle');
  };

  const handleScan = useCallback(async (result) => {
    // Prevent duplicate processing
    if (processingRef.current) return;
    if (!result || !result[0]?.rawValue) return;
    
    const payload = result[0].rawValue;
    
    // Prevent scanning same QR twice in quick succession
    if (payload === lastScannedPayload) return;
    
    processingRef.current = true;
    setLastScannedPayload(payload);
    setMode('processing');
    setCameraEnabled(false);
    setScanAttempts(prev => prev + 1);

    try {
      const response = await attendance.mark(payload);
      
      setSuccessData({
        event: activeSession?.event?.title || 'Event',
        timestamp: new Date().toLocaleTimeString(),
        message: response.data?.message || 'Attendance marked successfully!'
      });
      setMode('success');
      
      // Auto-redirect after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err) {
      console.error('Attendance marking failed:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to mark attendance';
      
      setError(errorMessage);
      setMode('error');
      
      // Allow retry after cooldown
      cooldownRef.current = setTimeout(() => {
        processingRef.current = false;
        setLastScannedPayload(null);
      }, 3000);
    }
  }, [activeSession, lastScannedPayload, navigate]);

  const handleCameraError = (error) => {
    console.error('Camera error:', error);
    setCameraError(error?.message || 'Camera access denied');
    setCameraEnabled(false);
    setMode('idle');
  };

  const handleRetry = () => {
    processingRef.current = false;
    setLastScannedPayload(null);
    setError('');
    setManualCode('');
    setMode('idle');
  };

  const handleRefreshSession = async () => {
    await checkActiveSession();
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim() || processingRef.current) return;
    
    processingRef.current = true;
    setMode('processing');
    setScanAttempts(prev => prev + 1);

    try {
      const response = await attendance.mark(manualCode.trim());
      
      setSuccessData({
        event: activeSession?.event?.title || 'Event',
        timestamp: new Date().toLocaleTimeString(),
        message: response.data?.message || 'Attendance marked successfully!'
      });
      setMode('success');
      setManualCode('');
      
      // Auto-redirect after success
      setTimeout(() => {
        navigate('/dashboard');
      }, 3000);
      
    } catch (err) {
      console.error('Attendance marking failed:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to mark attendance';
      
      setError(errorMessage);
      setMode('error');
      
      // Allow retry after cooldown
      cooldownRef.current = setTimeout(() => {
        processingRef.current = false;
      }, 3000);
    }
  };

  const openManualEntry = () => {
    setMode('manual');
    setError('');
    setManualCode('');
  };

  // Render based on mode
  const renderContent = () => {
    // Loading state
    if (isCheckingSession) {
      return (
        <div className="text-center py-12">
          <Loader2 className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-spin" />
          <p className="text-slate-400">Checking for active sessions...</p>
        </div>
      );
    }

    // No active session
    if (!activeSession) {
      return (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <WifiOff className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Active Session</h3>
          <p className="text-slate-400 mb-6 max-w-xs mx-auto">
            There's no attendance session running right now. Please wait for your instructor to start one.
          </p>
          <Button onClick={handleRefreshSession} icon={RefreshCw} variant="secondary">
            Check Again
          </Button>
        </div>
      );
    }

    // Success state
    if (mode === 'success') {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </motion.div>
          <h3 className="text-2xl font-bold text-white mb-2">Attendance Marked!</h3>
          <p className="text-slate-400 mb-2">{successData?.event}</p>
          <p className="text-sm text-slate-500 mb-6">Marked at {successData?.timestamp}</p>
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6">
            <p className="text-emerald-400 text-sm">{successData?.message}</p>
          </div>
          <p className="text-xs text-slate-500">Redirecting to dashboard...</p>
        </motion.div>
      );
    }

    // Error state
    if (mode === 'error') {
      return (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-8"
        >
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Scan Failed</h3>
          <p className="text-red-400 mb-6 max-w-xs mx-auto">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRetry} icon={RefreshCw}>
              Try Again
            </Button>
            <Button variant="secondary" onClick={() => navigate('/dashboard')}>
              Back
            </Button>
          </div>
        </motion.div>
      );
    }

    // Processing state
    if (mode === 'processing') {
      return (
        <div className="text-center py-12">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full mx-auto mb-4"
          />
          <h3 className="text-lg font-semibold text-white mb-2">Verifying...</h3>
          <p className="text-slate-400 text-sm">Marking your attendance</p>
        </div>
      );
    }

    // Scanning state
    if (mode === 'scanning' && cameraEnabled) {
      return (
        <div className="relative">
          {/* Camera View */}
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-w-sm mx-auto">
            <Scanner
              onScan={handleScan}
              onError={handleCameraError}
              constraints={{
                facingMode: 'environment'
              }}
              styles={{
                container: { 
                  width: '100%', 
                  height: '100%',
                  position: 'relative'
                },
                video: {
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }
              }}
              components={{
                audio: false,
                torch: true
              }}
            />
            
            {/* Scan overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Corner markers */}
              <div className="absolute top-8 left-8 w-12 h-12 border-l-4 border-t-4 border-indigo-400 rounded-tl-lg" />
              <div className="absolute top-8 right-8 w-12 h-12 border-r-4 border-t-4 border-indigo-400 rounded-tr-lg" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-l-4 border-b-4 border-indigo-400 rounded-bl-lg" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-r-4 border-b-4 border-indigo-400 rounded-br-lg" />
              
              {/* Scan line animation */}
              <motion.div
                animate={{ y: [0, 280, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute left-8 right-8 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"
                style={{ top: '10%' }}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 mb-4">Position the QR code within the frame</p>
            <Button variant="secondary" onClick={stopScanning} icon={CameraOff}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // Manual entry state
    if (mode === 'manual') {
      return (
        <div className="py-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Keyboard className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Manual Entry</h3>
            <p className="text-sm text-slate-400">Paste the QR code content below</p>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                QR Code Payload
              </label>
              <textarea
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Paste the QR code content here..."
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm"
                rows={4}
                required
                autoFocus
              />
              <p className="text-xs text-slate-500 mt-2">
                Ask your instructor to share the QR code content if you can't scan it
              </p>
            </div>

            <div className="flex gap-3">
              <Button 
                type="submit" 
                className="flex-1" 
                icon={Send}
                disabled={!manualCode.trim()}
              >
                Submit
              </Button>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setMode('idle')}
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </form>

          {/* Quick tip */}
          <div className="mt-6 bg-slate-700/30 rounded-xl p-4">
            <h4 className="text-sm font-medium text-white mb-2">💡 Tip</h4>
            <p className="text-xs text-slate-400">
              If you can't scan the QR code, ask your instructor to display the raw code text, 
              or use another device to scan and copy the content.
            </p>
          </div>
        </div>
      );
    }

    // Idle state - ready to scan
    return (
      <div className="text-center py-8">
        {/* Active Session Info */}
        <div className="bg-slate-700/30 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-center gap-2 text-emerald-400 mb-2">
            <Wifi className="w-4 h-4" />
            <span className="text-sm font-medium">Active Session</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">{activeSession?.event?.title}</h3>
          <div className="flex items-center justify-center gap-4 text-sm text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {activeSession?.event?.scheduled_at ? new Date(activeSession.event.scheduled_at).toLocaleDateString() : 'Today'}
            </span>
            {activeSession?.expires_in_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Expires in {Math.floor(activeSession.expires_in_seconds / 60)}m
              </span>
            )}
          </div>
        </div>

        {/* Camera Error */}
        {cameraError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{cameraError}</span>
            </div>
          </div>
        )}

        {/* Start Scanning Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={startScanning}
          className="w-full max-w-xs mx-auto block bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl p-6 shadow-lg shadow-indigo-500/25 transition-all"
        >
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
              <Camera className="w-8 h-8" />
            </div>
            <span className="text-lg font-semibold">Start Scanning</span>
            <span className="text-sm text-indigo-200 mt-1">Tap to open camera</span>
          </div>
        </motion.button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6 max-w-xs mx-auto">
          <div className="flex-1 h-px bg-slate-700"></div>
          <span className="text-xs text-slate-500 uppercase">or</span>
          <div className="flex-1 h-px bg-slate-700"></div>
        </div>

        {/* Manual Entry Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={openManualEntry}
          className="w-full max-w-xs mx-auto block bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-white rounded-xl p-4 transition-all"
        >
          <div className="flex items-center justify-center gap-3">
            <Keyboard className="w-5 h-5 text-slate-400" />
            <span className="font-medium">Enter Code Manually</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Can't scan? Paste the QR content</p>
        </motion.button>

        {/* Scan attempts info */}
        {scanAttempts > 0 && (
          <p className="text-xs text-slate-500 mt-4">
            Scan attempts this session: {scanAttempts}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Back to Dashboard</span>
          </button>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Mark Attendance</h1>
              <p className="text-sm text-slate-400">Scan the QR code displayed by your instructor</p>
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6"
        >
          {renderContent()}
        </motion.div>

        {/* Security Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 grid grid-cols-3 gap-3"
        >
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-center">
            <Shield className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Secure</p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-center">
            <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">Time-limited</p>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-3 text-center">
            <Zap className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
            <p className="text-xs text-slate-400">One-time</p>
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 bg-slate-800/30 border border-slate-700/30 rounded-xl p-4"
        >
          <h4 className="text-sm font-medium text-white mb-3">How it works:</h4>
          <ol className="space-y-2 text-sm text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</span>
              <span>Wait for your instructor to display the QR code</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</span>
              <span>Tap "Start Scanning" and point your camera at the QR</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-5 h-5 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</span>
              <span>Your attendance will be marked automatically</span>
            </li>
          </ol>
        </motion.div>
      </div>
    </div>
  );
};