'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function About() {
    return (
        <section id="about" className="py-20 bg-white">
            <div className="container">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    {/* Image Side */}
                    <div className="relative order-2 lg:order-1">
                        <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#31486a]/20">
                            {/* Placeholder for team/company image */}
                            <div className="relative aspect-[4/3]">
                                <Image
                                    src="/about-us.jpg"
                                    alt="Tech-Solution Team"
                                    fill
                                    className="object-cover"
                                    sizes="(max-width: 768px) 100vw, 50vw"
                                    priority
                                />
                            </div>

                            {/* Decorative corner accent */}
                            <div className="absolute top-0 left-0 w-24 h-24 bg-[#d9140e] rounded-br-3xl flex items-center justify-center">
                                <span className="text-white font-bold text-2xl">+17</span>
                            </div>
                        </div>

                        {/* Floating badge */}
                        <div className="absolute -bottom-6 -right-6 bg-white rounded-xl p-4 shadow-xl shadow-[#31486a]/10 border border-[#39547c]/10">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-[#d9140e]/10 flex items-center justify-center">
                                    <svg className="w-6 h-6 text-[#d9140e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-[#39547c]">سنوات خبرة</p>
                                    <p className="text-sm text-black/60">في خدمة المؤسسات</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Text Side */}
                    <div className="order-1 lg:order-2 text-right">
                        {/* Section Title */}
                        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#39547c] leading-tight mb-8">
                            شريك واحد...<span className="text-[#d9140e]">منظومة متكاملة</span>
                        </h2>

                        {/* First Paragraph */}
                        <p className="text-lg text-black leading-relaxed mb-6">
                            "في عالم لا يعترف إلا بالسرعة والدقة، تتجاوز تاك سولوشن مفهوم 'مزود الخدمات' لتكون الشريك الاستراتيجي الأول للمؤسسات والجهات الحكومية والخاصة. نحن لا نكتفي بمواكبة التحول الرقمي، بل نقود هندسته عبر أقطاب تشغيلية مدمجة تجمع بين القوة التقنية، النفوذ الإعلامي، والذكاء اللوجستي."
                        </p>

                        {/* Second Paragraph */}
                        <p className="text-lg text-black leading-relaxed mb-8">
                            "مهمتنا واضحة: توفير مركز قيادة موحد يحيط بكل احتياجاتكم — من البنية التحتية الرقمية، وصولاً إلى إدارة صورتكم أمام الرأي العام. لا نبيع حلولاً، بل نضمن استمرارية وتفوق المؤسسة."
                        </p>

                        {/* CTA Button */}
                        <Link
                            href="#contact"
                            className="inline-flex items-center gap-3 px-8 py-4 border-2 border-[#39547c] text-[#39547c] font-semibold rounded-xl hover:bg-[#39547c] hover:text-white transition-all duration-300"
                        >
                            <span>الملف التعريفي</span>
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
