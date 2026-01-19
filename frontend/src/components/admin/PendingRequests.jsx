import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Mail, Calendar } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { admin } from '../../services/api';

export const PendingRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const response = await admin.getPendingUsers();
      setRequests(response.data);
    } catch (error) {
      console.error('Failed to load requests:', error);
    }
  };

  const handleApprove = async (userId, approve) => {
    setLoading(true);
    try {
      await admin.approveUser(userId, approve);
      await loadRequests();
    } catch (error) {
      console.error('Failed to process request:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold mb-2">Pending Requests</h1>
        <p className="text-gray-400">Review and approve new member registrations</p>
      </motion.div>

      <div className="space-y-4">
        {requests.length === 0 ? (
          <GlassCard>
            <p className="text-center text-gray-400 py-8">No pending requests</p>
          </GlassCard>
        ) : (
          requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">{request.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Mail size={16} />
                        {request.email}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(request.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(request.id, true)}
                      disabled={loading}
                    >
                      <Check size={20} className="mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleApprove(request.id, false)}
                      disabled={loading}
                    >
                      <X size={20} className="mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};