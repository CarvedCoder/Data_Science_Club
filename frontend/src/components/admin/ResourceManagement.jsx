import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Upload, 
  Trash2, 
  FileText, 
  Video, 
  Link as LinkIcon,
  Plus,
  X,
  Search,
  Filter,
  Calendar,
  User,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import { resources, events as eventsApi } from '../../services/api';

export const ResourceManagement = () => {
  const [materials, setMaterials] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Upload form state
  const [uploadForm, setUploadForm] = useState({
    title: '',
    description: '',
    event_id: '',
    file: null
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [materialsRes, eventsRes] = await Promise.all([
        resources.getAll(),
        eventsApi.getAll()
      ]);
      setMaterials(materialsRes.data || []);
      // Handle both {events: [...]} and direct array response
      const eventsData = eventsRes.data?.events || eventsRes.data || [];
      setEvents(Array.isArray(eventsData) ? eventsData : []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadForm(prev => ({ ...prev, file, title: prev.title || file.name.replace(/\.[^/.]+$/, '') }));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.file || !uploadForm.title) {
      setError('Please provide a title and select a file');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('title', uploadForm.title);
      if (uploadForm.description) formData.append('description', uploadForm.description);
      if (uploadForm.event_id) formData.append('event_id', uploadForm.event_id);

      await resources.upload(formData);
      
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
        setShowUploadModal(false);
        setUploadForm({ title: '', description: '', event_id: '', file: null });
        fetchData();
      }, 1500);
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Failed to upload resource. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (materialId) => {
    try {
      await resources.delete(materialId);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Failed to delete resource');
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileName) => {
    if (!fileName) return FileText;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp4', 'avi', 'mov', 'webm'].includes(ext)) return Video;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return FileText;
    return FileText;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Resource Management</h1>
              <p className="text-slate-400">Upload and manage study materials for members</p>
            </div>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            <Plus className="w-5 h-5" />
            Upload Resource
          </button>
        </div>
      </motion.div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{materials.length}</p>
              <p className="text-sm text-slate-400">Total Resources</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Download className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {materials.reduce((acc, m) => acc + (m.downloads || 0), 0)}
              </p>
              <p className="text-sm text-slate-400">Total Downloads</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Calendar className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {materials.filter(m => m.event_id).length}
              </p>
              <p className="text-sm text-slate-400">Event-linked Resources</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Resources List */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-2xl border border-slate-700/50">
          <BookOpen className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">No Resources Yet</h3>
          <p className="text-slate-500 mb-6">Upload your first resource to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-500 transition-all"
          >
            <Upload className="w-5 h-5" />
            Upload Resource
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMaterials.map((material, index) => {
            const FileIcon = getFileIcon(material.file_name);
            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-lg">
                    <FileIcon className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">{material.title}</h3>
                    {material.description && (
                      <p className="text-slate-400 text-sm mb-3 line-clamp-2">{material.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        {material.file_name || 'Unknown file'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(material.uploaded_at || material.created_at)}
                      </span>
                      {material.downloads > 0 && (
                        <span className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {material.downloads} downloads
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDeleteConfirm(material.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation */}
                {deleteConfirm === material.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-slate-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-400">Are you sure you want to delete this resource?</p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(material.id)}
                          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => !uploading && setShowUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg"
            >
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Upload Resource</h2>
                  <button
                    onClick={() => !uploading && setShowUploadModal(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                    disabled={uploading}
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {uploadSuccess ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Upload Successful!</h3>
                  <p className="text-slate-400">Your resource has been uploaded successfully.</p>
                </div>
              ) : (
                <form onSubmit={handleUpload} className="p-6 space-y-5">
                  {/* File Upload */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">File</label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        uploadForm.file
                          ? 'border-indigo-500/50 bg-indigo-500/5'
                          : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                      {uploadForm.file ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText className="w-8 h-8 text-indigo-400" />
                          <div className="text-left">
                            <p className="text-white font-medium">{uploadForm.file.name}</p>
                            <p className="text-sm text-slate-400">{formatFileSize(uploadForm.file.size)}</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                          <p className="text-slate-400">Click to select a file or drag and drop</p>
                          <p className="text-sm text-slate-500 mt-1">PDF, DOC, Video, or any file type</p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Title *</label>
                    <input
                      type="text"
                      value={uploadForm.title}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter resource title"
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                    <textarea
                      value={uploadForm.description}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of the resource"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
                    />
                  </div>

                  {/* Event Link */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Link to Event (Optional)</label>
                    <select
                      value={uploadForm.event_id}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, event_id: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
                    >
                      <option value="">No event</option>
                      {events.map(event => (
                        <option key={event.id} value={event.id}>{event.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowUploadModal(false)}
                      className="px-5 py-2.5 text-slate-400 hover:text-white transition-colors"
                      disabled={uploading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={uploading || !uploadForm.file}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          Upload
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
