import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trash2, UserX, UserCheck } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { admin } from '../../services/api';

export const MemberManagement = () => {
  const [members, setMembers] = useState([]);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const response = await admin.getMembers();
      setMembers(response.data);
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const handleToggle = async (userId) => {
    try {
      await admin.toggleMember(userId);
      await loadMembers();
    } catch (error) {
      console.error('Failed to toggle member:', error);
    }
  };

  const handleRemove = async (userId) => {
    if (confirm('Are you sure you want to remove this member?')) {
      try {
        await admin.removeMember(userId);
        await loadMembers();
      } catch (error) {
        console.error('Failed to remove member:', error);
      }
    }
  };

  return (
    <div className="p-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-4xl font-bold mb-2">Member Management</h1>
        <p className="text-gray-400">View and manage club members</p>
      </motion.div>

      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4">Name</th>
                <th className="text-left py-3 px-4">Email</th>
                <th className="text-left py-3 px-4">Attended</th>
                <th className="text-left py-3 px-4">Rate</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-right py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-white/5">
                  <td className="py-4 px-4">{member.name}</td>
                  <td className="py-4 px-4 text-gray-400">{member.email}</td>
                  <td className="py-4 px-4">{member.attended}/{member.total_events}</td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      member.attendance_rate >= 75 ? 'bg-green-500/20 text-green-400' :
                      member.attendance_rate >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {member.attendance_rate}%
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      member.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {member.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleToggle(member.id)}
                        className="p-2 glass rounded-lg hover:bg-white/20 transition-all"
                      >
                        {member.is_active ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="p-2 glass rounded-lg hover:bg-red-500/20 text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};