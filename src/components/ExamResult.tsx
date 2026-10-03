import { useState, Fragment } from 'react';
import { ExamData, ExamQuestion } from '../types';
import MathRenderer from './MathRenderer';
import { exportExamToWord, exportExamToLatexFile } from '../utils/exportWord';
import { WordMathMode } from '../utils/latexToDocxMath';
import { formatAnswerString, formatShortAnswer, parseMultipleChoiceAnswer, parseTrueFalseAnswers } from '../utils/answerUtils';
import { FileDown, Printer, ArrowLeft, BookOpenCheck, ChevronDown, Sigma, Code } from 'lucide-react';

interface ExamResultProps {
  exam: ExamData;
  onBack: () => void;
}

export default function ExamResult({ exam, onBack }: ExamResultProps) {
  const [viewMode, setViewMode] = useState<'exam' | 'answers'>('exam');
  const [showSpecInfo, setShowSpecInfo] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExportWord = async (mode: WordMathMode = 'equation') => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      const fileTitle =
        mode === 'latex'
          ? 'De_Kiem_Tra_Toan_LaTeX'
          : mode === true || mode === 'equation'
          ? 'De_Kiem_Tra_Toan_Equation'
          : 'De_Kiem_Tra_Toan_Unicode';
      await exportExamToWord(exam, fileTitle, mode);
    } catch (err) {
      console.error('Lỗi xuất file Word:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportLatexFile = () => {
    setShowExportMenu(false);
    exportExamToLatexFile(exam, 'De_Kiem_Tra_Toan_LaTeX');
  };

  // Helper to get letter from index (0 -> A, 1 -> B)
  const getLetter = (index: number) => String.fromCharCode(65 + index);

  // Group questions by type
  const multipleChoiceQs = exam.questions.filter(q => q.type === 'multipleChoice');
  const trueFalseQs = exam.questions.filter(q => q.type === 'trueFalse');
  const shortAnswerQs = exam.questions.filter(q => q.type === 'shortAnswer');
  const essayQs = exam.questions.filter(q => q.type === 'essay');

  const hasMultipleChoice = multipleChoiceQs.length > 0;
  const hasTrueFalse = trueFalseQs.length > 0;
  const hasShortAnswer = shortAnswerQs.length > 0;
  const hasEssay = essayQs.length > 0;

  const renderSpecBadge = (q: ExamQuestion) => {
    if (!showSpecInfo) return null;
    const levelColor =
      q.level?.toLowerCase().includes('biết')
        ? 'bg-sky-50 text-sky-700 border-sky-200'
        : q.level?.toLowerCase().includes('hiểu')
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-purple-50 text-purple-700 border-purple-200';

    return (
      <div className="mb-1.5 p-2 rounded-md bg-slate-50 border border-slate-200 text-xs font-sans print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded font-semibold border ${levelColor}`}>
            {q.level || 'Nhận biết'}
          </span>
          {q.points && (
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
              {q.points}
            </span>
          )}
          {q.topic && (
            <span className="font-semibold text-slate-700">
              Chủ đề: {q.topic}
            </span>
          )}
        </div>
        {q.requirement && (
          <div className="mt-1 text-slate-600 leading-snug">
            <span className="font-semibold text-slate-700">YCCĐ: </span>
            <MathRenderer inline content={q.requirement} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full col-span-1 lg:col-span-3">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-emerald-50 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-emerald-800">Đề Kiểm Tra & Hướng Dẫn Chấm Chi Tiết</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-emerald-700 font-medium">
            <span>Tổng số: {exam.questions.length} câu</span>
            {hasMultipleChoice && <span>• Nhiều lựa chọn: {multipleChoiceQs.length} câu</span>}
            {hasTrueFalse && <span>• Đúng/Sai: {trueFalseQs.length} câu</span>}
            {hasShortAnswer && <span>• Trả lời ngắn: {shortAnswerQs.length} câu</span>}
            {hasEssay && <span>• Tự luận: {essayQs.length} câu</span>}
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex bg-white rounded-lg p-1 border border-emerald-200">
            <button
              onClick={() => setViewMode('exam')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'exam' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              Đề bài
            </button>
            <button
              onClick={() => setViewMode('answers')}
              className={`px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'answers' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:text-emerald-600'}`}
            >
              Đáp án & Hướng dẫn chấm
            </button>
          </div>

          <button
            onClick={() => setShowSpecInfo(!showSpecInfo)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center gap-1.5 border ${
              showSpecInfo
                ? 'bg-purple-100 border-purple-300 text-purple-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Ẩn/Hiện thông tin đối chiếu Yêu cầu cần đạt từ Bản đặc tả cho từng câu hỏi"
          >
            <BookOpenCheck className="w-4 h-4" />
            <span className="hidden md:inline">{showSpecInfo ? 'Đang hiện Đặc tả' : 'Hiện Đặc tả'}</span>
          </button>

          <button 
            onClick={onBack}
            className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span> Ma Trận
          </button>

          <div className="relative flex items-center gap-2">
            <button
              onClick={() => handleExportWord('latex')}
              disabled={isExporting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              title="Xuất file Word (.docx) giữ nguyên mã công thức LaTeX $...$ (dùng cho MathType Alt+\, McMix, SmartTest)"
            >
              <Code className="w-4 h-4" />
              {isExporting ? 'Đang xuất...' : 'Xuất Word (LaTeX)'}
            </button>

            <div className="flex rounded-lg shadow-sm">
              <button
                onClick={() => handleExportWord('equation')}
                disabled={isExporting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-l-lg text-sm font-semibold transition-colors flex items-center gap-2"
                title="Xuất toàn bộ Đề thi và Hướng dẫn chấm sang Word (.docx) với công thức toán dạng Equation chỉnh sửa được"
              >
                <Sigma className="w-4 h-4" />
                {isExporting ? 'Đang xuất Word...' : 'Xuất Word (Equation)'}
              </button>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white px-2 py-2 rounded-r-lg border-l border-blue-500 transition-colors flex items-center justify-center"
                title="Tùy chọn định dạng xuất Word & LaTeX"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-sm">
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Chế độ xuất Word (.docx) & LaTeX
                  </div>
                  <button
                    onClick={() => handleExportWord('equation')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 flex items-center justify-between text-slate-800 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Sigma className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Word (Equation)
                        <span className="block text-[11px] font-normal text-slate-500">
                          Công thức chuẩn Word Equation sửa trực tiếp
                        </span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                      Equation
                    </span>
                  </button>
                  <button
                    onClick={() => handleExportWord('latex')}
                    className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-50 flex items-center justify-between text-slate-800 font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <Code className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>
                        Word (Dạng LaTeX $...$)
                        <span className="block text-[11px] font-normal text-slate-500">
                          File .docx giữ mã $...$ (MathType Alt+\, McMix)
                        </span>
                      </span>
                    </span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold shrink-0">
                      LaTeX .docx
                    </span>
                  </button>
                  <button
                    onClick={() => handleExportWord('unicode')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileDown className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>
                      Word (Văn bản Unicode)
                      <span className="block text-[11px] font-normal text-slate-500">
                        Công thức dạng ký tự văn bản thuần
                      </span>
                    </span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={handleExportLatexFile}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Code className="w-4 h-4 text-slate-600 shrink-0" />
                    <span>
                      Xuất mã nguồn LaTeX (.tex)
                      <span className="block text-[11px] font-normal text-slate-500">
                        File .tex chuẩn dùng cho Overleaf / TeXstudio
                      </span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In {viewMode === 'exam' ? 'Đề' : 'Đáp án'}</span>
          </button>
        </div>
      </div>

      <div className="p-6 sm:p-8 overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 100px)' }}>
        <div className="max-w-[840px] mx-auto text-black font-serif" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          
          {viewMode === 'exam' && (
            <>
              {/* Header of the exam */}
              <div className="flex justify-between items-start mb-6 text-center">
                <div>
                  <p className="font-bold">UBND TỈNH / THÀNH PHỐ</p>
                  <p className="font-bold">TRƯỜNG THCS .................................</p>
                </div>
                <div>
                  <p className="font-bold">ĐỀ KIỂM TRA ĐỊNH KỲ</p>
                  <p className="font-bold">NĂM HỌC 2025 - 2026</p>
                  <p className="font-bold">MÔN: TOÁN</p>
                  <p className="italic text-sm">Thời gian làm bài: 90 phút (không kể thời gian phát đề)</p>
                </div>
              </div>
              
              <div className="mb-6 font-medium border-b border-slate-200 pb-4">
                <p className="font-bold">Mã đề: 101</p>
                <p className="mt-2 italic">Họ và tên thí sinh: ................................................................ Số báo danh: ....................</p>
              </div>

              {/* Phần 1: Trắc nghiệm nhiều lựa chọn */}
              {hasMultipleChoice && (
                <div className="mb-8">
                  <h3 className="font-bold uppercase mb-1">PHẦN 1: CÂU TRẮC NGHIỆM NHIỀU PHƯƠNG ÁN LỰA CHỌN</h3>
                  <p className="italic mb-4 text-sm text-slate-600">Thí sinh trả lời từ câu 1 đến câu {multipleChoiceQs.length}. Mỗi câu hỏi thí sinh chỉ chọn một phương án.</p>
                  <div className="space-y-6">
                    {multipleChoiceQs.map((q, idx) => (
                      <div key={idx}>
                        {renderSpecBadge(q)}
                        <div className="flex font-bold mb-2 items-baseline">
                          <span className="whitespace-nowrap mr-2">Câu {idx + 1}:</span>
                          <div className="font-normal flex-1">
                            <MathRenderer content={q.content} />
                          </div>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-x-3 gap-y-2 pl-4">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-start">
                                <span className="font-bold mr-1.5">{getLetter(oIdx)}.</span>
                                <MathRenderer inline content={String(opt || '').replace(/^[A-Da-d][.)]\s*/, '')} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phần 2: Trắc nghiệm đúng sai */}
              {hasTrueFalse && (
                <div className="mb-8">
                  <h3 className="font-bold uppercase mb-1">PHẦN 2: CÂU TRẮC NGHIỆM ĐÚNG - SAI</h3>
                  <p className="italic mb-4 text-sm text-slate-600">Thí sinh trả lời từ câu 1 đến câu {trueFalseQs.length}. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</p>
                  <div className="space-y-6">
                    {trueFalseQs.map((q, idx) => (
                      <div key={idx}>
                        {renderSpecBadge(q)}
                        <div className="flex font-bold mb-2 items-baseline">
                          <span className="whitespace-nowrap mr-2">Câu {idx + 1}:</span>
                          <div className="font-normal flex-1">
                            <MathRenderer content={String(q.content || '')} />
                          </div>
                        </div>
                        {q.options && q.options.length > 0 && (
                          <div className="ml-6 space-y-2">
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} className="flex items-start">
                                <span className="font-bold mr-2">{getLetter(oIdx).toLowerCase()})</span>
                                <MathRenderer inline content={String(opt || '').replace(/^[A-Da-d][.)]\s*/, '').replace(/^[a-d][.)]\s*/, '')} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phần 3: Trả lời ngắn */}
              {hasShortAnswer && (
                <div className="mb-8">
                  <h3 className="font-bold uppercase mb-1">PHẦN 3: CÂU TRẮC NGHIỆM TRẢ LỜI NGẮN</h3>
                  <p className="italic mb-4 text-sm text-slate-600">Thí sinh trả lời từ câu 1 đến câu {shortAnswerQs.length}. Mỗi câu hỏi chỉ điền đáp số là một số (tối đa 4 ký tự).</p>
                  <div className="space-y-6">
                    {shortAnswerQs.map((q, idx) => (
                      <div key={idx}>
                        {renderSpecBadge(q)}
                        <div className="flex items-start">
                          <span className="font-bold whitespace-nowrap mr-2">Câu {idx + 1}:</span>
                          <div className="flex-1">
                            <MathRenderer content={q.content} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phần 4: Tự luận */}
              {hasEssay && (
                <div className="mb-8">
                  <h3 className="font-bold uppercase mb-1">PHẦN 4: TỰ LUẬN</h3>
                  <p className="italic mb-4 text-sm text-slate-600">Trình bày lời giải chi tiết cho các bài tập sau.</p>
                  <div className="space-y-6">
                    {essayQs.map((q, idx) => (
                      <div key={idx}>
                        {renderSpecBadge(q)}
                        <div className="flex items-start">
                          <span className="font-bold whitespace-nowrap mr-2">Câu {idx + 1}{q.points ? ` (${q.points})` : ''}:</span>
                          <div className="flex-1">
                            <MathRenderer content={q.content} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-center font-bold mt-12 mb-8 tracking-widest text-slate-500">
                --- HẾT ---
              </div>
            </>
          )}

          {viewMode === 'answers' && (
            <>
              <div className="text-center font-bold mb-8 uppercase">
                <h2 className="text-xl">HƯỚNG DẪN CHẤM VÀ ĐÁP ÁN CHI TIẾT</h2>
                <h3 className="text-base text-slate-700">ĐỀ KIỂM TRA ĐỊNH KỲ - MÔN: TOÁN</h3>
              </div>

              {hasMultipleChoice && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3 uppercase">1. Đáp án Phần 1: Trắc nghiệm nhiều phương án lựa chọn ({multipleChoiceQs.length} câu)</h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-slate-900 text-center">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-900 p-2 font-bold w-20">Câu</td>
                          {multipleChoiceQs.map((_, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold">{i + 1}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border border-slate-900 p-2 font-bold">Đ/án</td>
                          {multipleChoiceQs.map((q, i) => {
                            const ansLetter = parseMultipleChoiceAnswer(q.answer);
                            return (
                              <td key={i} className="border border-slate-900 p-2 font-bold text-red-600">
                                {ansLetter ? ansLetter : <MathRenderer inline content={formatAnswerString(q.answer)} />}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {multipleChoiceQs.some(q => q.explanation) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
                      <p className="font-bold text-slate-800 mb-2">Lời giải chi tiết Phần 1:</p>
                      {multipleChoiceQs.map((q, i) => q.explanation && (
                        <div key={i} className="flex items-start gap-2">
                          <span className="font-bold whitespace-nowrap text-slate-900">Câu {i + 1} (Chọn {parseMultipleChoiceAnswer(q.answer)}):</span>
                          <div className="flex-1 text-slate-700">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasTrueFalse && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3 uppercase">2. Đáp án Phần 2: Câu hỏi trắc nghiệm Đúng - Sai ({trueFalseQs.length} câu)</h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full max-w-md border-collapse border border-slate-900 text-center">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-900 p-2 w-24">Câu</th>
                          <th className="border border-slate-900 p-2 w-16">Ý a</th>
                          <th className="border border-slate-900 p-2 w-16">Ý b</th>
                          <th className="border border-slate-900 p-2 w-16">Ý c</th>
                          <th className="border border-slate-900 p-2 w-16">Ý d</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trueFalseQs.map((q, i) => {
                          const tf = parseTrueFalseAnswers(q.answer);
                          return (
                            <tr key={i}>
                              <td className="border border-slate-900 p-2 font-bold">Câu {i + 1}</td>
                              <td className="border border-slate-900 p-2 font-bold text-red-600">{tf[0]}</td>
                              <td className="border border-slate-900 p-2 font-bold text-red-600">{tf[1]}</td>
                              <td className="border border-slate-900 p-2 font-bold text-red-600">{tf[2]}</td>
                              <td className="border border-slate-900 p-2 font-bold text-red-600">{tf[3]}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {trueFalseQs.some(q => q.explanation) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3 text-sm">
                      <p className="font-bold text-slate-800">Giải thích chi tiết Phần 2 (Đúng - Sai):</p>
                      {trueFalseQs.map((q, i) => q.explanation && (
                        <div key={i} className="border-t border-slate-200 first:border-t-0 pt-2 first:pt-0">
                          <p className="font-bold text-slate-900 mb-1">Câu {i + 1}:</p>
                          <div className="text-slate-700 pl-2">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasShortAnswer && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3 uppercase">3. Đáp án Phần 3: Câu trắc nghiệm Trả lời ngắn ({shortAnswerQs.length} câu)</h3>
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full border-collapse border border-slate-900 text-center">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-900 p-2 font-bold w-20">Câu</td>
                          {shortAnswerQs.map((_, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold">{i + 1}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border border-slate-900 p-2 font-bold">Đáp số</td>
                          {shortAnswerQs.map((q, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold text-red-600">
                              <MathRenderer inline content={formatShortAnswer(q.answer)} />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  {shortAnswerQs.some(q => q.explanation) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2.5 text-sm">
                      <p className="font-bold text-slate-800">Hướng dẫn giải chi tiết Phần 3 (Trả lời ngắn):</p>
                      {shortAnswerQs.map((q, i) => q.explanation && (
                        <div key={i} className="border-t border-slate-200 first:border-t-0 pt-2 first:pt-0">
                          <span className="font-bold text-slate-900">Câu {i + 1} (Đáp số: {formatShortAnswer(q.answer)}): </span>
                          <div className="text-slate-700 mt-0.5 pl-2">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {hasEssay && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3 uppercase">4. Đáp án và Hướng dẫn chấm chi tiết Phần 4: Tự luận ({essayQs.length} câu)</h3>
                  <table className="w-full border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-slate-900 p-3 text-center w-28 font-bold">CÂU / Ý</th>
                        <th className="border border-slate-900 p-3 text-left font-bold">NỘI DUNG TRÌNH BÀY & HƯỚNG DẪN CHẤM CHI TIẾT</th>
                        <th className="border border-slate-900 p-3 text-center w-24 font-bold">ĐIỂM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {essayQs.map((q, i) => {
                        const steps = Array.isArray(q.gradingSteps) && q.gradingSteps.length > 0 ? q.gradingSteps : null;

                        if (steps) {
                          return (
                            <Fragment key={`essay-q-${i}`}>
                              {/* Row 1 for question statement & summary */}
                              <tr className="bg-amber-50/40">
                                <td className="border border-slate-900 p-3 font-bold text-center align-top">
                                  <div>Câu {i + 1}</div>
                                  {q.points && <div className="text-xs text-red-600 mt-1">({q.points})</div>}
                                  {q.level && <div className="text-xs font-normal text-slate-500 mt-0.5">{q.level}</div>}
                                </td>
                                <td className="border border-slate-900 p-3 align-top" colSpan={2}>
                                  <div className="text-sm italic text-slate-700 mb-1">
                                    <strong className="not-italic text-slate-900">Đề bài: </strong>
                                    <MathRenderer content={q.content} />
                                  </div>
                                  {q.answer && (
                                    <div className="text-sm mt-1.5 pt-1.5 border-t border-amber-200/70">
                                      <strong className="text-slate-900">Tóm tắt đáp số: </strong>
                                      <span className="text-red-700 font-semibold">
                                        <MathRenderer inline content={formatAnswerString(q.answer)} />
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>

                              {/* Step-by-step rubric rows */}
                              {steps.map((step, sIdx) => (
                                <tr key={`q-${i}-step-${sIdx}`}>
                                  <td className="border border-slate-900 p-3 font-semibold text-sm text-slate-800 align-top text-center">
                                    {step.part || `Bước ${sIdx + 1}`}
                                  </td>
                                  <td className="border border-slate-900 p-3 align-top text-slate-800 leading-relaxed">
                                    <MathRenderer content={step.content} />
                                  </td>
                                  <td className="border border-slate-900 p-3 font-bold text-red-600 text-center align-middle">
                                    {step.points || '0,25'}
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          );
                        }

                        // Fallback if no gradingSteps
                        return (
                          <tr key={i}>
                            <td className="border border-slate-900 p-3 font-bold align-top text-center">
                              <div>Câu {i + 1}</div>
                              {q.points && <div className="text-xs text-red-600 mt-1">({q.points})</div>}
                            </td>
                            <td className="border border-slate-900 p-3 align-top space-y-3">
                              <div className="text-sm italic text-slate-700 pb-2 border-b border-slate-200">
                                <strong className="not-italic text-slate-900">Đề bài: </strong>
                                <MathRenderer content={q.content} />
                              </div>
                              <div className="flex items-start gap-2">
                                <strong className="text-slate-800 shrink-0">Đáp số / Kết quả:</strong> 
                                <div className="text-red-700 font-semibold">
                                  <MathRenderer inline content={formatAnswerString(q.answer)} />
                                </div>
                              </div>
                              {q.explanation && (
                                <div className="pt-2 border-t border-slate-200">
                                  <strong className="text-slate-800 block mb-1">Lời giải chi tiết từng bước:</strong>
                                  <div className="text-slate-800 leading-relaxed">
                                    <MathRenderer content={q.explanation} />
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="border border-slate-900 p-3 font-bold text-red-600 text-center align-middle">
                              {q.points || '1,0 điểm'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}
