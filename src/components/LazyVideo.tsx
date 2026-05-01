'use client';
import { useEffect, useRef, useState } from 'react';

interface LazyVideoProps {
  src: string;
  className?: string;
  [key: string]: any;
}

export function LazyVideo({ src, className, ...props }: LazyVideoProps) {
  const [isVisible, setIsVisible] = useState(false);
  const videoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    });

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={videoRef} className={className}>
      {isVisible ? (
        <video src={src} className="h-full w-full object-cover" {...props} />
      ) : (
        <div className="h-full w-full bg-zinc-900 animate-pulse" />
      )}
    </div>
  );
}
