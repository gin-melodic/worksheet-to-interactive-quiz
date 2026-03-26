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

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quiz, answers, answerKeyText } = body;

    if (!quiz || !answers) {
      return NextResponse.json({ error: "Missing quiz or answers" }, { status: 400 });
    }

    const modelName = process.env.NEXT_PUBLIC_MODEL_NAME || "qwen3.5-35b-a3b";

    // Core grading prompt from env (server-side secret) or simple default
    const gradingSystemPrompt = process.env.GRADING_SYSTEM_PROMPT
      || "You are an English teacher grading a worksheet. Compare answers and grade fairly.";

    // Construct the prompt for batch grading
    let prompt = `${gradingSystemPrompt}

Worksheet Title: ${quiz.title}

Questions and Answers to Grade:
`;

    quiz.sections.forEach((section: any, sIdx: number) => {
      prompt += `\nSection ${sIdx + 1} Instruction: ${section.instruction}\n`;
      section.questions.forEach((q: any) => {
        const studentAns = answers[q.id] || "(No answer)";
        prompt += `- [ID: ${q.id}, Num: ${q.number}] Question text: ${q.text}\n  Expected Answer: "${q.answer || '(Unknown)'}"\n  Student's Answer: "${studentAns}"\n`;
      });
    });

    if (answerKeyText) {
      prompt += `\nReference Answer Key:\n${answerKeyText}\n`;
    }

    prompt += `\nReturn ONLY a JSON array of objects with this structure:
[
  {
    "questionId": "q_id",
    "questionNumber": "1",
    "sectionIndex": 0,
    "userAnswer": "student_ans",
    "correctAnswers": ["ref_ans1", "ref_ans2"],
    "isCorrect": true | false,
    "explanation": "Brief explanation in Chinese if needed"
  }
]
`;

    const response = await fetch(`${process.env.NEXT_PUBLIC_LM_STUDIO_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer lm-studio",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "grading_results",
            strict: true,
            schema: {
              type: "object",
              properties: {
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      questionId: { type: "string" },
                      questionNumber: { type: "string" },
                      sectionIndex: { type: "number" },
                      userAnswer: { type: "string" },
                      correctAnswers: { type: "array", items: { type: "string" } },
                      isCorrect: { type: "boolean" },
                      explanation: { type: "string" }
                    },
                    required: ["questionId", "questionNumber", "sectionIndex", "userAnswer", "correctAnswers", "isCorrect", "explanation"]
                  }
                }
              },
              required: ["results"]
            }
          }
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("LM Studio error body:", errorText);
      throw new Error(`LM Studio API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const text = message?.content || message?.reasoning_content;

    if (!text) {
      throw new Error("No response from AI model");
    }

    // Clean and parse JSON
    const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    // The model might return an object with a "results" key or just the array
    let results = JSON.parse(cleaned);
    if (!Array.isArray(results) && results.results) {
      results = results.results;
    }

    return NextResponse.json({ results });
  } catch (error: any) {
    console.error("Grading error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
