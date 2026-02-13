import React, { useState, useCallback } from 'react';
import { Product, ProductStatus, ProductType, AppSettings } from './types';
import { fetchTrends, generateMerchDesign } from './services/geminiService';
import ControlPanel from './components/ControlPanel';
import ProductCard from './components/ProductCard';
import { CROWDFUNDING_THRESHOLD, TREND_ANALYSIS_PROMPT, DESIGN_PROMPT_PREFIX } from './constants';
import { ShoppingBag, Loader2, LayoutDashboard, Store } from 'lucide-react';

// Helper for delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const App: React.FC = () => {
  // --- STATE ---
  const [viewMode, setViewMode] = useState<'admin' | 'store'>('admin');
  const [products, setProducts] = useState<Product[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Backend Settings State
  const [settings, setSettings] = useState<AppSettings>({
    trendPrompt: TREND_ANALYSIS_PROMPT,
    designStylePrompt: DESIGN_PROMPT_PREFIX,
    fundingThreshold: CROWDFUNDING_THRESHOLD
  });

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  // --- ACTIONS ---
  const handleScanAndGenerate = async () => {
    setIsScanning(true);
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
        const trend = trends[i];
        addLog(`[${i+1}/${trends.length}] Conceptualizing "${trend.topic}"...`);

        const design = await generateMerchDesign(trend, settings.designStylePrompt);

        if (design) {
           // Randomly select 2-3 product types for this specific trend to create variety
           // instead of making every product for every trend
           const allTypes = [
             ProductType.TSHIRT, ProductType.HOODIE, ProductType.CAP, 
             ProductType.TOTE, ProductType.MUG, ProductType.CUSHION, 
             ProductType.POSTER, ProductType.PHONE_CASE
           ];
           
           // Shuffle and pick 3
           const shuffled = allTypes.sort(() => 0.5 - Math.random());
           const selectedTypes = shuffled.slice(0, 3);
           
           const newProductsForTrend: Product[] = [];
           
           selectedTypes.forEach((type) => {
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
                votes: 0, // Reset to 0 as requested for frontend interaction
                status: ProductStatus.DRAFT,
                price: price,
                createdAt: Date.now(),
                fundingProgress: 0
              });
           });
           
           setProducts(prev => [...newProductsForTrend, ...prev]);
           addLog(`>> Dropped ${selectedTypes.length} new items in catalog.`);
        } else {
           addLog(`Error: Skipped ${trend.topic} due to visual generation failure.`);
        }

        // Add a delay between requests to respect rate limits
        if (i < trends.length - 1) {
          await delay(3000); 
        }
      }
      
      addLog("Cycle Complete. Store updated.");

    } catch (e) {
      console.error(e);
      addLog("CRITICAL FAILURE: Pipeline interrupted.");
    } finally {
      setIsScanning(false);
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
      } else if (newVotes >= settings.fundingThreshold * 2 && p.status === ProductStatus.CROWDFUNDING) {
         newStatus = ProductStatus.FUNDED;
         addLog(`FUNDED: ${p.title} -> PRODUCTION`);
      }

      return {
        ...p,
        votes: newVotes,
        status: newStatus
      };
    }));
  }, [settings.fundingThreshold]);

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-black text-slate-200 font-sans selection:bg-white/20 flex flex-col">
      
      {/* Header */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-white rounded-none flex items-center justify-center font-black text-black text-xl">
               TP
             </div>
             <span className="font-light text-xl tracking-widest text-white uppercase">Trend<span className="font-bold">Proto</span></span>
          </div>
          
          <div className="flex items-center space-x-4">
             {/* View Switcher */}
             <div className="bg-slate-900/50 rounded-full p-1 flex border border-white/10">
                <button 
                  onClick={() => setViewMode('store')}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'store' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <Store size={12} />
                  <span className="hidden sm:inline">Shop</span>
                </button>
                <button 
                  onClick={() => setViewMode('admin')}
                  className={`flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    viewMode === 'admin' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'
                  }`}
                >
                  <LayoutDashboard size={12} />
                  <span className="hidden sm:inline">System</span>
                </button>
             </div>
             
             <button className="text-white hover:text-slate-300 transition-colors relative">
                <ShoppingBag size={20} />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
             </button>
          </div>
        </div>
      </nav>

      {/* ADMIN VIEW: Control Panel */}
      {viewMode === 'admin' && (
        <ControlPanel 
          logs={logs} 
          isScanning={isScanning} 
          onScan={handleScanAndGenerate}
          settings={settings}
          onUpdateSettings={(s) => {
            setSettings(s);
            addLog(`System Config Updated.`);
          }}
        />
      )}

      {/* STORE VIEW: Hero Section */}
      {viewMode === 'store' && (
        <div className="relative bg-black border-b border-white/5 overflow-hidden">
           <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2000&auto=format&fit=crop')] opacity-20 bg-cover bg-center grayscale mix-blend-screen"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
           
           <div className="relative max-w-7xl mx-auto px-6 py-24 text-center space-y-6">
              <span className="inline-block px-4 py-1 border border-white/30 text-white text-[10px] font-bold uppercase tracking-[0.3em] backdrop-blur-md">
                season_01 // ai_generated
              </span>
              <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter uppercase leading-none">
                 Ephemeral<br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 to-slate-600">Artifacts</span>
              </h1>
              <p className="text-slate-400 max-w-lg mx-auto text-sm md:text-base tracking-wide font-light">
                Merchandise born from the collective unconscious of the internet. 
                Captured by AI. Curated by you. Produced on demand.
              </p>
           </div>
        </div>
      )}

      {/* Main Content Area (Shared) */}
      <main className="max-w-7xl mx-auto px-6 py-16 flex-grow w-full">
         
         <div className="flex items-end justify-between mb-12 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-3xl font-light text-white uppercase tracking-tighter">
                Latest Drops
              </h2>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                {products.length} Items Available
              </p>
            </div>
            
            <div className="flex space-x-4 text-xs font-bold uppercase tracking-widest">
               <button className="text-white border-b border-white pb-1">All</button>
               <button className="text-slate-600 hover:text-white transition-colors pb-1">Apparel</button>
               <button className="text-slate-600 hover:text-white transition-colors pb-1">Objects</button>
            </div>
         </div>

         {/* Infinite Feed / Masonry Layout */}
         {products.length === 0 ? (
           <div className="flex flex-col items-center justify-center py-32 text-slate-600 border border-dashed border-white/10 rounded-none bg-white/5">
             <Loader2 size={32} className={`mb-6 ${isScanning ? 'animate-spin text-white' : 'text-slate-700'}`} />
             <p className="text-lg font-light tracking-widest uppercase">Catalog Offline</p>
             {viewMode === 'admin' ? (
               <p className="text-xs mt-2 font-mono">INITIALIZE_SCRAPER_PROTOCOL</p>
             ) : (
               <p className="text-xs mt-2 font-mono">PLEASE STAND BY FOR NEXT DROP</p>
             )}
           </div>
         ) : (
           <div className="columns-1 sm:columns-2 lg:columns-3 gap-10 space-y-10">
             {products.map(product => (
               <ProductCard key={product.id} product={product} onVote={handleVote} />
             ))}
           </div>
         )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 text-center">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-xs text-slate-600 uppercase tracking-widest font-bold">
           <p>© 2024 TREND_PROTO</p>
           <div className="flex space-x-6 mt-4 md:mt-0">
             <span>Terms</span>
             <span>Privacy</span>
             <span>Manifesto</span>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default App;