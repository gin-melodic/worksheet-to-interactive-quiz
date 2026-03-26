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

import React from 'react';
import { Quiz, Section, GradingResult } from '@/types/quiz';
import { CheckCircle2, XCircle, Lightbulb, Loader2, RefreshCw, Edit2 } from 'lucide-react';

const BLANK_PATTERN = /_{3,}|\.{3,}/;

const renderFormattedText = (text: string) => {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((bPart, bIndex) => {
    if (bIndex % 2 === 1) {
      return <strong key={bIndex} className="font-bold text-slate-900">{bPart}</strong>;
    }
    const underParts = bPart.split(/_([^_]+)_/g);
    return underParts.map((uPart, uIndex) => {
      if (uIndex % 2 === 1) {
        return <u key={`${bIndex}-${uIndex}`} className="underline decoration-blue-500/50 decoration-2 underline-offset-4 font-semibold text-slate-900 bg-blue-50/30 px-0.5 rounded-sm">{uPart}</u>;
      }
      return <span key={`${bIndex}-${uIndex}`}>{uPart}</span>;
    });
  });
};

interface QuizRendererProps {
  quiz: Quiz;
  mode?: 'preview' | 'interactive';
  answers?: Record<string, string>;
  onAnswerChange?: (id: string, value: string) => void;
  submitted?: boolean;
  gradingResults?: GradingResult[];
  onExplain?: (result: GradingResult) => void;
  onEdit?: (path: (string | number)[], value: string) => void;
  onRescan?: (sectionIndex: number) => void;
}

