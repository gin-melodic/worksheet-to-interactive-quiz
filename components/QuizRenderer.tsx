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
import Image from 'next/image';
import { CheckCircle2, XCircle, Lightbulb, Loader2, RefreshCw, Edit2, GripVertical, Trash2, Image as ImageIcon, MessageCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const renderFormattedText = (text: string) => {
  const boldParts = text.split(/\*\*([^*]+)\*\*/g);
  return boldParts.map((bPart, bIndex) => {
    if (bIndex % 2 === 1) {
      return <strong key={bIndex} className="font-bold text-slate-900">{bPart}</strong>;
    }
    const underParts = bPart.split(/(?<!_)_([^_]+)_(?!_)/g);
    return underParts.map((uPart, uIndex) => {
      if (uIndex % 2 === 1) {
        return <u key={`${bIndex}-${uIndex}`} className="underline decoration-blue-500/50 decoration-2 underline-offset-4 font-semibold text-slate-900 bg-blue-50/30 px-0.5 rounded-sm">{uPart}</u>;
      }
      return <span key={`${bIndex}-${uIndex}`}>{uPart}</span>;
    });
  });
};

const AutoResizeTextarea = ({
  value,
  onChange,
  className,
  placeholder,
  ...props
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  className?: string;
  placeholder?: string;
  rows?: number;
  [key: string]: any;
}) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const target = textareaRef.current;
    if (target) {
      target.style.height = 'auto';
      target.style.height = target.scrollHeight + 'px';
    }
  };

  React.useLayoutEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className={className}
      placeholder={placeholder}
      rows={props.rows || 1}
      onInput={adjustHeight}
      {...props}
    />
  );
};

interface QuizRendererProps {
  quiz: Quiz;
  mode?: 'preview' | 'interactive';
  answers?: Record<string, string>;
  onAnswerChange?: (id: string, value: string) => void;
  submitted?: boolean;
  gradingResults?: GradingResult[];
  onExplain?: (result: GradingResult) => void;
  onFollowUp?: (result: GradingResult, message: string) => void;
  onEdit?: (path: (string | number)[], value: string) => void;
  onRescan?: (sectionIndex: number) => void;
  onSetQuestionImage?: (sectionIndex: number, questionIndex: number) => void;
}

