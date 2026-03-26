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

// Simple default prompt fallback
const DEFAULT_RECOGNITION_PROMPT = "Analyze this worksheet image and convert it into an interactive quiz format. Extract the title, instructions, and all questions. Categorize each section into one of these types: fill_in_the_blank, matching, or short_answer.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Inject server-side prompt if available (replaces the simple client-side default)
    const serverPrompt = process.env.WORKSHEET_RECOGNITION_PROMPT;
    if (serverPrompt && body.messages) {
      for (const msg of body.messages) {
        if (Array.isArray(msg.content)) {
          // Multimodal message: find the text part and replace the default prompt prefix
          for (const part of msg.content) {
            if (part.type === 'text' && part.text?.startsWith(DEFAULT_RECOGNITION_PROMPT)) {
              part.text = part.text.replace(DEFAULT_RECOGNITION_PROMPT, serverPrompt);
            }
          }
        } else if (typeof msg.content === 'string' && msg.content.startsWith(DEFAULT_RECOGNITION_PROMPT)) {
          msg.content = msg.content.replace(DEFAULT_RECOGNITION_PROMPT, serverPrompt);
        }
      }
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_LM_STUDIO_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer lm-studio",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    if (body.stream) {
      // Forward the streaming response
      return new Response(response.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
        },
      });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
