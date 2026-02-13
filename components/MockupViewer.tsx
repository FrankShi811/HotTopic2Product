import React, { useState } from 'react';
import { ProductType } from '../types';
import { 
  MOCKUP_BASE_TSHIRT, MOCKUP_BASE_MUG, MOCKUP_BASE_PHONE,
  MOCKUP_BASE_HOODIE, MOCKUP_BASE_TOTE, MOCKUP_BASE_CAP,
  MOCKUP_BASE_CUSHION, MOCKUP_BASE_POSTER
} from '../constants';
import { ImageOff } from 'lucide-react';

interface MockupViewerProps {
  type: ProductType;
  designUrl: string;
  className?: string;
}

const MockupViewer: React.FC<MockupViewerProps> = ({ type, designUrl, className = "" }) => {
  const [imgError, setImgError] = useState(false);
  
  let baseImage = MOCKUP_BASE_TSHIRT;
  // Overlay styles: positioning (top/left), sizing (w/h), and rotation if needed
  let overlayStyle = "top-[25%] left-[28%] w-[44%] h-[50%]"; 

  switch (type) {
    case ProductType.HOODIE:
      baseImage = MOCKUP_BASE_HOODIE;
      overlayStyle = "top-[30%] left-[32%] w-[36%] h-[36%]";
      break;
    case ProductType.MUG:
      baseImage = MOCKUP_BASE_MUG;
      overlayStyle = "top-[35%] left-[30%] w-[35%] h-[35%] opacity-90"; // Mugs wrap, keep small
      break;
    case ProductType.PHONE_CASE:
      baseImage = MOCKUP_BASE_PHONE;
      overlayStyle = "top-[20%] left-[38%] w-[25%] h-[55%]";
      break;
    case ProductType.TOTE:
      baseImage = MOCKUP_BASE_TOTE;
      overlayStyle = "top-[40%] left-[30%] w-[40%] h-[40%]";
      break;
    case ProductType.CAP:
      baseImage = MOCKUP_BASE_CAP;
      overlayStyle = "top-[25%] left-[35%] w-[30%] h-[30%] opacity-90";
      break;
    case ProductType.CUSHION:
      baseImage = MOCKUP_BASE_CUSHION;
      overlayStyle = "top-[20%] left-[20%] w-[60%] h-[60%] opacity-90";
      break;
    case ProductType.POSTER:
      baseImage = MOCKUP_BASE_POSTER;
      overlayStyle = "top-[22%] left-[27%] w-[46%] h-[56%] shadow-inner";
      break;
    default: // T-Shirt
      baseImage = MOCKUP_BASE_TSHIRT;
      overlayStyle = "top-[25%] left-[28%] w-[44%] h-[50%]";
  }

  return (
    <div className={`relative overflow-hidden rounded-none bg-slate-900 aspect-[3/4] group ${className}`}>
      {/* Base Product Image */}
      <img 
        src={baseImage} 
        alt={type} 
        loading="lazy"
        className="w-full h-full object-cover opacity-100 transition-transform duration-1000 group-hover:scale-105"
      />
      
      {/* Design Overlay */}
      <div className={`absolute ${overlayStyle} flex items-center justify-center pointer-events-none transition-all duration-500`}>
        {!imgError && designUrl ? (
           <img 
             src={designUrl} 
             alt="Generated Design" 
             loading="lazy"
             onError={(e) => {
               console.warn("Image load failed", e);
               setImgError(true);
             }}
             // mix-blend-multiply allows the white background of the design to disappear, 
             // showing the texture of the product beneath.
             className="w-full h-full object-contain mix-blend-multiply opacity-90 filter brightness-105 contrast-110" 
           />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 opacity-60 bg-slate-800/50 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
             <ImageOff size={24} />
             <span className="text-[10px] uppercase font-bold mt-2 tracking-widest">Asset Missing</span>
          </div>
        )}
      </div>
      
      {/* High-end glossy finish overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/10 via-white/5 to-transparent pointer-events-none opacity-50"></div>
    </div>
  );
};

export default MockupViewer;