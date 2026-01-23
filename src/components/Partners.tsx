'use client';

import { Building2 } from 'lucide-react';

// Partner logos
// Partner logos
const partners = [
    { id: 1, image: '/partners/1.jpg', alt: 'Partner 1' },
    { id: 2, image: '/partners/2.jpg', alt: 'Partner 2' },
    { id: 3, image: '/partners/3.jpg', alt: 'Partner 3' },
    { id: 4, image: '/partners/4.jpg', alt: 'Partner 4' },
    { id: 5, image: '/partners/5.jpg', alt: 'Partner 5' },
    { id: 6, image: '/partners/6.jpg', alt: 'Partner 6' },
    { id: 7, image: '/partners/7.jpg', alt: 'Partner 7' },
    { id: 8, image: '/partners/8.jpg', alt: 'Partner 8' },
    { id: 9, image: '/partners/9.jpg', alt: 'Partner 9' },
    { id: 10, image: '/partners/10.jpg', alt: 'Partner 10' },
    { id: 11, image: '/partners/11.jpg', alt: 'Partner 11' },
];

import RevealOnScroll from './ui/RevealOnScroll';

// ... (partners array)

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
                <RevealOnScroll className="text-center mb-16" width="100%">
                    {/* Label */}
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                        <span className="text-accent-500 font-semibold text-sm uppercase tracking-wider">شركاء النجاح</span>
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                    </div>

                    {/* Title */}
                    <h2 className="text-3xl lg:text-4xl font-bold text-navy-400 mb-4">
                        يثقون بنا
                    </h2>

                    {/* Subtitle */}
                    <p className="text-navy-500 max-w-xl mx-auto">
                        نفتخر بثقة كبرى المؤسسات الحكومية والخاصة في تونس
                    </p>
                </RevealOnScroll>

                {/* Partners Marquee - CSS Infinite Scroll */}
                <RevealOnScroll className="relative group overflow-hidden" width="100%" delay={200}>
                    {/* Gradient Masks */}
                    <div className="absolute inset-y-0 left-0 w-12 md:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                    <div className="absolute inset-y-0 right-0 w-12 md:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                    {/* Scrolling Container */}
                    <div
                        className="flex w-max animate-marquee-triple md:group-hover:[animation-play-state:paused]"
                        dir="ltr"
                    >
                        {/* Render 3 sets for robust infinite looping (enough for 4k screens) */}
                        {Array(3).fill(null).map((_, setIndex) => (
                            <div key={`set-${setIndex}`} className="flex gap-8 shrink-0 pr-8">
                                {partners.map((partner) => (
                                    <div
                                        key={`set${setIndex}-${partner.id}`}
                                        className="flex-shrink-0 bg-white rounded-xl border border-navy-100 flex items-center justify-center hover:border-navy-200 hover:shadow-lg transition-all duration-300 select-none group/card"
                                        style={{ width: '192px', height: '112px' }}
                                    >
                                        <img
                                            src={partner.image}
                                            alt={partner.alt}
                                            className="max-w-[80%] max-h-[80%] object-contain opacity-70 group-hover/card:opacity-100 transition-all duration-300 grayscale group-hover/card:grayscale-0"
                                            loading="lazy"
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </RevealOnScroll>

                {/* Trust Badges */}
                <div className="mt-16 flex flex-wrap items-center justify-center gap-6">
                    {[
                        { label: 'مؤسسات حكومية', count: '+15' },
                        { label: 'شركات خاصة', count: '+20' },
                        { label: 'منظمات دولية', count: '+10' },
                    ].map((badge, i) => (
                        <RevealOnScroll key={i} delay={400 + (i * 100)}>
                            <div
                                className="flex items-center gap-3 px-6 py-3 bg-navy-50 rounded-full border border-navy-100"
                            >
                                <span className="text-2xl font-bold text-accent-500">{badge.count}</span>
                                <span className="text-navy-600 font-medium">{badge.label}</span>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}
