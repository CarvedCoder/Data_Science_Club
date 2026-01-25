import React from 'react';
import { motion } from 'framer-motion';

export const GlassCard = ({ 
  children, 
  className = '', 
  hover = false,
  padding = 'p-6',
  animate = true,
  delay = 0 
}) => {
  const Component = animate ? motion.div : 'div';
  
  const animationProps = animate ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay },
    whileHover: hover ? { scale: 1.02, y: -2 } : {},
  } : {};

  return (
    <Component
      className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl ${padding} ${
        hover ? 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer' : ''
      } ${className}`}
      {...animationProps}
    >
      {children}
    </Component>
  );
};