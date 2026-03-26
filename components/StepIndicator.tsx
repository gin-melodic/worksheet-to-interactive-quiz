/*
 * Copyright 2026 MelodicGin
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use client';

import { CheckCircle2 } from 'lucide-react';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center">
          {/* Step circle + label */}
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                i < currentStep
                  ? 'bg-green-500 text-white shadow-md shadow-green-200'
                  : i === currentStep
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 scale-110'
                    : 'bg-slate-200 text-slate-400'
              }`}
            >
              {i < currentStep ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                i + 1
              )}
            </div>
            <span
              className={`mt-2 text-xs font-medium transition-colors ${
                i === currentStep ? 'text-blue-600' : i < currentStep ? 'text-green-600' : 'text-slate-400'
              }`}
            >
              {label}
            </span>
          </div>
          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`w-16 sm:w-24 h-0.5 mx-2 mt-[-20px] transition-colors duration-300 ${
                i < currentStep ? 'bg-green-400' : 'bg-slate-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
