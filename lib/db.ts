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

import Database from 'better-sqlite3';
import path from 'path';
import { Quiz } from '@/types/quiz';

const DB_PATH = path.join(process.cwd(), 'data', 'quizzes.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    // Ensure the data directory exists
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        original_image TEXT,
        answer_key TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      )
    `);

    // Migration
    try {
      db.exec('ALTER TABLE quizzes ADD COLUMN original_image TEXT');
    } catch (e) {
      // Column already exists
    }
  }
  return db;
}

export interface QuizRecord {
  id: string;
  title: string;
  data: Quiz;
  originalImage: string | null;
  answerKey: string | null;
  createdAt: string;
}

export interface QuizListItem {
  id: string;
  title: string;
  questionCount: number;
  sectionCount: number;
  createdAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

export function createQuiz(title: string, data: Quiz, originalImage?: string): string {
  const db = getDb();
  const id = generateId();
  const stmt = db.prepare('INSERT INTO quizzes (id, title, data, original_image) VALUES (?, ?, ?, ?)');
  stmt.run(id, title, JSON.stringify(data), originalImage || null);
  return id;
}

export function getQuiz(id: string): QuizRecord | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    data: JSON.parse(row.data),
    originalImage: row.original_image,
    answerKey: row.answer_key,
    createdAt: row.created_at,
  };
}

export function listQuizzes(): QuizListItem[] {
  const db = getDb();
  const rows = db.prepare('SELECT id, title, data, created_at FROM quizzes ORDER BY created_at DESC').all() as any[];
  return rows.map((row) => {
    const data: Quiz = JSON.parse(row.data);
    return {
      id: row.id,
      title: row.title,
      questionCount: data.sections.reduce((sum, s) => sum + s.questions.length, 0),
      sectionCount: data.sections.length,
      createdAt: row.created_at,
    };
  });
}

export function deleteQuiz(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM quizzes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function updateQuiz(id: string, title: string, data: Quiz): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE quizzes SET title = ?, data = ? WHERE id = ?').run(title, JSON.stringify(data), id);
  return result.changes > 0;
}

export function updateAnswerKey(id: string, answerKey: string): boolean {
  const db = getDb();
  const result = db.prepare('UPDATE quizzes SET answer_key = ? WHERE id = ?').run(answerKey, id);
  return result.changes > 0;
}
