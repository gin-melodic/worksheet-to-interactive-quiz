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

import { useState, useEffect } from 'react';
import { Plus, FileText, Loader2, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QuizCard } from '@/components/QuizCard';
import { useRouter } from 'next/navigation';

interface QuizListItem {
  id: string;
  title: string;
  questionCount: number;
  sectionCount: number;
  createdAt: string;
}

export default function Home() {
  const router = useRouter();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setQuizzes(data);
      } else {
        console.error('Failed to load quizzes or data is not an array:', data);
        setQuizzes([]); // Fallback to empty array to avoid crash
      }
    } catch (err) {
      console.error('Failed to load quizzes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这份试卷吗？')) return;
    try {
      await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
      setQuizzes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Failed to delete quiz:', err);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-600 font-bold text-xl tracking-tight">
            <BookOpen className="w-6 h-6" />
            <span>PaperToQuiz</span>
          </div>
          <button
            onClick={() => router.push('/create')}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            创建试卷
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Hero section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 mb-4">
            我的<span className="text-blue-600">互动试卷</span>
          </h1>
          <p className="text-lg text-slate-500">
            上传练习册照片，AI 自动生成互动试卷，在线作答并批改
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4" />
            <p>加载中...</p>
          </div>
        ) : quizzes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-12 h-12 text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-600 mb-2">还没有试卷</h3>
            <p className="text-slate-400 mb-8">点击上方「创建试卷」按钮开始</p>
            <button
              onClick={() => router.push('/create')}
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              创建第一份试卷
            </button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <AnimatePresence>
              {quizzes.map((quiz) => (
                <QuizCard
                  key={quiz.id}
                  {...quiz}
                  onTake={(id) => router.push(`/quiz/${id}`)}
                  onDelete={handleDelete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </main>
  );
}
