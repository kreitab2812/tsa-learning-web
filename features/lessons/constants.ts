"use client";
import { Video, FileText, ClipboardList, PlayCircle } from "lucide-react";
import type { Option, Statement, Lesson } from "./types";
export const EMPTY_OPTIONS: Option[] = [
  { id: "A", text: "" }, { id: "B", text: "" }, { id: "C", text: "" }, { id: "D", text: "" },
];
export const EMPTY_STATEMENTS: Statement[] = [
  { id: "a", text: "", isTrue: true }, { id: "b", text: "", isTrue: true },
  { id: "c", text: "", isTrue: true }, { id: "d", text: "", isTrue: true },
];

export const TABS = [
  { key: "theory", label: "Lý thuyết", icon: PlayCircle },
  { key: "practice", label: "Thực hành", icon: Video },
  { key: "documents", label: "Tài liệu", icon: FileText },
  { key: "questions", label: "Bài tập", icon: ClipboardList },
] as const;
export type TabKey = typeof TABS[number]["key"];
export type LessonFieldValue = string | Lesson["status"] | number | boolean | null;
