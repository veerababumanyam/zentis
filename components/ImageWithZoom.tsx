import React, { useState, useEffect } from 'react';

interface ImageWithZoomProps {
  src: string;
  alt: string;
}

export const ImageWithZoom: React.FC<ImageWithZoomProps> = React.memo(({ src, alt }) => {
  const [scale, setScale] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const MAX_SCALE = 3;
  const MIN_SCALE = 0.5;

  useEffect(() => {
    setIsLoading(true);
    setScale(1);
  }, [src]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev * 1.2, MAX_SCALE));
  const handleZoomOut = () => setScale(prev => Math.max(prev / 1.2, MIN_SCALE));
  const handleResetZoom = () => setScale(1);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div className="flex-shrink-0 bg-gray-100 p-2 rounded-lg shadow-sm mb-4 sticky top-0 z-10">
        <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 border border-gray-300 bg-white rounded-md p-1">
                <button 
                    onClick={handleZoomOut} 
                    className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                    title="Zoom Out"
                    disabled={scale <= MIN_SCALE}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
                <span className="text-sm font-semibold w-12 text-center text-gray-700 tabular-nums" title="Current Zoom">
                    {Math.round(scale * 100)}%
                </span>
                <button 
                    onClick={handleZoomIn} 
                    className="px-2 py-1 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                    title="Zoom In"
                    disabled={scale >= MAX_SCALE}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
            <button onClick={handleResetZoom} className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded-md hover:bg-gray-200" title="Reset Zoom">
                Reset
            </button>
        </div>
      </div>
      <div className="flex-1 w-full h-full overflow-auto flex items-center justify-center">
        {isLoading && <div className="text-gray-500">Loading image...</div>}
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          className={`transition-transform duration-200 ease-in-out ${isLoading ? 'hidden' : 'block'}`}
          style={{ transform: `scale(${scale})`, transformOrigin: 'center', maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    </div>
  );
});
