'use client';

import { Shield, Target, Users, Clock, Award, Headphones } from 'lucide-react';
import RevealOnScroll from './ui/RevealOnScroll';

const reasons = [
    {
        icon: Users,
        number: '01',
        title: 'مخاطب وحيد',
        subtitle: 'Interlocuteur Unique',
        description: 'نغنيك عن التعامل مع عدة مزودين. مدير مشروع مخصص يضمن سلاسة التواصل.',
    },
    {
        icon: Target,
        number: '02',
        title: 'خبرة ميدانية عميقة',
        subtitle: 'Expertise Terrain',
        description: 'فهم دقيق لخصوصيات السوق التونسية والمؤسسات الحكومية.',
    },
    {
        icon: Clock,
        number: '03',
        title: 'سرعة ومرونة',
        subtitle: 'Agilité & Réactivité',
        description: 'فريق جاهز للتدخل السريع وإدارة الأزمات مع الالتزام بالمواعيد.',
    },
    {
        icon: Shield,
        number: '04',
        title: 'ضمان الجودة',
        subtitle: 'Garantie Qualité',
        description: 'معايير صارمة في كل مشروع مع متابعة مستمرة وتقارير دورية.',
    },
    {
        icon: Award,
        number: '05',
        title: 'خبرة مُثبتة',
        subtitle: 'Expérience Prouvée',
        description: 'أكثر من 10 سنوات خبرة و50 مشروعاً ناجحاً مع كبرى المؤسسات.',
    },
    {
        icon: Headphones,
        number: '06',
        title: 'دعم مستمر',
        subtitle: 'Support Continu',
        description: 'فريق دعم متواجد على مدار الساعة لمرافقتكم في كل خطوة.',
    },
];

export default function WhyUs() {
    return (
        <section id="why-us" className="section bg-navy-50 relative overflow-hidden py-16">
            <div className="container relative z-10">
                {/* Simplified Header */}
                <RevealOnScroll className="text-center mb-10" width="100%">
                    <h2 className="text-3xl font-bold text-navy-900">
                        لماذا <span className="text-accent-600">نحن</span> ؟
                    </h2>
                </RevealOnScroll>

                {/* Compact Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {reasons.map((reason, index) => (
                        <RevealOnScroll key={index} delay={index * 50} width="100%">
                            <div className="group bg-white border border-navy-100 rounded-xl p-5 hover:border-accent-200 hover:shadow-md transition-all duration-300 flex items-start gap-4">
                                {/* Icon */}
                                <div className="shrink-0 w-12 h-12 bg-navy-50 rounded-lg flex items-center justify-center group-hover:bg-accent-50 transition-colors duration-300">
                                    <reason.icon className="w-6 h-6 text-navy-600 group-hover:text-accent-600 transition-colors" strokeWidth={1.5} />
                                </div>

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs font-bold text-accent-600 opacity-60">
                                            {reason.number}
                                        </span>
                                        <h3 className="text-lg font-bold text-navy-900">
                                            {reason.title}
                                        </h3>
                                    </div>

                                    <p className="text-sm text-navy-500 leading-snug">
                                        {reason.description}
                                    </p>
                                </div>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}