export function QuizRenderer({
  quiz,
  mode = 'interactive',
  answers: externalAnswers,
  onAnswerChange: externalOnChange,
  submitted: externalSubmitted,
  gradingResults,
  onExplain,
  onEdit,
  onRescan,
}: QuizRendererProps) {
  const [internalAnswers, setInternalAnswers] = React.useState<Record<string, string>>({});
  const answers = externalAnswers ?? internalAnswers;
  const disabled = mode === 'preview' || (externalSubmitted ?? false);

  const handleAnswerChange = (id: string, value: string) => {
    if (externalOnChange) {
      externalOnChange(id, value);
    } else {
      setInternalAnswers(prev => ({ ...prev, [id]: value }));
    }
  };

  const getGradingResult = (questionId: string): GradingResult | undefined => {
    return gradingResults?.find(r => r.questionId === questionId);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 sm:p-10 bg-white rounded-2xl shadow-sm border border-gray-100">
      {mode === 'preview' ? (
        <div className="relative group mb-10">
          <input
            type="text"
            value={quiz.title}
            onChange={(e) => onEdit?.(['title'], e.target.value)}
            className="w-full text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-colors"
            placeholder="试卷标题"
          />
          <Edit2 className="absolute -left-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <h1 className="text-3xl sm:text-4xl font-bold mb-10 text-gray-900 tracking-tight">{quiz.title || 'Interactive Exercise'}</h1>
      )}

      <div className="space-y-16">
        {quiz.sections.map((section, index) => (
          <div key={index} className="relative">
            {/* Section Header */}
            <div className="bg-slate-100 p-5 rounded-xl mb-8 border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="bg-blue-600 text-white font-bold rounded-lg w-10 h-10 flex items-center justify-center shrink-0 shadow-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  {mode === 'preview' ? (
                    <div className="relative group">
                      <textarea
                        value={section.instruction}
                        onChange={(e) => onEdit?.(['sections', index, 'instruction'], e.target.value)}
                        rows={1}
                        className="w-full text-lg font-semibold text-slate-900 leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                      <Edit2 className="absolute -left-6 top-1 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <h2 className="text-lg font-semibold text-slate-900 leading-snug">{section.instruction}</h2>
                  )}
                </div>
                {mode === 'preview' && onRescan && (
                  <button
                    onClick={() => onRescan(index)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200 hover:border-blue-200"
                    title="重新识别此区域"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}
              </div>
              {section.wordBank && section.wordBank.length > 0 && (
                <div className="mt-4 pl-14 flex flex-wrap gap-2">
                  {section.wordBank.map((word, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-700 shadow-sm">
                      {word}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Section Content */}
            <div className="pl-2 sm:pl-14">
              {section.type === 'fill_in_the_blank' && (
                <FillInTheBlankSection
                  section={section}
                  answers={answers}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                  getGradingResult={getGradingResult}
                  onExplain={onExplain}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  isEditing={mode === 'preview'}
                />
              )}
              {section.type === 'matching' && (
                <MatchingSection
                  section={section}
                  answers={answers}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  isEditing={mode === 'preview'}
                />
              )}
              {section.type === 'short_answer' && (
                <ShortAnswerSection
                  section={section}
                  answers={answers}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                  getGradingResult={getGradingResult}
                  onExplain={onExplain}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  isEditing={mode === 'preview'}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function GradingBadge({
  result,
  onExplain,
}: {
  result: GradingResult;
  onExplain?: (result: GradingResult) => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        {result.isCorrect ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-600">
            <CheckCircle2 className="w-4 h-4" /> 正确
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500">
              <XCircle className="w-4 h-4" /> 错误
            </span>
            <span className="text-sm text-slate-500">
              正确答案：<strong className="text-slate-700">{result.correctAnswers.join(' / ')}</strong>
            </span>
            {onExplain && !result.explanation && (
              <button
                onClick={() => onExplain(result)}
                className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors font-medium"
              >
                <Lightbulb className="w-3 h-3" />
                AI 解析
              </button>
            )}
          </>
        )}
      </div>
      {result.explanation && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 leading-relaxed">
          {result.explanation === '正在生成解析...' ? (
            <span className="inline-flex items-center gap-2 text-blue-500">
              <Loader2 className="w-3 h-3 animate-spin" /> 正在生成解析...
            </span>
          ) : (
            result.explanation
          )}
        </div>
      )}
    </div>
  );
}

interface SectionProps {
  section: Section;
  answers: Record<string, string>;
  onChange: (id: string, val: string) => void;
  disabled: boolean;
  getGradingResult?: (id: string) => GradingResult | undefined;
  onExplain?: (result: GradingResult) => void;
  onEdit?: (questionIndex: number, field: string, value: string) => void;
  isEditing?: boolean;
}

function FillInTheBlankSection({ section, answers, onChange, disabled, getGradingResult, onExplain, onEdit, isEditing }: SectionProps) {
  return (
    <div className="space-y-10">
      {section.questions.map((q, qIndex) => {
        const gradingResult = getGradingResult?.(q.id);

        return (
          <div key={q.id} className="relative">
            <div className="flex items-start gap-4">
              <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <textarea
                    value={q.text}
                    onChange={(e) => onEdit?.(qIndex, 'text', e.target.value)}
                    rows={1}
                    className="w-full text-lg text-slate-800 leading-relaxed bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                ) : (
                  <div className="text-lg text-slate-800 leading-relaxed">
                    {renderFormattedText(q.text)}
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xl">
                    <input
                      type="text"
                      disabled={disabled}
                      className={`w-full border-2 rounded-xl px-4 py-3 outline-none font-medium transition-all shadow-sm ${
                        gradingResult
                          ? gradingResult.isCorrect
                            ? 'border-green-300 text-green-700 bg-green-50/50'
                            : 'border-red-300 text-red-600 bg-red-50/50'
                          : 'border-slate-200 focus:border-blue-500 text-blue-700 bg-slate-50/30 hover:bg-white hover:border-slate-300'
                      } disabled:opacity-70 disabled:bg-slate-100`}
                      value={answers[q.id] || ''}
                      onChange={(e) => onChange(q.id, e.target.value)}
                      placeholder={q.answer && !answers[q.id] ? `e.g. ${q.answer}` : '在此输入答案...'}
                    />
                  </div>
                </div>
              </div>
            </div>
            {gradingResult && <div className="pl-12 mt-1"><GradingBadge result={gradingResult} onExplain={onExplain} /></div>}
            {isEditing && (
              <div className="pl-12 mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correct Answer:</span>
                <input
                  type="text"
                  value={q.answer || ''}
                  onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-600 outline-none focus:border-blue-400 transition-colors w-40"
                  placeholder="正确答案"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchingSection({ section, answers, onChange, disabled, onEdit, isEditing }: Omit<SectionProps, 'getGradingResult' | 'onExplain'>) {
  return (
    <div className="grid lg:grid-cols-2 gap-12">
      <div className="space-y-8">
        {section.questions.map((q, qIndex) => (
          <div key={q.id}>
            <div className="flex items-start gap-4">
              <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
              <div className="flex-1 space-y-3">
                {isEditing ? (
                  <textarea
                    value={q.text}
                    onChange={(e) => onEdit?.(qIndex, 'text', e.target.value)}
                    rows={1}
                    className="w-full text-lg text-slate-800 leading-snug bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                ) : (
                  <div className="text-lg text-slate-800 leading-snug">{renderFormattedText(q.text)}</div>
                )}
                
                <div className="flex items-center gap-2">
                  <select
                    disabled={disabled}
                    className="border-2 border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white text-slate-700 font-medium disabled:opacity-70 disabled:bg-slate-50 shadow-sm transition-all hover:border-slate-300"
                    value={answers[q.id] || ''}
                    onChange={(e) => onChange(q.id, e.target.value)}
                  >
                    <option value="">选择匹配项...</option>
                    {section.matchingOptions?.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.id}: {opt.text}</option>
                    ))}
                  </select>
                </div>

                {isEditing && (
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Answer Key:</span>
                    <input
                      type="text"
                      value={q.answer || ''}
                      onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                      className="text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-600 outline-none focus:border-blue-400 transition-colors w-20"
                      placeholder="ID"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {section.matchingOptions && section.matchingOptions.length > 0 && (
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 space-y-4 h-fit sticky top-6">
          <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-6">备选项 Word Bank</h3>
          <div className="space-y-3">
            {section.matchingOptions.map((opt) => (
              <div key={opt.id} className="flex gap-4 text-slate-700 text-lg bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                <span className="font-bold text-blue-600 w-6 shrink-0">{opt.id}</span>
                <span>{opt.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShortAnswerSection({ section, answers, onChange, disabled, getGradingResult, onExplain, onEdit, isEditing }: SectionProps) {
  return (
    <div className="space-y-12">
      {section.questions.map((q, qIndex) => {
        const gradingResult = getGradingResult?.(q.id);

        return (
          <div key={q.id}>
            <div className="flex items-start gap-4">
              <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
              <div className="flex-1 space-y-4">
                {isEditing ? (
                  <textarea
                    value={q.text}
                    onChange={(e) => onEdit?.(qIndex, 'text', e.target.value)}
                    rows={1}
                    className="w-full text-lg text-slate-800 leading-relaxed bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                  />
                ) : (
                  <div className="text-lg text-slate-800 leading-relaxed">
                    {renderFormattedText(q.text)}
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-2xl">
                    <textarea
                      disabled={disabled}
                      rows={2}
                      className={`w-full border-2 rounded-xl px-4 py-3 outline-none font-medium transition-all shadow-sm resize-none ${
                        gradingResult
                          ? gradingResult.isCorrect
                            ? 'border-green-300 text-green-700 bg-green-50/50'
                            : 'border-red-300 text-red-600 bg-red-50/50'
                          : 'border-slate-200 focus:border-blue-500 text-blue-700 bg-slate-50/30 hover:bg-white hover:border-slate-300'
                      } disabled:opacity-70 disabled:bg-slate-100`}
                      value={answers[q.id] || ''}
                      onChange={(e) => onChange(q.id, e.target.value)}
                      placeholder={q.answer && !answers[q.id] ? `参考答案：${q.answer}` : '在此输入您的回答...'}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = 'auto';
                        target.style.height = target.scrollHeight + 'px';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
            {gradingResult && <div className="pl-12 mt-1"><GradingBadge result={gradingResult} onExplain={onExplain} /></div>}
            {isEditing && (
              <div className="pl-12 mt-2 flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Correct Answer:</span>
                <input
                  type="text"
                  value={q.answer || ''}
                  onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                  className="text-xs px-2 py-1 border border-slate-200 rounded bg-slate-50 text-slate-600 outline-none focus:border-blue-400 transition-colors w-full max-w-2xl"
                  placeholder="正确答案"
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
