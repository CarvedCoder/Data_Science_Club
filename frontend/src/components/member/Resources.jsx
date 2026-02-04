import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Download, 
  FileText, 
  Video, 
  Link as LinkIcon, 
  Folder,
  Search,
  Filter,
  Calendar,
  User,
  ExternalLink,
  Eye,
  Tag
} from 'lucide-react';
import { resources } from '../../services/api';

export const Resources = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const response = await resources.getAll();
      setMaterials(response.data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (material) => {
    if (material.type === 'link') {
      window.open(material.url, '_blank');
      return;
    }
    
    try {
      const response = await resources.download(material.id);
      // Create blob and download
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', material.file_name || 'download');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab
      alert('Download will be available when connected to the backend server.');
    }
  };

  // Get unique categories
  const categories = ['all', ...new Set(materials.map(m => m.category))];
  const types = ['all', 'document', 'video', 'link'];

  // Filter materials
  const filteredMaterials = materials
    .filter(m => {
      if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
      if (typeFilter !== 'all' && m.type !== typeFilter) return false;
      if (searchQuery && !m.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'document': return FileText;
      case 'video': return Video;
      case 'link': return LinkIcon;
      default: return Folder;
    }
  };

  const getTypeStyle = (type) => {
    switch (type) {
      case 'document': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'video': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'link': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
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
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Resources</h1>
        </div>
        <p className="text-slate-400 ml-12">Access study materials, documents, videos, and helpful links</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Documents</p>
              <p className="text-2xl font-bold text-white">{materials.filter(m => m.type === 'document').length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-lg">
              <Video className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Videos</p>
              <p className="text-2xl font-bold text-white">{materials.filter(m => m.type === 'video').length}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <LinkIcon className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Links</p>
              <p className="text-2xl font-bold text-white">{materials.filter(m => m.type === 'link').length}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Types</option>
              <option value="document">Documents</option>
              <option value="video">Videos</option>
              <option value="link">Links</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMaterials.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-slate-800/50 border border-slate-700/50 rounded-xl">
            <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-500" />
            <p className="text-slate-400">No resources found</p>
            {searchQuery && <p className="text-sm text-slate-500 mt-1">Try adjusting your search query</p>}
          </div>
        ) : (
          filteredMaterials.map((material, index) => {
            const TypeIcon = getTypeIcon(material.type);
            
            return (
              <motion.div
                key={material.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-indigo-500/50 transition-all group"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${getTypeStyle(material.type).split(' ')[0]}`}>
                    <TypeIcon className={`w-5 h-5 ${getTypeStyle(material.type).split(' ')[1]}`} />
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getTypeStyle(material.type)}`}>
                    {material.type}
                  </span>
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                  {material.title}
                </h3>
                <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                  {material.description}
                </p>

                {/* Category Tag */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded text-xs font-medium">
                    {material.category}
                  </span>
                  {material.size && (
                    <span className="text-slate-500 text-xs">{material.size}</span>
                  )}
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
                  <div className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{material.uploaded_by_name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(material.uploaded_at)}</span>
                  </div>
                </div>

                {/* Stats & Action */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {material.downloads !== undefined && (
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {material.downloads}
                      </span>
                    )}
                    {material.views !== undefined && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {material.views}
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleDownload(material)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-medium transition-colors"
                  >
                    {material.type === 'link' ? (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Download
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6 text-center text-sm text-slate-400"
      >
        Showing {filteredMaterials.length} of {materials.length} resources
      </motion.div>
    </div>
  );
};
