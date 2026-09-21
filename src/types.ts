export interface Lesson {
  id: string;
  title: string;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface QuestionType {
  id: string;
  name: string;
  quantity: number;
  points: number;
}

export interface CognitiveLevels {
  knowledge: number;
  comprehension: number;
  application: number;
  highApplication: number;
}

export interface ExamQuestion {
  id: string;
  type: 'multipleChoice' | 'trueFalse' | 'shortAnswer' | 'essay';
  level: string;
  topic: string;
  content: string;
  options?: string[]; // Used for multiple choice and true-false
  answer: any;
  explanation: string;
}

export interface ExamData {
  questions: ExamQuestion[];
}

export interface LevelBreakdown {
  knowledge: string | number;
  comprehension: string | number;
  application: string | number;
}

export interface MatrixRow {
  chapter: string;
  topic: string;
  multipleChoice: LevelBreakdown;
  trueFalse: LevelBreakdown;
  shortAnswer: LevelBreakdown;
  essay: LevelBreakdown;
  totalKnowledge: string | number;
  totalComprehension: string | number;
  totalApplication: string | number;
  totalPercentage: string | number;
}

export interface MatrixTotals {
  totalQuestions: LevelBreakdown & {
    multipleChoice: LevelBreakdown;
    trueFalse: LevelBreakdown;
    shortAnswer: LevelBreakdown;
    essay: LevelBreakdown;
    totalKnowledge: string | number;
    totalComprehension: string | number;
    totalApplication: string | number;
  };
  totalPoints: LevelBreakdown & {
    multipleChoice: string | number;
    trueFalse: string | number;
    shortAnswer: string | number;
    essay: string | number;
    totalKnowledge: string | number;
    totalComprehension: string | number;
    totalApplication: string | number;
  };
  totalPercentage: LevelBreakdown & {
    multipleChoice: string | number;
    trueFalse: string | number;
    shortAnswer: string | number;
    essay: string | number;
    totalKnowledge: string | number;
    totalComprehension: string | number;
    totalApplication: string | number;
  };
}

export interface SpecRow {
  topic: string;
  level: string;
  requirement: string;
  questionCount: string | number;
}
