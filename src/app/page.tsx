import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
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

            {/* Why Choose Us Section */}
            <WhyUs />

            {/* Key Figures Section */}
            <KeyFigures />

            {/* Methodology Section */}
            <Methodology />

            {/* Partners Section */}
            <Partners />

            {/* Contact Section */}
            <Contact />

            {/* Footer with Contact */}
            <Footer />
        </main>
    );
}
