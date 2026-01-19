import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ children, className = '', hover = false }) => {
  return (
    <motion.div
      className={`glass rounded-2xl p-6 ${hover ? 'glass-hover' : ''} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {children}
    </motion.div>
  );
};