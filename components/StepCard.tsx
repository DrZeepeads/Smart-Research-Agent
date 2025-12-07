import React from 'react';
import { ResearchStep } from '../types';
import { Loader2, CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface StepCardProps {
  step: ResearchStep;
}

export const StepCard: React.FC<StepCardProps> = ({ step }) => {
  const getIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'in-progress':
        return <Loader2 className="w-5 h-5 text-primary animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Circle className="w-5 h-5 text-muted" />;
    }
  };

  const getBorderColor = () => {
    switch (step.status) {
      case 'in-progress': return 'border-primary/50 bg-primary/5';
      case 'completed': return 'border-green-500/20 bg-green-500/5';
      case 'failed': return 'border-red-500/20';
      default: return 'border-secondary bg-secondary/30';
    }
  };

  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${getBorderColor()} mb-3`}>
      <div className="flex items-start gap-3">
        <div className="mt-1 flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-text leading-tight mb-1">
            {step.query}
          </h4>
          <p className="text-xs text-muted mb-2">
            {step.rationale}
          </p>
          {step.result && (
            <div className="mt-2 text-xs text-text/80 bg-black/20 p-2 rounded border border-white/5 font-mono">
              <span className="text-primary block mb-1">Latest Finding:</span>
              <p className="line-clamp-3 italic">"{step.result.substring(0, 150)}..."</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
