'use client';

import { Shield, Target, Users, Clock, Award, Headphones } from 'lucide-react';

const reasons = [
    {
        icon: Users,
        number: '01',
        title: 'مخاطب وحيد',
        subtitle: 'Interlocuteur Unique',
        description: 'نغنيك عن التعامل مع عدة مزودين. مدير مشروع مخصص يضمن سلاسة التواصل وتوحيد الرؤية.',
    },
    {
        icon: Target,
        number: '02',
        title: 'خبرة ميدانية عميقة',
        subtitle: 'Expertise Terrain',
        description: 'فهم دقيق لخصوصيات السوق التونسية والمؤسسات الحكومية. حلولنا مصممة لواقعكم.',
    },
    {
        icon: Clock,
        number: '03',
        title: 'سرعة ومرونة',
        subtitle: 'Agilité & Réactivité',
        description: 'فريق جاهز للتدخل السريع وإدارة الأزمات. نلتزم بالمواعيد ونوفر حلولاً بديلة عند الضرورة.',
    },
    {
        icon: Shield,
        number: '04',
        title: 'ضمان الجودة',
        subtitle: 'Garantie Qualité',
        description: 'معايير صارمة في كل مشروع مع متابعة مستمرة وتقارير دورية لضمان أعلى مستويات الجودة.',
    },
    {
        icon: Award,
        number: '05',
        title: 'خبرة مُثبتة',
        subtitle: 'Expérience Prouvée',
        description: 'أكثر من 10 سنوات خبرة و50 مشروعاً ناجحاً مع مؤسسات حكومية وشركات كبرى.',
    },
    {
        icon: Headphones,
        number: '06',
        title: 'دعم مستمر',
        subtitle: 'Support Continu',
        description: 'فريق دعم متواجد على مدار الساعة لمرافقتكم ومساعدتكم في كل خطوة من مشروعكم.',
    },
];

export default function WhyUs() {
    return (
        <section id="why-us" className="section bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Gradient Orbs */}
                <div className="absolute top-1/4 right-0 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-navy-500/10 rounded-full blur-[120px]" />
                
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
            </div>

            <div className="container relative z-10">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    {/* Label */}
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-0.5 bg-accent-500/50 rounded-full" />
                        <span className="text-accent-400 font-semibold text-sm uppercase tracking-wider px-4 py-1.5 rounded-full bg-accent-500/10 border border-accent-500/20">
                            قيمنا وتميّزنا
                        </span>
                        <span className="w-8 h-0.5 bg-accent-500/50 rounded-full" />
                    </div>

                    {/* Title */}
                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ color: '#fff' }}>
                        <span className="text-accent-500">6</span> أسباب تجعلنا شريككم المثالي
                    </h2>

                    {/* Subtitle */}
                    <p className="text-lg text-white/70 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        نشتغل بمنطق الشراكة طويلة المدى — وضوح، سرعة، ونتائج قابلة للقياس. 
                        نحن لا نقدم خدمات فحسب، بل نحمل عنكم عبء التنفيذ والتعقيد التقني.
                    </p>
                </div>

                {/* Reasons Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {reasons.map((reason, index) => (
                        <div
                            key={index}
                            className="group relative bg-navy-800/50 backdrop-blur-sm border border-navy-700/50 rounded-2xl p-8 hover:border-accent-500/30 transition-all duration-500 hover:-translate-y-2"
                        >
                            {/* Number Badge */}
                            <div className="absolute top-6 left-6 text-6xl font-bold text-navy-700/30 group-hover:text-accent-500/20 transition-colors duration-500">
                                {reason.number}
                            </div>

                            {/* Icon */}
                            <div className="relative w-16 h-16 bg-gradient-to-br from-accent-500 to-accent-600 rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-accent-500/20 group-hover:scale-110 transition-transform duration-300">
                                <reason.icon className="w-8 h-8 text-white" strokeWidth={1.5} />
                            </div>

                            {/* Content */}
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-accent-400 transition-colors duration-300" style={{ color: '#fff' }}>
                                {reason.title}
                            </h3>
                            
                            {/* Subtitle in French */}
                            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider block mb-4" style={{ color: '#ffffffcc' }}>
                                {reason.subtitle}
                            </span>
                            
                            <p className="text-navy-300 leading-relaxed">
                                {reason.description}
                            </p>

                            {/* Bottom Glow Effect */}
                            <div className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-gradient-to-r from-accent-500 to-accent-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                    ))}
                </div>


            </div>
        </section>
    );
}