export function QuizRenderer({
  quiz,
  mode = 'interactive',
  answers: externalAnswers,
  onAnswerChange: externalOnChange,
  submitted: externalSubmitted,
  gradingResults,
  onExplain,
  onFollowUp,
  onEdit,
  onRescan,
  onSetQuestionImage,
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
          <AutoResizeTextarea
            value={quiz.title}
            onChange={(e) => onEdit?.(['title'], e.target.value)}
            className="w-full text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
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
                      <AutoResizeTextarea
                        value={section.instruction}
                        onChange={(e) => onEdit?.(['sections', index, 'instruction'], e.target.value)}
                        className="w-full text-lg font-semibold text-slate-900 leading-snug bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                      />
                      <Edit2 className="absolute -left-6 top-1 w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ) : (
                    <h2 className="text-lg font-semibold text-slate-900 leading-snug whitespace-pre-wrap">{renderFormattedText(section.instruction)}</h2>
                  )}
                </div>
                {mode === 'preview' && onRescan && (
                  <button
                    onClick={() => onRescan(index)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm border border-slate-200 hover:border-blue-200"
                    title="重新提取此区域"
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
                  onFollowUp={onFollowUp}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  onSetQuestionImage={(qIndex) => onSetQuestionImage?.(index, qIndex)}
                  isEditing={mode === 'preview'}
                />
              )}
              {section.type === 'matching' && (
                <MatchingSection
                  section={section}
                  answers={answers}
                  onChange={handleAnswerChange}
                  disabled={disabled}
                  getGradingResult={getGradingResult}
                  onExplain={onExplain}
                  onFollowUp={onFollowUp}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  onSetQuestionImage={(qIndex) => onSetQuestionImage?.(index, qIndex)}
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
                  onFollowUp={onFollowUp}
                  onEdit={(qIndex, field, val) => onEdit?.(['sections', index, 'questions', qIndex, field], val)}
                  onSetQuestionImage={(qIndex) => onSetQuestionImage?.(index, qIndex)}
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
  onFollowUp,
}: {
  result: GradingResult;
  onExplain?: (result: GradingResult) => void;
  onFollowUp?: (result: GradingResult, message: string) => void;
}) {
  const [followUp, setFollowUp] = React.useState('');

  const handleSendFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUp.trim() || !onFollowUp) return;
    onFollowUp(result, followUp.trim());
    setFollowUp('');
  };

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
          </>
        )}
        {onExplain && !result.explanation && (
          <button
            onClick={() => onExplain(result)}
            className="inline-flex items-center gap-1 text-xs px-3 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg transition-colors font-medium"
          >
            <Lightbulb className="w-3 h-3" />
            AI 解析
          </button>
        )}
      </div>
      {result.explanation && (
        <div className="mt-2 space-y-2">
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800 leading-relaxed shadow-sm">
            <div className="flex items-start gap-2">
              <div className="bg-blue-600/10 p-1 rounded mt-0.5">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="flex-1 prose prose-sm prose-blue max-w-none text-blue-800 leading-relaxed overflow-x-auto">
                {result.explanation === '正在生成解析...' ? (
                  <span className="inline-flex items-center gap-2 text-blue-500 font-medium no-underline">
                    <Loader2 className="w-3 h-3 animate-spin" /> 正在生成解析...
                  </span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.explanation}</ReactMarkdown>
                )}
              </div>
            </div>
          </div>

          {/* Message History */}
          {result.messages && result.messages.length > 0 && (
            <div className="space-y-4 pl-0 mt-3 flex flex-col items-stretch">
              {result.messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} w-full animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  <div className={`max-w-[90%] p-3 rounded-2xl text-sm leading-relaxed shadow-sm ${m.role === 'user'
                    ? 'bg-white text-slate-700 border border-slate-200 rounded-tr-none ml-6'
                    : 'bg-blue-50 text-blue-800 border border-blue-100 rounded-tl-none mr-6'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`p-1 rounded-lg shrink-0 ${m.role === 'user' ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-blue-600'}`}>
                        {m.role === 'user' ? <MessageCircle className="w-3.5 h-3.5" /> : <Lightbulb className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 pt-0.5 prose prose-sm prose-slate max-w-none text-current leading-relaxed overflow-x-auto">
                        {m.content === '正在思考...' ? (
                          <span className="inline-flex items-center gap-2 text-slate-400 font-medium italic no-underline">
                            <Loader2 className="w-3 h-3 animate-spin" /> AI 正在思考...
                          </span>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Follow-up input */}
          {result.explanation !== '正在生成解析...' && onFollowUp && (
            <form onSubmit={handleSendFollowUp} className="relative mt-2 flex items-center gap-2 group">
              <input
                type="text"
                placeholder="追问 AI 关于此题的解析..."
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                className="flex-1 text-sm bg-white border border-slate-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-100 rounded-lg pl-3 pr-10 py-2 outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!followUp.trim()}
                className="absolute right-1 p-1.5 text-blue-500 hover:bg-blue-50 disabled:text-slate-300 rounded-md transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
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
  onFollowUp?: (result: GradingResult, message: string) => void;
  onEdit?: (questionIndex: number, field: string, value: string) => void;
  onSetQuestionImage?: (questionIndex: number) => void;
  isEditing?: boolean;
}

function FillInTheBlankSection({ section, answers, onChange, disabled, getGradingResult, onExplain, onFollowUp, onEdit, isEditing, onSetQuestionImage }: SectionProps) {
  return (
    <div className="space-y-10">
      {section.questions.map((q, qIndex) => {
        const gradingResult = getGradingResult?.(q.id);

        return (
          <div key={q.id} className="relative">
            <div className="flex items-start gap-4">
              <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {q.imageThumb && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xs group relative">
                        <Image
                          src={q.imageThumb}
                          alt={`Question ${q.number}`}
                          width={400}
                          height={300}
                          className="w-full h-auto object-contain"
                        />
                        {isEditing && (
                          <button
                            onClick={() => onSetQuestionImage?.(qIndex)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> 更换图片
                          </button>
                        )}
                      </div>
                    )}
                    {isEditing ? (
                      <AutoResizeTextarea
                        value={q.text}
                        onChange={(e) => onEdit?.(qIndex, 'text', e.target.value)}
                        className="w-full text-lg text-slate-800 leading-relaxed bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                      />
                    ) : (
                      <div className="text-lg text-slate-800 leading-relaxed">
                        {renderFormattedText(q.text)}
                      </div>
                    )}
                  </div>
                  {isEditing && !q.imageThumb && (
                    <button
                      onClick={() => onSetQuestionImage?.(qIndex)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                      title="设置题目图片"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-xl">
                    <input
                      type="text"
                      disabled={disabled}
                      className={`w-full border-2 rounded-xl px-4 py-3 outline-none font-medium transition-all shadow-sm ${gradingResult
                        ? gradingResult.isCorrect
                          ? 'border-green-300 text-green-700 bg-green-50/50'
                          : 'border-red-300 text-red-600 bg-red-50/50'
                        : 'border-slate-200 focus:border-blue-500 text-blue-700 bg-slate-50/30 hover:bg-white hover:border-slate-300'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                      value={answers[q.id] || ''}
                      onChange={(e) => onChange(q.id, e.target.value)}
                      placeholder={q.placeholder || '在此输入答案...'}
                    />
                  </div>
                </div>
              </div>
            </div>
            {gradingResult && <div className="pl-12 mt-1"><GradingBadge result={gradingResult} onExplain={onExplain} onFollowUp={onFollowUp} /></div>}
            {isEditing && (
              <div className="pl-12 mt-4 space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Correct Answer:</span>
                  <input
                    type="text"
                    value={q.answer || ''}
                    onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-60 shadow-sm"
                    placeholder="正确答案"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Placeholder:</span>
                  <input
                    type="text"
                    value={q.placeholder || ''}
                    onChange={(e) => onEdit?.(qIndex, 'placeholder', e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-60 shadow-sm"
                    placeholder="输入框提示文字 (可选)"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MatchingSection({ section, answers, onChange, disabled, getGradingResult, onExplain, onFollowUp, onEdit, isEditing, onSetQuestionImage }: SectionProps) {
  const [activeDragId, setActiveDragId] = React.useState<string | null>(null);

  return (
    <div className="grid lg:grid-cols-2 gap-12">
      <div className="space-y-8">
        {section.questions.map((q, qIndex) => {
          const currentAnswer = answers[q.id];
          const matchedOption = section.matchingOptions?.find(opt => opt.id === currentAnswer);
          const gradingResult = getGradingResult?.(q.id);

          return (
            <div key={q.id}>
              <div className="flex items-start gap-4">
                <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {q.imageThumb && (
                        <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xs group relative">
                          <Image
                            src={q.imageThumb}
                            alt={`Question ${q.number}`}
                            width={400}
                            height={300}
                            className="w-full h-auto object-contain"
                          />
                          {isEditing && (
                            <button
                              onClick={() => onSetQuestionImage?.(qIndex)}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2"
                            >
                              <ImageIcon className="w-4 h-4" /> 更换图片
                            </button>
                          )}
                        </div>
                      )}
                      {isEditing ? (
                        <AutoResizeTextarea
                          value={q.text}
                          onChange={(e) => onEdit?.(qIndex, 'text', e.target.value)}
                          className="w-full text-lg text-slate-800 leading-snug bg-transparent border-b border-dashed border-slate-300 hover:border-blue-400 focus:border-blue-500 outline-none transition-colors resize-none overflow-hidden"
                        />
                      ) : (
                        <div className="text-lg text-slate-800 leading-snug">{renderFormattedText(q.text)}</div>
                      )}
                    </div>
                    {isEditing && !q.imageThumb && (
                      <button
                        onClick={() => onSetQuestionImage?.(qIndex)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                        title="设置题目图片"
                      >
                        <ImageIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  {/* Drag Drop Area */}
                  <div
                    className={`min-h-[64px] border-2 border-dashed rounded-xl p-3 flex items-center transition-all ${gradingResult
                      ? gradingResult.isCorrect ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'
                      : matchedOption
                        ? 'border-blue-200 bg-blue-50/50'
                        : 'border-slate-200 bg-slate-50/30'
                      } ${activeDragId && !matchedOption ? 'border-amber-300 bg-amber-50/50 scale-[1.02]' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!disabled) e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                      const optionId = e.dataTransfer.getData('optionId');
                      if (optionId && !disabled) {
                        onChange(q.id, optionId);
                      }
                    }}
                  >
                    {matchedOption ? (
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm ${gradingResult
                            ? gradingResult.isCorrect ? 'bg-green-600 text-white' : 'bg-red-500 text-white'
                            : 'bg-blue-600 text-white'
                            }`}>
                            {matchedOption.id}
                          </div>
                          <span className={`font-medium ${gradingResult
                            ? gradingResult.isCorrect ? 'text-green-700' : 'text-red-700'
                            : 'text-slate-700'
                            }`}>{matchedOption.text}</span>
                        </div>
                        {!disabled && (
                          <button
                            onClick={() => onChange(q.id, '')}
                            className="p-1.5 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-full text-center text-slate-400 italic text-sm">
                        {q.placeholder || '将备选项拖拽到此处'}
                      </div>
                    )}
                  </div>

                  {gradingResult && (
                    <div className="mt-2">
                      <GradingBadge result={gradingResult} onExplain={onExplain} onFollowUp={onFollowUp} />
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Answer Key:</span>
                        <input
                          type="text"
                          value={q.answer || ''}
                          onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-32 shadow-sm"
                          placeholder="ID"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Placeholder:</span>
                        <input
                          type="text"
                          value={q.placeholder || ''}
                          onChange={(e) => onEdit?.(qIndex, 'placeholder', e.target.value)}
                          className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-60 shadow-sm"
                          placeholder="拖动区域提示文字 (可选)"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {section.matchingOptions && section.matchingOptions.length > 0 && (
        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200 space-y-4 h-fit sticky top-24">
          <h3 className="font-bold text-slate-400 uppercase tracking-widest text-xs mb-6 text-center">备选项 (拖拽配对)</h3>
          <div className="space-y-3">
            {section.matchingOptions.map((opt) => {
              const isUsed = Object.values(answers).includes(opt.id);
              return (
                <div
                  key={opt.id}
                  draggable={!disabled && !isUsed}
                  onDragStart={(e) => {
                    e.dataTransfer.setData('optionId', opt.id);
                    setActiveDragId(opt.id);
                  }}
                  onDragEnd={() => setActiveDragId(null)}
                  className={`flex gap-4 p-4 rounded-xl border transition-all select-none group ${isUsed
                    ? 'bg-slate-100 border-transparent opacity-40 grayscale cursor-not-allowed'
                    : 'bg-white border-slate-200 cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-md'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 transition-colors ${isUsed ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white shadow-sm'
                    }`}>
                    {opt.id}
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-700 font-semibold">{opt.text}</div>
                  </div>
                  {!isUsed && !disabled && (
                    <GripVertical className="w-5 h-5 text-slate-300" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ShortAnswerSection({ section, answers, onChange, disabled, getGradingResult, onExplain, onFollowUp, onEdit, isEditing, onSetQuestionImage }: SectionProps) {
  return (
    <div className="space-y-12">
      {section.questions.map((q, qIndex) => {
        const gradingResult = getGradingResult?.(q.id);

        return (
          <div key={q.id}>
            <div className="flex items-start gap-4">
              <span className="font-bold text-slate-300 w-8 text-right shrink-0 mt-1.5 text-xl">{q.number}.</span>
              <div className="flex-1 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {q.imageThumb && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-xs group relative">
                        <Image
                          src={q.imageThumb}
                          alt={`Question ${q.number}`}
                          width={400}
                          height={300}
                          className="w-full h-auto object-contain"
                        />
                        {isEditing && (
                          <button
                            onClick={() => onSetQuestionImage?.(qIndex)}
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold gap-2"
                          >
                            <ImageIcon className="w-4 h-4" /> 更换图片
                          </button>
                        )}
                      </div>
                    )}
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
                  </div>
                  {isEditing && !q.imageThumb && (
                    <button
                      onClick={() => onSetQuestionImage?.(qIndex)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all border border-slate-200"
                      title="设置题目图片"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 max-w-2xl">
                    <AutoResizeTextarea
                      disabled={disabled}
                      rows={2}
                      className={`w-full border-2 rounded-xl px-4 py-3 outline-none font-medium transition-all shadow-sm resize-none ${gradingResult
                        ? gradingResult.isCorrect
                          ? 'border-green-300 text-green-700 bg-green-50/50'
                          : 'border-red-300 text-red-600 bg-red-50/50'
                        : 'border-slate-200 focus:border-blue-500 text-blue-700 bg-slate-50/30 hover:bg-white hover:border-slate-300'
                        } disabled:opacity-70 disabled:bg-slate-100`}
                      value={answers[q.id] || ''}
                      onChange={(e) => onChange(q.id, e.target.value)}
                      placeholder={q.placeholder || '在此输入您的回答...'}
                    />
                  </div>
                </div>
              </div>
            </div>
            {gradingResult && <div className="pl-12 mt-1"><GradingBadge result={gradingResult} onExplain={onExplain} onFollowUp={onFollowUp} /></div>}
            {isEditing && (
              <div className="pl-12 mt-4 space-y-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Correct Answer:</span>
                  <input
                    type="text"
                    value={q.answer || ''}
                    onChange={(e) => onEdit?.(qIndex, 'answer', e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-full max-w-2xl shadow-sm"
                    placeholder="正确答案"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Placeholder:</span>
                  <input
                    type="text"
                    value={q.placeholder || ''}
                    onChange={(e) => onEdit?.(qIndex, 'placeholder', e.target.value)}
                    className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 outline-none focus:border-blue-400 focus:bg-white transition-all w-full max-w-2xl shadow-sm"
                    placeholder="输入框提示文字 (可选)"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
