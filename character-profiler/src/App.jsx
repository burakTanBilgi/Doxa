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
  const isProgrammaticScroll = useRef(false);
  const lastUserScrollTime = useRef({ left: 0, right: 0 });
  const [isExporting, setIsExporting] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('Untitled Analysis');
  const [analysisDescription, setAnalysisDescription] = useState('Character Profile Analysis');
  const [mainHovered, setMainHovered] = useState(false);
  const [canvasHovered, setCanvasHovered] = useState(false);

  // Asymmetric scroll ratio
  const SCROLL_RATIO = 0.6;
  const SCROLL_COOLDOWN = 100; // ms to ignore programmatic scroll triggers

  const handleLeftScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    
    const now = Date.now();
    // Ignore if right panel was just scrolled by user
    if (now - lastUserScrollTime.current.right < SCROLL_COOLDOWN) return;
    
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    const leftMaxScroll = left.scrollHeight - left.clientHeight;
    const rightMaxScroll = right.scrollHeight - right.clientHeight;
    if (leftMaxScroll <= 0 || rightMaxScroll <= 0) return;

    lastUserScrollTime.current.left = now;
    
    const leftScrollPercent = left.scrollTop / leftMaxScroll;
    const targetRight = Math.min(leftScrollPercent * rightMaxScroll * (1 / SCROLL_RATIO), rightMaxScroll);
    
    isProgrammaticScroll.current = true;
    right.scrollTop = targetRight;
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, []);

  const handleRightScroll = useCallback(() => {
    if (isProgrammaticScroll.current) return;
    
    const now = Date.now();
    // Ignore if left panel was just scrolled by user
    if (now - lastUserScrollTime.current.left < SCROLL_COOLDOWN) return;
    
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    const leftMaxScroll = left.scrollHeight - left.clientHeight;
    const rightMaxScroll = right.scrollHeight - right.clientHeight;
    if (rightMaxScroll <= 0 || leftMaxScroll <= 0) return;

    lastUserScrollTime.current.right = now;
    
    const rightScrollPercent = right.scrollTop / rightMaxScroll;
    const targetLeft = Math.min(rightScrollPercent * leftMaxScroll * SCROLL_RATIO, leftMaxScroll);
    
    isProgrammaticScroll.current = true;
    left.scrollTop = targetLeft;
    requestAnimationFrame(() => {
      isProgrammaticScroll.current = false;
    });
  }, []);

  useEffect(() => {
    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    left.addEventListener('scroll', handleLeftScroll, { passive: true });
    right.addEventListener('scroll', handleRightScroll, { passive: true });

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, [handleLeftScroll, handleRightScroll]);

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
            className="xl:col-span-4 flex flex-col gap-4 overflow-y-auto pr-2"
            style={{ scrollbarGutter: 'stable', willChange: 'scroll-position' }}
          >
            {/* Branding */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <img 
                src="/logo.png" 
                alt="Doxa" 
                className="h-8 w-auto rounded-lg logo-main transition-all duration-300"
                style={{
                  filter: canvasHovered ? 'drop-shadow(0 4px 12px rgba(199, 58, 58, 0.6))' : 'none',
                  transform: canvasHovered ? 'translateY(-2px)' : 'none'
                }}
                onMouseEnter={() => setMainHovered(true)}
                onMouseLeave={() => setMainHovered(false)}
              />
              <span className="text-lg font-bold tracking-tight" style={{ color: '#d0d0d0' }}>Doxa</span>
            </div>

            {/* Control Panel */}
            <div 
              className="rounded-xl p-4 flex flex-col flex-shrink-0"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d', contain: 'layout style' }}
            >
              <MemoizedControlPanel onExport={handleExport} isExporting={isExporting} />
            </div>
          </aside>

          {/* Right Panel - Visualization */}
          <section 
            ref={rightPanelRef}
            className="xl:col-span-8 relative overflow-y-auto"
            style={{ willChange: 'scroll-position' }}
          >
            {/* View Panel label - excluded from screenshot */}
            <div 
              className="absolute -top-1 right-4 text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded-b-md z-10"
              style={{ backgroundColor: '#2d2d2d', color: '#555555' }}
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
