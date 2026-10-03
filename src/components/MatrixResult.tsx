import { useState, useEffect } from 'react';
import {
  Sparkles,
  FileText,
  Code,
  ChevronDown,
  Download,
  Edit3,
  Wand2,
  Eye,
  Calculator,
  Plus,
  Minus,
} from 'lucide-react';
import MathRenderer from './MathRenderer';
import { exportMatrixAndSpecToWord } from '../utils/exportWord';
import { WordMathMode } from '../utils/latexToDocxMath';
import {
  MatrixRow,
  SpecRow,
  MatrixTotals,
  LevelBreakdown,
  QuestionType,
  CognitiveLevels,
} from '../types';
import {
  recalculateMatrixAndTotals,
  autoDistributeMatrixRows,
  toInt,
} from '../utils/matrixUtils';

export type { LevelBreakdown, MatrixRow, MatrixTotals, SpecRow };

interface MatrixResultProps {
  matrix: MatrixRow[];
  specification: SpecRow[];
  totals?: MatrixTotals;
  grade?: string;
  questionTypes?: QuestionType[];
  cognitiveLevels?: CognitiveLevels;
  onUpdateMatrixData?: (
    newMatrix: MatrixRow[],
    newTotals: MatrixTotals,
    updatedQuestionTypes?: QuestionType[],
    updatedLevels?: CognitiveLevels
  ) => void;
  onBack: () => void;
  onGenerateExam: () => void;
  isGeneratingExam: boolean;
}

type QTypeKey = 'multipleChoice' | 'trueFalse' | 'shortAnswer' | 'essay';
type LevelKey = 'knowledge' | 'comprehension' | 'application';

interface EditableCellProps {
  value: number;
  editable: boolean;
  onChange: (newVal: number) => void;
  colorClass?: string;
}

function EditableMatrixCell({
  value,
  editable,
  onChange,
  colorClass = 'text-purple-800',
}: EditableCellProps) {
  const [draft, setDraft] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(String(value));
    }
  }, [value, isFocused]);

  if (!editable) {
    return (
      <td className={`border border-slate-300 p-2 text-center font-semibold ${colorClass}`}>
        {value}
      </td>
    );
  }

  const handleInputChange = (raw: string) => {
    // Allow empty string while typing so user can clear with Backspace
    const cleaned = raw.replace(/[^0-9]/g, '');
    setDraft(cleaned);
    const num = cleaned === '' ? 0 : Math.min(99, parseInt(cleaned, 10) || 0);
    onChange(num);
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.min(99, value + delta));
    setDraft(String(next));
    onChange(next);
  };

  return (
    <td className="border border-slate-300 p-1 text-center bg-purple-50/25 hover:bg-purple-100/50 transition-colors align-middle">
      <div className="inline-flex items-center justify-center bg-white border border-purple-300 rounded-md shadow-2xs focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-purple-500">
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(-1)}
          className="px-1 py-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-l transition-colors"
          title="Giảm 1 câu"
        >
          <Minus className="w-2.5 h-2.5" />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={isFocused ? draft : String(value)}
          onFocus={(e) => {
            setIsFocused(true);
            setDraft(String(value));
            e.currentTarget.select();
          }}
          onBlur={() => {
            setIsFocused(false);
            setDraft(String(value));
          }}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              handleStep(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              handleStep(-1);
            }
          }}
          className={`w-7 h-7 text-center text-sm font-bold ${colorClass} bg-transparent focus:outline-none`}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => handleStep(1)}
          className="px-1 py-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded-r transition-colors"
          title="Tăng 1 câu"
        >
          <Plus className="w-2.5 h-2.5" />
        </button>
      </div>
    </td>
  );
}

interface EditablePointsCellProps {
  points: number;
  editable: boolean;
  onChangePoints: (newPoints: number) => void;
  label: string;
}

