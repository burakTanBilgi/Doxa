import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { toPng, toSvg } from 'html-to-image';
import { ChartProvider } from './context/ChartContext';
import ControlPanel from './components/ControlPanel';
import VisualizationCanvas from './components/VisualizationCanvas';

// Memoized components to prevent unnecessary re-renders
const MemoizedControlPanel = memo(ControlPanel);
const MemoizedVisualizationCanvas = memo(VisualizationCanvas);

function AppContent() {
  const canvasRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const isSyncingRef = useRef(false); // Flag to prevent recursion
  const [isExporting, setIsExporting] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('Untitled Analysis');
  const [analysisDescription, setAnalysisDescription] = useState('Character Profile Analysis');
  const [mainHovered, setMainHovered] = useState(false);
  const [canvasHovered, setCanvasHovered] = useState(false);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [bothAtTop, setBothAtTop] = useState(true);
  const [rightAtTop, setRightAtTop] = useState(true);
  const [mobileTab, setMobileTab] = useState('view'); // 'control' | 'view'

  // Check if panels are at top
  useEffect(() => {
    const checkAtTop = () => {
      const left = leftPanelRef.current;
      const right = rightPanelRef.current;
      if (!left || !right) return;
      
      const atTop = left.scrollTop < 5 && right.scrollTop < 5;
      setBothAtTop(atTop);
      setRightAtTop(right.scrollTop < 5);
    };

    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (left && right) {
      left.addEventListener('scroll', checkAtTop, { passive: true });
      right.addEventListener('scroll', checkAtTop, { passive: true });
      checkAtTop();
    }

    return () => {
      if (left) left.removeEventListener('scroll', checkAtTop);
      if (right) right.removeEventListener('scroll', checkAtTop);
    };
  }, []);

  useEffect(() => {
    if (!scrollSyncEnabled) return;
    // Disable scroll sync on mobile (below lg breakpoint) since only one panel is visible
    const isMobile = window.matchMedia('(max-width: 1023px)').matches;
    if (isMobile) return;
    
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    // Sync scroll by percentage - both panels reach bottom together
    // When one is at X%, the other should also be at X%
    const syncFromLeft = () => {
      if (isSyncingRef.current) return;
      
      const leftMax = left.scrollHeight - left.clientHeight;
      const rightMax = right.scrollHeight - right.clientHeight;
      if (leftMax <= 0 || rightMax <= 0) return;

      // Calculate percentage and apply to other panel
      const percent = left.scrollTop / leftMax;
      const targetRight = percent * rightMax;
      
      if (Math.abs(right.scrollTop - targetRight) > 1) {
        isSyncingRef.current = true;
        right.scrollTop = targetRight;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isSyncingRef.current = false;
          });
        });
      }
    };

    const syncFromRight = () => {
      if (isSyncingRef.current) return;
      
      const leftMax = left.scrollHeight - left.clientHeight;
      const rightMax = right.scrollHeight - right.clientHeight;
      if (leftMax <= 0 || rightMax <= 0) return;

      // Calculate percentage and apply to other panel
      const percent = right.scrollTop / rightMax;
      const targetLeft = percent * leftMax;
      
      if (Math.abs(left.scrollTop - targetLeft) > 1) {
        isSyncingRef.current = true;
        left.scrollTop = targetLeft;
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            isSyncingRef.current = false;
          });
        });
      }
    };

    left.addEventListener('scroll', syncFromLeft, { passive: true });
    right.addEventListener('scroll', syncFromRight, { passive: true });

    return () => {
      left.removeEventListener('scroll', syncFromLeft);
      right.removeEventListener('scroll', syncFromRight);
    };
  }, [scrollSyncEnabled]);
  
  const toggleScrollSync = () => {
    if (bothAtTop) {
      setScrollSyncEnabled(!scrollSyncEnabled);
    }
  };

  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#1a1a1a',
        pixelRatio: 2,
        cacheBust: true
      });
      const link = document.createElement('a');
      const safeName = analysisTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `doxa-${safeName}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('PNG export failed:', error);
      alert('Failed to export PNG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = async () => {
    if (!canvasRef.current) return;
    setIsExporting(true);
    try {
      const dataUrl = await toSvg(canvasRef.current, {
        backgroundColor: '#1a1a1a',
        cacheBust: true
      });
      const link = document.createElement('a');
      const safeName = analysisTitle.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      link.download = `doxa-${safeName}-${Date.now()}.svg`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('SVG export failed:', error);
      alert('Failed to export SVG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
      {/* Mobile tab switcher */}
      <div className="lg:hidden flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img 
            src="/logo.png" 
            alt="Doxa" 
            className="h-6 w-auto rounded logo-main"
          />
          <span className="text-sm font-bold tracking-tight font-cinzel" style={{ color: '#d0d0d0' }}>Doxa</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMobileTab('control')}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200"
            style={{ 
              backgroundColor: mobileTab === 'control' ? '#2d2d2d' : 'transparent',
              color: mobileTab === 'control' ? '#d0d0d0' : '#666666'
            }}
          >
            Control
          </button>
          <button
            onClick={() => setMobileTab('view')}
            className="px-3 py-1 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-200"
            style={{ 
              backgroundColor: mobileTab === 'view' ? '#2d2d2d' : 'transparent',
              color: mobileTab === 'view' ? '#d0d0d0' : '#666666'
            }}
          >
            View
          </button>
        </div>
      </div>

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-3 py-2 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full">
          {/* Left Panel - Controls */}
          <aside 
            ref={leftPanelRef}
            className={`lg:col-span-4 flex flex-col gap-2 overflow-y-auto pr-1 hide-scrollbar scroll-fade py-3 ${
              mobileTab !== 'control' ? 'hidden lg:flex' : ''
            }`}
            style={{ willChange: 'scroll-position' }}
          >
            {/* Branding - desktop only (mobile has it in the tab bar) */}
            <div className="hidden lg:flex items-center gap-2 flex-shrink-0 mb-1">
              <img 
                src="/logo.png" 
                alt="Doxa" 
                className="h-7 w-auto rounded-lg logo-main transition-all duration-300"
                style={{
                  filter: canvasHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
                  transform: canvasHovered ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => setMainHovered(true)}
                onMouseLeave={() => setMainHovered(false)}
              />
              <span className="text-base font-bold tracking-tight font-cinzel" style={{ color: '#d0d0d0' }}>Doxa</span>
            </div>

            {/* Control Panel */}
            <div 
              className="rounded-xl p-3 flex flex-col flex-shrink-0"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', contain: 'layout style' }}
            >
              <MemoizedControlPanel 
                onExportPng={handleExportPng}
                onExportSvg={handleExportSvg}
                isExporting={isExporting}
                scrollSyncEnabled={scrollSyncEnabled}
                onToggleScrollSync={toggleScrollSync}
                canToggleSync={bothAtTop}
                analysisTitle={analysisTitle}
                analysisDescription={analysisDescription}
                setAnalysisTitle={setAnalysisTitle}
                setAnalysisDescription={setAnalysisDescription}
              />
            </div>
          </aside>

          {/* Right Panel - Visualization */}
          <div className={`lg:col-span-8 relative flex flex-col min-h-0 overflow-hidden ${
            mobileTab !== 'view' ? 'hidden lg:flex' : ''
          }`}>
            {/* View Panel label - outside scroll-fade, excluded from screenshot, fades on scroll */}
            <h2 
              className="hidden lg:block text-sm font-semibold uppercase tracking-wider text-right pr-3 pb-1 flex-shrink-0 transition-all duration-300"
              style={{ color: '#888888', opacity: rightAtTop ? 1 : 0, pointerEvents: rightAtTop ? 'auto' : 'none' }}
              data-html2canvas-ignore="true"
            >
              View Panel
            </h2>
            <section 
              ref={rightPanelRef}
              className="flex-1 relative overflow-y-auto overflow-x-hidden aesthetic-scrollbar scroll-fade py-3"
              style={{ willChange: 'scroll-position' }}
            >
              <MemoizedVisualizationCanvas 
                ref={canvasRef} 
                analysisTitle={analysisTitle}
                setAnalysisTitle={setAnalysisTitle}
                analysisDescription={analysisDescription}
                setAnalysisDescription={setAnalysisDescription}
                mainHovered={mainHovered}
                onCanvasLogoHover={setCanvasHovered}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <ChartProvider>
      <AppContent />
    </ChartProvider>
  );
}

export default App;
