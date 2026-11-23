import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ArchivalPlateProps {
  src: string;
  alt: string;
  caption: string;
  fallbackTitle: string;
}

export function ArchivalPlate({
  src,
  alt,
  caption,
  fallbackTitle,
}: ArchivalPlateProps) {
  const [hasError, setHasError] = useState(false);

  return (
    <figure className="my-6">
      <div className="w-full aspect-16/9 overflow-hidden bg-[#F2EDE4] border border-[#E6DFD3]">
        {!hasError ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setHasError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#F2EDE4] to-[#E6DFD3]">
            <BookOpen className="w-8 h-8 text-[#78350F] mb-3" aria-hidden="true" />
            <p className="font-editorial text-2xl text-[#1C1917]">
              {fallbackTitle}
            </p>
          </div>
        )}
      </div>
      <figcaption className="mt-2.5 text-xs font-serif italic text-[#57534E] leading-relaxed">
        {caption}
      </figcaption>
    </figure>
  );
}