function EditableSectionPointsCell({
  points,
  editable,
  onChangePoints,
  label,
}: EditablePointsCellProps) {
  const formatDisplay = (n: number) => {
    const rounded = Math.round((Number(n) || 0) * 100) / 100;
    return rounded.toString().replace('.', ',');
  };

  const [draft, setDraft] = useState<string>(formatDisplay(points));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setDraft(formatDisplay(points));
    }
  }, [points, isFocused]);

  if (!editable) {
    return (
      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700 font-bold">
        {formatDisplay(points)}
      </td>
    );
  }

  const handleRawChange = (raw: string) => {
    // Allow digits, dot, comma
    const cleaned = raw.replace(/[^0-9.,]/g, '');
    setDraft(cleaned);
    const normalized = cleaned.replace(',', '.');
    if (normalized === '' || normalized === '.') {
      onChangePoints(0);
      return;
    }
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
      onChangePoints(Math.max(0, Math.min(20, parsed)));
    }
  };

  const handleStep = (delta: number) => {
    const next = Math.max(0, Math.round((points + delta) * 100) / 100);
    setDraft(formatDisplay(next));
    onChangePoints(next);
  };

  return (
    <td colSpan={3} className="border border-slate-300 p-2 text-center bg-purple-50/40">
      <div className="inline-flex items-center justify-center gap-1">
        <div className="inline-flex items-center bg-white border border-purple-300 rounded-md shadow-2xs focus-within:ring-2 focus-within:ring-purple-500">
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleStep(-0.25)}
            className="px-1.5 py-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-l transition-colors"
            title={`Giảm 0,25 điểm phần ${label}`}
          >
            <Minus className="w-3 h-3" />
          </button>
          <input
            type="text"
            inputMode="decimal"
            value={isFocused ? draft : formatDisplay(points)}
            onFocus={(e) => {
              setIsFocused(true);
              setDraft(formatDisplay(points));
              e.currentTarget.select();
            }}
            onBlur={() => {
              setIsFocused(false);
              setDraft(formatDisplay(points));
            }}
            onChange={(e) => handleRawChange(e.target.value)}
            className="w-12 h-7 text-center text-sm font-bold text-purple-800 bg-transparent focus:outline-none"
            title={`Nhập tổng điểm phần ${label}`}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => handleStep(0.25)}
            className="px-1.5 py-1 text-slate-500 hover:text-purple-700 hover:bg-purple-50 rounded-r transition-colors"
            title={`Tăng 0,25 điểm phần ${label}`}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
        <span className="text-xs text-slate-500 font-medium">đ</span>
      </div>
    </td>
  );
}

