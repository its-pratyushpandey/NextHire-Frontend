import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

const MessageReactions = ({ 
  messageId, 
  reactions = {}, 
  onAddReaction, 
  onRemoveReaction, 
  currentUserId,
  className = ''
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '👏', '🔥'];
  
  const handleReactionClick = (emoji) => {
    const userReactions = reactions[emoji] || [];
    const hasReacted = userReactions.includes(currentUserId);
    
    if (hasReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleEmojiSelect = (emoji) => {
    handleReactionClick(emoji);
    setShowEmojiPicker(false);
  };

  const getReactionCount = (emoji) => {
    return reactions[emoji]?.length || 0;
  };

  const hasUserReacted = (emoji) => {
    return reactions[emoji]?.includes(currentUserId) || false;
  };

  const getTopReactions = () => {
    return Object.entries(reactions)
      .filter(([emoji, users]) => users.length > 0)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 6);
  };

  const topReactions = getTopReactions();

  return (
    <TooltipProvider>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Existing Reactions */}
        <AnimatePresence>
          {topReactions.map(([emoji, users]) => (
            <motion.div
              key={emoji}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReactionClick(emoji)}
                    className={`h-7 px-2 rounded-full text-xs ${
                      hasUserReacted(emoji)
                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="mr-1">{emoji}</span>
                    <span>{getReactionCount(emoji)}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="max-w-48">
                    {users.length === 1 ? (
                      `${hasUserReacted(emoji) ? 'You' : '1 person'} reacted with ${emoji}`
                    ) : hasUserReacted(emoji) ? (
                      `You and ${users.length - 1} others reacted with ${emoji}`
                    ) : (
                      `${users.length} people reacted with ${emoji}`
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Add Reaction Button */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="h-7 w-7 p-0 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                {showEmojiPicker ? <Plus className="w-4 h-4 rotate-45" /> : <Smile className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add Reaction</TooltipContent>
          </Tooltip>

          {/* Quick Emoji Picker */}
          <AnimatePresence>
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
              >
                <div className="flex gap-1">
                  {commonEmojis.map((emoji) => (
                    <motion.button
                      key={emoji}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <span className="text-lg">{emoji}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Click outside to close */}
        {showEmojiPicker && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </TooltipProvider>
  );
};

export default MessageReactions;
