'use client';

import { Building2 } from 'lucide-react';

// Placeholder partners data
const partners = [
    { id: 1, name: 'وزارة التعليم العالي' },
    { id: 2, name: 'وزارة الصحة' },
    { id: 3, name: 'البنك المركزي' },
    { id: 4, name: 'الخطوط التونسية' },
    { id: 5, name: 'اتصالات تونس' },
    { id: 6, name: 'الصندوق الوطني للتقاعد' },
    { id: 7, name: 'الشركة التونسية للكهرباء' },
    { id: 8, name: 'وزارة المالية' },
    { id: 9, name: 'الديوان الوطني للسياحة' },
    { id: 10, name: 'بريد تونس' },
    { id: 11, name: 'وزارة الفلاحة' },
    { id: 12, name: 'الهيئة الوطنية للاتصالات' },
];

export default function Partners() {
    return (
        <section id="partners" className="section bg-white relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-navy-500/3 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent-500/3 rounded-full blur-3xl" />
            </div>

            <div className="container relative z-10">
                {/* Section Header */}
                <div className="text-center mb-16">
                    {/* Label */}
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-8 h-0.5 bg-navy-300 rounded-full" />
                        <span className="text-navy-500 font-semibold text-sm uppercase tracking-wider">شركاء النجاح</span>
                        <span className="w-8 h-0.5 bg-navy-300 rounded-full" />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl lg:text-4xl font-bold text-navy-400 mb-4">
                        يثقون بنا
                    </h2>

                    {/* Subtitle */}
                    <p className="text-navy-500 max-w-xl mx-auto">
                        نفتخر بثقة كبرى المؤسسات الحكومية والخاصة في تونس
                    </p>
                </div>

                {/* Partners Marquee */}
                <div className="relative">
                    {/* Gradient Masks */}
                    <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                    {/* Scrolling Container */}
                    <div className="overflow-hidden mask-gradient">
                        <div className="flex gap-8 animate-marquee hover:[animation-play-state:paused]">
                            {/* First Set */}
                            {partners.map((partner) => (
                                <div
                                    key={partner.id}
                                    className="group flex-shrink-0 w-48 h-28 bg-navy-50 rounded-xl border border-navy-100 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-white hover:border-navy-200 hover:shadow-lg cursor-pointer"
                                >
                                    {/* Icon Placeholder */}
                                    <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-navy-400 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors duration-300">
                                        <Building2 className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    {/* Name */}
                                    <span className="text-xs font-medium text-navy-500 text-center px-2 group-hover:text-navy-700 transition-colors">
                                        {partner.name}
                                    </span>
                                </div>
                            ))}
                            {/* Duplicate Set for Seamless Loop */}
                            {partners.map((partner) => (
                                <div
                                    key={`dup-${partner.id}`}
                                    className="group flex-shrink-0 w-48 h-28 bg-navy-50 rounded-xl border border-navy-100 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:bg-white hover:border-navy-200 hover:shadow-lg cursor-pointer"
                                >
                                    {/* Icon Placeholder */}
                                    <div className="w-12 h-12 rounded-full bg-navy-100 flex items-center justify-center text-navy-400 group-hover:bg-accent-500/10 group-hover:text-accent-500 transition-colors duration-300">
                                        <Building2 className="w-6 h-6" strokeWidth={1.5} />
                                    </div>
                                    {/* Name */}
                                    <span className="text-xs font-medium text-navy-500 text-center px-2 group-hover:text-navy-700 transition-colors">
                                        {partner.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
                    {[
                        { label: 'مؤسسات حكومية', count: '+15' },
                        { label: 'شركات خاصة', count: '+20' },
                        { label: 'منظمات دولية', count: '+10' },
                    ].map((badge, i) => (
                        <div 
                            key={i}
                            className="flex items-center gap-3 px-6 py-3 bg-navy-50 rounded-full border border-navy-100"
                        >
                            <span className="text-2xl font-bold text-accent-500">{badge.count}</span>
                            <span className="text-navy-600 font-medium">{badge.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
