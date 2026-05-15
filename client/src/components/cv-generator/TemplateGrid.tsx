'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { CVTemplate } from '@/types';

interface TemplateGridProps {
  templates: CVTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const templateColors: Record<string, { from: string; to: string; accent: string }> = {
  classic: { from: 'from-gray-700', to: 'to-gray-900', accent: 'bg-gray-600' },
  modern: { from: 'from-indigo-500', to: 'to-violet-600', accent: 'bg-indigo-500' },
  professional: { from: 'from-slate-700', to: 'to-slate-900', accent: 'bg-slate-600' },
  minimal: { from: 'from-gray-100', to: 'to-gray-200', accent: 'bg-gray-400' },
  elegant: { from: 'from-amber-500', to: 'to-yellow-600', accent: 'bg-amber-500' },
};

export default function TemplateGrid({ templates, selectedId, onSelect }: TemplateGridProps) {
  return (
    <div>
      <label className="text-sm font-medium text-text-secondary block mb-3">Choose CV Template</label>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {templates.map((template) => {
          const isSelected = selectedId === template.id;
          const colors = templateColors[template.category];
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              className={cn(
                'relative rounded-xl border-2 overflow-hidden transition-all duration-300 cursor-pointer group text-left',
                isSelected
                  ? 'border-primary shadow-lg shadow-primary/20 scale-[1.02]'
                  : 'border-border hover:border-primary/40 hover:shadow-md'
              )}
            >
              {/* Template Preview */}
              <div className="aspect-[3/4] bg-white relative flex flex-col border-b border-border overflow-hidden">
                {/* Real Template Header */}
                <div className="w-full h-[60px] bg-slate-50 flex-shrink-0">
                  {template.thumbnail ? (
                    <img src={template.thumbnail} className="w-full h-full object-contain object-top" alt={template.name} />
                  ) : (
                    <div className={cn('w-full h-full bg-gradient-to-br', colors.from, colors.to)} />
                  )}
                </div>
                
                {/* Simulated CV layout lines below it to fill space */}
                <div className="flex-1 w-full bg-slate-50 p-3 opacity-60">
                   <div className="space-y-1.5">
                     <div className="h-1.5 bg-slate-300 rounded w-3/4" />
                     <div className="h-1 bg-slate-200 rounded w-1/2" />
                     <div className="mt-3 space-y-1">
                       {[...Array(5)].map((_, i) => (
                         <div key={i} className="h-1 bg-slate-200 rounded" style={{ width: `${70 + ((i * 17) % 30)}%` }} />
                       ))}
                     </div>
                   </div>
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md z-10 animate-scale-pop">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200 z-0" />
              </div>

              {/* Template Info */}
              <div className="p-3 bg-surface">
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', colors.accent)} />
                  <p className="text-sm font-semibold text-text-primary">{template.name}</p>
                </div>
                <p className="text-xs text-text-tertiary line-clamp-2">{template.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
