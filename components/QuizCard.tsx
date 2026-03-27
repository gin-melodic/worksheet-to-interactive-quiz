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

import { FileText, Trash2, ArrowRight, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';

interface QuizCardProps {
  id: string;
  title: string;
  questionCount: number;
  sectionCount: number;
  createdAt: string;
  onTake: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function QuizCard({
  id,
  title,
  questionCount,
  sectionCount,
  createdAt,
  onTake,
  onEdit,
  onDelete,
}: QuizCardProps) {
  const formattedDate = new Date(createdAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-lg hover:border-blue-200 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-900 truncate">{title}</h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
            <span>{sectionCount} 个部分</span>
            <span>·</span>
            <span>{questionCount} 道题</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{formattedDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-5">
        <button
          onClick={() => onTake(id)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          开始作答
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(id);
          }}
          className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
          title="编辑试卷"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          title="删除试卷"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
