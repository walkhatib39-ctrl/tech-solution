'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, TrendingUp, Clock, ArrowRight } from 'lucide-react';

interface Message {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    message: string;
    createdAt: string;
}

export default function AdminDashboard() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMessages();
    }, []);

    const fetchMessages = async () => {
        try {
            const response = await fetch('/api/messages');
            const data = await response.json();
            if (data.success) {
                setMessages(data.messages);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const recentMessages = messages.slice(0, 5);
    const todayMessages = messages.filter(m => {
        const messageDate = new Date(m.createdAt);
        const today = new Date();
        return messageDate.toDateString() === today.toDateString();
    });

    const stats = [
        {
            label: 'Total Messages',
            value: messages.length,
            icon: MessageSquare,
            color: 'bg-blue-500',
        },
        {
            label: 'Today',
            value: todayMessages.length,
            icon: TrendingUp,
            color: 'bg-green-500',
        },
        {
            label: 'This Week',
            value: messages.filter(m => {
                const messageDate = new Date(m.createdAt);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return messageDate >= weekAgo;
            }).length,
            icon: Clock,
            color: 'bg-purple-500',
        },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-[#d9140e] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Title */}
            <div>
                <div className="text-2xl font-bold text-gray-900">Dashboard</div>
                <p className="text-gray-600 mt-1">Welcome to your admin panel</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={index}
                            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                                </div>
                                <div className={`${stat.color} p-3 rounded-lg`}>
                                    <Icon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Recent Messages */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                    <div className="text-lg font-semibold text-gray-900">Recent Messages</div>
                    <Link
                        href="/admin/messages"
                        className="text-sm text-[#d9140e] hover:text-[#b91010] font-medium flex items-center gap-1"
                    >
                        View All
                        <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>

                <div className="divide-y divide-gray-200">
                    {recentMessages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No messages yet
                        </div>
                    ) : (
                        recentMessages.map((message) => (
                            <div key={message.id} className="p-6 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="font-semibold text-gray-900">
                                            {message.firstName} {message.lastName}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">{message.email}</p>
                                        <p className="text-sm text-gray-700 mt-2 line-clamp-2">{message.message}</p>
                                    </div>
                                    <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                                        {new Date(message.createdAt).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
