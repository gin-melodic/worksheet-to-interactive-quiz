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

export type QuestionType = 'fill_in_the_blank' | 'matching' | 'short_answer';

export interface Question {
  id: string;
  number: string;
  text: string;
  answer?: string;
  placeholder?: string; // Custom placeholder for input box
  imageThumb?: string; // Base64 thumbnail for image-based questions
  bbox?: [number, number, number, number]; // [ymin, xmin, ymax, xmax] coordinates for cropping
}

export interface MatchingOption {
  id: string;
  text: string;
}

export interface Section {
  instruction: string;
  type: QuestionType;
  wordBank?: string[];
  matchingOptions?: MatchingOption[];
  questions: Question[];
}

export interface Quiz {
  title: string;
  sections: Section[];
}

export interface GradingResult {
  questionId: string;
  questionNumber: string;
  sectionIndex: number;
  userAnswer: string;
  correctAnswers: string[];  // multiple acceptable answers (split by /)
  isCorrect: boolean;
  explanation?: string;
}
