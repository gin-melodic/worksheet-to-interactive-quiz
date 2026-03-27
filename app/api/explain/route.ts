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
    const { question, userAnswer, correctAnswer, instruction, messages: history = [] } = body;

    const isCorrect = userAnswer?.trim().toLowerCase() === correctAnswer?.trim().toLowerCase();

    // Core explanation prompt from env (server-side secret) or simple default
    let explainSystemPrompt = process.env.EXPLAIN_SYSTEM_PROMPT || 
      "You are an English grammar tutor. Explain why the student's answer is wrong and provide the correct grammar rule in Chinese.";

    if (isCorrect) {
      explainSystemPrompt = process.env.EXPLAIN_CORRECT_SYSTEM_PROMPT || 
        "You are an English grammar tutor. Excellent! The student's answer is correct. Please briefly explain (in Chinese) the grammar rule behind this question to help the student understand it better.";
    }

    const context = `Exercise instruction: ${instruction}
Question: ${question}
Student's answer: "${userAnswer}"
Correct answer: "${correctAnswer}"`;

    let chatMessages = [];

    if (history.length === 0) {
      // First explanation call
      const prompt = `${explainSystemPrompt}\n\n${context}`;
      chatMessages.push({ role: 'user', content: prompt });
    } else {
      // Follow-up call: Prepend context to the first assistant message or the whole conversation
      // To ensure alternating roles (User/Assistant), we should avoid two Assistants in a row
      // The history already starts with the Assistant's initial explanation
      const followupPrompt = process.env.EXPLAIN_FOLLOWUP_PROMPT
        || "Instructions: ${instructions}\n\nContext for this conversation:\n${context}\n\nPlease help the student with their follow-up questions.";
      
      chatMessages.push({ 
        role: 'user', 
        content: followupPrompt
          .replace('${instructions}', explainSystemPrompt)
          .replace('${context}', context)
      });
      chatMessages.push(...history);
    }


    const response = await fetch(`${process.env.NEXT_PUBLIC_LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer lm-studio',
      },
      body: JSON.stringify({
        model: process.env.NEXT_PUBLIC_MODEL_NAME || 'qwen3.5-35b-a3b',
        messages: chatMessages,
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const result = await response.json();
    const message = result.choices?.[0]?.message;
    const explanation = message?.content || message?.reasoning_content || 'Unable to generate explanation.';

    // Strip thinking tags and process headers (common with qwen / deepseek models)
    const cleaned = explanation
      .replace(/<think>[\s\S]*?<\/think>\s*/g, '')
      .replace(/Thinking Process:\s*[\s\S]*?\n\n/gi, '')
      .replace(/理清思路[：:]\s*[\s\S]*?\n\n/g, '')
      .trim();

    return NextResponse.json({ explanation: cleaned });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
