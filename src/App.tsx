import { useState } from 'react';
import Header from './components/Header';
import DataSource from './components/DataSource';
import LessonContent from './components/LessonContent';
import Configuration from './components/Configuration';
import MatrixResult from './components/MatrixResult';
import ExamResult from './components/ExamResult';
import { curriculumData, initialQuestionTypes, initialCognitiveLevels } from './data/mockData';
import { QuestionType, CognitiveLevels, ExamData } from './types';
import { Eye, Circle, AlertCircle } from 'lucide-react';
import { MatrixRow, SpecRow } from './components/MatrixResult';

export default function App() {
  const [selectedGrade, setSelectedGrade] = useState<string>('Lớp 6');
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(initialQuestionTypes);
  const [cognitiveLevels, setCognitiveLevels] = useState<CognitiveLevels>(initialCognitiveLevels);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ matrix: MatrixRow[], specification: SpecRow[], totals?: any } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examResult, setExamResult] = useState<ExamData | null>(null);

  const activeChapters = curriculumData[selectedGrade] || [];

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedLessons(new Set()); // Reset selections when grade changes
  };

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  };

  const handleToggleChapter = (chapterId: string, lessonIds: string[]) => {
    setSelectedLessons(prev => {
      const newSet = new Set(prev);
      const allSelected = lessonIds.every(id => newSet.has(id));
      
      if (allSelected) {
        // Deselect all
        lessonIds.forEach(id => newSet.delete(id));
      } else {
        // Select all
        lessonIds.forEach(id => newSet.add(id));
      }
      
      return newSet;
    });
  };

  const handleUpdateQuestionType = (id: string, field: keyof QuestionType, value: number) => {
    setQuestionTypes(prev => 
      prev.map(qt => qt.id === id ? { ...qt, [field]: value } : qt)
    );
  };

  const handleUpdateCognitiveLevel = (field: keyof CognitiveLevels, value: number) => {
    setCognitiveLevels(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerate = async () => {
    if (selectedLessons.size === 0) {
      setError("Vui lòng chọn ít nhất 1 bài học để phân tích.");
      return;
    }
    
    setError(null);
    setIsGenerating(true);

    try {
      // Find the titles of the selected lessons
      const selectedLessonTitles: string[] = [];
      activeChapters.forEach(chapter => {
        chapter.lessons.forEach(lesson => {
          if (selectedLessons.has(lesson.id)) {
            selectedLessonTitles.push(lesson.title);
          }
        });
      });

      const response = await fetch('/api/generate-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          lessons: selectedLessonTitles,
          config: questionTypes,
          levels: cognitiveLevels
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes("503")) {
          throw new Error("Hệ thống AI đang quá tải (Lỗi 503). Vui lòng thử lại sau vài phút.");
        }
        throw new Error(errorData.error || 'Đã có lỗi xảy ra khi gọi API');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo ma trận. Vui lòng thử lại sau.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExam = async () => {
    if (!result?.specification) {
      setError("Không có bản đặc tả để tạo đề.");
      return;
    }
    
    setError(null);
    setIsGeneratingExam(true);

    try {
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          specification: result.specification,
          matrix: result.matrix
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes("503")) {
          throw new Error("Hệ thống AI đang quá tải (Lỗi 503). Vui lòng thử lại sau vài phút.");
        }
        throw new Error(errorData.error || 'Đã có lỗi xảy ra khi tạo đề');
      }

      const data = await response.json();
      setExamResult(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tạo đề. Vui lòng thử lại sau.');
    } finally {
      setIsGeneratingExam(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header onGenerate={handleGenerate} isGenerating={isGenerating} />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {examResult ? (
          <div className="grid grid-cols-1 gap-6 flex-1">
            <ExamResult 
              exam={examResult} 
              onBack={() => setExamResult(null)} 
            />
          </div>
        ) : result ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <MatrixResult 
              matrix={result.matrix} 
              specification={result.specification} 
              totals={result.totals}
              grade={selectedGrade}
              onBack={() => setResult(null)} 
              onGenerateExam={handleGenerateExam}
              isGeneratingExam={isGeneratingExam}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)] min-h-[600px] items-stretch">
            <div className="lg:col-span-1 h-full">
              <DataSource onGradeChange={handleGradeChange} selectedGrade={selectedGrade} />
            </div>
            <div className="lg:col-span-1 h-full">
              <LessonContent 
                chapters={activeChapters}
                selectedLessons={selectedLessons}
                onToggleLesson={handleToggleLesson}
                onToggleChapter={handleToggleChapter}
              />
            </div>
            <div className="lg:col-span-1 h-full">
              <Configuration 
                questionTypes={questionTypes}
                onUpdateQuestionType={handleUpdateQuestionType}
                cognitiveLevels={cognitiveLevels}
                onUpdateCognitiveLevel={handleUpdateCognitiveLevel}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer to match screenshot footer */}
      <footer className="bg-white border-t border-slate-200 py-3 px-6 text-sm text-slate-500 flex justify-between items-center mt-auto">
        <div>Phát triển bởi: Đức Khuê Education - Zalo 0342551431 © 2025</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <Eye className="w-4 h-4" /> 24.514
          </div>
          <div className="flex items-center gap-1.5 font-medium text-emerald-600">
            <Circle className="w-2.5 h-2.5 fill-current" /> 5 Online
          </div>
        </div>
      </footer>
    </div>
  );
}
