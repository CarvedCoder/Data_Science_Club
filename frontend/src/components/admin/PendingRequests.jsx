import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Mail, Calendar, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { admin } from '../../services/api';

export const PendingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [roleSelection, setRoleSelection] = useState({});
  const [rejectionReasons, setRejectionReasons] = useState({});
  const [showRejectionInput, setShowRejectionInput] = useState({});

  // Auto-refresh for pending requests (to update countdown)
  useEffect(() => {
    loadRequests();
    
    // Refresh every 5 seconds to update countdowns
    const interval = setInterval(() => {
      if (statusFilter === 'PENDING') {
        loadRequests();
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [statusFilter]);

  const loadRequests = async () => {
    try {
      const response = await admin.getApprovalRequests(statusFilter);
      setRequests(response.data.requests || []);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleApprove = async (requestId, role = 'student') => {
    setProcessingId(requestId);
    try {
      await admin.decideApproval(requestId, 'approved', role);
      await loadRequests();
    } catch (error) {
      console.error('Failed to approve:', error);
      alert(error.response?.data?.detail || 'Failed to approve request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      await admin.decideApproval(requestId, 'rejected', null, rejectionReasons[requestId] || null);
      setShowRejectionInput(prev => ({ ...prev, [requestId]: false }));
      setRejectionReasons(prev => ({ ...prev, [requestId]: '' }));
      await loadRequests();
    } catch (error) {
      console.error('Failed to reject:', error);
      alert(error.response?.data?.detail || 'Failed to reject request');
    } finally {
      setProcessingId(null);
    }
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeColor = (seconds) => {
    if (seconds <= 0) return 'text-red-500';
    if (seconds <= 60) return 'text-red-400';
    if (seconds <= 120) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
      approved: 'bg-green-500/20 text-green-400 border-green-500',
      rejected: 'bg-red-500/20 text-red-400 border-red-500',
      timeout: 'bg-gray-500/20 text-gray-400 border-gray-500',
    };
    return badges[status?.toLowerCase()] || badges.pending;
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold mb-2">Approval Requests</h1>
        <p className="text-gray-400">Review and approve new member registrations within 3 minutes</p>
      </motion.div>

      {/* Status Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['PENDING', 'APPROVED', 'REJECTED', 'TIMEOUT'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg transition-all ${
              statusFilter === status
                ? 'bg-indigo-600 text-white'
                : 'glass text-gray-400 hover:text-white'
            }`}
          >
            {status.charAt(0) + status.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <GlassCard>
            <p className="text-center text-gray-400 py-8">
              No {statusFilter.toLowerCase()} requests
            </p>
          </GlassCard>
        ) : (
          requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              layout
            >
              <GlassCard>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* User Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{request.user?.full_name}</h3>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-400 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Mail size={16} />
                        {request.user?.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(request.requested_at).toLocaleString()}
                      </div>
                      {request.status === 'pending' && (
                        <div className={`flex items-center gap-1 font-mono font-bold ${getTimeColor(request.time_remaining_seconds)}`}>
                          <Clock size={16} />
                          {formatTimeRemaining(request.time_remaining_seconds)}
                          {request.time_remaining_seconds <= 60 && request.time_remaining_seconds > 0 && (
                            <AlertTriangle size={16} className="animate-pulse" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Show decision info for non-pending */}
                    {request.status !== 'pending' && request.decided_at && (
                      <div className="mt-2 text-sm text-gray-500">
                        Decided: {new Date(request.decided_at).toLocaleString()}
                        {request.approved_role && ` • Role: ${request.approved_role}`}
                        {request.rejection_reason && (
                          <span className="text-red-400"> • Reason: {request.rejection_reason}</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Actions for pending requests */}
                  {request.status === 'pending' && request.time_remaining_seconds > 0 && (
                    <div className="flex flex-col gap-2">
                      {/* Role Selection */}
                      <div className="flex items-center gap-2">
                        <select
                          value={roleSelection[request.id] || 'student'}
                          onChange={(e) => setRoleSelection(prev => ({ ...prev, [request.id]: e.target.value }))}
                          className="px-3 py-2 rounded-lg glass border border-white/20 bg-transparent text-white text-sm"
                        >
                          <option value="student" className="bg-gray-800">Student</option>
                          <option value="admin" className="bg-gray-800">Admin</option>
                        </select>
                        <Button
                          variant="primary"
                          onClick={() => handleApprove(request.id, roleSelection[request.id] || 'student')}
                          disabled={processingId === request.id}
                        >
                          <Check size={18} className="mr-1" />
                          Approve
                        </Button>
                      </div>
                      
                      {/* Reject with optional reason */}
                      {showRejectionInput[request.id] ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={rejectionReasons[request.id] || ''}
                            onChange={(e) => setRejectionReasons(prev => ({ ...prev, [request.id]: e.target.value }))}
                            className="px-3 py-2 rounded-lg glass border border-white/20 bg-transparent text-white text-sm flex-1"
                          />
                          <Button
                            variant="danger"
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                          >
                            <X size={18} className="mr-1" />
                            Reject
                          </Button>
                          <button
                            onClick={() => setShowRejectionInput(prev => ({ ...prev, [request.id]: false }))}
                            className="text-gray-400 hover:text-white"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          onClick={() => setShowRejectionInput(prev => ({ ...prev, [request.id]: true }))}
                          disabled={processingId === request.id}
                        >
                          <X size={18} className="mr-1" />
                          Reject
                        </Button>
                      )}
                    </div>
                  )}
                  
                  {/* Expired indicator */}
                  {request.status === 'pending' && request.time_remaining_seconds <= 0 && (
                    <div className="text-red-400 text-sm font-semibold">
                      Request Expired
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};