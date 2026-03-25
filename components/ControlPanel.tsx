import React, { useEffect, useRef, useState } from 'react';
import { Activity, Play, Terminal, Zap, Settings as SettingsIcon, Save, RefreshCw, Pause, Square } from 'lucide-react';
import { AppSettings, Product, ProductStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ControlPanelProps {
  logs: string[];
  isScanning: boolean;
  isPaused: boolean;
  isHalting: boolean;
  onScan: () => void;
  onPause: () => void;
  onStop: () => void;
  onClear: () => void;
  products: Product[];
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
  onFulfillOrder?: (productId: string) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ logs, isScanning, isPaused, isHalting, onScan, onPause, onStop, onClear, products, settings, onUpdateSettings, onFulfillOrder }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'config' | 'orders'>('console');
  
  // Local state for form handling before save
  const [formState, setFormState] = useState<AppSettings>(settings);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, activeTab]);

  const handleSave = () => {
    onUpdateSettings(formState);
    setActiveTab('console');
  };

  const draftCount = products.filter(p => p.status === ProductStatus.DRAFT).length;
  const crowdfundingCount = products.filter(p => p.status === ProductStatus.CROWDFUNDING).length;
  const fundedCount = products.filter(p => p.status === ProductStatus.FUNDED || p.status === ProductStatus.PRODUCTION).length;

  return (
    <div className="bg-[#0a0a0a] border-b border-white/10 transition-all duration-300">
      <div className="max-w-7xl mx-auto p-6 flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Action & Info */}
        <div className="w-full md:w-1/3 space-y-8">
          <div>
            <h2 className="text-sm font-medium tracking-[0.2em] uppercase text-white flex items-center space-x-3">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
              <span>Atelier Core</span>
            </h2>
            <p className="text-[10px] text-white/40 mt-2 tracking-widest uppercase">
              v2.1.0 // Generative Pipeline
            </p>
          </div>

          <div className="space-y-4">
             <div className="flex flex-col gap-2">
               <button
                onClick={onScan}
                disabled={isScanning}
                className={`w-full flex items-center justify-center space-x-3 py-4 px-4 border text-[11px] uppercase tracking-[0.2em] transition-all ${
                  isScanning 
                    ? 'bg-white/5 text-white/30 cursor-not-allowed border-white/10'
                    : 'bg-white text-black hover:bg-white/90 border-white'
                }`}
              >
                {isScanning ? (
                  isHalting ? (
                    <>
                      <Square className="animate-pulse" size={14} />
                      <span>Halting...</span>
                    </>
                  ) : isPaused ? (
                    <>
                      <Pause className="animate-pulse" size={14} />
                      <span>Paused</span>
                    </>
                  ) : (
                    <>
                      <Activity className="animate-spin" size={14} />
                      <span>Processing...</span>
                    </>
                  )
                ) : (
                  <>
                    <Play size={14} fill="currentColor" />
                    <span>Execute Scraper</span>
                  </>
                )}
              </button>

              <AnimatePresence>
                {isScanning && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-2 overflow-hidden"
                  >
                    <button
                      onClick={onPause}
                      disabled={isHalting}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border text-[10px] uppercase tracking-[0.15em] transition-all ${
                        isHalting ? 'opacity-50 cursor-not-allowed border-white/10 text-white/30' :
                        isPaused 
                          ? 'bg-white/20 text-white border-white/30' 
                          : 'bg-transparent text-white/70 border-white/20 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                      <span>{isPaused ? 'Resume' : 'Pause'}</span>
                    </button>
                    <button
                      onClick={onStop}
                      disabled={isHalting}
                      className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 border transition-all text-[10px] uppercase tracking-[0.15em] ${
                        isHalting ? 'opacity-50 cursor-not-allowed border-white/10 text-white/30' : 'border-white/20 bg-transparent text-white/70 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50'
                      }`}
                    >
                      <Square size={12} fill="currentColor" />
                      <span>Halt</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
             </div>

            <div className="flex gap-2 border-b border-white/10 pb-2">
               <button 
                  onClick={() => setActiveTab('console')}
                  className={`flex-1 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${activeTab === 'console' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
               >
                  Console
               </button>
               <button 
                  onClick={() => setActiveTab('config')}
                  className={`flex-1 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${activeTab === 'config' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
               >
                  Variables
               </button>
               <button 
                  onClick={() => setActiveTab('orders')}
                  className={`flex-1 py-2 text-[10px] uppercase tracking-[0.15em] transition-colors ${activeTab === 'orders' ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
               >
                  Orders
               </button>
            </div>
          </div>
          
          <div className="p-4 border border-white/10 text-[10px] uppercase tracking-[0.15em] space-y-3 bg-white/[0.02]">
             <div className="flex justify-between text-white/50">
                <span>Vote Target:</span>
                <span className="text-white">{settings.fundingThreshold} Votes</span>
             </div>
             <div className="flex justify-between text-white/50">
                <span>Fund Target:</span>
                <span className="text-white">{Math.ceil(settings.fundingThreshold * 0.8)} Orders</span>
             </div>
             <div className="flex justify-between text-white/50 items-center pt-2 border-t border-white/10">
                <span>Catalog Size:</span>
                <div className="flex items-center space-x-3">
                  <span className="text-white">{products.length} Items</span>
                  {products.length > 0 && (
                    <button 
                      onClick={onClear}
                      className="text-red-400 hover:text-red-300 transition-colors underline decoration-red-400/30 underline-offset-2"
                    >
                      Clear All
                    </button>
                  )}
                </div>
             </div>
             <div className="pt-2 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/5 p-2 rounded-sm">
                  <div className="text-white/40 text-[8px] mb-1">DRAFT</div>
                  <div className="text-white font-mono">{draftCount}</div>
                </div>
                <div className="bg-[#FF6321]/10 p-2 rounded-sm">
                  <div className="text-[#FF6321]/60 text-[8px] mb-1">FUNDING</div>
                  <div className="text-[#FF6321] font-mono">{crowdfundingCount}</div>
                </div>
                <div className="bg-green-500/10 p-2 rounded-sm">
                  <div className="text-green-500/60 text-[8px] mb-1">PRODUCTION</div>
                  <div className="text-green-500 font-mono">{fundedCount}</div>
                </div>
             </div>
          </div>
        </div>

        {/* Right Column: Console OR Config Form */}
        <div className="w-full md:w-2/3">
           <AnimatePresence mode="wait">
             {activeTab === 'console' ? (
               <motion.div 
                 key="console"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.3 }}
                 className="bg-[#050505] border border-white/10 p-4 h-72 flex flex-col relative"
               >
                  <div className="absolute top-4 right-4 text-white/30 flex items-center space-x-2">
                    <span className="text-[9px] uppercase tracking-[0.2em]">Live Feed</span>
                    <Terminal size={12} />
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar font-mono text-[11px] leading-relaxed">
                     {logs.length === 0 && <span className="text-white/30">System ready. Waiting for command...</span>}
                     {logs.map((log, i) => (
                       <div key={i} className="flex space-x-3">
                         <span className="text-white/30 shrink-0">[{new Date().toLocaleTimeString()}]</span> 
                         <span className="text-white/80">{log}</span>
                       </div>
                     ))}
                     <div ref={logEndRef} />
                  </div>
               </motion.div>
             ) : activeTab === 'config' ? (
               <motion.div 
                 key="config"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.3 }}
                 className="bg-[#050505] border border-white/10 p-6 h-72 flex flex-col relative overflow-y-auto custom-scrollbar"
               >
                  <h3 className="text-[11px] uppercase tracking-[0.2em] text-white mb-6 flex items-center">
                    <SettingsIcon size={12} className="mr-3 text-white/50"/> 
                    Backend Variables
                  </h3>
                  
                  <div className="space-y-6 flex-1">
                     <div>
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Trend Scraper Prompt (JSON Logic)</label>
                        <textarea 
                          className="w-full bg-transparent border border-white/20 p-3 text-[11px] text-white/80 font-mono h-24 focus:border-white outline-none resize-none transition-colors"
                          value={formState.trendPrompt}
                          onChange={(e) => setFormState({...formState, trendPrompt: e.target.value})}
                        />
                     </div>
                     
                     <div>
                        <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Image Generation Style Prefix</label>
                        <input 
                          type="text" 
                          className="w-full bg-transparent border border-white/20 p-3 text-[11px] text-white/80 font-mono focus:border-white outline-none transition-colors"
                          value={formState.designStylePrompt}
                          onChange={(e) => setFormState({...formState, designStylePrompt: e.target.value})}
                        />
                     </div>

                     <div className="flex gap-4">
                       <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Vote Threshold (Draft -&gt; Funding)</label>
                          <input 
                            type="number" 
                            className="w-full bg-transparent border border-white/20 p-3 text-[11px] text-white/80 font-mono focus:border-white outline-none transition-colors"
                            value={formState.fundingThreshold}
                            onChange={(e) => setFormState({...formState, fundingThreshold: parseInt(e.target.value) || 10})}
                          />
                       </div>
                       <div className="flex-1">
                          <label className="block text-[10px] uppercase tracking-[0.15em] text-white/50 mb-2">Order Threshold (80% of Votes)</label>
                          <input 
                            type="number" 
                            disabled
                            className="w-full bg-transparent border border-white/10 p-3 text-[11px] text-white/40 font-mono outline-none cursor-not-allowed"
                            value={Math.ceil(formState.fundingThreshold * 0.8)}
                          />
                       </div>
                     </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                     <button 
                       onClick={handleSave}
                       className="bg-white hover:bg-white/90 text-black px-6 py-3 text-[10px] uppercase tracking-[0.2em] font-medium flex items-center space-x-3 transition-colors"
                     >
                       <Save size={12} />
                       <span>Update Variables</span>
                     </button>
                  </div>
               </motion.div>
             ) : activeTab === 'orders' ? (
               <motion.div 
                 key="orders"
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: -20 }}
                 transition={{ duration: 0.3 }}
                 className="bg-[#050505] border border-white/10 p-6 h-72 flex flex-col relative overflow-y-auto custom-scrollbar"
               >
                  <h3 className="text-[11px] uppercase tracking-[0.2em] text-white mb-6 flex items-center">
                    <Activity size={12} className="mr-3 text-white/50"/> 
                    Order Fulfillment
                  </h3>
                  
                  <div className="flex-1 space-y-4">
                    {products.filter(p => p.status === ProductStatus.FUNDED || p.status === ProductStatus.PRODUCTION).length === 0 ? (
                      <div className="h-full flex items-center justify-center text-white/30 text-[10px] uppercase tracking-[0.2em]">
                        No products ready for fulfillment
                      </div>
                    ) : (
                      products.filter(p => p.status === ProductStatus.FUNDED || p.status === ProductStatus.PRODUCTION).map(product => (
                        <div key={product.id} className="p-4 border border-white/10 bg-white/[0.02] flex justify-between items-center">
                          <div>
                            <h4 className="text-sm text-white font-serif">{product.title}</h4>
                            <p className="text-[10px] text-white/50 uppercase tracking-[0.15em] mt-1">
                              {product.preOrders} Orders • ${product.price}
                            </p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 ${product.status === ProductStatus.PRODUCTION ? 'bg-green-500/20 text-green-400' : 'bg-[#FF6321]/20 text-[#FF6321]'}`}>
                              {product.status}
                            </span>
                            {product.status === ProductStatus.FUNDED && onFulfillOrder && (
                              <button 
                                onClick={() => onFulfillOrder(product.id)}
                                className="text-[10px] uppercase tracking-[0.2em] px-3 py-1 bg-white text-black hover:bg-white/90 transition-colors"
                              >
                                Fulfill
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
               </motion.div>
             ) : null}
           </AnimatePresence>
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;