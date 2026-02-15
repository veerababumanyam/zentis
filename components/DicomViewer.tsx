import React, { useEffect, useRef, useState, useCallback } from 'react';

declare const dwv: any;

interface DicomViewerProps {
  url: string;
}

type Tool = 'Scroll' | 'ZoomAndPan' | 'WindowLevel' | 'Draw';

export const DicomViewer: React.FC<DicomViewerProps> = ({ url }) => {
  const appContainer = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<any>(null);
  const [activeTool, setActiveTool] = useState<Tool>('Scroll');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initDwvApp = useCallback(() => {
    const dwvApp = new dwv.App();
    const options = {
      containerDivId: 'dwv-container',
      tools: ['Scroll', 'ZoomAndPan', 'WindowLevel'],
      isMobile: false,
    };
    dwvApp.init(options);
    setApp(dwvApp);
  }, []);

  useEffect(() => {
    if (appContainer.current && !app) {
      initDwvApp();
    }
  }, [appContainer, app, initDwvApp]);

  // Effect for loading the image, runs only when app or URL changes.
  useEffect(() => {
    if (app && url) {
      setIsLoading(true);
      setError(null);
      
      const handleLoadEnd = () => {
        setIsLoading(false);
      };
      
      const handleError = (event: any) => {
        console.error("DWV Load Error:", event.error);
        setError("Failed to load DICOM image. It may be corrupt or inaccessible.");
        setIsLoading(false);
      };
      
      app.addEventListener('loadend', handleLoadEnd);
      app.addEventListener('error', handleError);
      
      app.loadURLs([url]);
      
      return () => {
        app.removeEventListener('loadend', handleLoadEnd);
        app.removeEventListener('error', handleError);
        app.reset();
      };
    }
  }, [app, url]);
  
  // Effect for setting the tool, runs when activeTool or app changes.
  useEffect(() => {
    if (app && !isLoading) {
      app.setTool(activeTool);
    }
  }, [app, activeTool, isLoading]);


  const handleToolChange = (tool: Tool) => {
    setActiveTool(tool);
  };
  
  const handleReset = () => {
      if(app) {
          app.getViewController().resetDisplay();
      }
  }

  const tools: { name: Tool, label: string }[] = [
    { name: 'Scroll', label: 'Scroll Slices' },
    { name: 'ZoomAndPan', label: 'Zoom/Pan' },
    { name: 'WindowLevel', label: 'Brightness/Contrast' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center bg-gray-900 text-white rounded-lg overflow-hidden">
      <div className="flex-shrink-0 bg-gray-800 p-2 rounded-b-lg shadow-sm w-full z-10">
        <div className="flex items-center justify-center space-x-2">
            {tools.map(tool => (
                 <button 
                    key={tool.name}
                    onClick={() => handleToolChange(tool.name)} 
                    className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${activeTool === tool.name ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`} 
                    title={tool.label}
                >
                    {tool.label}
                </button>
            ))}
            <button onClick={handleReset} className="px-3 py-1.5 text-xs font-semibold bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600" title="Reset View">
                Reset
            </button>
        </div>
      </div>
      <div className="flex-1 w-full h-full relative">
         {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 z-20">
              <div className="text-center">
                <svg className="animate-spin h-8 w-8 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                <p className="mt-2">Loading DICOM...</p>
              </div>
            </div>
         )}
         {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-80 z-20">
                <div className="text-center text-white p-4">
                    <p className="font-bold">Error</p>
                    <p>{error}</p>
                </div>
            </div>
         )}
        <div id="dwv-container" ref={appContainer} className="w-full h-full">
            <div className="layer-container"></div>
        </div>
      </div>
    </div>
  );
};