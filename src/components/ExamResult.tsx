import { useState } from 'react';
import { ExamData, ExamQuestion } from '../types';
import MathRenderer from './MathRenderer';
import { exportExamToWord } from '../utils/exportWord';
import { formatAnswerString, formatShortAnswer, parseMultipleChoiceAnswer, parseTrueFalseAnswers } from '../utils/answerUtils';
import { FileDown, Printer, ArrowLeft, Check, Copy } from 'lucide-react';

interface ExamResultProps {
  exam: ExamData;
  onBack: () => void;
}

export default function ExamResult({ exam, onBack }: ExamResultProps) {
  const [viewMode, setViewMode] = useState<'exam' | 'answers'>('exam');
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportWord = async () => {
    try {
      setIsExporting(true);
      await exportExamToWord(exam, 'De_Kiem_Tra_Toan_Dinh_Ky');
    } catch (err) {
      console.error('Lỗi xuất file Word:', err);
      alert('Không thể xuất file Word. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full col-span-1 lg:col-span-3">
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-emerald-50 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-emerald-800">Đề Kiểm Tra Đề Xuất</h2>
          <p className="text-xs text-emerald-600 mt-0.5">Công thức toán hiển thị định dạng chuẩn LaTeX</p>
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
              Đáp án & Lời giải
            </button>
          </div>

          <button 
            onClick={onBack}
            className="bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quay lại</span> Ma Trận
          </button>

          <button 
            onClick={handleExportWord}
            disabled={isExporting}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm"
            title="Tải toàn bộ Đề thi và Hướng dẫn chấm về máy dưới dạng tài liệu Word (.docx)"
          >
            <FileDown className="w-4 h-4" />
            {isExporting ? 'Đang xuất Word...' : 'Xuất file Word (.docx)'}
          </button>

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
        <div className="max-w-[800px] mx-auto text-black font-serif" style={{ fontSize: '15px', lineHeight: '1.6' }}>
          
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
                        <div className="flex font-bold mb-2 items-baseline">
                          <span className="whitespace-nowrap mr-2">{q.id.replace('Câu', 'Câu ')}:</span>
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
                  <p className="italic mb-4 text-sm text-slate-600">Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.</p>
                  <div className="space-y-6">
                    {trueFalseQs.map((q, idx) => (
                      <div key={idx}>
                        <div className="flex font-bold mb-2 items-baseline">
                          <span className="whitespace-nowrap mr-2">{String(q.id || '').replace('Câu', 'Câu ')}:</span>
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
                  <p className="italic mb-4 text-sm text-slate-600">Thí sinh điền kết quả vào chỗ trống. Mỗi câu hỏi chỉ điền đáp số là một số (tối đa 4 ký tự).</p>
                  <div className="space-y-6">
                    {shortAnswerQs.map((q, idx) => (
                      <div key={idx} className="flex items-start">
                        <span className="font-bold whitespace-nowrap mr-2">{q.id.replace('Câu', 'Câu ')}:</span>
                        <div className="flex-1">
                          <MathRenderer content={q.content} />
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
                      <div key={idx} className="flex items-start">
                        <span className="font-bold whitespace-nowrap mr-2">{q.id.replace('Câu', 'Câu ')}:</span>
                        <div className="flex-1">
                          <MathRenderer content={q.content} />
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
                  <h3 className="font-bold mb-3">1. Đáp án Phần 1: Trắc nghiệm 1 lựa chọn</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-900 text-center">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-900 p-2 font-bold w-20">Câu</td>
                          {multipleChoiceQs.map((q, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold">{q.id.replace(/[^\d]/g, '') || (i+1)}</td>
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
                </div>
              )}

              {hasTrueFalse && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3">2. Đáp án Phần 2: Câu hỏi Đúng - Sai</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full max-w-md border-collapse border border-slate-900 text-center">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="border border-slate-900 p-2 w-24">Câu</th>
                          <th className="border border-slate-900 p-2 w-16">a</th>
                          <th className="border border-slate-900 p-2 w-16">b</th>
                          <th className="border border-slate-900 p-2 w-16">c</th>
                          <th className="border border-slate-900 p-2 w-16">d</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trueFalseQs.map((q, i) => {
                          const tf = parseTrueFalseAnswers(q.answer);
                          return (
                            <tr key={i}>
                              <td className="border border-slate-900 p-2 font-bold">{q.id.replace(/[^\d]/g, '') || (i+1)}</td>
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
                </div>
              )}

              {hasShortAnswer && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3">3. Đáp án Phần 3: Trả lời ngắn</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-slate-900 text-center">
                      <tbody>
                        <tr className="bg-slate-50">
                          <td className="border border-slate-900 p-2 font-bold w-20">Câu</td>
                          {shortAnswerQs.map((q, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold">{q.id.replace(/[^\d]/g, '') || (i+1)}</td>
                          ))}
                        </tr>
                        <tr>
                          <td className="border border-slate-900 p-2 font-bold">Đáp án</td>
                          {shortAnswerQs.map((q, i) => (
                            <td key={i} className="border border-slate-900 p-2 font-bold text-red-600">
                              <MathRenderer inline content={formatShortAnswer(q.answer)} />
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {hasEssay && (
                <div className="mb-8">
                  <h3 className="font-bold mb-3">4. Đáp án và Hướng dẫn giải Phần 4: Tự luận</h3>
                  <table className="w-full border-collapse border border-slate-900">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-900 p-3 text-left w-24">CÂU</th>
                        <th className="border border-slate-900 p-3 text-left">ĐÁP ÁN / HƯỚNG DẪN GIẢI CHI TIẾT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {essayQs.map((q, i) => (
                        <tr key={i}>
                          <td className="border border-slate-900 p-3 font-bold align-top">{q.id}</td>
                          <td className="border border-slate-900 p-3 align-top space-y-3">
                            <div className="flex items-start gap-2">
                              <strong className="text-slate-800 shrink-0">Kết quả:</strong> 
                              <div className="text-red-700 font-semibold">
                                <MathRenderer inline content={formatAnswerString(q.answer)} />
                              </div>
                            </div>
                            {q.explanation && (
                              <div className="pt-2 border-t border-slate-200">
                                <strong className="text-slate-800 block mb-1">Hướng dẫn giải:</strong>
                                <div className="text-slate-800 leading-relaxed">
                                  <MathRenderer content={q.explanation} />
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
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