export default function MatrixResult({
  matrix,
  specification,
  totals: propTotals,
  grade = 'Lớp 6',
  questionTypes = [],
  cognitiveLevels = { knowledge: 40, comprehension: 30, application: 20, highApplication: 10 },
  onUpdateMatrixData,
  onBack,
  onGenerateExam,
  isGeneratingExam,
}: MatrixResultProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isManualEditMode, setIsManualEditMode] = useState(true);

  // Always compute live recalculated matrix & totals so every row total, point, and percentage is 100% reactive
  const liveCalc = recalculateMatrixAndTotals(matrix, questionTypes);
  const displayMatrix = liveCalc.matrix;
  const totals = liveCalc.totals || propTotals;

  const handleExport = async (
    mode: 'all' | 'matrix' | 'spec',
    mathMode: WordMathMode = 'equation'
  ) => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      await exportMatrixAndSpecToWord(displayMatrix, specification, totals, grade, mode, mathMode);
    } catch (error) {
      console.error('Lỗi khi xuất Word:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCellChange = (
    rowIndex: number,
    qType: QTypeKey,
    level: LevelKey,
    newVal: number
  ) => {
    if (!onUpdateMatrixData) return;
    const cleanVal = Math.max(0, Math.round(newVal) || 0);

    const updatedRows = displayMatrix.map((row, idx) => {
      if (idx !== rowIndex) return row;
      return {
        ...row,
        [qType]: {
          ...row[qType],
          [level]: cleanVal,
        },
      };
    });

    const { matrix: recalcMatrix, totals: recalcTotals, computedLevels } =
      recalculateMatrixAndTotals(updatedRows, questionTypes);

    const typeIdMap: Record<QTypeKey, string> = {
      multipleChoice: 'trac_nghiem',
      trueFalse: 'dung_sai',
      shortAnswer: 'tra_loi_ngan',
      essay: 'tu_luan',
    };

    const updatedQTypes = questionTypes.map((qt) => {
      const matchedKey = (Object.keys(typeIdMap) as QTypeKey[]).find(
        (k) => typeIdMap[k] === qt.id
      );
      if (!matchedKey) return qt;
      const kCount = toInt(recalcTotals.totalQuestions[matchedKey].knowledge);
      const cCount = toInt(recalcTotals.totalQuestions[matchedKey].comprehension);
      const aCount = toInt(recalcTotals.totalQuestions[matchedKey].application);
      return {
        ...qt,
        quantity: kCount + cCount + aCount,
        manualLevels: {
          knowledge: kCount,
          comprehension: cCount,
          application: aCount,
          highApplication: 0,
        },
      };
    });

    onUpdateMatrixData(recalcMatrix, recalcTotals, updatedQTypes, computedLevels);
  };

  const handleSectionPointsChange = (cfgId: string, newPts: number) => {
    if (!onUpdateMatrixData) return;
    const cleanPts = Math.max(0, Number(newPts) || 0);
    const updatedQTypes = questionTypes.map((qt) =>
      qt.id === cfgId ? { ...qt, points: cleanPts } : qt
    );
    const { matrix: recalcMatrix, totals: recalcTotals, computedLevels } =
      recalculateMatrixAndTotals(displayMatrix, updatedQTypes);
    onUpdateMatrixData(recalcMatrix, recalcTotals, updatedQTypes, computedLevels);
  };

  const handleAutoDistribute = () => {
    if (!onUpdateMatrixData) return;
    const { matrix: autoMatrix, totals: autoTotals, computedLevels } =
      autoDistributeMatrixRows(displayMatrix, questionTypes, cognitiveLevels);
    onUpdateMatrixData(autoMatrix, autoTotals, questionTypes, computedLevels);
  };

  const getSectionPointsNumber = (cfgId: string, fallback: string | number | undefined): number => {
    const found = questionTypes.find((q) => q.id === cfgId);
    if (found !== undefined) return Number(found.points) || 0;
    if (typeof fallback === 'number') return fallback;
    if (typeof fallback === 'string') return parseFloat(fallback.replace(',', '.')) || 0;
    return 0;
  };

  const totalExamPoints =
    questionTypes.length > 0
      ? questionTypes.reduce((acc, q) => acc + (Number(q.points) || 0), 0)
      : 10;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full col-span-1 lg:col-span-3">
      <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-purple-50">
        <h2 className="text-xl font-bold text-purple-800">Kết quả: Khung Ma Trận & Bản Đặc Tả</h2>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onBack}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm mr-1"
          >
            Quay lại
          </button>

          <button
            onClick={() => {
              document.getElementById('ban-dac-ta-section')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Xem Bản đặc tả
          </button>

          <button
            onClick={onGenerateExam}
            disabled={isGeneratingExam}
            className="bg-[#f59e0b] hover:bg-[#d97706] disabled:opacity-70 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            {isGeneratingExam ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Đang tạo đề...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Tạo Đề Từ Ma Trận
              </>
            )}
          </button>

          {/* Nút Xuất Word với Menu Tùy Chọn */}
          <div className="relative">
            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => handleExport('all')}
                disabled={isExporting}
                className="bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-75 text-white px-3.5 py-2 rounded-l-lg text-sm font-bold transition-colors flex items-center gap-1.5"
                title="Xuất cả Ma trận & Bản đặc tả sang Word (.docx) chuẩn Equation"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Đang xuất...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Xuất Word (Equation)</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-75 text-white px-2 py-2 rounded-r-lg border-l border-blue-400 transition-colors flex items-center justify-center"
                title="Tùy chọn xuất Word (Equation)"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-1.5 w-76 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-sm">
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Word Equation (.docx)
                  </div>
                  <button
                    onClick={() => handleExport('all', 'equation')}
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 flex items-center justify-between text-slate-800 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Cả Ma trận & Đặc tả (Equation)
                    </span>
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                      Equation
                    </span>
                  </button>
                  <button
                    onClick={() => handleExport('matrix', 'equation')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Chỉ Khung Ma trận (Equation)
                  </button>
                  <button
                    onClick={() => handleExport('spec', 'equation')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Chỉ Bản Đặc tả (Equation)
                  </button>

                  <div className="my-1 border-t border-slate-100" />
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Word Dạng LaTeX $...$ (.docx)
                  </div>
                  <button
                    onClick={() => handleExport('all', 'latex')}
                    className="w-full text-left px-3.5 py-2 hover:bg-indigo-50 flex items-center justify-between text-slate-800 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-indigo-600" />
                      Cả Ma trận & Đặc tả (LaTeX)
                    </span>
                    <span className="text-[11px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                      $...$
                    </span>
                  </button>
                  <button
                    onClick={() => handleExport('spec', 'latex')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Code className="w-4 h-4 text-slate-500" />
                    Chỉ Bản Đặc tả (LaTeX)
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => handleExport('all', 'latex')}
            disabled={isExporting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-75 text-white px-3.5 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-1.5"
            title="Xuất cả Ma trận & Bản đặc tả sang Word (.docx) giữ nguyên mã công thức LaTeX $...$"
          >
            <Code className="w-4 h-4" />
            Xuất Word (LaTeX)
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {/* Khung Ma Trận */}
        <div className="mb-10" id="khung-ma-tran-section">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-bold text-slate-800 border-l-4 border-purple-600 pl-3">
                1. Khung Ma Trận
              </h3>
              <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5" />
                Tự động chia tỉ lệ % khi sửa số câu & điểm
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Manual Edit vs Read-only View */}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setIsManualEditMode(true)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    isManualEditMode
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Sửa trực tiếp trên bảng
                </button>
                <button
                  type="button"
                  onClick={() => setIsManualEditMode(false)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    !isManualEditMode
                      ? 'bg-white text-slate-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Chế độ xem in
                </button>
              </div>

              {onUpdateMatrixData && (
                <button
                  type="button"
                  onClick={handleAutoDistribute}
                  className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors"
                  title="Tự động rải đều lại số câu hỏi vào các bài học theo cấu hình"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-600" />
                  Tự động phân bổ lại
                </button>
              )}

              <button
                onClick={() => handleExport('matrix')}
                disabled={isExporting}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất Ma trận (.docx)
              </button>
            </div>
          </div>

          {isManualEditMode && (
            <div className="mb-3 px-3.5 py-2.5 bg-purple-50/70 border border-purple-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-purple-900">
              <div>
                <strong>Chỉnh sửa trực tiếp:</strong> Bấm nút <strong>- / +</strong> hoặc gõ trực tiếp số vào từng ô{' '}
                <span className="font-semibold underline">Biết / Hiểu / Vận dụng</span> và hàng{' '}
                <span className="font-semibold underline">Tổng số điểm</span>. Mọi cột <strong>Tổng</strong> và{' '}
                <strong>Tỉ lệ %</strong> sẽ tự động chia lại ngay lập tức.
              </div>
              {totals && (
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-sky-700 bg-white px-2 py-1 rounded border border-sky-200">
                    Biết: {totals.totalPercentage.totalKnowledge}
                  </span>
                  <span className="text-emerald-700 bg-white px-2 py-1 rounded border border-emerald-200">
                    Hiểu: {totals.totalPercentage.totalComprehension}
                  </span>
                  <span className="text-amber-700 bg-white px-2 py-1 rounded border border-amber-200">
                    Vận dụng: {totals.totalPercentage.totalApplication}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full border-collapse min-w-[1300px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-10"
                  >
                    TT
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-32"
                  >
                    Chủ đề/Chương
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-48"
                  >
                    Nội dung/đơn vị kiến thức
                  </th>
                  <th
                    colSpan={12}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700"
                  >
                    Mức độ đánh giá
                  </th>
                  <th
                    colSpan={3}
                    rowSpan={2}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700"
                  >
                    Tổng
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-16"
                  >
                    Tỉ lệ
                    <br />%<br />
                    điểm
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Nhiều lựa chọn
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    "Đúng - Sai"
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Trả lời ngắn
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Tự luận
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-14">
                    Vận dụng
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {displayMatrix.map((row, idx) => {
                  const isFirstTopicInChapter =
                    idx === 0 || displayMatrix[idx - 1].chapter !== row.chapter;
                  const topicsInChapter = displayMatrix.filter(
                    (r) => r.chapter === row.chapter
                  ).length;

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {isFirstTopicInChapter && (
                        <>
                          <td
                            rowSpan={topicsInChapter}
                            className="border border-slate-300 p-2 text-center text-slate-700"
                          >
                            {idx + 1}
                          </td>
                          <td
                            rowSpan={topicsInChapter}
                            className="border border-slate-300 p-2 text-left font-medium text-slate-800"
                          >
                            {row.chapter}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-300 p-2 text-left text-slate-700">
                        {row.topic}
                      </td>

                      {/* Multiple Choice */}
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.knowledge)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'knowledge', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.comprehension)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.application)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'application', val)
                        }
                      />

                      {/* True/False */}
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.knowledge)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'trueFalse', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.comprehension)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'trueFalse', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.application)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'trueFalse', 'application', val)}
                      />

                      {/* Short Answer */}
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.knowledge)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'shortAnswer', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.comprehension)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'shortAnswer', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.application)}
                        editable={isManualEditMode}
                        onChange={(val) =>
                          handleCellChange(idx, 'shortAnswer', 'application', val)
                        }
                      />

                      {/* Essay */}
                      <EditableMatrixCell
                        value={toInt(row.essay.knowledge)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'essay', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.essay.comprehension)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'essay', 'comprehension', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.essay.application)}
                        editable={isManualEditMode}
                        onChange={(val) => handleCellChange(idx, 'essay', 'application', val)}
                      />

                      {/* Totals for row */}
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700 bg-slate-50/60">
                        {row.totalKnowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700 bg-slate-50/60">
                        {row.totalComprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700 bg-slate-50/60">
                        {row.totalApplication}
                      </td>
                      <td className="border border-slate-300 p-2 text-center font-bold text-purple-700 bg-purple-50/30">
                        {row.totalPercentage}
                      </td>
                    </tr>
                  );
                })}

                {/* Footer Totals */}
                {totals && (
                  <>
                    <tr className="bg-slate-50 font-semibold">
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-3 text-center text-slate-800"
                      >
                        Tổng số câu(ý)
                      </td>

                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.multipleChoice.knowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.multipleChoice.comprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.multipleChoice.application}
                      </td>

                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.trueFalse.knowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.trueFalse.comprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.trueFalse.application}
                      </td>

                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.shortAnswer.knowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.shortAnswer.comprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.shortAnswer.application}
                      </td>

                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.essay.knowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.essay.comprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalQuestions.essay.application}
                      </td>

                      <td className="border border-slate-300 p-2 text-center text-slate-800 font-bold">
                        {totals.totalQuestions.totalKnowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-800 font-bold">
                        {totals.totalQuestions.totalComprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-800 font-bold">
                        {totals.totalQuestions.totalApplication}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-purple-800 font-bold">
                        {toInt(totals.totalQuestions.totalKnowledge) +
                          toInt(totals.totalQuestions.totalComprehension) +
                          toInt(totals.totalQuestions.totalApplication)}{' '}
                        câu
                      </td>
                    </tr>

                    <tr className="bg-slate-100 font-bold">
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-3 text-center text-slate-800"
                      >
                        Tổng số điểm
                      </td>

                      <EditableSectionPointsCell
                        points={getSectionPointsNumber(
                          'trac_nghiem',
                          totals.totalPoints.multipleChoice
                        )}
                        editable={isManualEditMode}
                        label="Nhiều lựa chọn"
                        onChangePoints={(pts) => handleSectionPointsChange('trac_nghiem', pts)}
                      />

                      <EditableSectionPointsCell
                        points={getSectionPointsNumber('dung_sai', totals.totalPoints.trueFalse)}
                        editable={isManualEditMode}
                        label="Đúng - Sai"
                        onChangePoints={(pts) => handleSectionPointsChange('dung_sai', pts)}
                      />

                      <EditableSectionPointsCell
                        points={getSectionPointsNumber(
                          'tra_loi_ngan',
                          totals.totalPoints.shortAnswer
                        )}
                        editable={isManualEditMode}
                        label="Trả lời ngắn"
                        onChangePoints={(pts) => handleSectionPointsChange('tra_loi_ngan', pts)}
                      />

                      <EditableSectionPointsCell
                        points={getSectionPointsNumber('tu_luan', totals.totalPoints.essay)}
                        editable={isManualEditMode}
                        label="Tự luận"
                        onChangePoints={(pts) => handleSectionPointsChange('tu_luan', pts)}
                      />

                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalPoints.totalKnowledge}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalPoints.totalComprehension}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">
                        {totals.totalPoints.totalApplication}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-purple-800">
                        {totalExamPoints.toFixed(1).replace('.', ',')}
                      </td>
                    </tr>

                    <tr className="bg-slate-100 font-bold">
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-3 text-center text-slate-800"
                      >
                        Tỉ lệ %
                      </td>
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-2 text-center text-purple-700"
                      >
                        {String(totals.totalPercentage.multipleChoice).includes('%')
                          ? totals.totalPercentage.multipleChoice
                          : `${totals.totalPercentage.multipleChoice}%`}
                      </td>
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-2 text-center text-purple-700"
                      >
                        {String(totals.totalPercentage.trueFalse).includes('%')
                          ? totals.totalPercentage.trueFalse
                          : `${totals.totalPercentage.trueFalse}%`}
                      </td>
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-2 text-center text-purple-700"
                      >
                        {String(totals.totalPercentage.shortAnswer).includes('%')
                          ? totals.totalPercentage.shortAnswer
                          : `${totals.totalPercentage.shortAnswer}%`}
                      </td>
                      <td
                        colSpan={3}
                        className="border border-slate-300 p-2 text-center text-purple-700"
                      >
                        {String(totals.totalPercentage.essay).includes('%')
                          ? totals.totalPercentage.essay
                          : `${totals.totalPercentage.essay}%`}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-sky-700">
                        {String(totals.totalPercentage.totalKnowledge).includes('%')
                          ? totals.totalPercentage.totalKnowledge
                          : `${totals.totalPercentage.totalKnowledge}%`}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-emerald-700">
                        {String(totals.totalPercentage.totalComprehension).includes('%')
                          ? totals.totalPercentage.totalComprehension
                          : `${totals.totalPercentage.totalComprehension}%`}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-amber-700">
                        {String(totals.totalPercentage.totalApplication).includes('%')
                          ? totals.totalPercentage.totalApplication
                          : `${totals.totalPercentage.totalApplication}%`}
                      </td>
                      <td className="border border-slate-300 p-2 text-center text-slate-800">
                        100%
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bản Đặc Tả */}
        <div id="ban-dac-ta-section">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-purple-600 pl-3">
              2. Bản Đặc Tả
            </h3>
            <button
              onClick={() => handleExport('spec')}
              disabled={isExporting}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Bản đặc tả (.docx)
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full border-collapse min-w-[1400px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-10"
                  >
                    TT
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-32"
                  >
                    Chủ đề/Chương
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-48"
                  >
                    Nội dung/đơn vị kiến thức
                  </th>
                  <th
                    rowSpan={3}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-96"
                  >
                    Yêu cầu cần đạt
                  </th>
                  <th
                    colSpan={12}
                    className="border border-slate-300 p-2 text-center font-bold text-slate-700"
                  >
                    Số câu hỏi ở các mức độ đánh giá
                  </th>
                </tr>
                <tr>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Nhiều lựa chọn
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    "Đúng - Sai"
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Trả lời ngắn
                  </th>
                  <th
                    colSpan={3}
                    className="border border-slate-300 p-2 text-center font-semibold text-slate-700"
                  >
                    Tự luận
                  </th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Biết
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Hiểu
                  </th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">
                    Vận dụng
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {displayMatrix.map((row, idx) => {
                  const isFirstTopicInChapter =
                    idx === 0 || displayMatrix[idx - 1].chapter !== row.chapter;
                  const topicsInChapter = displayMatrix.filter(
                    (r) => r.chapter === row.chapter
                  ).length;

                  const specs = specification.filter((s) => s.topic === row.topic);
                  const knowledge = specs
                    .filter((s) => s.level.toLowerCase().includes('biết'))
                    .map((s) => s.requirement)
                    .join('\n');
                  const comprehension = specs
                    .filter((s) => s.level.toLowerCase().includes('hiểu'))
                    .map((s) => s.requirement)
                    .join('\n');
                  const application = specs
                    .filter((s) => s.level.toLowerCase().includes('vận dụng'))
                    .map((s) => s.requirement)
                    .join('\n');

                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {isFirstTopicInChapter && (
                        <>
                          <td
                            rowSpan={topicsInChapter}
                            className="border border-slate-300 p-2 text-center text-slate-700 align-top"
                          >
                            {idx + 1}
                          </td>
                          <td
                            rowSpan={topicsInChapter}
                            className="border border-slate-300 p-2 text-left font-medium text-slate-800 align-top"
                          >
                            {row.chapter}
                          </td>
                        </>
                      )}
                      <td className="border border-slate-300 p-2 text-left text-slate-700 align-top font-medium">
                        <MathRenderer inline content={row.topic} />
                      </td>

                      <td className="border border-slate-300 p-3 text-left text-slate-700 align-top">
                        <div className="space-y-3">
                          {knowledge && (
                            <div>
                              <strong className="text-slate-800">Nhận biết:</strong>
                              <MathRenderer
                                content={knowledge.replace(/^- /gm, '– ')}
                                className="whitespace-pre-wrap mt-1 text-sm text-slate-700"
                              />
                            </div>
                          )}
                          {comprehension && (
                            <div>
                              <strong className="text-slate-800">Thông hiểu:</strong>
                              <MathRenderer
                                content={comprehension.replace(/^- /gm, '– ')}
                                className="whitespace-pre-wrap mt-1 text-sm text-slate-700"
                              />
                            </div>
                          )}
                          {application && (
                            <div>
                              <strong className="text-slate-800">Vận dụng:</strong>
                              <MathRenderer
                                content={application.replace(/^- /gm, '– ')}
                                className="whitespace-pre-wrap mt-1 text-sm text-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Multiple Choice */}
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.knowledge)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'knowledge', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.comprehension)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.multipleChoice.application)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'multipleChoice', 'application', val)
                        }
                      />

                      {/* True/False */}
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.knowledge)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'trueFalse', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.comprehension)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'trueFalse', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.trueFalse.application)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'trueFalse', 'application', val)}
                      />

                      {/* Short Answer */}
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.knowledge)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'shortAnswer', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.comprehension)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'shortAnswer', 'comprehension', val)
                        }
                      />
                      <EditableMatrixCell
                        value={toInt(row.shortAnswer.application)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) =>
                          handleCellChange(idx, 'shortAnswer', 'application', val)
                        }
                      />

                      {/* Essay */}
                      <EditableMatrixCell
                        value={toInt(row.essay.knowledge)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'essay', 'knowledge', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.essay.comprehension)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'essay', 'comprehension', val)}
                      />
                      <EditableMatrixCell
                        value={toInt(row.essay.application)}
                        editable={isManualEditMode}
                        colorClass="text-emerald-700"
                        onChange={(val) => handleCellChange(idx, 'essay', 'application', val)}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
