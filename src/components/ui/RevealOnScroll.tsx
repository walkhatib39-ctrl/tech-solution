'use client';

import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';

interface RevealOnScrollProps {
    children: React.ReactNode;
    className?: string;
    delay?: number;
    width?: 'fit-content' | '100%';
    threshold?: number;
}

export default function RevealOnScroll({
    children,
    className = '',
    delay = 0,
    width = 'fit-content',
    threshold = 0.1,
}: RevealOnScrollProps) {
    const { ref, isVisible } = useIntersectionObserver({ threshold, triggerOnce: true });

    return (
        <div
            ref={ref}
            style={{ width, transitionDelay: `${delay}ms` }}
            className={`transition-all duration-1000 ease-out ${isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-10'
                } ${className}`}
        >
            {children}
        </div>
    );
}
