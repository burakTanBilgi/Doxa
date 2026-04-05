import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, Camera, User, Loader2 } from 'lucide-react';
import { ChartProvider } from './context/ChartContext';
import ControlPanel from './components/ControlPanel';
import VisualizationCanvas from './components/VisualizationCanvas';

function AppContent() {
  const canvasRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (!canvasRef.current) return;

    setIsExporting(true);
    try {
      const dataUrl = await toPng(canvasRef.current, {
        backgroundColor: '#0f172a',
        pixelRatio: 2,
        cacheBust: true
      });

      const link = document.createElement('a');
      link.download = `character-profile-${Date.now()}.png`;
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Character Profiler</h1>
              <p className="text-sm text-slate-400">Psychological & Social Analysis</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition-all shadow-lg shadow-purple-500/25 disabled:shadow-none"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Camera size={18} />
                Save as Image
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 xl:sticky xl:top-24 xl:h-[calc(100vh-8rem)] xl:overflow-hidden">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 h-full">
              <ControlPanel />
            </div>
          </aside>

          <section className="xl:col-span-8">
            <VisualizationCanvas ref={canvasRef} />
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-slate-500 text-sm">
          Character Profiler — Dynamic Radar Chart Visualization
        </div>
      </footer>
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
