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
import { motion } from 'motion/react';
import { ArrowLeft, Loader2, BookOpen, Sparkles, Wrench } from 'lucide-react';
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
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    handleGrade();
  };

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
          ? { ...r, explanation: '正在生成解析...' }
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
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </button>
          <div className="flex items-center gap-2 text-slate-800 font-bold">
            <BookOpen className="w-5 h-5 text-blue-600" />
            {title}
          </div>
          <div className="w-20" />
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

        {/* Quiz */}
        <QuizRenderer
          quiz={quiz}
          mode="interactive"
          answers={answers}
          onAnswerChange={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))}
          submitted={submitted}
          gradingResults={graded ? gradingResults : undefined}
          onExplain={handleExplain}
        />

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
                '提交答案'
              )}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
