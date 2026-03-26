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

import { useState, useRef, useEffect } from 'react';
import { Upload, FileImage, Loader2, ArrowLeft, ArrowRight, Save, Clipboard, CheckCircle2, Edit3, ClipboardPaste, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Quiz } from '@/types/quiz';
import { QuizRenderer } from '@/components/QuizRenderer';
import { StepIndicator } from '@/components/StepIndicator';
import { useRouter } from 'next/navigation';
import { CropModal } from '@/components/CropModal';

const STEPS = ['上传试卷', '录入答案', 'AI 识别', '预览保存'];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [quizData, setQuizData] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [answerKey, setAnswerKey] = useState('');
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [answerKeyImage, setAnswerKeyImage] = useState<string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [rescanSectionIndex, setRescanSectionIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const answerKeyInputRef = useRef<HTMLInputElement>(null);
  const [partialOutput, setPartialOutput] = useState('');
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Process partial output into terminal lines
  useEffect(() => {
    if (!partialOutput) {
      setTerminalLines([]);
      return;
    }
    // Regex to extract values of text, instruction, title, and answer fields
    const regex = /"(?:text|instruction|title|answer)"\s*:\s*"([^"]*)"/g;
    let match;
    const lines: string[] = [];
    while ((match = regex.exec(partialOutput)) !== null) {
      let value = match[1];
      if (value.trim()) {
        const truncated = value.length > 50 ? value.substring(0, 50) + "..." : value;
        lines.push(truncated);
      }
    }
    setTerminalLines(lines);
  }, [partialOutput]);

  // Auto scroll for terminal
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLines]);

  // Paste from clipboard
  const handlePasteFromClipboard = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((t) => t.startsWith("image/"));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = new File([blob], "clipboard-image.png", { type: imageType });
          processFile(file);
          return;
        }
      }
      setError("剪贴板中没有图片，请先截图或复制图片后再试。");
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setError("需要剪贴板读取权限，请在浏览器弹窗中点击「允许」。");
      } else {
        setError("无法读取剪贴板：" + err.message);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件。");
      return;
    }
    setStep(1);
    setLoading(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        try {
          const base64data = reader.result as string;
          setOriginalImage(base64data);
          setLoading(false);
          setStep(1); // Go to answer key step
        } catch (err: any) {
          console.error(err);
          setError("读取图片失败");
          setStep(0);
          setLoading(false);
        }
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || "处理文件时发生错误。");
      setLoading(false);
      setStep(0);
    }
  };

  const handleAnswerKeyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件作为答案。");
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      setAnswerKeyImage(reader.result as string);
    };
  };

  const generateQuiz = async () => {
    if (!originalImage) return;

    setStep(2);
    setLoading(true);
    setError(null);

    try {
      // Core recognition prompt loaded from env (server-side via API) or simple default
      const defaultPrompt = "Analyze this worksheet image and convert it into an interactive quiz format. Extract the title, instructions, and all questions. Categorize each section into one of these types: fill_in_the_blank, matching, or short_answer.";

      let prompt = defaultPrompt;

      if (answerKey.trim() || answerKeyImage) {
        prompt += `\n\nIMPORTANT: I have provided an answer key. Please use it to fill the "answer" field for each question. 
${answerKey.trim() ? `Answer Key Text: ${answerKey.trim()}` : "An image of the answer key is also provided."}`;
      }

      prompt += `\n\nReturn ONLY valid JSON in this exact structure:
{
  "title": "worksheet title",
  "sections": [
    {
      "instruction": "section instruction text",
      "type": "fill_in_the_blank | matching | short_answer",
      "wordBank": ["word1", "word2"],
      "matchingOptions": [{"id": "a", "text": "option text"}],
      "questions": [
        {
          "id": "q1",
          "number": "1",
          "text": "question text with ___ for blanks",
          "answer": "correct answer"
        }
      ]
    }
  ]
}`;

      const content: any[] = [
        { type: "image_url", image_url: { url: originalImage } },
      ];

      if (answerKeyImage) {
        content.push({ type: "image_url", image_url: { url: answerKeyImage } });
      }

      content.push({ type: "text", text: prompt });

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
              content: content,
            },
          ],
          stream: true,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "quiz_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  sections: {
                    type: "array",
                    items: {
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
                            },
                            required: ["id", "number", "text"],
                          },
                        },
                      },
                      required: ["instruction", "type", "questions"],
                    },
                  },
                },
                required: ["title", "sections"],
              },
            },
          },
          temperature: 0.1,
          max_tokens: 8192,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader from API");

      const decoder = new TextDecoder();
      let fullText = "";
      setPartialOutput("");

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
              const deltaReasoning = data.choices?.[0]?.delta?.reasoning_content || "";

              const combined = deltaReasoning || deltaContent;
              if (combined) {
                fullText += combined;
                setPartialOutput(fullText);
              }
            } catch (e) {
              // ignore incomplete JSON fragments
            }
          }
        }
      }

      const text = fullText;

      if (!text) {
        throw new Error("No response content from model.");
      }

      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      const data = JSON.parse(cleaned);

      if (!data.sections) {
        throw new Error("Failed to parse quiz data.");
      }

      setQuizData(data);
      setTitle(data.title || 'Untitled Quiz');
      setStep(3);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "识别过程中发生错误。");
      setStep(1); // Go back to answer key step on error
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!quizData || !title.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), data: quizData, answerKey: answerKey.trim() || undefined }),
      });
      if (!response.ok) throw new Error('Failed to save quiz');
      const { id } = await response.json();
      router.push(`/`);
    } catch (err: any) {
      setError(err.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (path: (string | number)[], value: string) => {
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

  const handleRescan = (sectionIndex: number) => {
    setRescanSectionIndex(sectionIndex);
    setIsCropModalOpen(true);
  };

  const onCropConfirm = async (croppedImage: string) => {
    if (rescanSectionIndex === null || !quizData) return;
    setIsCropModalOpen(false);
    setLoading(true);
    setStep(2); // Show processing screen
    setError(null);

    try {
      const sectionType = quizData.sections[rescanSectionIndex].type;
      const prompt = `Analyze this specific section from a worksheet and convert it into JSON. 
This section is of type: ${sectionType}.

Return ONLY valid JSON in this exact structure:
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
      "answer": "correct answer"
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
                { type: "image_url", image_url: { url: croppedImage } },
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
      setPartialOutput("");

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
              const deltaReasoning = data.choices?.[0]?.delta?.reasoning_content || "";

              const combined = deltaReasoning || deltaContent;
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

      const newSections = [...quizData.sections];
      newSections[rescanSectionIndex] = content;
      setQuizData({ ...quizData, sections: newSections });
      setStep(3);
    } catch (err: any) {
      setError("重新识别失败：" + (err.message || "未知错误"));
      setStep(3);
    } finally {
      setLoading(false);
      setRescanSectionIndex(null);
    }
  };

  // Global paste listener (only on step 0)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (step !== 0 || loading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            processFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [step, loading]);

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
          <h1 className="text-lg font-bold text-slate-800">创建试卷</h1>
          <div className="w-20" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <StepIndicator steps={STEPS} currentStep={step} />

        <AnimatePresence mode="wait">
          {/* Step 0: Upload */}
          {step === 0 && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">上传练习册图片</h2>
                <p className="text-slate-500">拍照或截图上传，AI 将自动识别并生成互动试卷</p>
              </div>

              <div
                className={`relative group rounded-3xl border-2 border-dashed transition-all duration-200 ${dragActive
                  ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                  : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'
                  }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />

                <div className="p-12 text-center flex flex-col items-center justify-center min-h-[280px]">
                  <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">拖拽图片到这里</h3>
                  <p className="text-slate-500 mb-6">或点击选择文件</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePasteFromClipboard();
                    }}
                    className="relative z-20 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Clipboard className="w-4 h-4" />
                    粘贴剪贴板图片
                  </button>
                  <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-100 px-4 py-2 rounded-full mt-4">
                    <FileImage className="w-4 h-4" />
                    支持 JPG, PNG, WEBP
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Answer Key (Optional) */}
          {step === 1 && (
            <motion.div
              key="answer-key"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">录入参考答案</h2>
                <p className="text-slate-500">上传答案照片或粘贴文字，AI 将自动填入正确答案</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Image Upload */}
                <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 flex flex-col items-center justify-center text-center hover:border-blue-400 transition-colors relative overflow-hidden group">
                  {answerKeyImage ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-100">
                      <img src={answerKeyImage} alt="Answer Key" className="w-full h-full object-contain" />
                      <button
                        onClick={() => setAnswerKeyImage(null)}
                        className="absolute top-2 right-2 p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <ArrowLeft className="w-4 h-4 rotate-45" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <FileImage className="w-8 h-8" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-1">答案照片</h4>
                      <p className="text-sm text-slate-500 mb-4">上传包含正确答案的图片</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAnswerKeyUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                      <button className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        选择文件
                      </button>
                    </>
                  )}
                </div>

                {/* Text Input */}
                <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 flex flex-col hover:border-blue-400 transition-colors">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
                      <ClipboardPaste className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-slate-800">粘贴文字</h4>
                  </div>
                  <textarea
                    value={answerKey}
                    onChange={(e) => setAnswerKey(e.target.value)}
                    placeholder="例如：
1. A 2. B 3. C
(1) 苹果 (2) 香蕉
..."
                    className="flex-1 w-full min-h-[120px] p-3 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-colors resize-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  上一步
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setAnswerKey('');
                      setAnswerKeyImage(null);
                      generateQuiz();
                    }}
                    className="px-6 py-3 text-slate-400 hover:text-slate-600 font-medium transition-colors"
                  >
                    跳过此步
                  </button>
                  <button
                    onClick={generateQuiz}
                    disabled={!answerKey.trim() && !answerKeyImage}
                    className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50 disabled:bg-slate-300"
                  >
                    开始识别
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === 2 && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="max-w-2xl mx-auto text-center py-12"
            >
              <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-slate-900 mb-2">AI 正在识别...</h2>
              <p className="text-slate-500">正在对比试卷与答案并生成互动试卷，请稍候</p>

              {/* Scrolling Output Effect */}
              <div className="mt-10 bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80 shadow-inner"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80 shadow-inner"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-inner"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-[0.2em]">Engine Analysis Logs</span>
                  </div>
                </div>
                <div className="h-48 overflow-y-auto p-6 font-mono text-xs text-blue-300 text-left leading-relaxed select-none opacity-80">
                  {terminalLines.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      {terminalLines.map((line, idx) => (
                        <div key={idx} className="flex gap-2">
                          <span className="text-blue-500/50 shrink-0">[{idx + 1}]</span>
                          <span className="break-all">{line}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 opacity-50">
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">{'>'}</span> Initializing vision model context...
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-500">{'>'}</span> Establishing secure connection to LLM host...
                      </div>
                    </div>
                  )}
                  <div ref={terminalEndRef} />
                </div>
              </div>

              <p className="text-sm text-slate-400 mt-6">通常需要 15-40 秒</p>
            </motion.div>
          )}

          {/* Step 3: Review & Save */}
          {step === 3 && quizData && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  <h2 className="text-2xl font-bold text-slate-900">识别完成！请检查预览</h2>
                </div>

                {/* Editable title */}
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-sm font-medium text-slate-600 shrink-0">试卷标题：</label>
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-slate-800 font-medium transition-colors"
                      placeholder="输入试卷标题..."
                    />
                    <Edit3 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Quiz Preview */}
              <QuizRenderer
                quiz={quizData}
                mode="preview"
                onEdit={handleEdit}
                onRescan={handleRescan}
              />

              {/* Answer Key (optional) */}
              <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowAnswerKey(!showAnswerKey)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardPaste className="w-5 h-5 text-blue-600" />
                    <span className="text-base font-semibold text-slate-800">录入参考答案（可选）</span>
                    {answerKey.trim() && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">已填写</span>
                    )}
                  </div>
                  {showAnswerKey ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>
                {showAnswerKey && (
                  <div className="px-5 pb-5 border-t border-slate-100">
                    <p className="text-sm text-slate-500 mt-4 mb-3">
                      粘贴参考答案，保存后可在作答页面直接用于批改。多个可接受答案用 &quot;/&quot; 分隔。
                    </p>
                    <textarea
                      value={answerKey}
                      onChange={(e) => setAnswerKey(e.target.value)}
                      placeholder={'UNIT 3\n3.1\n3 is trying\n4 phones\n5 OK\n...'}
                      className="w-full h-48 p-4 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-mono text-slate-700 resize-y transition-colors"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => {
                    setStep(0);
                    setQuizData(null);
                    setError(null);
                  }}
                  className="flex items-center gap-2 px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  重新上传
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !title.trim()}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  保存试卷
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-center max-w-2xl mx-auto"
          >
            {error}
          </motion.div>
        )}
      </div>

      {isCropModalOpen && originalImage && (
        <CropModal
          image={originalImage}
          onCrop={onCropConfirm}
          onClose={() => {
            setIsCropModalOpen(false);
            setRescanSectionIndex(null);
          }}
        />
      )}
    </main>
  );
}
