import { useState } from 'react';
import { Sparkles, FileText, Code, ChevronDown, Download } from 'lucide-react';
import MathRenderer from './MathRenderer';
import { exportMatrixAndSpecToWord } from '../utils/exportWord';
import { MatrixRow, SpecRow, MatrixTotals, LevelBreakdown } from '../types';

export type { LevelBreakdown, MatrixRow, MatrixTotals, SpecRow };

interface MatrixResultProps {
  matrix: MatrixRow[];
  specification: SpecRow[];
  totals?: MatrixTotals;
  grade?: string;
  onBack: () => void;
  onGenerateExam: () => void;
  isGeneratingExam: boolean;
}

export default function MatrixResult({ matrix, specification, totals, grade = 'Lớp 6', onBack, onGenerateExam, isGeneratingExam }: MatrixResultProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (mode: 'all' | 'matrix' | 'spec') => {
    try {
      setIsExporting(true);
      setShowExportMenu(false);
      await exportMatrixAndSpecToWord(matrix, specification, totals, grade, mode);
    } catch (error) {
      console.error('Lỗi khi xuất Word:', error);
      alert('Đã xảy ra lỗi khi tạo file Word. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full col-span-1 lg:col-span-3">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-purple-50">
        <h2 className="text-xl font-bold text-purple-800">Kết quả: Khung Ma Trận & Bản Đặc Tả</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={onBack}
            className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm mr-2"
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
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
                title="Xuất cả Ma trận & Bản đặc tả sang Word (.docx)"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Đang xuất...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>Xuất Word</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                disabled={isExporting}
                className="bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-75 text-white px-2 py-2 rounded-r-lg border-l border-blue-400 transition-colors flex items-center justify-center"
                title="Tùy chọn xuất Word"
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
                <div className="absolute right-0 mt-1.5 w-64 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-sm">
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Định dạng Word (.docx)
                  </div>
                  <button
                    onClick={() => handleExport('all')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center justify-between text-slate-700 font-medium"
                  >
                    <span className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Cả Ma trận & Đặc tả
                    </span>
                    <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Khuyên dùng</span>
                  </button>
                  <button
                    onClick={() => handleExport('matrix')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Chỉ Khung Ma trận
                  </button>
                  <button
                    onClick={() => handleExport('spec')}
                    className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    Chỉ Bản Đặc tả
                  </button>
                </div>
              </>
            )}
          </div>

          <button 
            onClick={() => alert("Chức năng xuất LaTeX đang được phát triển")}
            className="bg-[#374151] hover:bg-[#1f2937] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
          >
            <Code className="w-4 h-4" />
            Xuất LaTeX
          </button>
        </div>
      </div>

      <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        
        {/* Khung Ma Trận */}
        <div className="mb-10" id="khung-ma-tran-section">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-purple-600 pl-3">1. Khung Ma Trận</h3>
            <button
              onClick={() => handleExport('matrix')}
              disabled={isExporting}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Xuất Ma trận (.docx)
            </button>
          </div>
          <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
            <table className="w-full border-collapse min-w-[1200px] text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-12">TT</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-32">Chủ đề/Chương</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-48">Nội dung/đơn vị kiến thức</th>
                  <th colSpan={12} className="border border-slate-300 p-2 text-center font-bold text-slate-700">Mức độ đánh giá</th>
                  <th colSpan={3} rowSpan={2} className="border border-slate-300 p-2 text-center font-bold text-slate-700">Tổng</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-16">Tỉ lệ<br/>%<br/>điểm</th>
                </tr>
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Nhiều lựa chọn</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">"Đúng - Sai"</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Trả lời ngắn</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Tự luận</th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>

                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {matrix.map((row, idx) => {
                  const isFirstTopicInChapter = idx === 0 || matrix[idx - 1].chapter !== row.chapter;
                  const topicsInChapter = matrix.filter(r => r.chapter === row.chapter).length;
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {isFirstTopicInChapter && (
                        <>
                          <td rowSpan={topicsInChapter} className="border border-slate-300 p-2 text-center text-slate-700">{idx + 1}</td>
                          <td rowSpan={topicsInChapter} className="border border-slate-300 p-2 text-left font-medium text-slate-800">{row.chapter}</td>
                        </>
                      )}
                      <td className="border border-slate-300 p-2 text-left text-slate-700">{row.topic}</td>
                      
                      {/* Multiple Choice */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.multipleChoice.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.multipleChoice.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.multipleChoice.application}</td>
                      
                      {/* True/False */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.trueFalse.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.trueFalse.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.trueFalse.application}</td>
                      
                      {/* Short Answer */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.shortAnswer.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.shortAnswer.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.shortAnswer.application}</td>
                      
                      {/* Essay */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.essay.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.essay.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-purple-700">{row.essay.application}</td>

                      {/* Totals for row */}
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{row.totalKnowledge}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{row.totalComprehension}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{row.totalApplication}</td>
                      <td className="border border-slate-300 p-2 text-center font-semibold text-slate-700">{row.totalPercentage}</td>
                    </tr>
                  );
                })}

                {/* Footer Totals */}
                {totals && (
                  <>
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan={3} className="border border-slate-300 p-3 text-center text-slate-800">Tổng số câu(ý)</td>
                      
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.multipleChoice.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.multipleChoice.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.multipleChoice.application}</td>
                      
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.trueFalse.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.trueFalse.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.trueFalse.application}</td>
                      
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.shortAnswer.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.shortAnswer.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.shortAnswer.application}</td>
                      
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.essay.knowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.essay.comprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.essay.application}</td>

                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.totalKnowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.totalComprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalQuestions.totalApplication}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700"></td>
                    </tr>
                    
                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="border border-slate-300 p-3 text-center text-slate-800">Tổng số điểm</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.multipleChoice}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.trueFalse}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.shortAnswer}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.essay}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.totalKnowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.totalComprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPoints.totalApplication}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">10,0</td>
                    </tr>

                    <tr className="bg-slate-100 font-bold">
                      <td colSpan={3} className="border border-slate-300 p-3 text-center text-slate-800">Tỉ lệ %</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.multipleChoice}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.trueFalse}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.shortAnswer}</td>
                      <td colSpan={3} className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.essay}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.totalKnowledge}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.totalComprehension}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">{totals.totalPercentage.totalApplication}</td>
                      <td className="border border-slate-300 p-2 text-center text-slate-700">100%</td>
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
            <h3 className="text-lg font-bold text-slate-800 border-l-4 border-purple-600 pl-3">2. Bản Đặc Tả</h3>
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
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-12">TT</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-32">Chủ đề/Chương</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-48">Nội dung/đơn vị kiến thức</th>
                  <th rowSpan={3} className="border border-slate-300 p-2 text-center font-bold text-slate-700 w-96">Yêu cầu cần đạt</th>
                  <th colSpan={12} className="border border-slate-300 p-2 text-center font-bold text-slate-700">Số câu hỏi ở các mức độ đánh giá</th>
                </tr>
                <tr>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Nhiều lựa chọn</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">"Đúng - Sai"</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Trả lời ngắn</th>
                  <th colSpan={3} className="border border-slate-300 p-2 text-center font-semibold text-slate-700">Tự luận</th>
                </tr>
                <tr>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                  
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Biết</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-12">Hiểu</th>
                  <th className="border border-slate-300 p-1 text-center font-medium text-slate-600 w-16">Vận dụng</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {matrix.map((row, idx) => {
                  const isFirstTopicInChapter = idx === 0 || matrix[idx - 1].chapter !== row.chapter;
                  const topicsInChapter = matrix.filter(r => r.chapter === row.chapter).length;
                  
                  // Extract requirements for this topic
                  const specs = specification.filter(s => s.topic === row.topic);
                  const knowledge = specs.filter(s => s.level.toLowerCase().includes('biết')).map(s => s.requirement).join('\n');
                  const comprehension = specs.filter(s => s.level.toLowerCase().includes('hiểu')).map(s => s.requirement).join('\n');
                  const application = specs.filter(s => s.level.toLowerCase().includes('vận dụng')).map(s => s.requirement).join('\n');
                  
                  return (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      {isFirstTopicInChapter && (
                        <>
                          <td rowSpan={topicsInChapter} className="border border-slate-300 p-2 text-center text-slate-700 align-top">{idx + 1}</td>
                          <td rowSpan={topicsInChapter} className="border border-slate-300 p-2 text-left font-medium text-slate-800 align-top">{row.chapter}</td>
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
                              <MathRenderer content={knowledge.replace(/^- /gm, '– ')} className="whitespace-pre-wrap mt-1 text-sm text-slate-700" />
                            </div>
                          )}
                          {comprehension && (
                            <div>
                              <strong className="text-slate-800">Thông hiểu:</strong>
                              <MathRenderer content={comprehension.replace(/^- /gm, '– ')} className="whitespace-pre-wrap mt-1 text-sm text-slate-700" />
                            </div>
                          )}
                          {application && (
                            <div>
                              <strong className="text-slate-800">Vận dụng:</strong>
                              <MathRenderer content={application.replace(/^- /gm, '– ')} className="whitespace-pre-wrap mt-1 text-sm text-slate-700" />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Multiple Choice */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.multipleChoice.knowledge || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.multipleChoice.comprehension || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.multipleChoice.application || 0}</td>
                      
                      {/* True/False */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.trueFalse.knowledge || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.trueFalse.comprehension || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.trueFalse.application || 0}</td>
                      
                      {/* Short Answer */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.shortAnswer.knowledge || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.shortAnswer.comprehension || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.shortAnswer.application || 0}</td>
                      
                      {/* Essay */}
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.essay.knowledge || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.essay.comprehension || 0}</td>
                      <td className="border border-slate-300 p-2 text-center font-medium text-emerald-700 align-top">{row.essay.application || 0}</td>
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
