import React, { useEffect, useRef, useState } from 'react';
import { Activity, Play, Terminal, Zap, Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { AppSettings } from '../types';

interface ControlPanelProps {
  logs: string[];
  isScanning: boolean;
  onScan: () => void;
  settings: AppSettings;
  onUpdateSettings: (s: AppSettings) => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ logs, isScanning, onScan, settings, onUpdateSettings }) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'console' | 'config'>('console');
  
  // Local state for form handling before save
  const [formState, setFormState] = useState<AppSettings>(settings);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, activeTab]);

  const handleSave = () => {
    onUpdateSettings(formState);
    setActiveTab('console');
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 transition-all duration-300">
      <div className="max-w-7xl mx-auto p-4 flex flex-col md:flex-row gap-6">
        
        {/* Left Column: Action & Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <div>
            <h2 className="text-xl font-bold flex items-center space-x-2 text-white">
              <Zap className="text-yellow-400" />
              <span>System Core</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              v2.1.0 | Stable Diffusion Pipeline
            </p>
          </div>

          <div className="space-y-3">
             <button
              onClick={onScan}
              disabled={isScanning}
              className={`w-full flex items-center justify-center space-x-2 py-4 px-4 rounded-lg font-bold text-sm transition-all shadow-lg ${
                isScanning 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-purple-900/20 hover:shadow-purple-700/40'
              }`}
            >
              {isScanning ? (
                <>
                  <Activity className="animate-spin" size={18} />
                  <span>Processing Pipeline...</span>
                </>
              ) : (
                <>
                  <Play size={18} />
                  <span>Execute Trend Scraper</span>
                </>
              )}
            </button>

            <div className="flex gap-2">
               <button 
                  onClick={() => setActiveTab('console')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border ${activeTab === 'console' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                  Console
               </button>
               <button 
                  onClick={() => setActiveTab('config')}
                  className={`flex-1 py-2 text-xs font-semibold rounded border ${activeTab === 'config' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-transparent border-transparent text-slate-500 hover:text-slate-300'}`}
               >
                  Config Variables
               </button>
            </div>
          </div>
          
          <div className="bg-slate-950/50 p-3 rounded border border-slate-800 text-xs space-y-2">
             <div className="flex justify-between text-slate-400">
                <span>Active Model:</span>
                <span className="text-white font-mono">Gemini 2.5 Flash</span>
             </div>
             <div className="flex justify-between text-slate-400">
                <span>Funding Threshold:</span>
                <span className="text-green-400 font-mono">{settings.fundingThreshold} Votes</span>
             </div>
          </div>
        </div>

        {/* Right Column: Console OR Config Form */}
        <div className="w-full md:w-2/3">
           {activeTab === 'console' ? (
             <div className="bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs p-3 h-64 overflow-hidden flex flex-col relative shadow-inner">
                <div className="absolute top-2 right-2 text-slate-600 flex items-center space-x-2">
                  <span className="text-[10px] uppercase">Live Logs</span>
                  <Terminal size={14} />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                   {logs.length === 0 && <span className="text-slate-600 opacity-50">System ready. Waiting for command...</span>}
                   {logs.map((log, i) => (
                     <div key={i} className="border-l-2 border-slate-800 pl-2 py-0.5">
                       <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-green-400">{log}</span>
                     </div>
                   ))}
                   <div ref={logEndRef} />
                </div>
             </div>
           ) : (
             <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 h-64 flex flex-col relative shadow-inner overflow-y-auto custom-scrollbar">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center">
                  <SettingsIcon size={14} className="mr-2 text-purple-400"/> 
                  Backend Variables
                </h3>
                
                <div className="space-y-4 flex-1">
                   <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Trend Scraper Prompt (JSON Logic)</label>
                      <textarea 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 font-mono h-20 focus:border-purple-500 outline-none resize-none"
                        value={formState.trendPrompt}
                        onChange={(e) => setFormState({...formState, trendPrompt: e.target.value})}
                      />
                   </div>
                   
                   <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Image Generation Style Prefix</label>
                      <input 
                        type="text" 
                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 font-mono focus:border-purple-500 outline-none"
                        value={formState.designStylePrompt}
                        onChange={(e) => setFormState({...formState, designStylePrompt: e.target.value})}
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Crowdfunding Threshold (Votes)</label>
                      <input 
                        type="number" 
                        className="w-24 bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 font-mono focus:border-purple-500 outline-none"
                        value={formState.fundingThreshold}
                        onChange={(e) => setFormState({...formState, fundingThreshold: parseInt(e.target.value) || 10})}
                      />
                   </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                   <button 
                     onClick={handleSave}
                     className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded text-xs font-bold flex items-center space-x-2 transition-colors"
                   >
                     <Save size={14} />
                     <span>Update Variables</span>
                   </button>
                </div>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;