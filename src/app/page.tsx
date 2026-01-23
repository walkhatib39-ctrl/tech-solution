import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import TargetAudience from '@/components/TargetAudience';
import WhyUs from '@/components/WhyUs';
import Services from '@/components/Services';
import KeyFigures from '@/components/KeyFigures';
import Methodology from '@/components/Methodology';
import Partners from '@/components/Partners';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';

export default function Home() {
    return (
        <main className="min-h-screen bg-white">
            {/* Fixed Header */}
            <Header />

            {/* Hero Section with Video Background */}
            <Hero />

            {/* About / Presentation Section */}
            <About />

            {/* Services / Strategic Poles Section */}
            <Services />

            {/* Target Audience Section (Replaces old WhyUs) */}
            <TargetAudience />

            {/* Key Figures Section */}
            <KeyFigures />

            {/* Methodology Section */}
            <Methodology />

            {/* Partners Section */}
            <Partners />

            {/* Why Choose Us Section (New Compact Light Version) */}
            <WhyUs />

            {/* Contact Section */}
            <Contact />

            {/* Footer with Contact */}
            <Footer />
        </main>
    );
}
