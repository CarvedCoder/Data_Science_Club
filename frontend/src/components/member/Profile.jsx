import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, BookOpen, GraduationCap, Calendar, Code, Save, X, Check, Loader2 } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Button } from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';
import { member } from '../../services/api';

// Skill/Interest tags available for selection
const AVAILABLE_SKILLS = [
  'Machine Learning', 'Deep Learning', 'Data Visualization', 'Python',
  'R Programming', 'Statistics', 'NLP', 'Computer Vision', 'Big Data',
  'SQL', 'TensorFlow', 'PyTorch', 'Pandas', 'Data Engineering',
  'Business Analytics', 'Research', 'Kaggle', 'Web Scraping'
];

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduate'];
const BRANCH_OPTIONS = ['Computer Science', 'Information Technology', 'Electronics', 'Mechanical', 'Civil', 'Other'];

export const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    section: '',
    branch: '',
    year: '',
    skills: [],
    bio: ''
  });

  const [editedProfile, setEditedProfile] = useState({ ...profile });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const response = await member.getProfile();
      const data = response.data;
      setProfile(data);
      setEditedProfile(data);
    } catch (error) {
      // Use auth context user data as fallback
      const fallbackProfile = {
        full_name: user?.full_name || '',
        email: user?.email || '',
        section: user?.section || '',
        branch: user?.branch || '',
        year: user?.year || '',
        skills: user?.skills || [],
        bio: user?.bio || ''
      };
      setProfile(fallbackProfile);
      setEditedProfile(fallbackProfile);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!editedProfile.full_name?.trim()) {
      newErrors.full_name = 'Full name is required';
    }
    if (editedProfile.bio && editedProfile.bio.length > 300) {
      newErrors.bio = 'Bio must be under 300 characters';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    setIsSaving(true);
    try {
      await member.updateProfile(editedProfile);
      setProfile(editedProfile);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save profile:', error);
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedProfile({ ...profile });
    setErrors({});
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditedProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const toggleSkill = (skill) => {
    const currentSkills = editedProfile.skills || [];
    if (currentSkills.includes(skill)) {
      handleInputChange('skills', currentSkills.filter(s => s !== skill));
    } else if (currentSkills.length < 8) {
      handleInputChange('skills', [...currentSkills, skill]);
    }
  };

  const removeSkill = (skill) => {
    handleInputChange('skills', (editedProfile.skills || []).filter(s => s !== skill));
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Profile</h1>
            <p className="text-slate-400">Manage your personal information</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="secondary">
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button onClick={handleCancel} variant="ghost">
                <X size={18} className="mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 size={18} className="mr-2 animate-spin" />
                ) : (
                  <Save size={18} className="mr-2" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
        
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-emerald-400"
          >
            <Check size={18} />
            Profile updated successfully
          </motion.div>
        )}
      </motion.div>

      {/* Profile Card */}
      <div className="space-y-6">
        {/* Avatar & Basic Info */}
        <GlassCard>
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-3xl font-bold flex-shrink-0">
              {(editedProfile.full_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="input-label flex items-center gap-2">
                    <User size={14} />
                    Full Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editedProfile.full_name}
                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                        className={`input-field ${errors.full_name ? 'error' : ''}`}
                        placeholder="Your full name"
                      />
                      {errors.full_name && <p className="input-error">{errors.full_name}</p>}
                    </>
                  ) : (
                    <p className="text-lg font-medium">{profile.full_name || '—'}</p>
                  )}
                </div>

                {/* Email (read-only) */}
                <div>
                  <label className="input-label flex items-center gap-2">
                    <Mail size={14} />
                    Email
                  </label>
                  <p className="text-lg font-medium text-slate-400">{profile.email}</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Academic Information */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <GraduationCap size={20} className="text-indigo-400" />
            Academic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Section */}
            <div>
              <label className="input-label">Section</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedProfile.section}
                  onChange={(e) => handleInputChange('section', e.target.value)}
                  className="input-field"
                  placeholder="e.g., A, B, C"
                />
              ) : (
                <p className="font-medium">{profile.section || '—'}</p>
              )}
            </div>

            {/* Branch */}
            <div>
              <label className="input-label">Branch</label>
              {isEditing ? (
                <select
                  value={editedProfile.branch}
                  onChange={(e) => handleInputChange('branch', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select Branch</option>
                  {BRANCH_OPTIONS.map(branch => (
                    <option key={branch} value={branch}>{branch}</option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{profile.branch || '—'}</p>
              )}
            </div>

            {/* Year */}
            <div>
              <label className="input-label">Year</label>
              {isEditing ? (
                <select
                  value={editedProfile.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                  className="input-field"
                >
                  <option value="">Select Year</option>
                  {YEAR_OPTIONS.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              ) : (
                <p className="font-medium">{profile.year || '—'}</p>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Skills & Interests */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Code size={20} className="text-indigo-400" />
            Skills & Interests
            {isEditing && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                (Select up to 8)
              </span>
            )}
          </h3>
          
          {/* Selected Skills */}
          <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
            {(isEditing ? editedProfile.skills : profile.skills)?.length > 0 ? (
              (isEditing ? editedProfile.skills : profile.skills).map(skill => (
                <span key={skill} className={`tag ${isEditing ? 'tag-removable' : ''}`}>
                  {skill}
                  {isEditing && (
                    <button onClick={() => removeSkill(skill)} className="tag-remove">
                      <X size={14} />
                    </button>
                  )}
                </span>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No skills selected</p>
            )}
          </div>

          {/* Available Skills (Edit Mode) */}
          {isEditing && (
            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-400 mb-3">Click to add skills:</p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_SKILLS.filter(s => !editedProfile.skills?.includes(s)).map(skill => (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    disabled={editedProfile.skills?.length >= 8}
                    className="px-3 py-1 rounded-full text-sm bg-slate-700/50 text-slate-300 
                             hover:bg-indigo-500/30 hover:text-indigo-300 transition-colors
                             disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </GlassCard>

        {/* Bio */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen size={20} className="text-indigo-400" />
            About Me
          </h3>
          {isEditing ? (
            <>
              <textarea
                value={editedProfile.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                className={`input-field min-h-[120px] resize-none ${errors.bio ? 'error' : ''}`}
                placeholder="Tell us a bit about yourself, your interests in data science, goals..."
                maxLength={300}
              />
              <div className="flex justify-between mt-2">
                {errors.bio && <p className="input-error">{errors.bio}</p>}
                <p className={`text-sm ml-auto ${editedProfile.bio?.length > 280 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {editedProfile.bio?.length || 0}/300
                </p>
              </div>
            </>
          ) : (
            <p className="text-slate-300 whitespace-pre-wrap">
              {profile.bio || 'No bio added yet.'}
            </p>
          )}
        </GlassCard>

        {/* Membership Stats */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-400" />
            Membership
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-indigo-400">—</p>
              <p className="text-sm text-slate-400">Events Attended</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-emerald-400">—</p>
              <p className="text-sm text-slate-400">Workshops</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-purple-400">—</p>
              <p className="text-sm text-slate-400">Badges</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-slate-800/50">
              <p className="text-2xl font-bold text-amber-400">—</p>
              <p className="text-sm text-slate-400">Points</p>
            </div>
          </div>
        </GlassCard>

        {errors.submit && (
          <div className="text-center p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {errors.submit}
          </div>
        )}
      </div>
    </div>
  );
};
