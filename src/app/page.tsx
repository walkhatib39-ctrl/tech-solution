import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import WhyUs from '@/components/WhyUs';
import Services from '@/components/Services';
import KeyFigures from '@/components/KeyFigures';
import Methodology from '@/components/Methodology';
import Partners from '@/components/Partners';
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
            
            {/* Why Choose Us Section */}
            <WhyUs />
            
            {/* Services / Strategic Poles Section */}
            <Services />
            
            {/* Key Figures Section */}
            <KeyFigures />
            
            {/* Methodology Section */}
            <Methodology />
            
            {/* Partners Section */}
            <Partners />
            
            {/* Footer with Contact */}
            <Footer />
        </main>
    );
}
