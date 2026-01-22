'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Mail, Phone, MapPin, ArrowUpLeft, Linkedin, Facebook, Twitter, Instagram } from 'lucide-react';

const quickLinks = [
    { name: 'الرئيسية', href: '#hero' },
    { name: 'لماذا نحن؟', href: '#why-us' },
    { name: 'خدماتنا', href: '#services' },
    { name: 'منهجيتنا', href: '#methodology' },
    { name: 'شركاؤنا', href: '#partners' },
];

const services = [
    { name: 'الحلول الرقمية', href: '#services' },
    { name: 'الإعلام والاتصال المؤسساتي', href: '#services' },
    { name: 'الفعاليات والعلاقات العامة', href: '#services' },
    { name: 'التكوين وتطوير الكفاءات', href: '#services' },
];

const legalLinks = [
    { name: 'الإشعارات القانونية', href: '#' },
    { name: 'سياسة الخصوصية', href: '#' },
    { name: 'بيان الولوجية', href: '#' },
    { name: 'خريطة الموقع', href: '#' },
];

const socialLinks = [
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
];

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer id="contact" className="relative bg-gradient-to-b from-navy-900 to-navy-950 text-white overflow-hidden">
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent-500 to-transparent" />

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-500/5 rounded-full blur-[150px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-navy-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Main Content */}
            <div className="container relative z-10 pt-20 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 mb-16">
                    
                    {/* Brand Column */}
                    <div className="lg:col-span-4">
                        {/* Logo */}
                        <Link href="/" className="inline-block mb-6">
                            <div className="relative w-48 h-14">
                                <Image
                                    src="/logo-teh-solution.png"
                                    alt="Tech-Solution"
                                    fill
                                    className="object-contain object-right brightness-0 invert"
                                />
                            </div>
                        </Link>

                        {/* Description */}
                        <p className="mb-8 leading-relaxed max-w-sm" style={{ color: '#fff' }}>
                            شريككم الاستراتيجي للتحول الرقمي للمؤسسات. نرافق الجهات العمومية والشركات الكبرى عبر حلول تقنية واتصال مؤسساتي شامل.
                        </p>

                        {/* Social Links */}
                        <div className="flex gap-3">
                            {socialLinks.map((social) => (
                                <a
                                    key={social.name}
                                    href={social.href}
                                    aria-label={social.name}
                                    className="w-10 h-10 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center text-navy-400 hover:bg-accent-500 hover:border-accent-500 hover:text-white transition-all duration-300"
                                >
                                    <social.icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="lg:col-span-2">
<h4 className="text-lg font-bold text-white mb-6 pb-3 border-b border-navy-800" style={{ color: '#fff' }}>
    روابط سريعة
</h4>
                        <ul className="space-y-3">
                            {quickLinks.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500/50 group-hover:bg-accent-500 transition-colors" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Services */}
                    <div className="lg:col-span-3">
<h4 className="text-lg font-bold text-white mb-6 pb-3 border-b border-navy-800" style={{ color: '#fff' }}>
    خدماتنا
</h4>
                        <ul className="space-y-3">
                            {services.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                                    >
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent-500/50 group-hover:bg-accent-500 transition-colors" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact Info */}
                    <div className="lg:col-span-3">
<h4 className="text-lg font-bold text-white mb-6 pb-3 border-b border-navy-800" style={{ color: '#fff' }}>
    تواصل معنا
</h4>
                        
                        <div className="space-y-4">
                            {/* Phone */}
                            <a
                                href="tel:+21655588350"
                                className="group flex items-start gap-4 p-4"
                            >
                                <div className="p-2 rounded-lg text-accent-400">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-navy-400 uppercase tracking-wider mb-1">الهاتف</div>
                                    <div className="text-white font-semibold" dir="ltr">+216 55 588 350</div>
                                </div>
                            </a>

                            {/* Email */}
                            <a
                                href="mailto:contact@tech-solution.tn"
                                className="group flex items-start gap-4 p-4"
                            >
                                <div className="p-2 rounded-lg text-accent-400">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-navy-400 uppercase tracking-wider mb-1">البريد الإلكتروني</div>
                                    <div className="text-white font-semibold">contact@tech-solution.tn</div>
                                </div>
                            </a>

                            {/* Address */}
                            <div className="flex items-start gap-4 p-4">
                                <div className="p-2 rounded-lg text-accent-400">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="text-white">
                                    1 نهج الحبيب بوقطفة، حمام الأنف 2055
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 border-t border-navy-800">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        {/* Copyright */}
                        <p className="text-navy-400 text-sm text-center lg:text-right">
                            © {currentYear} <span className="text-white font-medium">Tech-Solution</span>. جميع الحقوق محفوظة.
                        </p>

                        {/* Legal Links */}
                        <div className="flex flex-wrap justify-center gap-6">
                            {legalLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="text-sm text-navy-400 hover:text-white transition-colors"
                                >
                                    {link.name}
                                </Link>
                            ))}
                        </div>

                        {/* Back to Top */}
                        <a
                            href="#hero"
                            className="group flex items-center gap-2 text-sm text-navy-400 hover:text-white transition-colors"
                        >
                            العودة للأعلى
                            <span className="w-8 h-8 rounded-lg bg-navy-800 border border-navy-700 flex items-center justify-center group-hover:bg-accent-500 group-hover:border-accent-500 transition-all duration-300">
                                <ArrowUpLeft className="w-4 h-4 rotate-45" />
                            </span>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
