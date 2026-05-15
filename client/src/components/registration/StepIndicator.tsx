'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { RegistrationStep } from '@/types';

interface StepIndicatorProps {
  currentStep: RegistrationStep;
  onStepClick?: (step: RegistrationStep) => void;
}

const steps = [
  { number: 1 as RegistrationStep, label: 'Import Document', description: 'Upload & extract data' },
  { number: 2 as RegistrationStep, label: 'Complete Profile', description: 'Fill details & register' },
];

export default function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.number;
        const isActive = currentStep === step.number;
        const isUpcoming = currentStep < step.number;

        return (
          <React.Fragment key={step.number}>
            <button
              type="button"
              onClick={() => {
                if (isCompleted && onStepClick) onStepClick(step.number);
              }}
              className={cn(
                'flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300',
                isCompleted && 'cursor-pointer hover:bg-success-light/50',
                isActive && 'bg-white shadow-md shadow-primary/10',
                isUpcoming && 'cursor-default opacity-50'
              )}
            >
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300',
                isCompleted && 'bg-success text-white',
                isActive && 'bg-primary text-white pulse-glow',
                isUpcoming && 'bg-border text-text-tertiary'
              )}>
                {isCompleted ? <Check size={16} strokeWidth={3} /> : step.number}
              </div>
              <div className="text-left">
                <p className={cn(
                  'text-sm font-semibold',
                  isCompleted && 'text-success',
                  isActive && 'text-text-primary',
                  isUpcoming && 'text-text-tertiary'
                )}>
                  {step.label}
                </p>
                <p className="text-xs text-text-tertiary hidden sm:block">{step.description}</p>
              </div>
            </button>

            {index < steps.length - 1 && (
              <div className={cn(
                'w-16 h-0.5 mx-1 rounded-full transition-all duration-500',
                currentStep > step.number ? 'bg-success' : 'bg-border'
              )} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
