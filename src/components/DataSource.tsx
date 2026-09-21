import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

interface DataSourceProps {
  onGradeChange: (grade: string) => void;
  selectedGrade: string;
}

export default function DataSource({ onGradeChange, selectedGrade }: DataSourceProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <h2 className="text-lg font-bold text-purple-700">1. Nguồn Dữ Liệu</h2>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-6">
        <div className="bg-purple-50 text-purple-700 p-3 rounded-lg text-sm font-medium border border-purple-100">
          Tải SGK môn học hoặc KHDH (PPCT) để làm nguồn tài liệu
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Môn học</label>
            <div className="relative">
              <select className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow">
                <option>TOÁN</option>
                <option>VẬT LÝ</option>
                <option>HÓA HỌC</option>
                <option>NGỮ VĂN</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Lớp</label>
            <div className="relative">
              <select 
                className="w-full appearance-none bg-white border border-slate-200 rounded-lg px-4 py-2.5 pr-10 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                value={selectedGrade}
                onChange={(e) => onGradeChange(e.target.value)}
              >
                <option value="Lớp 6">Lớp 6</option>
                <option value="Lớp 7">Lớp 7</option>
                <option value="Lớp 8">Lớp 8</option>
                <option value="Lớp 9">Lớp 9</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-1.5 pt-2">
            <label className="text-sm font-medium text-slate-700">Phiên bản nội dung</label>
            <div className="relative">
              <select className="w-full appearance-none bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 pr-10 text-emerald-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-shadow">
                <option>Tài liệu mới (GDPT 2018)</option>
                <option>Tài liệu cũ</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-6 border-t border-slate-100">
          <h3 className="text-lg font-bold text-purple-700 mb-4">2. Tải Lên (Nếu cần)</h3>
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-purple-300 transition-colors cursor-pointer group">
            <div className="bg-purple-50 text-purple-600 p-3 rounded-full mb-3 group-hover:bg-purple-100 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Click hoặc kéo thả file vào đây</p>
            <p className="text-xs text-slate-500">Hỗ trợ PDF, DOCX, XLSX (Max 10MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
