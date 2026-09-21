import { LayoutTemplate, Play, Loader2 } from 'lucide-react';

interface HeaderProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function Header({ onGenerate, isGenerating }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-purple-100 p-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-purple-600 text-white p-3 rounded-xl flex items-center justify-center">
            <LayoutTemplate className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-purple-700">Tạo Ma Trận từ Tài liệu</h1>
            <p className="text-slate-500 text-sm">
              Chọn môn học, lớp hoặc tải lên tài liệu để AI tự động phân tích và tạo ma trận.
            </p>
          </div>
        </div>
        <button 
          onClick={onGenerate}
          disabled={isGenerating}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-70 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4 fill-current" />
          )}
          {isGenerating ? 'Đang phân tích...' : 'Phân tích & Lập Ma trận'}
        </button>
      </div>
    </header>
  );
}
