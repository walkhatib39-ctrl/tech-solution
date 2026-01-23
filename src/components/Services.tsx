'use client';

import { Monitor, Video, Calendar, GraduationCap, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

const services = [
    {
        id: 'digital',
        number: '01',
        title: 'الحلول الرقمية',
        subtitle: 'Solutions Digitales',
        description: 'تطوير المنظومات الذكية للمؤسسات والشركات',
        longDescription: 'نرافق المؤسسات الحكومية والخاصة في رحلة التحول الرقمي عبر حلول تقنية متكاملة.',
        icon: Monitor,
        features: [
            'تطوير المنصات والبوابات التفاعلية',
            'مواقع الويب المؤسساتية',
            'تطبيقات الجوال والحلول المدمجة'
        ],
        highlight: '',
        gradient: 'from-accent-500 to-accent-600',
        backgroundImage: '/service-digital.jpg',
    },
    {
        id: 'media',
        number: '02',
        title: 'الإعلام والاتصال',
        subtitle: 'Média & Communication',
        description: 'صناعة المحتوى والتأثير الرقمي',
        longDescription: 'نمكنكم من إيصال رسالتكم بوضوح واحترافية عبر تغطية إعلامية شاملة وشراكات حصرية تضمن الوصول للجمهور المستهدف.',
        icon: Video,
        features: [
            'التغطية الإعلامية والتوثيق',
            'البث المباشر للندوات والتظاهرات',
            'الإنتاج السمعي البصري والمقابلات'
        ],
        highlight: '',
        gradient: 'from-navy-700 to-navy-800',
        backgroundImage: '/service-media.jpg',
    },
    {
        id: 'events',
        number: '03',
        title: 'الفعاليات والعلاقات العامة',
        subtitle: 'Événements & RP',
        description: 'تنظيم متكامل وإدارة للصورة العامة',
        longDescription: 'نقدم خدمات تنظيمية شاملة (360 درجة) للمؤتمرات والأحداث الكبرى، مع الاهتمام بأدق التفاصيل اللوجستية والاتصالية.',
        icon: Calendar,
        features: [
            'تنظيم الندوات والمؤتمرات',
            'إدارة الحملات الاتصالية',
            'تصميم وإنتاج المطبوعات'
        ],
        highlight: '',
        gradient: 'from-navy-700 to-navy-800',
        iconColor: 'white',
        backgroundImage: '/service-events.png',
    },
    {
        id: 'training',
        number: '04',
        title: 'التكوين وتطوير الكفاءات',
        subtitle: 'Formation & Développement',
        description: 'الاستثمار في العنصر البشري',
        longDescription: 'نؤمن بأن التكنولوجيا وحدها لا تكفي، لذلك نقدم برامج تكوينية متخصصة لضمان نقل الخبرات وتمكين الإطارات والموظفين.',
        icon: GraduationCap,
        features: [
            'تنظيم دورات تكوينية معتمدة',
            'ورشات عمل تطبيقية للموظفين',
            'برامج المرافقة وإدارة التغيير'
        ],
        highlight: '',
        gradient: 'from-accent-500 to-accent-600',
        iconColor: 'white',
        backgroundImage: '/service-training.webp',
    }
];

export default function Services() {
    return (
        <section id="services" className="section bg-navy-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-navy-500/5 rounded-full blur-3xl" />
            </div>

            <div className="container relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    {/* Label */}
                    <div className="inline-flex items-center gap-2 mb-6">
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                        <span className="text-accent-500 font-semibold text-sm uppercase tracking-wider">خدماتنا المتكاملة</span>
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                    </div>

                    {/* Title */}
                    <h2 className="text-4xl lg:text-5xl font-bold text-navy-900 mb-6">
                        الأقطاب الاستراتيجية
                    </h2>

                    {/* Subtitle */}
                    <p className="text-lg text-navy-600 leading-relaxed">
                        أربعة محاور متكاملة لخدمة مؤسستكم — حلول رقمية، اتصال مؤسساتي، فعاليات، وتكوين يضمن استدامة الأثر.
                    </p>
                </div>

                {/* Services Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                    {services.map((service, index) => (
                        <div
                            key={service.id}
                            className="group relative rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-500 border border-navy-100 hover:border-navy-200 overflow-hidden"
                        >
                            {/* Background Image */}
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${service.backgroundImage})` }}
                            />

                            {/* Dark Overlay with #0f172a */}
                            <div className="absolute inset-0 bg-[#0f172a]/95" />

                            {/* Background Number */}
                            <div className="absolute top-4 left-4 text-[120px] font-bold text-white/10 leading-none pointer-events-none select-none group-hover:text-accent-500/10 transition-colors duration-500">
                                {service.number}
                            </div>

                            {/* Content */}
                            <div className="relative">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-6">
                                    {/* Icon */}
                                    <div className={`p-4 rounded-xl bg-gradient-to-br ${service.gradient} ${service.iconColor === 'white' ? 'text-white' : 'text-white'} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        <service.icon className="w-7 h-7" strokeWidth={1.5} />
                                    </div>


                                </div>

                                {/* Title & Subtitle */}
                                <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-accent-300 transition-colors" style={{ color: '#ffffff' }}>
                                    {service.title}
                                </h3>
                                <span className="text-sm font-medium text-white/70 uppercase tracking-wider block mb-4">
                                    {service.subtitle}
                                </span>

                                {/* Short Description */}
                                <p className="text-accent-300 font-medium mb-4" style={{ color: '#ffffff' }}>
                                    {service.description}
                                </p>

                                {/* Long Description */}
                                <p className="text-white/90 mb-6 leading-relaxed" style={{ color: '#ffffff' }}>
                                    {service.longDescription}
                                </p>

                                {/* Features List */}
                                <ul className="space-y-3 mb-8">
                                    {service.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-white/90">
                                            <CheckCircle2 className="w-5 h-5 text-accent-300 flex-shrink-0" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-6 border-t border-white/20">
                                    {/* Highlight Badge - Only show if highlight is not empty */}
                                    {service.highlight && (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-white/10 px-3 py-1.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-accent-300" />
                                            {service.highlight}
                                        </span>
                                    )}

                                    {/* CTA Link */}
                                    <Link
                                        href={`#${service.id}`}
                                        className="group/link inline-flex items-center gap-2 text-white font-semibold hover:text-accent-300 transition-colors"
                                    >
                                        اكتشف المزيد
                                        <ArrowLeft className="w-4 h-4 transition-transform group-hover/link:-translate-x-1" />
                                    </Link>
                                </div>
                            </div>

                            {/* Hover Gradient Border */}
                            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}>
                                <div className={`absolute inset-0 rounded-2xl border-2 border-transparent bg-gradient-to-br ${service.gradient} opacity-20`} style={{ WebkitMaskImage: 'linear-gradient(white, white)', maskImage: 'linear-gradient(white, white)', WebkitMaskClip: 'padding-box', WebkitMaskComposite: 'xor' }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <div className="mt-16 text-center">
                    <p className="text-navy-600 mb-6">
                        هل لديك مشروع محدد؟ نحن هنا لمساعدتك
                    </p>
                    <Link
                        href="#contact"
                        className="btn btn-primary btn-lg"
                    >
                        تحدث مع فريقنا
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
