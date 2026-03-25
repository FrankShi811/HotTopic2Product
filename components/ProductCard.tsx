import React from 'react';
import { Product, ProductStatus, AppSettings } from '../types';
import MockupViewer from './MockupViewer';
import { Heart, ArrowRight, ShoppingBag, CheckCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface ProductCardProps {
  product: Product;
  onVote: (id: string) => void;
  onFund: (id: string) => void;
  onViewDetails: (product: Product) => void;
  settings: AppSettings;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onVote, onFund, onViewDetails, settings }) => {
  const isDraft = product.status === ProductStatus.DRAFT;
  const isCrowdfunding = product.status === ProductStatus.CROWDFUNDING;
  const isFunded = product.status === ProductStatus.FUNDED || product.status === ProductStatus.PRODUCTION;
  
  let progress = 0;
  if (isDraft) {
    progress = Math.min((product.votes / settings.fundingThreshold) * 100, 100);
  } else if (isCrowdfunding) {
    const target = Math.ceil(settings.fundingThreshold * 0.8);
    progress = Math.min(((product.preOrders || 0) / target) * 100, 100);
  } else {
    progress = 100;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="break-inside-avoid mb-12 group cursor-pointer"
      onClick={() => onViewDetails(product)}
    >
      <div className="relative overflow-hidden bg-[#0a0a0a] transition-all duration-700">
        
        {/* Mockup Display */}
        <MockupViewer type={product.type} designUrl={product.designUrl} />

        {/* Floating Status Badge (Minimalist) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
           {product.status === ProductStatus.CROWDFUNDING && (
             <span className="px-3 py-1.5 bg-white text-black text-[9px] font-medium uppercase tracking-[0.2em] shadow-sm">
               Funding Now
             </span>
           )}
           {product.status === ProductStatus.FUNDED && (
             <span className="px-3 py-1.5 bg-white text-black text-[9px] font-medium uppercase tracking-[0.2em] shadow-sm">
               Production Confirmed
             </span>
           )}
        </div>
      </div>

      {/* Content - Clean, High-Fashion Layout */}
      <div className="mt-6 space-y-4 px-1">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{product.type}</h3>
            <h2 className="font-serif text-2xl font-light text-white leading-tight group-hover:text-white/70 transition-colors">
              {product.title.split(' - ')[0]}
            </h2>
          </div>
          <div className="text-right pt-1">
             <p className="text-white text-sm tracking-widest">${product.price}</p>
          </div>
        </div>
        
        {/* Interactive Area */}
        <div className="pt-4 flex items-center justify-between border-t border-white/10 group-hover:border-white/30 transition-colors">
           <div className="flex items-center space-x-4">
              {isDraft && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(product.id);
                  }}
                  className={`flex items-center space-x-2 text-xs transition-all ${
                    product.votes > 0 ? 'text-white' : 'text-white/40 group-hover:text-white'
                  }`}
                >
                  <Heart 
                    size={16} 
                    strokeWidth={1.5}
                    className={`transition-all ${product.votes > 0 ? 'fill-white scale-110' : 'group-hover:scale-110'}`} 
                  />
                  <span className="font-mono text-[11px]">{product.votes}</span>
                </button>
              )}

              {isCrowdfunding && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onFund(product.id);
                  }}
                  className="flex items-center space-x-2 text-xs transition-all text-[#FF6321] hover:text-[#FF6321]/80"
                >
                  <ShoppingBag size={16} strokeWidth={1.5} />
                  <span className="font-mono text-[11px]">{product.preOrders || 0}</span>
                </button>
              )}

              {isFunded && (
                <div className="flex items-center space-x-2 text-xs text-white/50">
                  <CheckCircle size={16} strokeWidth={1.5} />
                  <span className="font-mono text-[11px]">FUNDED</span>
                </div>
              )}
              
              <div className="h-[1px] w-16 bg-white/10 overflow-hidden ml-2">
                <div 
                  className={`h-full transition-all duration-1000 ease-out ${isCrowdfunding ? 'bg-[#FF6321]' : 'bg-white'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
           </div>

           <button 
             onClick={(e) => {
               e.stopPropagation();
               onViewDetails(product);
             }}
             className="text-[10px] text-white/40 hover:text-white uppercase tracking-[0.2em] flex items-center space-x-2 group/btn transition-colors"
           >
             <span>View Details</span>
             <ArrowRight size={12} strokeWidth={1.5} className="transform group-hover/btn:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;