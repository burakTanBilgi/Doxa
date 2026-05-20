import { useRef, useState, useEffect, memo } from 'react';
import { toPng, toSvg } from 'html-to-image';
import { ChartProvider, useCharts } from './context/ChartContext';
import { ProjectsProvider } from './projects/ProjectsContext';
import ProjectsModal from './projects/ProjectsModal';
import ControlPanel from './components/ControlPanel';
import VisualizationCanvas from './components/VisualizationCanvas';
import TopNavbar from './components/TopNavbar';
import { useAuth } from './auth/AuthProvider';
import LoginScreen from './auth/LoginScreen';

// Memoized components to prevent unnecessary re-renders
const MemoizedControlPanel = memo(ControlPanel);
const MemoizedVisualizationCanvas = memo(VisualizationCanvas);

function AppContent() {
  const canvasRef = useRef(null);
  const leftPanelRef = useRef(null);
  const rightPanelRef = useRef(null);
  const isSyncingRef = useRef(false); // Flag to prevent recursion
  const [isExporting, setIsExporting] = useState(false);
  const {
    analysisTitle,
    setAnalysisTitle,
    analysisDescription,
    setAnalysisDescription,
  } = useCharts();
  const [mainHovered, setMainHovered] = useState(false);
  const [canvasHovered, setCanvasHovered] = useState(false);
  const [scrollSyncEnabled, setScrollSyncEnabled] = useState(true);
  const [bothAtTop, setBothAtTop] = useState(true);
  const [rightAtTop, setRightAtTop] = useState(true);
  const [mobileTab, setMobileTab] = useState('view'); // 'control' | 'view'
  // Tracks the lg breakpoint. The scroll-sync + scroll-position bookkeeping
  // (bothAtTop / rightAtTop / scroll-sync listeners) only matters on desktop
  // where both panels are visible, so gating on this avoids running any of
  // that math on mobile.
  const [isLg, setIsLg] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsLg(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Check if panels are at top — desktop only.
  useEffect(() => {
    if (!isLg) return;
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
  }, [isLg]);

  useEffect(() => {
    if (!scrollSyncEnabled || !isLg) return;

    const left = leftPanelRef.current;
    const right = rightPanelRef.current;
    if (!left || !right) return;

    // Anchor-based sync. Each chart/comparison is tagged with the same
    // data-sync-key in both panels, so we can match by entity instead of by
    // percentage. This is what makes alignment hold when a comparison's
    // visualization is much taller than its control card (or vice versa) —
    // percentage sync goes off as soon as per-entity heights diverge.
    const getAnchors = (container) => {
      const containerTop = container.getBoundingClientRect().top;
      const scroll = container.scrollTop;
      const els = container.querySelectorAll('[data-sync-key]');
      const anchors = [];
      for (const el of els) {
        const r = el.getBoundingClientRect();
        anchors.push({
          key: el.getAttribute('data-sync-key'),
          top: r.top - containerTop + scroll,
          height: r.height,
        });
      }
      // Sort ascending by position (DOM order isn't guaranteed if the panel
      // ever reorders, but we want the anchor list sorted for the linear scan).
      anchors.sort((a, b) => a.top - b.top);
      return anchors;
    };

    const syncByAnchor = (source, target) => {
      const sAnchors = getAnchors(source);
      if (sAnchors.length === 0) {
        // No entities yet — fall back to percentage so the empty-canvas case
        // still feels reasonable.
        const sMax = source.scrollHeight - source.clientHeight;
        const tMax = target.scrollHeight - target.clientHeight;
        if (sMax > 0 && tMax > 0) {
          target.scrollTop = (source.scrollTop / sMax) * tMax;
        }
        return;
      }
      const tAnchors = getAnchors(target);
      const tMap = new Map(tAnchors.map(a => [a.key, a]));

      // Active source anchor: the last one whose top <= source.scrollTop.
      // Anything above the first anchor maps to "above target's first anchor".
      let active = null;
      for (const a of sAnchors) {
        if (a.top <= source.scrollTop) active = a;
        else break;
      }
      if (!active) {
        target.scrollTop = 0;
        return;
      }
      const tActive = tMap.get(active.key);
      if (!tActive) return;

      const fraction = active.height > 0
        ? Math.max(0, Math.min(1, (source.scrollTop - active.top) / active.height))
        : 0;
      target.scrollTop = tActive.top + fraction * tActive.height;
    };

    const wrap = (fn) => () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      fn();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      });
    };

    const syncFromLeft = wrap(() => syncByAnchor(left, right));
    const syncFromRight = wrap(() => syncByAnchor(right, left));

    left.addEventListener('scroll', syncFromLeft, { passive: true });
    right.addEventListener('scroll', syncFromRight, { passive: true });

    return () => {
      left.removeEventListener('scroll', syncFromLeft);
      right.removeEventListener('scroll', syncFromRight);
    };
  }, [scrollSyncEnabled, isLg]);

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
      <TopNavbar
        canvasHovered={canvasHovered}
        onLogoHover={setMainHovered}
        mobileTab={mobileTab}
        onMobileTabChange={setMobileTab}
      />

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
                viewLabelVisible={rightAtTop}
              />
            </section>
          </div>
        </div>
      </main>

      <ProjectsModal />
    </div>
  );
}

function Gate({ children }) {
  const { user, loading, supabaseConfigured } = useAuth();
  if (!supabaseConfigured) return children;
  if (loading) {
    return (
      <div
        className="h-screen w-screen flex items-center justify-center"
        style={{ backgroundColor: '#1a1a1a', color: '#888888' }}
      >
        <span className="text-xs uppercase tracking-wider">Loading…</span>
      </div>
    );
  }
  if (!user) return <LoginScreen />;
  return children;
}

function App() {
  return (
    <Gate>
      <ChartProvider>
        <ProjectsProvider>
          <AppContent />
        </ProjectsProvider>
      </ChartProvider>
    </Gate>
  );
}

export default App;
