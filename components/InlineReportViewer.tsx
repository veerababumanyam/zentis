
import React, { useState } from 'react';
import type { Report } from '../types';
import { ImageWithZoom } from './ImageWithZoom';
import { SparklesIcon } from './icons/SparklesIcon';
import { ReportTypeIcon } from './icons/ReportTypeIcon';
import { DicomViewer } from './DicomViewer';
import { PdfViewer } from './PdfViewer';
import { LinkIcon } from './icons/LinkIcon';

interface InlineReportViewerProps {
  report: Report;
  onAnalyzeReport: (reportId: string) => void;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

export const InlineReportViewer: React.FC<InlineReportViewerProps> = React.memo(({ report, onAnalyzeReport }) => {
  const [showFullText, setShowFullText] = useState(false);

  if (!report) {
    return <div className="p-3 bg-red-100 text-red-800 rounded-lg">Error: Report not found.</div>;
  }
  
  const renderContent = () => {
      if (typeof report.content === 'string') {
          const isLong = report.content.length > 500;
          const displayText = isLong && !showFullText ? report.content.substring(0, 500) + '...' : report.content;
          return (
              <div>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 bg-gray-50 p-3 rounded-md border max-h-64 overflow-y-auto">{displayText}</pre>
                  {isLong && (
                      <button onClick={() => setShowFullText(!showFullText)} className="text-blue-600 text-sm mt-2 hover:underline">
                          {showFullText ? 'Show Less' : 'Show More'}
                      </button>
                  )}
              </div>
          );
      }
      if (report.content.type === 'image') {
          return <ImageWithZoom src={report.content.url} alt={report.title} />;
      }
      if (report.content.type === 'dicom') {
          return <DicomViewer url={report.content.url} />;
      }
      if (report.content.type === 'pdf') {
          return <PdfViewer url={report.content.url} />;
      }
      if (report.content.type === 'link') {
          return (
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="p-3 bg-blue-100 rounded-full">
                      <LinkIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                      <h5 className="text-sm font-bold text-gray-800 truncate">{report.title}</h5>
                      <a href={report.content.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                          {report.content.url}
                      </a>
                  </div>
                  <a href={report.content.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded hover:bg-gray-100 whitespace-nowrap">
                      Open
                  </a>
              </div>
          );
      }
      return <div className="p-3 bg-yellow-100 text-yellow-800 rounded-lg">This report format cannot be displayed inline.</div>;
  };

  return (
    <div className="bg-white rounded-lg border border-blue-200 shadow-sm my-2">
      <div className="p-3 border-b border-gray-200 flex justify-between items-start">
        <div>
            <div className="flex items-center space-x-2">
                <ReportTypeIcon type={report.type} className="w-5 h-5 text-blue-600" />
                <h4 className="font-bold text-gray-800">{report.title}</h4>
            </div>
            <p className="text-xs text-gray-500 ml-7">{formatDate(report.date)}</p>
        </div>
        <div className="flex-shrink-0">
             <button
                onClick={() => onAnalyzeReport(report.id)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200"
                title="Run AI analysis on this report"
            >
                <SparklesIcon className="w-4 h-4" />
                <span>Analyze</span>
            </button>
        </div>
      </div>
      <div className="report-content-wrapper p-3">
        {renderContent()}
      </div>
    </div>
  );
});
