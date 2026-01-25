import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Clock, AlertCircle, ArrowLeft, Mail, Lock, User, CheckCircle, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../common/Button';

export const Signup = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '', // Changed from 'name' to 'full_name'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [signupResult, setSignupResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signup(formData);
      setSignupResult(result);
      setSuccess(true);
      // Don't auto-redirect - show the approval pending message
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail[0]?.msg || 'Signup failed');
      } else {
        setError('Signup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <Link
            to="/login"
            className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </Link>

          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/30">
              <UserPlus className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="text-slate-400 mt-2 text-sm">Join the Data Science Club community</p>
          </div>

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-6 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              {/* Success Message */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-emerald-400">Account Created!</h3>
                    <p className="text-emerald-300/70 text-sm">Awaiting admin approval</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm mb-4">
                  Your account has been created successfully! An administrator must approve
                  your registration within <strong className="text-white">3 minutes</strong>.
                </p>
                {signupResult && (
                  <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 font-mono">
                    <p>User ID: {signupResult.user_id?.substring(0, 8)}...</p>
                    <p>Request ID: {signupResult.approval_request_id?.substring(0, 8)}...</p>
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300/80 text-sm">
                  <strong className="text-amber-400">Important:</strong> If not approved within 3 minutes, 
                  your request will expire and you'll need to contact an administrator.
                </p>
              </div>

              <Button
                variant="secondary"
                className="w-full"
                onClick={() => navigate('/login')}
                icon={ArrowLeft}
              >
                Return to Login
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="your.email@example.com"
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
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Create a strong password"
                      required
                      minLength={8}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    At least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <Button type="submit" className="w-full" size="lg" loading={loading} icon={UserPlus}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>

              {/* Login Link */}
              <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
                <p className="text-slate-400 text-sm">
                  Already have an account?{' '}
                  <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Sign in here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};