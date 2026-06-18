import { useEffect, useState } from 'react';
import { Minimize2, Square, X, ChevronLeft, ChevronRight, Disc } from 'lucide-react';
import { useNavigationStore } from '../store/navigationStore';

export default function Titlebar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const { currentView, setView } = useNavigationStore();

  useEffect(() => {
    const checkMaximized = async () => {
      if (window.electron?.window) {
        const maximized = await window.electron.window.isMaximized();
        setIsMaximized(maximized);
      }
    };
    checkMaximized();

    const interval = setInterval(checkMaximized, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMinimize = () => window.electron?.window.minimize();
  const handleMaximize = () => window.electron?.window.maximize();
  const handleClose = () => window.electron?.window.close();

  return (
    <header className="flex items-center justify-between h-12 bg-background-surface drag-region border-b border-white/[0.01] px-4 select-none">
      {/* Back and Forward navigation controls */}
      <div className="flex items-center gap-4 no-drag-region">
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setView('home')}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-background/50 text-text-secondary hover:text-text-primary hover:bg-background transition-colors"
            title="Go Home"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            disabled 
            className="flex items-center justify-center w-7 h-7 rounded-full bg-background/20 text-text-muted cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Indicator */}
        <span className="text-xs font-semibold tracking-wider text-text-secondary capitalize">
          {currentView.replace('-', ' ')}
        </span>
      </div>

      {/* Center Logo Placeholder (Visible if Sidebar is minimized, or just clean header branding) */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 opacity-40">
        <Disc className="w-3.5 h-3.5 text-accent animate-spin-slow" />
        <span className="text-[10px] font-bold tracking-widest uppercase font-sans text-text-primary">Pulse</span>
      </div>

      {/* Custom Window Controls */}
      <div className="flex items-center h-full no-drag-region">
        <button 
          onClick={handleMinimize}
          className="flex items-center justify-center w-11 h-full hover:bg-white/[0.04] transition-colors text-text-secondary hover:text-text-primary"
          title="Minimize"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleMaximize}
          className="flex items-center justify-center w-11 h-full hover:bg-white/[0.04] transition-colors text-text-secondary hover:text-text-primary"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button 
          onClick={handleClose}
          className="flex items-center justify-center w-11 h-full hover:bg-red-500/80 transition-colors text-text-secondary hover:text-white"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
