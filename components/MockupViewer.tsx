import React, { useState } from 'react';
import { ProductType } from '../types';
import { ImageOff } from 'lucide-react';

interface MockupViewerProps {
  type: ProductType;
  designUrl: string;
  className?: string;
}

const MockupViewer: React.FC<MockupViewerProps> = ({ type, designUrl, className = "" }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`relative overflow-hidden rounded-none bg-[#0a0a0a] aspect-[3/4] group ${className}`}>
      {!imgError && designUrl ? (
        <img 
          src={designUrl} 
          alt={`${type} Mockup`} 
          loading="lazy"
          onError={(e) => {
            console.warn("Image load failed", e);
            setImgError(true);
          }}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" 
        />
      ) : (
        <div className="flex flex-col items-center justify-center h-full w-full text-white/30 bg-white/[0.02] p-4 backdrop-blur-sm">
           <ImageOff size={24} strokeWidth={1} />
           <span className="text-[10px] uppercase font-medium mt-4 tracking-[0.2em]">Asset Missing</span>
        </div>
      )}
      
      {/* High-end glossy finish overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-white/5 to-transparent pointer-events-none opacity-40 mix-blend-overlay"></div>
    </div>
  );
};

export default MockupViewer;