import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { ChartProvider } from './context/ChartContext';
import ControlPanel from './components/ControlPanel';
import VisualizationCanvas from './components/VisualizationCanvas';

function AppContent() {
  const canvasRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [analysisTitle, setAnalysisTitle] = useState('Untitled Analysis');
  const [analysisDescription, setAnalysisDescription] = useState('Character Profile Analysis');
  const [mainHovered, setMainHovered] = useState(false);
  const [canvasHovered, setCanvasHovered] = useState(false);

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#1a1a1a' }}>
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 h-full">
          {/* Left Panel - Controls Only */}
          <aside className="xl:col-span-4 flex flex-col gap-4">
            {/* Control Panel */}
            <div 
              className="flex-1 rounded-xl p-4 overflow-hidden flex flex-col"
              style={{ backgroundColor: '#2d2d2d', border: '1px solid #3d3d3d' }}
            >
              <ControlPanel />
            </div>
          </aside>

          {/* Right Panel - Visualization */}
          <section className="xl:col-span-8">
            <VisualizationCanvas 
              ref={canvasRef} 
              analysisTitle={analysisTitle}
              setAnalysisTitle={setAnalysisTitle}
              analysisDescription={analysisDescription}
              setAnalysisDescription={setAnalysisDescription}
              mainHovered={mainHovered}
              onCanvasLogoHover={setCanvasHovered}
              onExport={handleExport}
              isExporting={isExporting}
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
