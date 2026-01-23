'use client';

import { Trophy, Clock, Phone, Users, Star, TrendingUp } from 'lucide-react';

const figures = [
    {
        icon: Trophy,
        value: '115',
        label: 'مشروع منجز',
        sublabel: 'Projets Réalisés',
    },
    {
        icon: Clock,
        value: '100%',
        label: 'التزام بالمواعيد',
        sublabel: 'Respect des Délais',
    },
    {
        icon: Phone,
        value: '24/7',
        label: 'دعم فني متواصل',
        sublabel: 'Support Technique',
    },
];

export default function KeyFigures() {
    return (
        <section className="relative py-20 bg-gradient-to-r from-accent-600 via-accent-500 to-accent-600 overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Animated Pattern */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[length:20px_20px]" />

                {/* Gradient Orbs */}
                <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-white/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-black/10 rounded-full blur-[80px]" />
            </div>

            <div className="container relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
                    {figures.map((fig, index) => (
                        <div
                            key={index}
                            className="group relative text-center"
                        >
                            {/* Divider for middle items */}
                            {index > 0 && (
                                <div className="hidden md:block absolute top-1/2 right-0 w-px h-20 bg-white/20 -translate-y-1/2 translate-x-1/2" />
                            )}

                            {/* Content */}
                            <div className="relative px-6 py-8">
                                {/* Icon */}
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6 group-hover:scale-110 group-hover:bg-white/20 transition-all duration-300">
                                    <fig.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                                </div>

                                {/* Value */}
                                <div className="text-5xl lg:text-6xl font-bold text-white mb-3 tracking-tight">
                                    {fig.value}
                                </div>

                                {/* Label */}
                                <div className="text-xl font-bold text-white mb-1">
                                    {fig.label}
                                </div>

                                {/* Sublabel */}
                                <div className="text-sm text-white/60 uppercase tracking-wider">
                                    {fig.sublabel}
                                </div>

                                {/* Hover Glow */}
                                <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Wave */}
            <div className="absolute top-0 left-0 right-0">
                <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto" preserveAspectRatio="none">
                    <path d="M0 60V0C360 40 720 50 1080 30C1260 20 1380 10 1440 0V60H0Z" fill="white" fillOpacity="0.05" />
                </svg>
            </div>

            {/* Bottom Wave */}
            <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-auto rotate-180" preserveAspectRatio="none">
                    <path d="M0 60V0C360 40 720 50 1080 30C1260 20 1380 10 1440 0V60H0Z" fill="white" fillOpacity="0.05" />
                </svg>
            </div>
        </section>
    );
}
