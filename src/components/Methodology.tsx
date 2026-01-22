'use client';



const steps = [
    {
        id: 1,
        title: 'التشخيص والتحليل',
        subtitle: 'Audit & Diagnostic',
        description: 'فهم احتياجاتكم بدقة وتحديد نطاق العمل ومؤشرات النجاح.',
    },
    {
        id: 2,
        title: 'الاستراتيجية',
        subtitle: 'Stratégie & Plans',
        description: 'وضع خطة عمل مفصلة وخارطة طريق واضحة وقابلة للتنفيذ.',
    },
    {
        id: 3,
        title: 'التنفيذ',
        subtitle: 'Déploiement',
        description: 'تطبيق الحلول بأعلى معايير الجودة مع تسليمات مرحلية.',
    },
    {
        id: 4,
        title: 'المرافقة',
        subtitle: 'Suivi & Support',
        description: 'الدعم المستمر والتحسين بعد الإطلاق لضمان الاستدامة.',
    }
];

export default function Methodology() {
    return (
        <section id="methodology" className="py-24 bg-white relative overflow-hidden">
            {/* Subtle background accents */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-24 -left-24 w-[380px] h-[380px] rounded-full bg-[#31486a]/5 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-[300px] h-[300px] rounded-full bg-[#39547c]/5 blur-3xl" />
            </div>

            <div className="container relative z-10">
                {/* Header */}
                <div className="text-center max-w-3xl mx-auto mb-14">
                    <div className="inline-flex items-center gap-2 mb-4">
                        <span className="w-8 h-0.5 bg-[#d9140e] rounded-full" />
                        <span className="text-[#d9140e] font-semibold text-sm">منهجية العمل</span>
                        <span className="w-8 h-0.5 bg-[#d9140e] rounded-full" />
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-[#39547c] mb-4">كيف نعمل؟</h2>
                    <p className="text-lg leading-relaxed text-black/70">
                        مقاربة استشارية مؤسسية واضحة وبسيطة — من التشخيص إلى الإطلاق، مع مرافقة مستمرة.
                    </p>
                </div>

                {/* Steps */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {steps.map((step) => (
                        <div
                            key={step.id}
                            className="relative bg-white rounded-2xl p-6 border border-[#39547c]/15 shadow-lg shadow-[#31486a]/5 hover:shadow-xl hover:shadow-[#31486a]/10 transition-all duration-300 hover:-translate-y-1"
                        >
                            {/* Step number badge */}
                            <div className="absolute -top-4 right-6 w-9 h-9 rounded-full bg-[#d9140e] text-white text-sm font-bold flex items-center justify-center">
                                {step.id}
                            </div>

                            {/* Title */}
                            <div className="text-lg md:text-xl font-bold text-[#39547c] mb-1 leading-snug">{step.title}</div>
                            {/* Subtitle */}
                            <span className="block text-xs font-semibold uppercase tracking-wider text-[#39547c]/70 mb-3">
                                {step.subtitle}
                            </span>
                            {/* Description */}
                            <p className="text-black/80 leading-relaxed">{step.description}</p>

                            {/* Bottom accent line */}
                            <div className="absolute bottom-0 left-6 right-6 h-1 rounded-t-full bg-[#31486a]/10 group-hover:bg-[#31486a]/20 transition-colors" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
