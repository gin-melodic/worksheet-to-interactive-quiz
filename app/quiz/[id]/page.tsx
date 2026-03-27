/*
 * Copyright 2026 DearGin
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

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Loader2, BookOpen, Sparkles, Wrench, GraduationCap, Send, CheckCircle2 } from 'lucide-react';
import { Quiz, GradingResult } from '@/types/quiz';
import { QuizRenderer } from '@/components/QuizRenderer';
import { parseAnswerKey, isAnswerCorrect } from '@/lib/parseAnswerKey';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grading state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [answerKeyText, setAnswerKeyText] = useState('');
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [graded, setGraded] = useState(false);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [gradingError, setGradingError] = useState<string | null>(null);
  const [gradingProgress, setGradingProgress] = useState(0);
  const [gradingStatus, setGradingStatus] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const totalQuestions = quiz?.sections.reduce((acc, s) => acc + s.questions.length, 0) || 0;
  const attemptedCount = quiz?.sections.reduce((acc, s) => {
    return acc + s.questions.filter(q => answers[q.id]?.trim()).length;
  }, 0) || 0;

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (!res.ok) throw new Error('Quiz not found');
        const data = await res.json();
        setQuiz(data.data);
        setTitle(data.title);
        if (data.answerKey) {
          setAnswerKeyText(data.answerKey);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const handleSubmit = () => {
    const unansweredCount = totalQuestions - attemptedCount;
    if (unansweredCount > 0 && !showConfirmModal) {
      setShowConfirmModal(true);
      return;
    }

    setShowConfirmModal(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleGrade();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gradingLoading && !graded) {
      setGradingProgress(0);
      setGradingStatus('准备提交...');

      const statuses = [
        { threshold: 10, message: `正在整理 ${quiz?.sections.reduce((acc, s) => acc + s.questions.length, 0) || ''} 道题目的答案...` },
        { threshold: 30, message: '正在上传至 AI 批改大脑...' },
        { threshold: 60, message: 'AI 老师正在认真审查每一道题的回答...' },
        { threshold: 85, message: '整理最后反馈，正在同步分析结果...' },
      ];

      interval = setInterval(() => {
        setGradingProgress(prev => {
          if (prev >= 95) return 95;
          const increment = Math.random() * (prev < 50 ? 5 : 2);
          const next = prev + increment;

          const statusMatch = statuses.find(s => next >= s.threshold && prev < s.threshold);
          if (statusMatch) {
            setGradingStatus(statusMatch.message);
          }

          return next;
        });
      }, 400);
    } else if (graded) {
      setGradingProgress(100);
      setGradingStatus('批改完成！');
    }

    return () => clearInterval(interval);
  }, [gradingLoading, graded, quiz]);

  const handleGrade = async () => {
    if (!quiz) return;

    setGradingLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quiz,
          answers,
          answerKeyText: answerKeyText.trim(),
        }),
      });

      if (!response.ok) throw new Error('AI grading failed');
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setGradingProgress(100);
      setGradingStatus('批改完成！');

      // Short delay for the user to see 100%
      await new Promise(resolve => setTimeout(resolve, 600));

      setGradingResults(data.results || []);
      setGraded(true);

      // Save answer key to DB (background)
      fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answerKey: answerKeyText }),
      });
    } catch (err: any) {
      setGradingError("批改请求失败：" + err.message);
    } finally {
      setGradingLoading(false);
    }
  };

  const handleSimulate = () => {
    if (!quiz) return;
    const newAnswers: Record<string, string> = { ...answers };

    quiz.sections.forEach(section => {
      section.questions.forEach(q => {
        const isCorrect = Math.random() > 0.5;
        if (section.type === 'matching') {
          if (isCorrect && q.answer) {
            newAnswers[q.id] = q.answer;
          } else {
            // Pick a random option ID that isn't the correct one
            const options = section.matchingOptions || [];
            const otherOptions = options.filter(opt => opt.id !== q.answer);
            if (otherOptions.length > 0) {
              const randomOpt = otherOptions[Math.floor(Math.random() * otherOptions.length)];
              newAnswers[q.id] = randomOpt.id;
            } else if (options.length > 0) {
              // If only one option, pick it anyway to show something
              newAnswers[q.id] = options[0].id;
            } else {
              newAnswers[q.id] = '?';
            }
          }
        } else {
          if (isCorrect && q.answer) {
            newAnswers[q.id] = q.answer;
          } else {
            const wrongChoices = [
              "I'm not sure",
              "Wrong answer here",
              "Maybe?",
              q.answer ? `${q.answer} is wrong` : "Error 404"
            ];
            newAnswers[q.id] = wrongChoices[Math.floor(Math.random() * wrongChoices.length)];
          }
        }
      });
    });
    setAnswers(newAnswers);
  };

  const handleExplain = async (result: GradingResult) => {
    if (!quiz) return;

    // Find the question and section
    const section = quiz.sections[result.sectionIndex];
    const question = section?.questions.find(q => q.id === result.questionId);
    if (!question) return;

    // Update result to show loading
    setGradingResults(prev =>
      prev.map(r =>
        r.questionId === result.questionId
          ? { ...r, explanation: '正在生成解析...', messages: [] }
          : r
      )
    );

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.text,
          userAnswer: result.userAnswer,
          correctAnswer: result.correctAnswers.join(' / '),
          instruction: section.instruction,
        }),
      });

      const data = await res.json();
      setGradingResults(prev =>
        prev.map(r =>
          r.questionId === result.questionId
            ? { ...r, explanation: data.explanation || '无法生成解析' }
            : r
        )
      );
    } catch (err) {
      setGradingResults(prev =>
        prev.map(r =>
          r.questionId === result.questionId
            ? { ...r, explanation: 'AI 解析请求失败，请重试' }
            : r
        )
      );
    }
  };

  const handleFollowUp = async (result: GradingResult, userMessage: string) => {
    if (!quiz) return;

    const section = quiz.sections[result.sectionIndex];
    const question = section?.questions.find(q => q.id === result.questionId);
    if (!question) return;

    // Initial message is always the initial explanation
    const history = [
      { role: 'assistant' as const, content: result.explanation || '' },
      ...(result.messages || []),
      { role: 'user' as const, content: userMessage }
    ];

    // Show loading state for the new message
    setGradingResults(prev =>
      prev.map(r =>
        r.questionId === result.questionId
          ? {
            ...r,
            messages: [
              ...(r.messages || []),
              { role: 'user', content: userMessage },
              { role: 'assistant', content: '正在思考...' }
            ]
          }
          : r
      )
    );

    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.text,
          userAnswer: result.userAnswer,
          correctAnswer: result.correctAnswers.join(' / '),
          instruction: section.instruction,
          messages: history
        }),
      });

      const data = await res.json();
      setGradingResults(prev =>
        prev.map(r =>
          r.questionId === result.questionId
            ? {
              ...r,
              messages: (r.messages || []).map(m =>
                m.content === '正在思考...'
                  ? { role: 'assistant', content: data.explanation || '无法生成回复' }
                  : m
              )
            }
            : r
        )
      );
    } catch (err) {
      setGradingResults(prev =>
        prev.map(r =>
          r.questionId === result.questionId
            ? {
              ...r,
              messages: (r.messages || []).map(m =>
                m.content === '正在思考...'
                  ? { role: 'assistant', content: '追问失败，请重试' }
                  : m
              )
            }
            : r
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <p className="mb-4">{error || '加载试卷失败'}</p>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  const correctCount = gradingResults.filter(r => r.isCorrect).length;
  const totalGraded = gradingResults.length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">返回首页</span>
          </button>

          <div className="flex-1 flex flex-col items-center justify-center min-w-0">
            <div className="flex items-center gap-2 text-slate-800 font-bold truncate max-w-full">
              <BookOpen className="w-5 h-5 text-blue-600 shrink-0" />
              <span className="truncate text-sm sm:text-base">{title}</span>
            </div>
            {!graded && totalQuestions > 0 && (
              <div className="w-full max-w-[120px] sm:max-w-[200px] mt-1">
                <div className="flex justify-between text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">
                  <span>进度</span>
                  <span>{attemptedCount} / {totalQuestions}</span>
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(attemptedCount / totalQuestions) * 100}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
              </div>
            )}
            {graded && (
              <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                已交卷
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push(`/quiz/${quizId}/edit`)}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors shadow-sm"
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">编辑</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Grading errors */}
        {gradingError && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
            <p>{gradingError}</p>
            <button
              onClick={() => setGradingError(null)}
              className="text-red-400 hover:text-red-600 font-bold px-2"
            >
              ×
            </button>
          </div>
        )}

        {/* Grading summary */}
        {graded && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 bg-white rounded-2xl border border-slate-200 shadow-sm"
          >
            <h3 className="text-lg font-bold text-slate-800 mb-3">📊 批改结果</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-extrabold text-blue-600">
                  {totalGraded > 0 ? Math.round((correctCount / totalGraded) * 100) : 0}%
                </div>
                <div className="text-sm text-slate-500">正确率</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-green-600">{correctCount}</div>
                <div className="text-sm text-slate-500">正确</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-red-500">{totalGraded - correctCount}</div>
                <div className="text-sm text-slate-500">错误</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-slate-400">{totalGraded}</div>
                <div className="text-sm text-slate-500">总题数</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Grading Progress Overlay */}
        <AnimatePresence>
          {gradingLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-white/80 backdrop-blur-md flex items-center justify-center p-6 select-none"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="max-w-md w-full bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 text-center"
              >
                <div className="relative w-24 h-24 mx-auto mb-10">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
                  <div className="relative bg-blue-600 text-white rounded-full w-full h-full flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                  {/* Floating particles or circles can be added here for extra "Wow" */}
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-2">正在进行 AI 批改</h2>
                <p className="text-slate-500 mb-8">{gradingStatus || '请稍候，老师正在处理中...'}</p>

                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-4 shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${gradingProgress}%` }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                    className="absolute h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                  />
                </div>

                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest px-1">
                  <span>Grading Process</span>
                  <span>{Math.round(gradingProgress)}%</span>
                </div>

                <p className="mt-10 text-xs text-slate-400 flex items-center justify-center gap-2 italic">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  AI 老师正在根据最新标准对您的回答进行深度评估
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quiz */}
        <QuizRenderer
          quiz={quiz}
          mode="interactive"
          answers={answers}
          onAnswerChange={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
          submitted={submitted}
          gradingResults={graded ? gradingResults : undefined}
          onExplain={handleExplain}
          onFollowUp={handleFollowUp}
        />

        {/* Confirmation Modal for incomplete submission */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowConfirmModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white rounded-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-w-md w-full"
              >
                <div className="bg-amber-50 w-12 h-12 rounded-full flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">还有题目未完成</h3>
                <p className="text-slate-500 mb-8">
                  您还有 <span className="font-bold text-slate-900">{totalQuestions - attemptedCount}</span> 道题目没有回答。确定现在就要交卷吗？
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-medium rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    回去继续做
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    坚持交卷
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Submit / Grade controls */}
        {!graded && (
          <div className="mt-10 flex justify-end gap-3 flex-wrap">
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleSimulate}
                className="flex items-center gap-2 px-6 py-3 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 font-semibold rounded-xl transition-colors shadow-sm"
                title="Only visible in development mode"
              >
                <Wrench className="w-4 h-4" />
                模拟回答 (Debug)
              </button>
            )}
            <button
              onClick={handleSubmit}
              disabled={gradingLoading}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              {gradingLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  正在批改...
                </>
              ) : (
                <>
                  提交答案
                  <Send className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
