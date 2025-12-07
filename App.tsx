import React, { useState, useRef, useEffect } from 'react';
import { AgentStatus, ResearchPlan, FinalReport, AgentLog } from './types';
import { generateResearchPlan, executeResearchStep, synthesizeReport } from './services/geminiService';
import { StepCard } from './components/StepCard';
import { ReportView } from './components/ReportView';
import { BrainCircuit, Sparkles, StopCircle, Terminal, ChevronRight, Download, XCircle } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<AgentStatus>(AgentStatus.IDLE);
  const [topic, setTopic] = useState('');
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [report, setReport] = useState<FinalReport | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Splash Screen & PWA Install Handler
  useEffect(() => {
    // Hide splash screen after mount
    const timer = setTimeout(() => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.style.opacity = '0';
        setTimeout(() => splash.remove(), 500);
      }
    }, 1500);

    // PWA Install Event
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const addLog = (message: string, type: AgentLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString(), timestamp: Date.now(), message, type }]);
  };

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStatus(AgentStatus.IDLE);
    addLog('Research process aborted by user.', 'warning');
  };

  const handleStartResearch = async () => {
    if (!topic.trim()) return;
    
    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    setStatus(AgentStatus.PLANNING);
    setLogs([]); // Clear logs
    setPlan(null);
    setReport(null);

    try {
      addLog(`Analyzing request: "${topic}"...`, 'info');
      
      // Check abort before starting heavy tasks
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // 1. Plan
      const generatedPlan = await generateResearchPlan(topic);
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
      
      setPlan(generatedPlan);
      addLog(`Plan generated with ${generatedPlan.steps.length} steps.`, 'success');
      
      // 2. Execute
      setStatus(AgentStatus.EXECUTING);
      let updatedPlan = { ...generatedPlan };
      
      for (let i = 0; i < updatedPlan.steps.length; i++) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const step = updatedPlan.steps[i];
        
        // Update Status to In-Progress
        updatedPlan.steps[i].status = 'in-progress';
        setPlan({ ...updatedPlan });
        addLog(`Executing Step ${i + 1}: ${step.query}`, 'info');
        
        // Execute
        try {
            // We pass signal implicitly by checking it before setting results, 
            // as the Gemini client calls themselves are not easily cancellable mid-flight without hacking fetch.
            // But we can stop the loop.
            const result = await executeResearchStep(step, topic);
            
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

            updatedPlan.steps[i].result = result;
            updatedPlan.steps[i].status = 'completed';
            addLog(`Step ${i + 1} complete.`, 'success');
        } catch (e: any) {
            if (e.name === 'AbortError') throw e;
            console.error(e);
            updatedPlan.steps[i].status = 'failed';
            addLog(`Step ${i + 1} failed.`, 'error');
        }
        
        // React State Update
        setPlan({ ...updatedPlan });
        
        // Artificial delay for UX
        await new Promise(r => setTimeout(r, 800));
      }

      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      // 3. Synthesize
      setStatus(AgentStatus.SYNTHESIZING);
      addLog('Synthesizing final report...', 'info');
      const finalReport = await synthesizeReport(updatedPlan);
      
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

      setReport(finalReport);
      setStatus(AgentStatus.COMPLETED);
      addLog('Mission Complete.', 'success');

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Handled by handleStop mostly, but ensures cleanup
        setStatus(AgentStatus.IDLE);
        return;
      }
      console.error(error);
      setStatus(AgentStatus.ERROR);
      addLog('An unexpected error occurred.', 'error');
    } finally {
        abortControllerRef.current = null;
    }
  };

  const handleReset = () => {
    setStatus(AgentStatus.IDLE);
    setTopic('');
    setPlan(null);
    setReport(null);
    setLogs([]);
  };

  // Render Logic
  if (status === AgentStatus.COMPLETED && report) {
    return <ReportView report={report} onReset={handleReset} />;
  }

  const isRunning = status === AgentStatus.PLANNING || status === AgentStatus.EXECUTING || status === AgentStatus.SYNTHESIZING;

  return (
    <div className="min-h-screen bg-background text-text flex flex-col md:flex-row overflow-hidden font-sans selection:bg-primary/30">
      
      {/* Mobile/Left Panel: Agent Interface */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/5 flex items-center justify-between bg-background/80 backdrop-blur-md sticky top-0 z-20 safe-top">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === AgentStatus.IDLE ? 'bg-secondary' : 'bg-primary animate-pulse-slow'}`}>
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">DeepThink</h1>
              <p className="text-xs text-muted flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${status === AgentStatus.IDLE ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                {status === AgentStatus.IDLE ? 'Online' : status}
              </p>
            </div>
          </div>
          
          {/* PWA Install Button */}
          {showInstallBtn && (
            <button 
              onClick={handleInstallClick}
              className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-white font-medium transition-colors flex items-center gap-2"
            >
              <Download className="w-3 h-3" /> Install
            </button>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-24">
          
          {/* Welcome / Idle State */}
          {status === AgentStatus.IDLE && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-6 max-w-md mx-auto animate-in fade-in zoom-in duration-500">
              <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center border border-white/5 shadow-2xl mb-4 group">
                <Sparkles className="w-10 h-10 text-primary group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Research Assistant</h2>
                <p className="text-muted text-sm leading-relaxed px-4">
                  I can plan, verify, and execute complex research tasks to generate comprehensive reports.
                </p>
              </div>
            </div>
          )}

          {/* Active State: Plan & Logs */}
          {(status !== AgentStatus.IDLE && status !== AgentStatus.ERROR) && (
            <div className="max-w-2xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-8">
              
              {/* Current Status Banner */}
              <div className="bg-surface border border-white/10 rounded-xl p-4 flex items-center gap-4 shadow-lg">
                 <div className="relative">
                   <div className="w-10 h-10 rounded-full border-2 border-primary/30 flex items-center justify-center">
                     <Loader2Wrapper active={true} />
                   </div>
                 </div>
                 <div className="flex-1">
                    <h3 className="font-medium text-white text-sm">
                        {status === AgentStatus.PLANNING && "Constructing research strategy..."}
                        {status === AgentStatus.EXECUTING && "Executing field operations..."}
                        {status === AgentStatus.SYNTHESIZING && "Compiling intelligence..."}
                    </h3>
                    <p className="text-xs text-muted mt-0.5">Estimated time remaining: {status === AgentStatus.SYNTHESIZING ? 'Few seconds' : 'Variable'}</p>
                 </div>
              </div>

              {/* The Plan Visualizer */}
              {plan && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Research Path</h3>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded text-text/60">{plan.steps.length} Steps</span>
                  </div>
                  <div className="space-y-2">
                    {plan.steps.map((step) => (
                      <StepCard key={step.id} step={step} />
                    ))}
                  </div>
                </div>
              )}

              {/* Terminal Logs */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 font-mono text-xs max-h-48 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 text-muted mb-2 border-b border-white/5 pb-2">
                    <Terminal className="w-3 h-3" />
                    <span>System Logs</span>
                </div>
                <div className="space-y-1.5">
                    {logs.map((log) => (
                        <div key={log.id} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : log.type === 'warning' ? 'text-amber-400' : 'text-muted/80'}`}>
                            <span className="opacity-50">[{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit'})}]</span>
                            <span>{log.message}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>
              </div>
            </div>
          )}

          {status === AgentStatus.ERROR && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-center text-red-400 space-y-4 animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                    <XCircle className="w-8 h-8" />
                </div>
                <div>
                    <h3 className="font-bold text-white mb-1">Mission Failed</h3>
                    <p className="text-sm text-red-300/80">Check network connection or API quota.</p>
                </div>
                <button onClick={handleReset} className="px-6 py-2 bg-surface hover:bg-secondary border border-white/10 rounded-full text-sm text-white transition-colors">
                    Reset System
                </button>
             </div>
          )}

        </div>

        {/* Input Area (Sticky Bottom) */}
        <div className="p-4 bg-background/90 backdrop-blur-xl border-t border-white/10 safe-bottom">
          <div className="max-w-2xl mx-auto relative flex gap-2">
             <div className="relative flex-1">
                <input
                    type="text"
                    disabled={status !== AgentStatus.IDLE}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleStartResearch()}
                    placeholder={status === AgentStatus.IDLE ? "Enter a research topic..." : "Agent is working..."}
                    className="w-full bg-secondary/50 border border-white/10 text-white placeholder-muted rounded-2xl py-4 pl-5 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 transition-all shadow-inner"
                />
             </div>
             
             {isRunning ? (
                 <button
                    onClick={handleStop}
                    className="aspect-square w-[58px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-2xl flex items-center justify-center transition-all active:scale-95"
                    title="Stop Execution"
                 >
                    <StopCircle className="w-6 h-6" />
                 </button>
             ) : (
                 <button
                    disabled={!topic.trim()}
                    onClick={handleStartResearch}
                    className="aspect-square w-[58px] bg-primary hover:bg-blue-600 disabled:bg-secondary disabled:text-muted text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:shadow-none"
                 >
                    <ChevronRight className="w-6 h-6" />
                 </button>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Simple spinner component helper
const Loader2Wrapper: React.FC<{active: boolean}> = ({active}) => (
    <svg 
        className={`w-5 h-5 text-primary ${active ? 'animate-spin' : ''}`} 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24"
    >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default App;