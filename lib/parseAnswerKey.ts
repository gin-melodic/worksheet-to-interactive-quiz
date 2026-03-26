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

/**
 * Parse a plain-text answer key into a structured map.
 * 
 * Expected format:
 *   UNIT 3          ← ignored header lines
 *   3.1             ← section marker (digits.digits)
 *   3 is trying     ← question number + answer
 *   4 phones        ← question number + answer
 *   5 OK            ← "OK" means original is correct
 *   
 * Answers separated by " / " are treated as equally acceptable alternatives.
 * Multi-line answers are concatenated.
 */

export interface ParsedAnswerKey {
  /** sectionIndex → questionNumber → list of acceptable answers */
  sections: Map<number, Map<string, string[]>>;
}

export function parseAnswerKey(text: string, sectionCount: number): ParsedAnswerKey {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const result: ParsedAnswerKey = {
    sections: new Map(),
  };

  let currentSectionIndex = 0;
  let currentQuestionMap: Map<string, string[]> = new Map();
  result.sections.set(0, currentQuestionMap);

  // Regex to detect section markers like "3.1", "3.2", etc.
  const sectionMarkerRe = /^\d+\.\d+$/;
  // Regex to detect question lines: starts with a number
  const questionLineRe = /^(\d+)\s+(.+)$/;

  let sectionMarkersFound = 0;

  for (const line of lines) {
    // Skip header lines like "UNIT 3"
    if (/^UNIT\s+/i.test(line)) continue;

    // Check for section marker
    if (sectionMarkerRe.test(line)) {
      sectionMarkersFound++;
      if (sectionMarkersFound > 1) {
        currentSectionIndex++;
      }
      currentQuestionMap = new Map();
      result.sections.set(currentSectionIndex, currentQuestionMap);
      continue;
    }

    // Check for question line
    const match = line.match(questionLineRe);
    if (match) {
      const qNum = match[1];
      const answerText = match[2].trim();
      const alternatives = answerText.split(/\s*\/\s*/).map(a => a.trim()).filter(a => a.length > 0);
      currentQuestionMap.set(qNum, alternatives);
      continue;
    }

    // Continuation line (e.g. multi-line answer or sub-parts like "b She always stays")
    // Try to detect sub-part patterns like "a flows" or "b is flowing"
    const subPartMatch = line.match(/^([a-z])\s+(.+)$/);
    if (subPartMatch) {
      // This is a sub-part of the previous question - append to last question's answers
      const entries = Array.from(currentQuestionMap.entries());
      if (entries.length > 0) {
        const lastKey = entries[entries.length - 1][0];
        const existing = currentQuestionMap.get(lastKey) || [];
        const subAnswers = subPartMatch[2].split(/\s*\/\s*/).map(a => a.trim()).filter(a => a.length > 0);
        currentQuestionMap.set(lastKey, [...existing, ...subAnswers]);
      }
      continue;
    }

    // Other continuation lines - append to last question
    const entries = Array.from(currentQuestionMap.entries());
    if (entries.length > 0) {
      const lastKey = entries[entries.length - 1][0];
      const existing = currentQuestionMap.get(lastKey) || [];
      const extraAnswers = line.split(/\s*\/\s*/).map(a => a.trim()).filter(a => a.length > 0);
      currentQuestionMap.set(lastKey, [...existing, ...extraAnswers]);
    }
  }

  return result;
}

/**
 * Compare a user answer against a list of acceptable answers.
 * Case-insensitive, trims whitespace, handles "OK" specially.
 */
export function isAnswerCorrect(
  userAnswer: string,
  correctAnswers: string[],
  originalText?: string
): boolean {
  const normalized = userAnswer.trim().toLowerCase();
  if (!normalized) return false;

  for (const correct of correctAnswers) {
    const normalizedCorrect = correct.trim().toLowerCase();
    if (normalizedCorrect === 'ok') {
      // "OK" means the original is correct - user should not have changed it
      // Accept empty answer or "ok" as correct
      if (normalized === 'ok' || normalized === '') return true;
      continue;
    }
    if (normalized === normalizedCorrect) return true;
    // Also check if user answer contains the correct answer (for partial matches)
    // e.g. user types "I'm coming" and correct is "I'm coming"
    if (normalizedCorrect.includes(normalized) || normalized.includes(normalizedCorrect)) return true;
  }
  return false;
}
