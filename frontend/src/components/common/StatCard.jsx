import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  subValue,
  trend,
  trendUp,
  color = 'indigo',
  delay = 0 
}) => {
  const colorStyles = {
    indigo: {
      bg: 'bg-indigo-500/20',
      text: 'text-indigo-400',
      border: 'border-indigo-500/30',
    },
    emerald: {
      bg: 'bg-emerald-500/20',
      text: 'text-emerald-400',
      border: 'border-emerald-500/30',
    },
    purple: {
      bg: 'bg-purple-500/20',
      text: 'text-purple-400',
      border: 'border-purple-500/30',
    },
    amber: {
      bg: 'bg-amber-500/20',
      text: 'text-amber-400',
      border: 'border-amber-500/30',
    },
    blue: {
      bg: 'bg-blue-500/20',
      text: 'text-blue-400',
      border: 'border-blue-500/30',
    },
    red: {
      bg: 'bg-red-500/20',
      text: 'text-red-400',
      border: 'border-red-500/30',
    },
  };

  const style = colorStyles[color] || colorStyles.indigo;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all cursor-pointer`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${style.bg} ${style.border} border`}>
          <Icon className={`w-6 h-6 ${style.text}`} />
        </div>
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {subValue && (
              <span className="text-sm text-slate-500">{subValue}</span>
            )}
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs mt-1 ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
              <span>{trendUp ? '↑' : '↓'}</span>
              <span>{trend}% from last month</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};