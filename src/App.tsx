import { useState } from 'react';
import Header from './components/Header';
import DataSource from './components/DataSource';
import LessonContent from './components/LessonContent';
import Configuration from './components/Configuration';
import MatrixResult from './components/MatrixResult';
import ExamResult from './components/ExamResult';
import { curriculumData, initialQuestionTypes, initialCognitiveLevels } from './data/mockData';
import {
  QuestionType,
  CognitiveLevels,
  ExamData,
  ManualLevelCounts,
  MatrixTotals,
} from './types';
import { Eye, Circle, AlertCircle } from 'lucide-react';
import { MatrixRow, SpecRow } from './components/MatrixResult';
import {
  splitCountByFourLevels,
  calculateLevelsFromManualConfig,
  recalculateMatrixAndTotals,
  autoDistributeMatrixRows,
  toInt,
} from './utils/matrixUtils';

export default function App() {
  const [selectedGrade, setSelectedGrade] = useState<string>('Lớp 6');
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>(initialQuestionTypes);
  const [cognitiveLevels, setCognitiveLevels] = useState<CognitiveLevels>(initialCognitiveLevels);
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');

  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    matrix: MatrixRow[];
    specification: SpecRow[];
    totals?: MatrixTotals;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isGeneratingExam, setIsGeneratingExam] = useState(false);
  const [examResult, setExamResult] = useState<ExamData | null>(null);

  const activeChapters = curriculumData[selectedGrade] || [];

  const handleGradeChange = (grade: string) => {
    setSelectedGrade(grade);
    setSelectedLessons(new Set()); // Reset selections when grade changes
  };

  const handleToggleLesson = (lessonId: string) => {
    setSelectedLessons((prev) => {
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
    setSelectedLessons((prev) => {
      const newSet = new Set(prev);
      const allSelected = lessonIds.every((id) => newSet.has(id));

      if (allSelected) {
        lessonIds.forEach((id) => newSet.delete(id));
      } else {
        lessonIds.forEach((id) => newSet.add(id));
      }

      return newSet;
    });
  };

  const handleUpdateQuestionType = (id: string, field: keyof QuestionType, value: any) => {
    setQuestionTypes((prev) => {
      const next = prev.map((qt) => {
        if (qt.id !== id) return qt;
        const updated = { ...qt, [field]: value };
        if (field === 'quantity' && allocationMode === 'auto') {
          updated.manualLevels = splitCountByFourLevels(
            toInt(value),
            cognitiveLevels,
            qt.id === 'tu_luan'
          );
        }
        return updated;
      });

      if (allocationMode === 'manual' && field === 'points') {
        const calc = calculateLevelsFromManualConfig(next);
        setCognitiveLevels(calc.levels);
      }

      return next;
    });
  };

  const handleUpdateManualLevel = (
    id: string,
    levelField: keyof ManualLevelCounts,
    value: number
  ) => {
    const cleanVal = Math.max(0, Math.round(value) || 0);
    setQuestionTypes((prev) => {
      const next = prev.map((qt) => {
        if (qt.id !== id) return qt;
        const currentManual = qt.manualLevels || {
          knowledge: qt.quantity,
          comprehension: 0,
          application: 0,
          highApplication: 0,
        };
        const updatedManual: ManualLevelCounts = {
          ...currentManual,
          [levelField]: cleanVal,
        };
        const newQuantity =
          toInt(updatedManual.knowledge) +
          toInt(updatedManual.comprehension) +
          toInt(updatedManual.application) +
          toInt(updatedManual.highApplication);

        return {
          ...qt,
          quantity: newQuantity,
          manualLevels: updatedManual,
        };
      });

      const calc = calculateLevelsFromManualConfig(next);
      setCognitiveLevels(calc.levels);
      return next;
    });
  };

  const handleUpdateCognitiveLevel = (field: keyof CognitiveLevels, value: number) => {
    setCognitiveLevels((prev) => {
      const nextLevels = { ...prev, [field]: value };
      if (allocationMode === 'auto') {
        setQuestionTypes((qts) =>
          qts.map((qt) => ({
            ...qt,
            manualLevels: splitCountByFourLevels(qt.quantity, nextLevels, qt.id === 'tu_luan'),
          }))
        );
      }
      return nextLevels;
    });
  };

  const handleSyncManualFromAuto = () => {
    setQuestionTypes((prev) => {
      const next = prev.map((qt) => ({
        ...qt,
        manualLevels: splitCountByFourLevels(qt.quantity, cognitiveLevels, qt.id === 'tu_luan'),
      }));
      const calc = calculateLevelsFromManualConfig(next);
      setCognitiveLevels(calc.levels);
      return next;
    });
  };

  const handleChangeAllocationMode = (mode: 'auto' | 'manual') => {
    setAllocationMode(mode);
    if (mode === 'manual') {
      setQuestionTypes((prev) => {
        const next = prev.map((qt) => {
          const ml = qt.manualLevels;
          const mlSum = ml
            ? toInt(ml.knowledge) +
              toInt(ml.comprehension) +
              toInt(ml.application) +
              toInt(ml.highApplication)
            : -1;
          if (!ml || mlSum !== qt.quantity) {
            return {
              ...qt,
              manualLevels: splitCountByFourLevels(
                qt.quantity,
                cognitiveLevels,
                qt.id === 'tu_luan'
              ),
            };
          }
          return qt;
        });
        const calc = calculateLevelsFromManualConfig(next);
        setCognitiveLevels(calc.levels);
        return next;
      });
    }
  };

  const handleUpdateMatrixData = (
    newMatrix: MatrixRow[],
    newTotals: MatrixTotals,
    updatedQTypes?: QuestionType[],
    updatedLevels?: CognitiveLevels
  ) => {
    setResult((prev) =>
      prev
        ? {
            ...prev,
            matrix: newMatrix,
            totals: newTotals,
          }
        : null
    );
    if (updatedQTypes) {
      setQuestionTypes(updatedQTypes);
    }
    if (updatedLevels) {
      setCognitiveLevels(updatedLevels);
    }
  };

  const handleOpenManualMatrix = () => {
    const selectedLessonDetails: { chapter: string; topic: string }[] = [];
    activeChapters.forEach((chapter) => {
      chapter.lessons.forEach((lesson) => {
        if (selectedLessons.has(lesson.id)) {
          selectedLessonDetails.push({ chapter: chapter.title, topic: lesson.title });
        }
      });
    });

    if (selectedLessonDetails.length === 0) {
      setError('Vui lòng chọn ít nhất 1 bài học ở cột Nội dung bài học để mở bảng Khung Ma Trận.');
      return;
    }

    setError(null);

    const baseRows: MatrixRow[] = selectedLessonDetails.map((ld) => ({
      chapter: ld.chapter,
      topic: ld.topic,
      multipleChoice: { knowledge: 0, comprehension: 0, application: 0 },
      trueFalse: { knowledge: 0, comprehension: 0, application: 0 },
      shortAnswer: { knowledge: 0, comprehension: 0, application: 0 },
      essay: { knowledge: 0, comprehension: 0, application: 0 },
      totalKnowledge: 0,
      totalComprehension: 0,
      totalApplication: 0,
      totalPercentage: '0%',
    }));

    const { matrix: distributedMatrix, totals: distributedTotals } = autoDistributeMatrixRows(
      baseRows,
      questionTypes,
      cognitiveLevels
    );

    const defaultSpecs: SpecRow[] = [];
    for (const ld of selectedLessonDetails) {
      defaultSpecs.push(
        {
          topic: ld.topic,
          level: 'Nhận biết',
          requirement: `– Nhận biết được các khái niệm, tính chất cơ bản thuộc bài: ${ld.topic}.`,
          questionCount: 1,
        },
        {
          topic: ld.topic,
          level: 'Thông hiểu',
          requirement: `– Hiểu và giải thích được các tính chất, thực hiện được các phép tính thuộc bài: ${ld.topic}.`,
          questionCount: 1,
        },
        {
          topic: ld.topic,
          level: 'Vận dụng',
          requirement: `– Vận dụng được kiến thức bài "${ld.topic}" để giải quyết bài toán thực tiễn hoặc bài toán tổng hợp.`,
          questionCount: 1,
        }
      );
    }

    setResult({
      matrix: distributedMatrix,
      specification: defaultSpecs,
      totals: distributedTotals,
    });
  };

  const handleGenerate = async () => {
    if (selectedLessons.size === 0) {
      setError('Vui lòng chọn ít nhất 1 bài học để phân tích.');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const selectedLessonTitles: string[] = [];
      const selectedLessonDetails: { chapter: string; topic: string }[] = [];
      activeChapters.forEach((chapter) => {
        chapter.lessons.forEach((lesson) => {
          if (selectedLessons.has(lesson.id)) {
            selectedLessonTitles.push(lesson.title);
            selectedLessonDetails.push({ chapter: chapter.title, topic: lesson.title });
          }
        });
      });

      const response = await fetch('/api/generate-matrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: selectedGrade,
          lessons: selectedLessonTitles,
          lessonDetails: selectedLessonDetails,
          config: questionTypes,
          levels: cognitiveLevels,
          allocationMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('503')) {
          throw new Error('Hệ thống AI đang quá tải (Lỗi 503). Vui lòng thử lại sau vài phút.');
        }
        throw new Error(errorData.error || 'Đã có lỗi xảy ra khi gọi API');
      }

      const data = await response.json();
      const recalc = recalculateMatrixAndTotals(data.matrix || [], questionTypes);
      setResult({
        matrix: recalc.matrix,
        specification: data.specification || [],
        totals: recalc.totals,
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo ma trận. Vui lòng thử lại sau.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateExam = async () => {
    if (!result?.specification) {
      setError('Không có bản đặc tả để tạo đề.');
      return;
    }

    setError(null);
    setIsGeneratingExam(true);

    try {
      const response = await fetch('/api/generate-exam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: selectedGrade,
          specification: result.specification,
          matrix: result.matrix,
          totals: result.totals,
          config: questionTypes,
          levels: cognitiveLevels,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error && errorData.error.includes('503')) {
          throw new Error('Hệ thống AI đang quá tải (Lỗi 503). Vui lòng thử lại sau vài phút.');
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
            <ExamResult exam={examResult} onBack={() => setExamResult(null)} />
          </div>
        ) : result ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            <MatrixResult
              matrix={result.matrix}
              specification={result.specification}
              totals={result.totals}
              grade={selectedGrade}
              questionTypes={questionTypes}
              cognitiveLevels={cognitiveLevels}
              onUpdateMatrixData={handleUpdateMatrixData}
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
                onUpdateManualLevel={handleUpdateManualLevel}
                cognitiveLevels={cognitiveLevels}
                onUpdateCognitiveLevel={handleUpdateCognitiveLevel}
                allocationMode={allocationMode}
                onChangeAllocationMode={handleChangeAllocationMode}
                onSyncManualFromAuto={handleSyncManualFromAuto}
                onOpenManualMatrix={handleOpenManualMatrix}
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
