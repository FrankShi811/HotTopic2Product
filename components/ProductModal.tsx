import React from 'react';
import { Product, ProductStatus, AppSettings } from '../types';
import { X, Heart, ShoppingBag, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MockupViewer from './MockupViewer';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onVote: (id: string) => void;
  onFund: (id: string) => void;
  settings: AppSettings;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onVote, onFund, settings }) => {
  if (!product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-5xl max-h-[90vh] bg-[#0a0a0a] border border-white/10 overflow-hidden flex flex-col md:flex-row shadow-2xl"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white/50 hover:text-white rounded-full transition-colors"
          >
            <X size={20} />
          </button>

          {/* Left: Image */}
          <div className="w-full md:w-1/2 bg-[#050505] relative min-h-[40vh] md:min-h-full flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-50">
               <MockupViewer type={product.type} designUrl={product.designUrl} />
            </div>
            <img 
              src={product.designUrl} 
              alt={product.title}
              className="relative z-10 w-full h-full object-contain p-8"
              referrerPolicy="no-referrer"
            />
          </div>

          {/* Right: Details */}
          <div className="w-full md:w-1/2 p-8 md:p-12 overflow-y-auto custom-scrollbar">
            <div className="space-y-8">
              
              <div className="space-y-2 border-b border-white/10 pb-6">
                <div className="flex justify-between items-start">
                  <h3 className="text-[10px] text-white/40 uppercase tracking-[0.2em]">{product.type}</h3>
                  <span className="text-white text-lg tracking-widest">${product.price}</span>
                </div>
                <h2 className="font-serif text-3xl md:text-4xl font-light text-white leading-tight">
                  {product.title.split(' - ')[0]}
                </h2>
                <p className="text-white/50 text-sm leading-relaxed pt-2">
                  {product.description}
                </p>
              </div>

              {product.details ? (
                <div className="space-y-8">
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                      <span>核心理念 (Core Concept)</span>
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed font-light">
                      {product.details.coreConcept}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                      <span>设计与外观 (Design & Appearance)</span>
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed font-light">
                      {product.details.designAppearance}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                      <span>核心创新 (Core Innovation)</span>
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed font-light">
                      {product.details.coreInnovation}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] text-white/40 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                      <span>使用场景 (Usage Scenarios)</span>
                    </h4>
                    <p className="text-white/80 text-sm leading-relaxed font-light">
                      {product.details.usageScenarios}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center border border-white/5 bg-white/[0.02]">
                  <p className="text-white/40 text-sm font-light italic">Detailed specifications are not available for this legacy artifact.</p>
                </div>
              )}

              <div className="pt-8 border-t border-white/10">
                {product.status === ProductStatus.DRAFT && (
                  <button 
                    onClick={() => onVote(product.id)}
                    className="w-full py-4 bg-white text-black hover:bg-white/90 transition-colors uppercase tracking-[0.2em] text-xs font-medium flex items-center justify-center space-x-3"
                  >
                    <Heart size={16} className={product.votes > 0 ? "fill-black" : ""} />
                    <span>Fund this Artifact ({product.votes} / {settings.fundingThreshold} Votes)</span>
                  </button>
                )}

                {product.status === ProductStatus.CROWDFUNDING && (
                  <button 
                    onClick={() => onFund(product.id)}
                    className="w-full py-4 bg-[#FF6321] text-white hover:bg-[#FF6321]/90 transition-colors uppercase tracking-[0.2em] text-xs font-medium flex items-center justify-center space-x-3"
                  >
                    <ShoppingBag size={16} />
                    <span>Pre-Order to Fund ({product.preOrders || 0} / {Math.ceil(settings.fundingThreshold * 0.8)})</span>
                  </button>
                )}

                {(product.status === ProductStatus.FUNDED || product.status === ProductStatus.PRODUCTION) && (
                  <button 
                    disabled
                    className="w-full py-4 bg-white/10 text-white/50 uppercase tracking-[0.2em] text-xs font-medium flex items-center justify-center space-x-3 cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    <span>Production Confirmed</span>
                  </button>
                )}
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductModal;
