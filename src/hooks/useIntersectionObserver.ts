import { useEffect, useState, useRef } from 'react';

interface UseIntersectionObserverProps {
    threshold?: number;
    rootMargin?: string;
    triggerOnce?: boolean;
}

export function useIntersectionObserver({
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true,
}: UseIntersectionObserverProps = {}) {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    if (triggerOnce) {
                        observer.unobserve(element);
                    }
                } else if (!triggerOnce) {
                    setIsVisible(false);
                }
            },
            { threshold, rootMargin }
        );

        observer.observe(element);

        return () => {
            if (element) observer.unobserve(element);
        };
    }, [threshold, rootMargin, triggerOnce]);

    return { ref, isVisible };
}
