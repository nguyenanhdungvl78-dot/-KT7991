import { QuestionType, CognitiveLevels } from '../types';

interface ConfigurationProps {
  questionTypes: QuestionType[];
  onUpdateQuestionType: (id: string, field: keyof QuestionType, value: number) => void;
  cognitiveLevels: CognitiveLevels;
  onUpdateCognitiveLevel: (field: keyof CognitiveLevels, value: number) => void;
}

export default function Configuration({
  questionTypes,
  onUpdateQuestionType,
  cognitiveLevels,
  onUpdateCognitiveLevel
}: ConfigurationProps) {
  const totalPoints = questionTypes.reduce((sum, qt) => sum + qt.points, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <h2 className="text-lg font-bold text-purple-700">Cấu hình & Điểm số</h2>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-8 overflow-y-auto">
        
        {/* Question Types Table */}
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4 px-2 pb-2 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Loại câu</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Số lượng</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Điểm số</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Tỉ lệ (%)</div>
          </div>
          
          <div className="space-y-3">
            {questionTypes.map((qt) => {
              const ratio = totalPoints > 0 ? ((qt.points / totalPoints) * 100).toFixed(0) : 0;
              return (
                <div key={qt.id} className="grid grid-cols-4 gap-4 items-center px-2">
                  <div className="text-sm font-medium text-slate-700">{qt.name}</div>
                  <div>
                    <input 
                      type="number" 
                      min="0"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                      value={qt.quantity === 0 ? '' : qt.quantity}
                      onChange={(e) => onUpdateQuestionType(qt.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      min="0"
                      step="0.1"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                      value={qt.points === 0 ? '' : qt.points}
                      onChange={(e) => onUpdateQuestionType(qt.id, 'points', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="text-sm font-medium text-purple-600 text-right">
                    {ratio}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cognitive Levels */}
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-purple-700">Mức độ nhận thức (%)</h3>
          
          <div className="grid grid-cols-4 gap-4 px-2 pb-2 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Biết</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Hiểu</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Vận dụng</div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Vận dụng cao</div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 px-2">
            <div>
              <input 
                type="number" 
                min="0"
                max="100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                value={cognitiveLevels.knowledge === 0 ? '' : cognitiveLevels.knowledge}
                onChange={(e) => onUpdateCognitiveLevel('knowledge', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <input 
                type="number" 
                min="0"
                max="100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                value={cognitiveLevels.comprehension === 0 ? '' : cognitiveLevels.comprehension}
                onChange={(e) => onUpdateCognitiveLevel('comprehension', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <input 
                type="number" 
                min="0"
                max="100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                value={cognitiveLevels.application === 0 ? '' : cognitiveLevels.application}
                onChange={(e) => onUpdateCognitiveLevel('application', parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <input 
                type="number" 
                min="0"
                max="100"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-shadow"
                value={cognitiveLevels.highApplication === 0 ? '' : cognitiveLevels.highApplication}
                onChange={(e) => onUpdateCognitiveLevel('highApplication', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="px-2 pt-2 flex justify-between items-center text-sm">
             <span className="text-slate-500">Tổng cộng:</span>
             <span className={`font-semibold ${
               (cognitiveLevels.knowledge + cognitiveLevels.comprehension + cognitiveLevels.application + cognitiveLevels.highApplication) === 100 
                ? 'text-emerald-600' : 'text-red-500'
             }`}>
               {cognitiveLevels.knowledge + cognitiveLevels.comprehension + cognitiveLevels.application + cognitiveLevels.highApplication}%
             </span>
          </div>
        </div>

      </div>
    </div>
  );
}
