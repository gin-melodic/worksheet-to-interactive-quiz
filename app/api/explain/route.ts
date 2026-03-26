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

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { question, userAnswer, correctAnswer, instruction } = body;

    // Core explanation prompt from env (server-side secret) or simple default
    const explainSystemPrompt = process.env.EXPLAIN_SYSTEM_PROMPT
      || "You are an English grammar tutor. Explain why the student's answer is wrong and what the correct answer should be. Reply in Chinese.";

    const prompt = `${explainSystemPrompt}

Exercise instruction: ${instruction}
Question: ${question}
Student's answer: "${userAnswer}"
Correct answer: "${correctAnswer}"`;


    const response = await fetch(`${process.env.NEXT_PUBLIC_LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_MODEL_NAME || 'qwen3.5-35b-a3b',
        messages: [
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;
    const explanation = message?.content || message?.reasoning_content || 'Unable to generate explanation.';

    // Strip thinking tags if present (common with qwen models)
    const cleaned = explanation.replace(/<think>[\s\S]*?<\/think>\s*/g, '').trim();

    return NextResponse.json({ explanation: cleaned });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
