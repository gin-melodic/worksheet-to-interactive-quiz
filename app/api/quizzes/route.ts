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
import { createQuiz, listQuizzes, updateAnswerKey } from '@/lib/db';

export async function GET() {
  try {
    const quizzes = listQuizzes();
    return NextResponse.json(quizzes);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, data, answerKey } = body;

    if (!title || !data || !data.sections) {
      return NextResponse.json({ error: 'Missing title or quiz data' }, { status: 400 });
    }

    const id = createQuiz(title, data);
    if (answerKey) {
      updateAnswerKey(id, answerKey);
    }
    return NextResponse.json({ id }, { status: 201 });
  } catch (error: any) {
    console.error('Failed to create quiz:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
