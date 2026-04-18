import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Send, Trash2, Flag, Loader2 } from 'lucide-react';
import api from '../services/api';

const ChatRoom = ({ reportId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useAuth();
  const socket = useSocket();

  // Load initial messages
  useEffect(() => {
    loadMessages();
  }, [reportId]);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(scrollToBottom, [messages]);

  // Socket listeners for real-time
  useEffect(() => {
    if (!socket || !reportId) return;

    socket.emit('join-user-room');

    const handleChatMessage = (data) => {
      if (data.reportId === reportId) {
        setMessages((prev) => [...prev, data]);
      }
    };

    socket.on('chat-message', handleChatMessage);
    return () => socket.off('chat-message', handleChatMessage);
  }, [socket, reportId]);

  const loadMessages = async () => {
    try {
      const { data } = await api.get(`/chat/${reportId}`);
      setMessages(data.messages || []);
    } catch (err) {
      toast.error('Failed to load chat');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    try {
      setLoading(true);
      const { data } = await api.post(`/chat/${reportId}/messages`, {
        message: newMessage.trim(),
        isAnonymous: false, // Toggle UI
      });
      // Optimistic update
      const optimisticMsg = {
        ...data.chatMessage,
        senderName: user.name,
      };
      setMessages((prev) => [optimisticMsg, ...prev]);
      setNewMessage('');
      socket.emit('chat-message', { roomId: reportId, message: optimisticMsg });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send');
    } finally {
      setLoading(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!confirm('Delete this message?')) return;
    try {
      await api.delete(`/chat/${messageId}`);
      setMessages((prev) => prev.filter((m) => m._id !== messageId));
      toast.success('Message deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="h-96 flex flex-col border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 shadow-sm">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-slate-500">Live Chat</h3>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No messages yet. Start the conversation.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className={`group flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] p-3 rounded-2xl ${msg.senderRole === 'admin' 
                ? 'bg-indigo-500 text-white' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs opacity-75 font-medium">
                    {msg.isAnonymous ? 'Anonymous' : msg.senderName}
                  </span>
                  <span className="text-xs opacity-50">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-sm break-words">{msg.message}</p>
                {msg.moderation?.flagged && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-xs rounded-full mt-1">
                    Flagged
                  </span>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type message..."
            className="input flex-1"
            disabled={!user || loading}
            maxLength={1000}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || loading || !user}
            className="btn-secondary p-2 flex items-center gap-1"
            title="Send"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {user?.role !== 'admin' && (
          <label className="flex items-center gap-2 pt-2 text-xs text-slate-500 cursor-pointer">
            <input type="checkbox" className="rounded" />
            Send anonymously
          </label>
        )}
      </form>
    </div>
  );
};

export default ChatRoom;

