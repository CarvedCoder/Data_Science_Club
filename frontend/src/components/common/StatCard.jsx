import React from 'react';
import { GlassCard } from './GlassCard';

export const StatCard = ({ icon: Icon, label, value, color = 'text-indigo-400' }) => {
  return (
    <GlassCard hover>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full bg-white/10 ${color}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-gray-400 text-sm">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </GlassCard>
  );
};