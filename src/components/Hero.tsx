'use client';

import Link from 'next/link';
import { ArrowLeft, Globe, CheckCircle, Building2, Sparkles } from 'lucide-react';
import RevealOnScroll from './ui/RevealOnScroll';

const stats = [
    {
        icon: Globe,
        value: '+17',
        label: 'سنوات خبرة',
        sublabel: 'Années d\'expertise',
        accent: true,
    },
    {
        icon: CheckCircle,
        value: '115',
        label: 'مشروع منجز',
        sublabel: 'Projets Réalisés',
        accent: false,
    },
    {
        icon: Building2,
        value: '+25',
        label: 'مؤسسة شريكة',
        sublabel: 'Partenaires',
        accent: true,
    },
];

// ... (stats array)

export default function Hero() {
    return (
        <section id="hero" className="relative min-h-screen flex flex-col overflow-hidden">
            {/* ... (keep background video/content) */}

            {/* Background Video */}
            <div className="absolute inset-0 z-0">
                <video
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover scale-105"
                >
                    <source src="/hero.mp4" type="video/mp4" />
                </video>

                {/* Multi-layer Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-navy-950/90 via-navy-900/80 to-navy-950/95" />
                <div className="absolute inset-0 bg-gradient-to-r from-navy-950/50 via-transparent to-navy-950/50" />

                {/* Animated Gradient Orbs */}
                <div className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-accent-500/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-navy-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 pt-32 pb-48">
                <div className="container max-w-5xl">
                    {/* Badge */}
                    <div
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-8 animate-fade-in-up"
                    >
                        <Sparkles className="w-4 h-4 text-accent-400" />
                        <span className="text-sm font-medium text-white/90">شريككم الاستراتيجي للتميز</span>
                    </div>

                    {/* Main Title */}
                    <h1
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.1] mb-8 animate-fade-in-up"
                        style={{ animationDelay: '100ms' }}
                    >
                        <span className="text-white">شريك استراتيجي واحد</span>
                        <br />
                        <span className="gradient-text-light">لحلول لا حدود لها</span>
                    </h1>

                    {/* Subtitle */}
                    <p
                        className="text-lg sm:text-xl md:text-2xl text-white/90 leading-relaxed max-w-3xl mx-auto mb-12 animate-fade-in-up"
                        style={{ animationDelay: '200ms', color: '#ffffff' }}
                    >
                        من الحلول الرقمية الذكية إلى صناعة الحدث والتأثير الإعلامي
                        <br className="hidden md:block" />
                        نقدم للمؤسسات والشركات منظومة متكاملة للنجاح والتميز
                    </p>

                    {/* CTA Buttons */}
                    <div
                        className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up"
                        style={{ animationDelay: '300ms' }}
                    >
                        <Link
                            href="#contact"
                            className="btn btn-lg bg-[#d9140e] text-white shadow-xl shadow-[#d9140e]/25 hover:shadow-[#d9140e]/40 hover:bg-[#b91010] hover:scale-105 transition-all duration-300"
                        >
                            <span>إتصل بنا</span>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <Link
                            href="#services"
                            className="btn btn-lg bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transition-all duration-300"
                        >
                            اكتشف خدماتنا
                        </Link>
                    </div>
                </div>
            </div>

            {/* Scroll Indicator */}
            <div className="absolute bottom-48 left-1/2 -translate-x-1/2 z-20 hidden md:flex flex-col items-center gap-2 animate-bounce">
                <span className="text-white/50 text-xs uppercase tracking-widest">اكتشف المزيد</span>
                <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
                </div>
            </div>

            {/* Stats Cards Section - Inside Hero with proper spacing */}
            <div className="relative z-30 bg-white pt-4 pb-16">
                <div className="container">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto px-4 -mt-20">
                        {stats.map((stat, index) => (
                            <RevealOnScroll key={index} delay={400 + index * 100} width="100%">
                                <div
                                    className="group relative bg-white rounded-2xl p-6 shadow-xl shadow-[#31486a]/10 hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-[#39547c]/10 overflow-hidden h-full"
                                >
                                    {/* Hover Gradient */}
                                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.accent
                                        ? 'bg-gradient-to-br from-[#d9140e]/5 to-transparent'
                                        : 'bg-gradient-to-br from-[#39547c]/5 to-transparent'
                                        }`} />

                                    <div className="relative flex items-center gap-4">
                                        {/* Icon */}
                                        <div className={`shrink-0 p-3 rounded-xl transition-all duration-300 group-hover:scale-110 ${stat.accent
                                            ? 'bg-[#d9140e] text-white shadow-lg shadow-[#d9140e]/30'
                                            : 'bg-[#39547c] text-white shadow-lg shadow-[#39547c]/30'
                                            }`}>
                                            <stat.icon className="w-6 h-6" strokeWidth={1.5} />
                                        </div>

                                        {/* Text */}
                                        <div className="text-right flex-1">
                                            <div className={`text-3xl font-bold mb-0.5 ${stat.accent ? 'text-[#d9140e]' : 'text-[#39547c]'
                                                }`}>
                                                {stat.value}
                                            </div>
                                            <div className="text-black font-semibold text-sm">
                                                {stat.label}
                                            </div>
                                            <div className="text-[#39547c]/60 text-xs uppercase tracking-wider mt-0.5">
                                                {stat.sublabel}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </RevealOnScroll>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
