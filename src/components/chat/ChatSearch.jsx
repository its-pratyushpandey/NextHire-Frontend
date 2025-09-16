import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Calendar, FileText, Image, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';


const ChatSearch = ({ 
  isOpen, 
  onClose, 
  messages, 
  onMessageSelect,
  currentUserId 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    dateRange: 'all', // 'today', 'week', 'month', 'all'
    messageType: 'all', // 'text', 'files', 'images', 'all'
    sender: 'all' // 'me', 'other', 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, filters, messages]);

  const performSearch = () => {
    let filteredMessages = messages.filter(msg => {
      // Text search
      const matchesText = msg.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         msg.fileName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Date filter
      let matchesDate = true;
      if (filters.dateRange !== 'all') {
        const now = new Date();
        const msgDate = new Date(msg.timestamp);
        
        switch (filters.dateRange) {
          case 'today':
            matchesDate = msgDate.toDateString() === now.toDateString();
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = msgDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = msgDate >= monthAgo;
            break;
        }
      }

      // Message type filter
      let matchesType = true;
      if (filters.messageType !== 'all') {
        switch (filters.messageType) {
          case 'text':
            matchesType = !msg.fileUrl && !msg.gif;
            break;
          case 'files':
            matchesType = msg.fileUrl && !msg.fileType?.startsWith('image/');
            break;
          case 'images':
            matchesType = msg.fileUrl && msg.fileType?.startsWith('image/') || msg.gif;
            break;
        }
      }

      // Sender filter
      let matchesSender = true;
      if (filters.sender !== 'all') {
        switch (filters.sender) {
          case 'me':
            matchesSender = msg.senderId === currentUserId;
            break;
          case 'other':
            matchesSender = msg.senderId !== currentUserId;
            break;
        }
      }

      return matchesText && matchesDate && matchesType && matchesSender;
    });

    setSearchResults(filteredMessages);
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const getMessageTypeIcon = (msg) => {
    if (msg.gif) return <Image className="w-4 h-4" />;
    if (msg.fileUrl) {
      if (msg.fileType?.startsWith('image/')) return <Image className="w-4 h-4" />;
      return <FileText className="w-4 h-4" />;
    }
    return null;
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 300 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 300 }}
        className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-40 flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Search Messages</h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filter Toggle */}
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="text-purple-600 dark:text-purple-400"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            {searchResults.length > 0 && (
              <span className="text-sm text-gray-500">
                {searchResults.length} results
              </span>
            )}
          </div>

          {/* Filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3"
              >
                {/* Date Range */}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Date Range
                  </label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 px-2 py-1"
                  >
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">Past week</option>
                    <option value="month">Past month</option>
                  </select>
                </div>

                {/* Message Type */}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Message Type
                  </label>
                  <select
                    value={filters.messageType}
                    onChange={(e) => setFilters(prev => ({ ...prev, messageType: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 px-2 py-1"
                  >
                    <option value="all">All types</option>
                    <option value="text">Text only</option>
                    <option value="files">Files</option>
                    <option value="images">Images & GIFs</option>
                  </select>
                </div>

                {/* Sender */}
                <div>
                  <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    Sender
                  </label>
                  <select
                    value={filters.sender}
                    onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 px-2 py-1"
                  >
                    <option value="all">Everyone</option>
                    <option value="me">My messages</option>
                    <option value="other">Their messages</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.trim() === '' ? (
            <div className="p-6 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Start typing to search messages</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No messages found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {searchResults.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => onMessageSelect(msg)}
                  className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getMessageTypeIcon(msg)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge 
                          variant={msg.senderId === currentUserId ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {msg.senderId === currentUserId ? 'You' : msg.name || 'Other'}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDate(msg.timestamp)}
                        </div>
                      </div>
                      
                      {msg.text && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {highlightText(msg.text, searchQuery)}
                        </p>
                      )}
                      
                      {msg.fileName && (
                        <p className="text-sm text-purple-600 dark:text-purple-400 truncate">
                          📎 {highlightText(msg.fileName, searchQuery)}
                        </p>
                      )}
                      
                      {msg.gif && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          🎬 GIF message
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChatSearch;
