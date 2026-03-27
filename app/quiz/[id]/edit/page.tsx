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

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz } from '@/types/quiz';
import { QuizRenderer } from '@/components/QuizRenderer';
import { CropModal } from '@/components/CropModal';
import { resizeImage } from '@/lib/utils';

export default function EditQuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;

  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Rescan state (copied from CreatePage)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rescanSectionIndex, setRescanSectionIndex] = useState<number | null>(null);
  const [rescanQuestionIndex, setRescanQuestionIndex] = useState<number | null>(null);
  const [partialOutput, setPartialOutput] = useState('');

  const [originalImage, setOriginalImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${quizId}`);
        if (!res.ok) throw new Error('Quiz not found');
        const data = await res.json();
        setQuizData(data.data);
        setTitle(data.title);
        setOriginalImage(data.originalImage);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [quizId]);

  const handleEdit = (path: (string | number)[], value: string) => {
// ... (omitting middle part for brevity in this tool call, but I will make sure it's correct)
    if (!quizData) return;
    const newData = { ...quizData };
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (Array.isArray(current[key])) {
        current[key] = [...current[key]];
      } else {
        current[key] = { ...current[key] };
      }
      current = current[key];
    }
    current[path[path.length - 1]] = value;
    setQuizData(newData);
  };

  const handleSave = async () => {
    if (!quizData || !title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), data: quizData }),
      });
      if (!response.ok) throw new Error('Failed to save quiz');
      router.push(`/quiz/${quizId}`);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleRescan = (sectionIndex: number) => {
    setRescanSectionIndex(sectionIndex);
    setRescanQuestionIndex(null);
    setIsCropModalOpen(true);
  };

  const handleSetQuestionImage = (sectionIndex: number, questionIndex: number) => {
    setRescanSectionIndex(sectionIndex);
    setRescanQuestionIndex(questionIndex);
    setIsCropModalOpen(true);
  };

  const onCropConfirm = async (croppedImage: string) => {
    if (rescanSectionIndex === null || !quizData) return;

    // If we're cropping for an individual question, just update the thumb and return
    if (rescanQuestionIndex !== null) {
      const newSections = [...quizData.sections];
      const newQuestions = [...newSections[rescanSectionIndex].questions];
      newQuestions[rescanQuestionIndex] = {
        ...newQuestions[rescanQuestionIndex],
        imageThumb: croppedImage
      };
      newSections[rescanSectionIndex] = {
        ...newSections[rescanSectionIndex],
        questions: newQuestions
      };
      setQuizData({ ...quizData, sections: newSections });
      setIsCropModalOpen(false);
      setRescanSectionIndex(null);
      setRescanQuestionIndex(null);
      return;
    }

    setIsCropModalOpen(false);
    setSaving(true); // Reuse saving state for loading
    setPartialOutput("");
    setError(null);

    try {
      const optimizedCropped = await resizeImage(croppedImage);
      const section = quizData.sections[rescanSectionIndex];
      const sectionType = section.type;
      
      const containsImageKeyword = (text: string) =>
        text ? ['picture', 'image', '图', '看图', '根据图', '图片'].some(kw => text.toLowerCase().includes(kw)) : false;
      
      const isPictureSection = containsImageKeyword(section.instruction);

      let prompt = `Analyze this specific section from a worksheet and convert it into JSON. 
This section is of type: ${sectionType}.`;

      if (isPictureSection) {
        prompt += `\n\nSPECIAL REQUIREMENT: This section contains images. You MUST provide a "bbox": [ymin, xmin, ymax, xmax] for EVERY question.`;
      }

      prompt += `\n\nReturn ONLY valid JSON in this exact structure:
{
  "instruction": "section instruction text",
  "type": "${sectionType}",
  "wordBank": ["word1", "word2"],
  "matchingOptions": [{"id": "a", "text": "option text"}],
  "questions": [
    {
      "id": "q_new_1",
      "number": "1",
      "text": "question text with ___ for blanks",
      "answer": "correct answer"${isPictureSection ? ',\n          "bbox": [ymin, xmin, ymax, xmax]' : ''}
    }
  ]
}`;

      const response = await fetch(`/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer lm-studio",
        },
        body: JSON.stringify({
          model: process.env.NEXT_PUBLIC_MODEL_NAME || "qwen3.5-35b-a3b",
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: optimizedCropped } },
                { type: "text", text: prompt },
              ],
            },
          ],
          stream: true,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "section_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  instruction: { type: "string" },
                  type: { type: "string", enum: ["fill_in_the_blank", "matching", "short_answer"] },
                  wordBank: { type: "array", items: { type: "string" } },
                  matchingOptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        text: { type: "string" },
                      },
                      required: ["id", "text"],
                    },
                  },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        number: { type: "string" },
                        text: { type: "string" },
                        answer: { type: "string" },
                        bbox: {
                          type: "array",
                          items: { type: "number" },
                          minItems: 4,
                          maxItems: 4
                        },
                      },
                      required: ["id", "number", "text"],
                    },
                  },
                },
                required: ["instruction", "type", "questions"],
              },
            },
          },
          temperature: 0.1,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) throw new Error("AI re-scan failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader from API");

      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr.trim() === "[DONE]") break;
            try {
              const data = JSON.parse(dataStr);
              const deltaContent = data.choices?.[0]?.delta?.content || "";
              const combined = deltaContent;
              if (combined) {
                fullText += combined;
                setPartialOutput(fullText);
              }
            } catch (e) {
              // ignore
            }
          }
        }
      }

      const text = fullText;
      if (!text) throw new Error("AI did not return any content");

      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const content = JSON.parse(cleaned);

      // Ensure unique IDs in the rescanned content to avoid clashing with other sections
      content.questions.forEach((q: any, qIdx: number) => {
        // Use a unique prefix to avoid ID collisions with existing sections in the quiz
        q.id = `q-${rescanSectionIndex}-${Date.now()}-${qIdx}-${q.id || 'new'}`;
      });

      // Helper to crop image (replicated from CreatePage)
      const cropImage = async (base64: string, bbox: [number, number, number, number]): Promise<string> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }
            const [ymin, xmin, ymax, xmax] = bbox;
            const x = (xmin / 1000) * img.width;
            const y = (ymin / 1000) * img.height;
            const width = ((xmax - xmin) / 1000) * img.width;
            const height = ((ymax - ymin) / 1000) * img.height;
            canvas.width = Math.max(1, width);
            canvas.height = Math.max(1, height);
            ctx.drawImage(img, x, y, width, height, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = () => reject(new Error('Failed to load image for cropping'));
          img.src = base64;
        });
      };

      // Post-process bboxes into thumbnails
      for (const question of content.questions) {
        if (question.bbox && croppedImage) {
          try {
            question.imageThumb = await cropImage(croppedImage, question.bbox);
          } catch (e) {
            console.warn("Failed to crop image for re-scanned question:", question.id, e);
          }
        }
      }

      const newSections = [...quizData.sections];
      newSections[rescanSectionIndex] = content;
      setQuizData({ ...quizData, sections: newSections });
    } catch (err: any) {
      setError("重新提取失败：" + (err.message || "未知错误"));
    } finally {
      setSaving(false);
      setRescanSectionIndex(null);
      setRescanQuestionIndex(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !quizData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500">
        <p className="mb-4">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 hover:underline"
        >
          返回首页
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push(`/quiz/${quizId}`)}
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            取消编辑
          </button>
          <h1 className="text-lg font-bold text-slate-800">编辑试卷</h1>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存修改
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {quizData && (
          <QuizRenderer
            quiz={quizData}
            mode="preview"
            onEdit={handleEdit}
            onRescan={handleRescan}
            onSetQuestionImage={handleSetQuestionImage}
          />
        )}
      </div>

      {isCropModalOpen && originalImage && (
        <CropModal
          image={originalImage}
          onCrop={onCropConfirm}
          onClose={() => setIsCropModalOpen(false)}
          title={rescanQuestionIndex !== null ? "提取题目图片" : "重新提取整个区域"}
        />
      )}
      
      <AnimatePresence>
        {saving && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">正在同步修改...</h2>
            <p className="text-slate-500 max-w-md mx-auto">请稍候，我们正在将您的修改保存到数据库中</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
