'use client';

import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function Contact() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSubmitStatus('success');
                setFormData({
                    firstName: '',
                    lastName: '',
                    email: '',
                    phone: '',
                    message: ''
                });
                setTimeout(() => setSubmitStatus('idle'), 5000);
            } else {
                setSubmitStatus('error');
            }
        } catch (error) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <section id="contact" className="relative py-20 overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url(/contact-section-bg.jpg)' }}
            />

            {/* Overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#39547c]/95 via-[#31486a]/93 to-[#39547c]/95" />

            {/* Background Effects */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[length:30px_30px]" />
                <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-[#d9140e]/10 rounded-full blur-[100px]" />
            </div>

            <div className="container relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 mb-4">
                        <span className="text-sm font-medium text-white/90">بحاجة إلى استشارة مجانية؟</span>
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ color: '#ffffff' }}>
                        دعنا نكون شريك نجاحك. إذا كان لديك أي استفسار نحن هنا لمساعدتك.
                    </h2>
                    <p className="text-white text-lg" style={{ color: '#ffffff' }}>
                        نحن هنا للرد على استفساراتكم على مدار الساعة
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Contact Information - Right Side */}
                    <div className="order-2 lg:order-1">
                        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 h-full">
                            <h3 className="text-2xl font-bold text-white mb-8 text-right" style={{ color: '#ffffff' }}>تواصل معنا</h3>

                            <div className="space-y-6">
                                {/* Email */}
                                <div className="flex items-start gap-4 group">
                                    <div className="shrink-0 w-14 h-14 rounded-xl bg-[#d9140e] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Mail className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <h4 className="text-white font-semibold mb-1" style={{ color: '#ffffff' }}>البريد الإلكتروني</h4>
                                        <a href="mailto:contact@techsolution-group.com" className="text-white/70 hover:text-white transition-colors">
                                            contact@techsolution-group.com
                                        </a>
                                    </div>
                                </div>

                                {/* Phone */}
                                <div className="flex items-start gap-4 group">
                                    <div className="shrink-0 w-14 h-14 rounded-xl bg-[#d9140e] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <Phone className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <h4 className="text-white font-semibold mb-1" style={{ color: '#ffffff' }}>الجوال</h4>
                                        <a href="tel:+21655588350" className="text-white/70 hover:text-white transition-colors" dir="ltr">
                                            +216 55 588 350
                                        </a>
                                    </div>
                                </div>

                                {/* Location */}
                                <div className="flex items-start gap-4 group">
                                    <div className="shrink-0 w-14 h-14 rounded-xl bg-[#d9140e] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                        <MapPin className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <h4 className="text-white font-semibold mb-1" style={{ color: '#ffffff' }}>الموقع</h4>
                                        <p className="text-white/70" style={{ color: '#ffffff' }}>
                                            تونس - تونس العاصمة
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="mt-8 pt-8 border-t border-white/10">
                                <p className="text-white text-sm text-right leading-relaxed" style={{ color: '#ffffff' }}>
                                    اضغط على استفساراتك المجانية أذا كيف يمكن لمنطقة التنقية أن تساعدكم في تحقيق تحضيراتك
                                    الرقمي وتحقيق أهدافك التجارية
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form - Left Side */}
                    <div className="order-1 lg:order-2">
                        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-2xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                {/* First Name */}
                                <div>
                                    <label className="block text-sm font-medium text-[#39547c] mb-2 text-right">
                                        الاسم الأول
                                    </label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d9140e] focus:ring-2 focus:ring-[#d9140e]/20 outline-none transition-all text-right"
                                        placeholder="أدخل اسمك الأول"
                                    />
                                </div>

                                {/* Last Name */}
                                <div>
                                    <label className="block text-sm font-medium text-[#39547c] mb-2 text-right">
                                        الاسم الأخير
                                    </label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d9140e] focus:ring-2 focus:ring-[#d9140e]/20 outline-none transition-all text-right"
                                        placeholder="أدخل اسمك الأخير"
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#39547c] mb-2 text-right">
                                    البريد الإلكتروني
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d9140e] focus:ring-2 focus:ring-[#d9140e]/20 outline-none transition-all"
                                    placeholder="example@email.com"
                                    dir="ltr"
                                />
                            </div>

                            {/* Phone */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-[#39547c] mb-2 text-right">
                                    رقم الجوال
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d9140e] focus:ring-2 focus:ring-[#d9140e]/20 outline-none transition-all"
                                    placeholder="+216 12 345 678"
                                    dir="ltr"
                                />
                            </div>

                            {/* Message */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-[#39547c] mb-2 text-right">
                                    رسالتك
                                </label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows={5}
                                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-[#d9140e] focus:ring-2 focus:ring-[#d9140e]/20 outline-none transition-all resize-none text-right"
                                    placeholder="اكتب رسالتك هنا..."
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-[#d9140e] text-white font-semibold py-4 rounded-lg hover:bg-[#b91010] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>جارٍ الإرسال...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>أرسل رسالتك</span>
                                        <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            {/* Success/Error Messages */}
                            {submitStatus === 'success' && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                                    <CheckCircle className="w-5 h-5" />
                                    <span>تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.</span>
                                </div>
                            )}
                            {submitStatus === 'error' && (
                                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-right">
                                    حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى.
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
}
