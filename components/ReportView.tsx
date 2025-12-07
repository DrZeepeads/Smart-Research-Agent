import React from 'react';
import { FinalReport } from '../types';
import { FileText, Download } from 'lucide-react';

interface ReportViewProps {
  report: FinalReport;
  onReset: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ report, onReset }) => {
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="max-w-3xl mx-auto bg-surface border border-white/10 rounded-2xl p-6 md:p-10 shadow-2xl">
          
          {/* Header */}
          <div className="border-b border-white/10 pb-6 mb-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <FileText className="w-5 h-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">Research Report</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
              {report.title}
            </h1>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-primary mb-2">Executive Summary</h3>
              <p className="text-sm text-text/90 leading-relaxed">
                {report.summary}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-8">
            {report.sections.map((section, idx) => (
              <section key={idx}>
                <h2 className="text-xl font-bold text-white mb-3">
                  {section.title}
                </h2>
                <div className="text-text/80 leading-relaxed text-base whitespace-pre-wrap">
                  {section.content}
                </div>
              </section>
            ))}

            <div className="mt-8 pt-8 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-3">Conclusion</h3>
              <p className="text-text/80 leading-relaxed italic">
                {report.conclusion}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="absolute bottom-6 left-0 right-0 px-4 flex justify-center gap-4">
        <button
          onClick={onReset}
          className="bg-secondary hover:bg-white/10 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg backdrop-blur-md border border-white/10"
        >
          New Research
        </button>
        <button
          onClick={() => alert("In a real app, this would generate a PDF.")}
          className="bg-primary hover:bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-colors shadow-lg flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>
    </div>
  );
};
