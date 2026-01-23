import { Building2, Globe2, Lightbulb, Users2, Landmark, Briefcase } from 'lucide-react';
import RevealOnScroll from './ui/RevealOnScroll';

const audience = [
    {
        icon: Briefcase,
        title: 'الرؤساء التنفيذيون وأصحاب الشركات',
        subtitle: 'CEOs & Business Owners',
        description: 'نرافقكم في اتخاذ القرارات الاستراتيجية الحاسمة من خلال حلول تقنية تعزز النمو وتضمن الاستدامة.',
    },
    {
        icon: Building2,
        title: 'المنشأت المتوسطة والكبيرة',
        subtitle: 'Medium & Large Enterprises',
        description: 'نمكنكم من تسريع التحول الرقمي وتبني أحدث التقنيات لزيادة الكفاءة التشغيلية والتنافسية.',
    },
    {
        icon: Landmark,
        title: 'الجهات الحكومية وشبه الحكومية',
        subtitle: 'Government & Semi-Gov',
        description: 'نقدم حلولاً سيادية آمنة تضمن حماية البيانات الوطنية وتدعم البنية التحتية الرقمية للدولة.',
    },
    {
        icon: Lightbulb,
        title: 'المستثمرون ورواد الأعمال',
        subtitle: 'Investors & Entrepreneurs',
        description: 'نوفر لكم بيانات دقيقة وتحليلات سوقية متقدمة لاكتشاف الفرص الواعدة وتقليل المخاطر.',
    },
    {
        icon: Users2,
        title: 'الجمعيات والمؤسسات غير الربحية',
        subtitle: 'Non-Profits & NGOs',
        description: 'نساعدكم على توسيع نطاق تأثيركم المجتمعي من خلال أدوات رقمية فعالة ومنصات تواصل متطورة.',
    },
    {
        icon: Globe2,
        title: 'المنظمات والهيئات الدولية',
        subtitle: 'International Organizations',
        description: 'شريك موثوق لتنفيذ البرامج التنموية والمشاريع الممولة دولياً، مع التزام تام بمعايير الامتثال والشفافية.',
    },
];

export default function TargetAudience() {
    return (
        <section id="target-audience" className="section bg-navy-950 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-navy-900/50 rounded-full blur-3xl opacity-20" />
                <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-accent-900/10 rounded-full blur-3xl opacity-20" />
            </div>

            <div className="container relative z-10">
                <RevealOnScroll className="text-center max-w-3xl mx-auto mb-16" width="100%">
                    <div className="inline-flex items-center gap-3 mb-6">
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                        <span className="text-accent-500 font-semibold text-sm uppercase tracking-wider">شركاء النجاح</span>
                        <span className="w-8 h-0.5 bg-accent-500 rounded-full" />
                    </div>

                    <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6" style={{ color: '#fff' }}>
                        لمن نقدم <span className="text-accent-500">خدماتنا</span> ؟
                    </h2>

                    <p className="text-white text-lg leading-relaxed" style={{ color: '#fff' }}>
                        نصمم حلولنا لتلبية احتياجات النخبة من القادة والمؤسسات الطموحة.
                    </p>
                </RevealOnScroll>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                    {audience.map((item, index) => (
                        <RevealOnScroll key={index} delay={index * 100} width="100%" className={index === audience.length - 1 && audience.length % 3 !== 0 ? "lg:col-start-2" : ""}>
                            {/* Center the last item if it's orphaned in a 3-col grid */}
                            <div className="group h-full bg-navy-900 border border-navy-800 hover:border-accent-500/50 rounded-2xl p-8 transition-all duration-300 hover:shadow-2xl hover:shadow-accent-500/10 hover:-translate-y-1">
                                <div className="w-14 h-14 bg-navy-800 rounded-xl flex items-center justify-center mb-6 group-hover:bg-accent-50 transition-colors duration-300">
                                    <item.icon className="w-7 h-7 text-accent-500 group-hover:text-white transition-colors duration-300" />
                                </div>

                                <h3 className="text-lg font-bold text-white mb-2" style={{ color: '#fff' }}>
                                    {item.title}
                                </h3>

                                <span className="text-sm font-bold text-white uppercase tracking-wider block mb-4 group-hover:text-accent-400 transition-colors" style={{ color: '#fff' }}>
                                    {item.subtitle}
                                </span>

                                <p className="text-white leading-relaxed font-medium" style={{ color: '#fff' }}>
                                    {item.description}
                                </p>
                            </div>
                        </RevealOnScroll>
                    ))}
                </div>
            </div>
        </section>
    );
}

