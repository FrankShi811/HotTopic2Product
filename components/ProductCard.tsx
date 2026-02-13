import React from 'react';
import { Product, ProductStatus } from '../types';
import MockupViewer from './MockupViewer';
import { CROWDFUNDING_THRESHOLD } from '../constants';
import { Heart, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onVote: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onVote }) => {
  const progress = Math.min((product.votes / CROWDFUNDING_THRESHOLD) * 100, 100);
  
  return (
    <div className="break-inside-avoid mb-10 group cursor-pointer">
      <div className="relative overflow-hidden bg-slate-900 shadow-2xl transition-all duration-500 group-hover:shadow-purple-900/10">
        
        {/* Mockup Display */}
        <MockupViewer type={product.type} designUrl={product.designUrl} />

        {/* Floating Status Badge (Minimalist) */}
        <div className="absolute top-4 left-4">
           {product.status === ProductStatus.CROWDFUNDING && (
             <span className="px-3 py-1 bg-white/90 backdrop-blur text-black text-[10px] font-bold uppercase tracking-widest">
               Funding Now
             </span>
           )}
           {product.status === ProductStatus.FUNDED && (
             <span className="px-3 py-1 bg-green-500 text-black text-[10px] font-bold uppercase tracking-widest">
               Production Confirmed
             </span>
           )}
        </div>
      </div>

      {/* Content - Clean, High-Fashion Layout */}
      <div className="mt-4 space-y-2 px-1">
        <div className="flex justify-between items-start">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-widest">{product.type}</h3>
            <h2 className="text-xl font-light text-white leading-tight group-hover:text-purple-300 transition-colors">
              {product.title.split(' - ')[0]}
            </h2>
          </div>
          <div className="text-right">
             <p className="text-white font-mono text-sm">${product.price}</p>
          </div>
        </div>
        
        {/* Interactive Area */}
        <div className="pt-3 flex items-center justify-between border-t border-slate-900 group-hover:border-slate-800 transition-colors">
           <div className="flex items-center space-x-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onVote(product.id);
                }}
                disabled={product.status === ProductStatus.FUNDED}
                className={`flex items-center space-x-2 text-sm font-medium transition-all ${
                  product.votes > 0 ? 'text-white' : 'text-slate-500 group-hover:text-white'
                }`}
              >
                <Heart 
                  size={18} 
                  className={`transition-all ${product.votes > 0 ? 'fill-white scale-110' : 'group-hover:scale-110'}`} 
                />
                <span>{product.votes}</span>
              </button>
              
              <div className="h-1 w-16 bg-slate-800 rounded-full overflow-hidden ml-2">
                <div 
                  className="h-full bg-white transition-all duration-700 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
           </div>

           <button className="text-xs text-slate-500 hover:text-white uppercase tracking-widest flex items-center space-x-1 group/btn">
             <span>Details</span>
             <ArrowRight size={12} className="transform group-hover/btn:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;