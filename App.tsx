import React, { useState, useCallback, useRef } from 'react';
import { Product, ProductStatus, ProductType, AppSettings } from './types';
import { fetchTrends, generateMerchDesign } from './services/geminiService';
import ControlPanel from './components/ControlPanel';
import ProductCard from './components/ProductCard';
import ProductModal from './components/ProductModal';
import { CROWDFUNDING_THRESHOLD, TREND_ANALYSIS_PROMPT, DESIGN_PROMPT_PREFIX } from './constants';
import { ShoppingBag, Loader2, LayoutDashboard, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState<'admin' | 'store'>('admin');
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('atelier_products');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved products", e);
      return [];
    }
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHalting, setIsHalting] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('atelier_logs');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved logs", e);
      return [];
    }
  });
  
  // Refs for loop control
  const isPausedRef = useRef(false);
  const shouldStopRef = useRef(false);
  
  // Backend Settings State
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('atelier_settings');
      return saved ? JSON.parse(saved) : {
        trendPrompt: TREND_ANALYSIS_PROMPT,
        designStylePrompt: DESIGN_PROMPT_PREFIX,
        fundingThreshold: CROWDFUNDING_THRESHOLD,
        productionThreshold: 10
      };
    } catch (e) {
      console.error("Failed to parse saved settings", e);
      return {
        trendPrompt: TREND_ANALYSIS_PROMPT,
        designStylePrompt: DESIGN_PROMPT_PREFIX,
        fundingThreshold: CROWDFUNDING_THRESHOLD,
        productionThreshold: 10
      };
    }
  });

  // Persist state changes
  React.useEffect(() => {
    try {
      localStorage.setItem('atelier_products', JSON.stringify(products));
    } catch (e) {
      console.error("Failed to save products", e);
    }
  }, [products]);

  React.useEffect(() => {
    try {
      localStorage.setItem('atelier_logs', JSON.stringify(logs));
    } catch (e) {
      console.error("Failed to save logs", e);
    }
  }, [logs]);

  React.useEffect(() => {
    try {
      localStorage.setItem('atelier_settings', JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings", e);
    }
  }, [settings]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  // --- ACTIONS ---
  const togglePause = () => {
    isPausedRef.current = !isPausedRef.current;
    setIsPaused(isPausedRef.current);
    addLog(isPausedRef.current ? "System Paused." : "System Resumed.");
  };

  const stopGeneration = () => {
    shouldStopRef.current = true;
    isPausedRef.current = false; // Unpause to allow loop to exit
    setIsPaused(false);
    setIsHalting(true);
    addLog("System Halting... Waiting for current process to finish.");
  };

  const clearCatalog = () => {
    setProducts([]);
    setLogs(["System Reset: Catalog and logs cleared."]);
  };

  const handleScanAndGenerate = async () => {
    setIsScanning(true);
    shouldStopRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    addLog(`System Init: Diverse Catalog Mode. Threshold set to ${settings.fundingThreshold}`);
    
    try {
      // 1. Fetch Trends using Dynamic Prompt
      addLog("Connecting to Social Media Firehose...");
      const trends = await fetchTrends(settings.trendPrompt);
      
      if (trends.length === 0) {
        addLog("Warning: No viable trends detected. Check API or Prompt settings.");
        setIsScanning(false);
        return;
      }

      addLog(`Identified ${trends.length} viral signals. Initializing Atelier...`);
      
      // 2. Process trends serially
      for (let i = 0; i < trends.length; i++) {
        if (shouldStopRef.current) break;
        while (isPausedRef.current) {
          await delay(500);
          if (shouldStopRef.current) break;
        }
        if (shouldStopRef.current) break;

        const trend = trends[i];
        addLog(`[${i+1}/${trends.length}] Conceptualizing "${trend.topic}"...`);

        const allTypes = [
          ProductType.TSHIRT, ProductType.HOODIE, ProductType.CAP, 
          ProductType.TOTE, ProductType.MUG, ProductType.CUSHION, 
          ProductType.POSTER, ProductType.PHONE_CASE
        ];
        
        // Shuffle and pick 2 types per trend to avoid hitting rate limits too fast
        const shuffled = allTypes.sort(() => 0.5 - Math.random());
        const selectedTypes = shuffled.slice(0, 2);
        
        const newProductsForTrend: Product[] = [];

        for (const type of selectedTypes) {
          if (shouldStopRef.current) break;
          while (isPausedRef.current) {
            await delay(500);
            if (shouldStopRef.current) break;
          }
          if (shouldStopRef.current) break;

          addLog(`Generating ${type} for "${trend.topic}"...`);
          const design = await generateMerchDesign(trend, type, settings.designStylePrompt);

          if (design) {
            // Dynamic Pricing
            let price = 25;
            switch(type) {
              case ProductType.HOODIE: price = 65; break;
              case ProductType.TSHIRT: price = 35; break;
              case ProductType.CAP: price = 28; break;
              case ProductType.TOTE: price = 30; break;
              case ProductType.POSTER: price = 22; break;
              case ProductType.MUG: price = 18; break;
              default: price = 25;
            }

            newProductsForTrend.push({
              id: `prod-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              trendId: trend.id,
              title: `${trend.topic} - ${type}`,
              description: trend.context,
              type: type,
              designUrl: design.imageUrl,
              details: design.details,
              votes: 0,
              status: ProductStatus.DRAFT,
              price: price,
              createdAt: Date.now(),
              fundingProgress: 0
            });
          } else {
             addLog(`Error: Skipped ${type} for ${trend.topic} due to visual generation failure.`);
          }
          
          // Add a delay between requests to respect rate limits
          if (!shouldStopRef.current) {
            await delay(3000); 
          }
        }

        if (newProductsForTrend.length > 0) {
           setProducts(prev => [...newProductsForTrend, ...prev]);
           addLog(`>> Dropped ${newProductsForTrend.length} new items in catalog.`);
        }
      }
      
      if (shouldStopRef.current) {
        addLog("Generation Process Aborted.");
      } else {
        addLog("Cycle Complete. Store updated.");
      }

    } catch (e) {
      console.error(e);
      addLog("CRITICAL FAILURE: Pipeline interrupted.");
    } finally {
      setIsScanning(false);
      setIsPaused(false);
      setIsHalting(false);
      isPausedRef.current = false;
      shouldStopRef.current = false;
    }
  };

  const handleVote = useCallback((id: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const newVotes = p.votes + 1;
      let newStatus = p.status;
      
      // Use Dynamic Threshold
      if (newVotes >= settings.fundingThreshold && p.status === ProductStatus.DRAFT) {
        addLog(`THRESHOLD REACHED: ${p.title} -> CROWDFUNDING`);
        newStatus = ProductStatus.CROWDFUNDING;
      }

      return {
        ...p,
        votes: newVotes,
        status: newStatus
      };
    }));
  }, [settings.fundingThreshold]);

  const handleFund = useCallback((id: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      
      const newFunds = (p.preOrders || 0) + 1;
      let newStatus = p.status;
      
      const target = Math.ceil(settings.fundingThreshold * 0.8);
      if (newFunds >= target && p.status === ProductStatus.CROWDFUNDING) {
         newStatus = ProductStatus.FUNDED;
         addLog(`FUNDED: ${p.title} -> PRODUCTION`);
      }

      return {
        ...p,
        preOrders: newFunds,
        status: newStatus
      };
    }));
  }, [settings.fundingThreshold]);

  const handleFulfillOrder = useCallback((id: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id && p.status === ProductStatus.FUNDED) {
        addLog(`Order fulfilled for "${p.title}". Status: PRODUCTION.`);
        return { ...p, status: ProductStatus.PRODUCTION };
      }
      return p;
    }));
  }, []);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-[#050505] text-[#f5f5f5] font-sans selection:bg-white/20 flex flex-col">
      
      {/* Header */}
      <nav className="border-b border-white/10 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-4">
             <div className="w-8 h-8 border border-white/30 rounded-full flex items-center justify-center font-serif text-white text-lg">
               T
             </div>
             <span className="font-serif text-2xl tracking-widest text-white uppercase font-light">Trend<span className="font-medium">Proto</span></span>
          </div>
          
          <div className="flex items-center space-x-6">
             {/* View Switcher */}
             <div className="flex space-x-4">
                <button 
                  onClick={() => setViewMode('store')}
                  className={`text-[11px] font-medium uppercase tracking-[0.15em] transition-all ${
                    viewMode === 'store' ? 'text-white border-b border-white pb-1' : 'text-white/50 hover:text-white pb-1'
                  }`}
                >
                  Boutique
                </button>
                <button 
                  onClick={() => setViewMode('admin')}
                  className={`text-[11px] font-medium uppercase tracking-[0.15em] transition-all ${
                    viewMode === 'admin' ? 'text-white border-b border-white pb-1' : 'text-white/50 hover:text-white pb-1'
                  }`}
                >
                  Atelier
                </button>
             </div>
             
             <div className="w-px h-4 bg-white/20"></div>

             <button className="text-white hover:text-white/70 transition-colors relative">
                <ShoppingBag size={18} strokeWidth={1.5} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full"></span>
             </button>
          </div>
        </div>
      </nav>

      {/* ADMIN VIEW: Control Panel */}
      <AnimatePresence mode="wait">
        {viewMode === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <ControlPanel 
              logs={logs} 
              isScanning={isScanning} 
              isPaused={isPaused}
              isHalting={isHalting}
              onScan={handleScanAndGenerate}
              onPause={togglePause}
              onStop={stopGeneration}
              onClear={clearCatalog}
              products={products}
              settings={settings}
              onUpdateSettings={(s) => {
                setSettings(s);
                addLog(`System Config Updated.`);
              }}
              onFulfillOrder={handleFulfillOrder}
            />
          </motion.div>
        )}

        {/* STORE VIEW: Hero Section */}
        {viewMode === 'store' && (
          <motion.div
            key="store"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#050505] border-b border-white/10 overflow-hidden"
          >
             <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center grayscale mix-blend-screen"></div>
             <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/50 to-transparent"></div>
             
             <div className="relative max-w-7xl mx-auto px-6 py-32 text-center space-y-8">
                <motion.span 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="inline-block text-white/60 text-[10px] font-medium uppercase tracking-[0.3em]"
                >
                  Collection 01 — AI Generated
                </motion.span>
                <motion.h1 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="font-serif text-6xl md:text-8xl font-light text-white tracking-tight leading-none"
                >
                   Ephemeral<br/>
                   <span className="italic text-white/80">Artifacts</span>
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-white/50 max-w-md mx-auto text-sm tracking-wide font-light leading-relaxed"
                >
                  Merchandise born from the collective unconscious of the internet. 
                  Captured by AI. Curated by you. Produced on demand.
                </motion.p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area (Shared) */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-grow w-full">
         
         <div className="flex items-end justify-between mb-16 border-b border-white/10 pb-6">
            <div>
              <h2 className="font-serif text-4xl font-light text-white tracking-tight">
                Latest Arrivals
              </h2>
              <p className="text-[10px] text-white/50 mt-2 uppercase tracking-[0.2em]">
                {products.length} Items Available
              </p>
            </div>
            
            <div className="flex space-x-6 text-[10px] font-medium uppercase tracking-[0.15em]">
               <button className="text-white border-b border-white pb-1">All</button>
               <button className="text-white/50 hover:text-white transition-colors pb-1">Apparel</button>
               <button className="text-white/50 hover:text-white transition-colors pb-1">Objects</button>
            </div>
         </div>

         {/* Infinite Feed / Masonry Layout */}
         {products.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-40 text-white/40 border border-white/5 rounded-none bg-white/[0.02]">
             <Loader2 size={24} strokeWidth={1} className={`mb-6 ${isScanning ? 'animate-spin text-white' : 'text-white/20'}`} />
             <p className="text-sm font-serif italic tracking-wide">Catalog Offline</p>
             {viewMode === 'admin' ? (
               <p className="text-[10px] mt-3 uppercase tracking-[0.2em]">Initialize Atelier Protocol</p>
             ) : (
               <p className="text-[10px] mt-3 uppercase tracking-[0.2em]">Please stand by for next drop</p>
             )}
           </div>
         ) : (
           <div className="columns-1 sm:columns-2 lg:columns-3 gap-12 space-y-12">
             {products.map(product => (
               <ProductCard 
                 key={product.id} 
                 product={product} 
                 onVote={handleVote} 
                 onFund={handleFund}
                 onViewDetails={(p) => setSelectedProductId(p.id)}
                 settings={settings}
               />
             ))}
           </div>
         )}
      </main>

      {/* Product Modal */}
      <ProductModal 
        product={products.find(p => p.id === selectedProductId) || null} 
        onClose={() => setSelectedProductId(null)} 
        onVote={handleVote}
        onFund={handleFund}
        settings={settings}
      />

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-[10px] text-white/40 uppercase tracking-[0.2em] font-medium">
           <p>© 2026 TREND_PROTO</p>
           <div className="flex space-x-8 mt-6 md:mt-0">
             <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
             <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
             <span className="hover:text-white cursor-pointer transition-colors">Manifesto</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;