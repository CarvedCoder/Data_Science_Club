import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, UserPlus, Shield, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { GlassCard } from '../common/GlassCard';
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
      if (loginType === 'admin' && user.role !== 'admin') {
        setError('This account is not an admin account');
        setLoading(false);
        return;
      }
      
      if (loginType === 'member' && user.role === 'admin') {
        setError('Admin accounts should use Admin Login');
        setLoading(false);
        return;
      }

      if (user.role === 'admin') {
        navigate('/admin');
      } else if (user.role === 'pending') {
        setError('Your account is pending approval. Please wait for admin approval.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Initial view - Choose login type
  if (!loginType) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-4xl"
        >
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Data Science Club Portal
            </h1>
            <p className="text-gray-400 text-lg">Welcome! Please select your role to continue</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Member Login */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLoginType('member')}
              className="cursor-pointer"
            >
              <GlassCard className="text-center p-8 h-full border-2 border-transparent hover:border-indigo-500 transition-all">
                <div className="inline-block p-6 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 mb-6">
                  <User size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-3">Member Login</h2>
                <p className="text-gray-400 mb-4">
                  Access your dashboard, view events, and mark attendance
                </p>
                <div className="text-indigo-400 font-semibold">Click to Login →</div>
              </GlassCard>
            </motion.div>

            {/* Admin Login */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLoginType('admin')}
              className="cursor-pointer"
            >
              <GlassCard className="text-center p-8 h-full border-2 border-transparent hover:border-purple-500 transition-all">
                <div className="inline-block p-6 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 mb-6">
                  <Shield size={48} />
                </div>
                <h2 className="text-2xl font-bold mb-3">Admin Login</h2>
                <p className="text-gray-400 mb-4">
                  Manage events, approve members, and track attendance
                </p>
                <div className="text-purple-400 font-semibold">Click to Login →</div>
              </GlassCard>
            </motion.div>
          </div>

          {/* Signup Section */}
          <GlassCard className="text-center p-6">
            <p className="text-gray-300 mb-4">
              Don't have an account yet?
            </p>
            <Link to="/signup">
              <Button className="inline-flex items-center">
                <UserPlus size={20} className="mr-2" />
                Create Member Account
              </Button>
            </Link>
            <p className="text-sm text-gray-500 mt-4">
              New member signups require admin approval
            </p>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Login form view
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <GlassCard>
          <button
            onClick={() => setLoginType(null)}
            className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
          >
            ← Back to role selection
          </button>

          <div className="text-center mb-8">
            <div className={`inline-block p-4 rounded-full mb-4 ${
              loginType === 'admin' 
                ? 'bg-gradient-to-r from-purple-600 to-pink-600' 
                : 'bg-gradient-to-r from-indigo-600 to-blue-600'
            }`}>
              {loginType === 'admin' ? <Shield size={32} /> : <User size={32} />}
            </div>
            <h2 className="text-3xl font-bold">
              {loginType === 'admin' ? 'Admin' : 'Member'} Login
            </h2>
            <p className="text-gray-400 mt-2">
              {loginType === 'admin' 
                ? 'Access admin control panel' 
                : 'Access your member dashboard'}
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {loginType === 'admin' && (
            <div className="bg-blue-500/10 border border-blue-500 text-blue-400 p-3 rounded-lg mb-4 text-sm">
              <strong>Demo Admin Credentials:</strong><br />
              Email: admin@dsclub.com<br />
              Password: Admin@123
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg glass border border-white/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg glass border border-white/20 focus:border-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : `Sign In as ${loginType === 'admin' ? 'Admin' : 'Member'}`}
            </Button>
          </form>

          {loginType === 'member' && (
            <div className="mt-6 text-center">
              <p className="text-gray-400 mb-3">Don't have an account?</p>
              <Link to="/signup">
                <Button variant="secondary" className="w-full">
                  <UserPlus size={20} className="mr-2" />
                  Create Member Account
                </Button>
              </Link>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
