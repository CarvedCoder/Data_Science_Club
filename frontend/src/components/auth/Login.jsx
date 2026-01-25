import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Shield, User, Mail, Lock, ArrowLeft, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState(null); // 'admin' or 'member'
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // Check if user role matches selected login type
      const userRole = user.role?.toLowerCase();
      
      if (loginType === 'admin' && userRole !== 'admin') {
        setError('This account is not an admin account');
        setLoading(false);
        return;
      }
      
      if (loginType === 'member' && userRole === 'admin') {
        setError('Admin accounts should use Admin Login');
        setLoading(false);
        return;
      }

      if (userRole === 'admin') {
        navigate('/admin');
      } else if (userRole === 'student') {
        navigate('/dashboard');
      } else {
        setError('Account not properly configured. Contact an administrator.');
      }
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        // Handle approval-related messages
        if (detail.includes('pending approval')) {
          setError(detail);
        } else if (detail.includes('rejected')) {
          setError(detail);
        } else if (detail.includes('timed out')) {
          setError(detail);
        } else {
          setError(detail);
        }
      } else {
        setError('Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial view - Choose login type
  if (!loginType) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-900 to-purple-600/10"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl relative z-10"
        >
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30 mb-6"
            >
              <BarChart3 className="w-10 h-10 text-white" />
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Data Science Club
            </h1>
            <p className="text-slate-400 text-lg">Welcome back! Select your role to continue</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Member Login */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLoginType('member')}
              className="cursor-pointer"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center h-full hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl mb-6 shadow-lg shadow-indigo-500/30">
                  <User className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Member Login</h2>
                <p className="text-slate-400 mb-6">
                  Access your dashboard, view events, and track your attendance
                </p>
                <div className="inline-flex items-center gap-2 text-indigo-400 font-semibold">
                  Continue as Member
                  <span className="text-lg">→</span>
                </div>
              </div>
            </motion.div>

            {/* Admin Login */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLoginType('admin')}
              className="cursor-pointer"
            >
              <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center h-full hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-6 shadow-lg shadow-purple-500/30">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">Admin Login</h2>
                <p className="text-slate-400 mb-6">
                  Manage events, approve members, and monitor club activities
                </p>
                <div className="inline-flex items-center gap-2 text-purple-400 font-semibold">
                  Continue as Admin
                  <span className="text-lg">→</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Signup Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-slate-800/30 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 text-center"
          >
            <p className="text-slate-300 mb-4">
              New to the Data Science Club?
            </p>
            <Link to="/signup">
              <Button icon={UserPlus} size="lg">
                Create Member Account
              </Button>
            </Link>
            <p className="text-sm text-slate-500 mt-4">
              New signups require admin approval within 3 minutes
            </p>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Login form view
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-slate-900 to-purple-600/10"></div>
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8 shadow-2xl">
          {/* Back Button */}
          <button
            onClick={() => setLoginType(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to role selection
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg ${
              loginType === 'admin' 
                ? 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30' 
                : 'bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/30'
            }`}>
              {loginType === 'admin' ? <Shield className="w-8 h-8 text-white" /> : <User className="w-8 h-8 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-white">
              {loginType === 'admin' ? 'Admin' : 'Member'} Login
            </h2>
            <p className="text-slate-400 mt-2 text-sm">
              {loginType === 'admin' 
                ? 'Access the admin control panel' 
                : 'Access your member dashboard'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 text-sm"
            >
              {error}
            </motion.div>
          )}

          {/* Demo Credentials */}
          {loginType === 'admin' && (
            <div className="bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 p-4 rounded-xl mb-6 text-sm">
              <p className="font-semibold mb-1">Demo Credentials:</p>
              <p className="text-slate-400">Email: admin@dsclub.com</p>
              <p className="text-slate-400">Password: SecureAdmin@2026</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" size="lg" loading={loading} icon={LogIn}>
              {loading ? 'Signing in...' : `Sign In as ${loginType === 'admin' ? 'Admin' : 'Member'}`}
            </Button>
          </form>

          {/* Signup Link for Members */}
          {loginType === 'member' && (
            <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-400 mb-4 text-sm">Don't have an account?</p>
              <Link to="/signup">
                <Button variant="secondary" className="w-full" icon={UserPlus}>
                  Create Member Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
