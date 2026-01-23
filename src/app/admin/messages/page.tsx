'use client';

import { useEffect, useState } from 'react';
import { Trash2, Search, Mail, Phone, Calendar, AlertCircle } from 'lucide-react';

interface Message {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
    createdAt: string;
}

export default function MessagesPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);

    useEffect(() => {
        fetchMessages();
    }, []);

    useEffect(() => {
        if (searchQuery) {
            const filtered = messages.filter(m =>
                m.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.phone.includes(searchQuery) ||
                m.message.toLowerCase().includes(searchQuery.toLowerCase())
            );
            setFilteredMessages(filtered);
        } else {
            setFilteredMessages(messages);
        }
    }, [searchQuery, messages]);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/messages');
            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
                setFilteredMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        setDeleteId(id);
        try {
            const response = await fetch(`/api/messages/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== id));
            } else {
                alert('Failed to delete message');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('An error occurred');
        } finally {
            setDeleteId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#d9140e] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-2xl font-bold text-gray-900">Messages</div>
                    <p className="text-gray-600 mt-1">
                        {messages.length} total message{messages.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            {/* Search Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#d9140e] focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Messages List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {filteredMessages.length === 0 ? (
                    <div className="p-12 text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500">
                            {searchQuery ? 'No messages found matching your search' : 'No messages yet'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {filteredMessages.map((message) => (
                            <div
                                key={message.id}
                                className="p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    {/* Message Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Name */}
                                        <div className="text-base font-semibold text-gray-900 mb-2">
                                            {message.firstName} {message.lastName}
                                        </div>

                                        {/* Contact Info */}
                                        <div className="flex flex-wrap gap-4 mb-3">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Mail className="w-4 h-4" />
                                                <a
                                                    href={`mailto:${message.email}`}
                                                    className="hover:text-[#d9140e] transition-colors"
                                                >
                                                    {message.email}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <Phone className="w-4 h-4" />
                                                <a
                                                    href={`tel:${message.phone}`}
                                                    className="hover:text-[#d9140e] transition-colors"
                                                >
                                                    {message.phone}
                                                </a>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(message.createdAt).toLocaleString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>

                                        {/* Message Text */}
                                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {message.message}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => handleDelete(message.id)}
                                        disabled={deleteId === message.id}
                                        className="shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                        title="Delete message"
                                    >
                                        {deleteId === message.id ? (
                                            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Trash2 className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
