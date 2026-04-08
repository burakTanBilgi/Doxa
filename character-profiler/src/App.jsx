import { useRef, useState, useEffect, useCallback, memo } from 'react';
import { toPng } from 'html-to-image';
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

  // Check if both panels are at top
  useEffect(() => {
    const checkAtTop = () => {
      const left = leftPanelRef.current;
      const right = rightPanelRef.current;
      if (!left || !right) return;
      
      const atTop = left.scrollTop < 5 && right.scrollTop < 5;
      setBothAtTop(atTop);
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

  const handleExport = async () => {
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
      console.error('Export failed:', error);
      alert('Failed to export image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: '#1a1a1a' }}>
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 overflow-hidden">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
          {/* Left Panel - Controls */}
          <aside 
            ref={leftPanelRef}
            className="xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2 hide-scrollbar scroll-fade py-4"
            style={{ willChange: 'scroll-position' }}
          >
            {/* Branding */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img 
                src="/Doxa3.png" 
                alt="Doxa" 
                className="h-8 w-auto rounded-lg logo-main transition-all duration-300"
                style={{
                  filter: canvasHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
                  transform: canvasHovered ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => setMainHovered(true)}
                onMouseLeave={() => setMainHovered(false)}
              />
              <span className="text-lg font-bold tracking-tight font-cinzel" style={{ color: '#d0d0d0' }}>Doxa</span>
            </div>

            {/* Control Panel */}
            <div 
              className="rounded-xl p-4 flex flex-col flex-shrink-0"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', contain: 'layout style' }}
            >
              <MemoizedControlPanel 
                onExport={handleExport} 
                isExporting={isExporting}
                scrollSyncEnabled={scrollSyncEnabled}
                onToggleScrollSync={toggleScrollSync}
                canToggleSync={bothAtTop}
              />
            </div>
          </aside>

          {/* Right Panel - Visualization */}
          <section 
            ref={rightPanelRef}
            className="xl:col-span-8 relative overflow-y-auto overflow-x-hidden aesthetic-scrollbar scroll-fade py-4"
            style={{ willChange: 'scroll-position' }}
          >
            {/* View Panel label - blends with background, excluded from screenshot */}
            <div 
              className="absolute top-0 right-4 text-xs font-medium uppercase tracking-wider px-2 py-0.5 z-10"
              style={{ color: '#444444' }}
              data-html2canvas-ignore="true"
            >
              View Panel
            </div>
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
