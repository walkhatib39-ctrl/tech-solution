'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronDown } from 'lucide-react';

const navLinks = [
    { name: 'الرئيسية', href: '#hero' },
    { name: 'لماذا نحن؟', href: '#why-us' },
    { name: 'خدماتنا', href: '#services' },
    { name: 'منهجيتنا', href: '#methodology' },
    { name: 'شركاؤنا', href: '#partners' },
];

export default function Header() {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [activeSection, setActiveSection] = useState('hero');

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);

            // Update active section based on scroll
            const sections = navLinks.map(link => link.href.replace('#', ''));
            for (const section of sections.reverse()) {
                const element = document.getElementById(section);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    if (rect.top <= 150) {
                        setActiveSection(section);
                        break;
                    }
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, []);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isMobileMenuOpen]);

    return (
        <>
            <header
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 bg-white ${
                    isScrolled
                        ? 'py-3 shadow-lg shadow-[#31486a]/10'
                        : 'py-5'
                }`}
            >
                <div className="container">
                    <div className="flex items-center justify-between">
                        {/* Logo */}
                        <Link 
                            href="/" 
                            className="relative z-50 flex items-center group"
                        >
                            <div className="relative w-44 h-12 transition-transform duration-300 group-hover:scale-105">
                                <Image
                                    src="/logo-teh-solution.png"
                                    alt="Tech-Solution"
                                    fill
                                    className="object-contain object-right"
                                    priority
                                />
                            </div>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={`relative px-4 py-2 text-[0.9375rem] font-medium transition-all duration-300 rounded-lg group ${
                                        activeSection === link.href.replace('#', '')
                                            ? 'text-[#d9140e]'
                                            : 'text-[#39547c] hover:text-[#d9140e]'
                                    }`}
                                >
                                    {link.name}
                                    {/* Active indicator */}
                                    <span 
                                        className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-[#d9140e] rounded-full transition-all duration-300 ${
                                            activeSection === link.href.replace('#', '') 
                                                ? 'w-6 opacity-100' 
                                                : 'w-0 opacity-0 group-hover:w-4 group-hover:opacity-50'
                                        }`}
                                    />
                                </Link>
                            ))}
                        </nav>

                        {/* Desktop CTA */}
                        <div className="hidden lg:flex items-center gap-4">
                            <Link
                                href="#contact"
                                className="btn btn-sm bg-[#d9140e] text-white hover:bg-[#b91010] shadow-lg shadow-[#d9140e]/25 hover:shadow-[#d9140e]/40 transition-all duration-300"
                            >
                                تواصل معنا
                            </Link>
                        </div>

                        {/* Mobile Menu Toggle */}
                        <button
                            className={`lg:hidden relative z-50 p-2 rounded-lg transition-colors ${
                                isMobileMenuOpen 
                                    ? 'text-white' 
                                    : 'text-[#39547c]'
                            }`}
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            aria-label={isMobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                            aria-expanded={isMobileMenuOpen}
                        >
                            <div className="w-6 h-6 relative">
                                <span 
                                    className={`absolute left-0 block w-6 h-0.5 rounded-full transition-all duration-300 ${
                                        isMobileMenuOpen 
                                            ? 'top-1/2 -translate-y-1/2 rotate-45 bg-white' 
                                            : 'top-1 bg-current'
                                    }`}
                                />
                                <span 
                                    className={`absolute left-0 top-1/2 -translate-y-1/2 block h-0.5 rounded-full transition-all duration-300 ${
                                        isMobileMenuOpen 
                                            ? 'w-0 opacity-0' 
                                            : 'w-6 bg-current'
                                    }`}
                                />
                                <span 
                                    className={`absolute left-0 block w-6 h-0.5 rounded-full transition-all duration-300 ${
                                        isMobileMenuOpen 
                                            ? 'top-1/2 -translate-y-1/2 -rotate-45 bg-white' 
                                            : 'bottom-1 bg-current'
                                    }`}
                                />
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay */}
            <div
                className={`fixed inset-0 z-40 lg:hidden transition-all duration-500 ${
                    isMobileMenuOpen 
                        ? 'opacity-100 pointer-events-auto' 
                        : 'opacity-0 pointer-events-none'
                }`}
            >
                {/* Backdrop */}
                <div 
                    className={`absolute inset-0 bg-navy-950/60 backdrop-blur-sm transition-opacity duration-500 ${
                        isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                />

                {/* Menu Content */}
                <div
                    className={`absolute inset-y-0 right-0 w-full max-w-sm bg-gradient-to-b from-navy-900 to-navy-950 shadow-2xl transition-transform duration-500 ease-out ${
                        isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    }`}
                >
                    {/* Decorative Background */}
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute top-0 left-0 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-navy-600/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
                    </div>

                    {/* Content */}
                    <div className="relative h-full flex flex-col pt-24 pb-8 px-6">
                        {/* Navigation Links */}
                        <nav className="flex-1 flex flex-col gap-2">
                            {navLinks.map((link, index) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`group flex items-center gap-4 py-4 px-4 rounded-xl text-xl font-semibold transition-all duration-300 ${
                                        activeSection === link.href.replace('#', '')
                                            ? 'bg-white/10 text-white'
                                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                                    }`}
                                    style={{
                                        transitionDelay: isMobileMenuOpen ? `${index * 50}ms` : '0ms',
                                        transform: isMobileMenuOpen ? 'translateX(0)' : 'translateX(20px)',
                                        opacity: isMobileMenuOpen ? 1 : 0,
                                    }}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                        activeSection === link.href.replace('#', '')
                                            ? 'bg-accent-500'
                                            : 'bg-white/30 group-hover:bg-accent-400'
                                    }`} />
                                    {link.name}
                                </Link>
                            ))}
                        </nav>

                        {/* CTA Button */}
                        <div 
                            className="pt-6 border-t border-white/10"
                            style={{
                                transitionDelay: isMobileMenuOpen ? '300ms' : '0ms',
                                transform: isMobileMenuOpen ? 'translateY(0)' : 'translateY(20px)',
                                opacity: isMobileMenuOpen ? 1 : 0,
                            }}
                        >
                            <Link
                                href="#contact"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="btn btn-primary w-full justify-center text-lg"
                            >
                                تواصل معنا
                            </Link>
                        </div>

                        {/* Contact Info */}
                        <div 
                            className="mt-8 text-center"
                            style={{
                                transitionDelay: isMobileMenuOpen ? '350ms' : '0ms',
                                opacity: isMobileMenuOpen ? 1 : 0,
                            }}
                        >
                            <p className="text-white/40 text-sm">contact@tech-solution.tn</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
