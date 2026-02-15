import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PdfViewerProps {
  url: string;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ url }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderPage = useCallback((num: number) => {
    if (!pdfDoc) return;
    pdfDoc.getPage(num).then((page: any) => {
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      page.render(renderContext);
    });
  }, [pdfDoc, scale]);
  
  useEffect(() => {
      const pdfjsLib = (window as any).pdfjsLib;
      if (!pdfjsLib) {
          setError("PDF library is not available.");
          setIsLoading(false);
          return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.4.168/build/pdf.worker.min.js`;

      setIsLoading(true);
      setError(null);
      const loadingTask = pdfjsLib.getDocument(url);
      loadingTask.promise.then((pdf: any) => {
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
        setIsLoading(false);
      }).catch((err: Error) => {
        console.error("Error loading PDF:", err);
        setError("Failed to load PDF document.");
        setIsLoading(false);
      });
  }, [url]);

  useEffect(() => {
    if (pdfDoc) {
      renderPage(pageNum);
    }
  }, [pdfDoc, pageNum, renderPage]);

  const onPrevPage = () => setPageNum(prev => (prev <= 1 ? 1 : prev - 1));
  const onNextPage = () => setPageNum(prev => (prev >= numPages ? numPages : prev + 1));
  const onZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
  const onZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  
  if (isLoading) {
      return <div className="text-center p-4">Loading PDF...</div>;
  }
  if (error) {
      return <div className="text-center p-4 text-red-500">{error}</div>;
  }

  return (
    <div className="w-full flex flex-col items-center">
      <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700 p-2 rounded-lg shadow-sm mb-2 sticky top-0 z-10 w-full">
        <div className="flex items-center justify-center space-x-4">
          <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 rounded-md p-1">
            <button onClick={onPrevPage} disabled={pageNum <= 1} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">Prev</button>
            <span className="text-sm font-semibold w-20 text-center text-gray-700 dark:text-gray-200 tabular-nums">Page {pageNum} of {numPages}</span>
            <button onClick={onNextPage} disabled={pageNum >= numPages} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">Next</button>
          </div>
          <div className="flex items-center space-x-1 border border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-800 rounded-md p-1">
             <button onClick={onZoomOut} disabled={scale <= 0.5} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">-</button>
             <span className="text-sm font-semibold w-16 text-center text-gray-700 dark:text-gray-200">{Math.round(scale * 100)}%</span>
             <button onClick={onZoomIn} disabled={scale >= 3} className="px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50">+</button>
          </div>
        </div>
      </div>
      <div className="flex-1 w-full overflow-auto flex justify-center p-2 bg-gray-200 dark:bg-gray-900 rounded-lg">
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
};