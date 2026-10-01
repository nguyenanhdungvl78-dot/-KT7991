import { QuestionType, CognitiveLevels, ManualLevelCounts } from '../types';
import { Sliders, Edit3, RefreshCw, Calculator } from 'lucide-react';
import {
  splitCountByFourLevels,
  calculateLevelsFromManualConfig,
  toInt,
} from '../utils/matrixUtils';

interface ConfigurationProps {
  questionTypes: QuestionType[];
  onUpdateQuestionType: (id: string, field: keyof QuestionType, value: any) => void;
  onUpdateManualLevel?: (id: string, levelField: keyof ManualLevelCounts, value: number) => void;
  cognitiveLevels: CognitiveLevels;
  onUpdateCognitiveLevel: (field: keyof CognitiveLevels, value: number) => void;
  allocationMode: 'auto' | 'manual';
  onChangeAllocationMode: (mode: 'auto' | 'manual') => void;
  onSyncManualFromAuto?: () => void;
  onOpenManualMatrix?: () => void;
}

export default function Configuration({
  questionTypes,
  onUpdateQuestionType,
  onUpdateManualLevel,
  cognitiveLevels,
  onUpdateCognitiveLevel,
  allocationMode,
  onChangeAllocationMode,
  onSyncManualFromAuto,
  onOpenManualMatrix,
}: ConfigurationProps) {
  const totalPoints = questionTypes.reduce((sum, qt) => sum + (Number(qt.points) || 0), 0);
  const totalQuestions = questionTypes.reduce((sum, qt) => sum + toInt(qt.quantity), 0);

  const manualSummary = calculateLevelsFromManualConfig(questionTypes);
  const sumCognitivePercent =
    cognitiveLevels.knowledge +
    cognitiveLevels.comprehension +
    cognitiveLevels.application +
    cognitiveLevels.highApplication;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/50">
        <h2 className="text-lg font-bold text-purple-700">Cấu hình & Điểm số</h2>

        {/* Mode Toggle: Tự động vs Thủ công */}
        <div className="inline-flex rounded-lg bg-slate-200/80 p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => onChangeAllocationMode('auto')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
              allocationMode === 'auto'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Nhập tổng số câu và tỉ lệ %, hệ thống tự chia số câu ở các mức độ"
          >
            <Sliders className="w-3.5 h-3.5" />
            Tự động
          </button>
          <button
            type="button"
            onClick={() => onChangeAllocationMode('manual')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition-all ${
              allocationMode === 'manual'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Chọn thủ công số câu ở từng mức độ, hệ thống tự động tính tỉ lệ %"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Thủ công
          </button>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-6 overflow-y-auto">
        {allocationMode === 'auto' ? (
          /* ================= CHẾ ĐỘ TỰ ĐỘNG ================= */
          <>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-2 px-1 pb-2 border-b border-slate-100">
                <div className="col-span-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Loại câu
                </div>
                <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Số lượng
                </div>
                <div className="col-span-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                  Điểm số
                </div>
                <div className="col-span-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Tỉ lệ
                </div>
              </div>

              <div className="space-y-2.5">
                {questionTypes.map((qt) => {
                  const ratio =
                    totalPoints > 0 ? ((qt.points / totalPoints) * 100).toFixed(0) : 0;
                  const autoSplit = splitCountByFourLevels(
                    qt.quantity,
                    cognitiveLevels,
                    qt.id === 'tu_luan'
                  );

                  return (
                    <div
                      key={qt.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/40 p-2 transition-colors hover:border-purple-200"
                    >
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-4 text-sm font-semibold text-slate-700">
                          {qt.name}
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            value={qt.quantity === 0 ? '' : qt.quantity}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateQuestionType(
                                qt.id,
                                'quantity',
                                Math.max(0, parseInt(e.target.value) || 0)
                              )
                            }
                          />
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            value={qt.points === 0 ? '' : qt.points}
                            placeholder="0"
                            onChange={(e) =>
                              onUpdateQuestionType(
                                qt.id,
                                'points',
                                Math.max(0, parseFloat(e.target.value) || 0)
                              )
                            }
                          />
                        </div>
                        <div className="col-span-2 text-sm font-bold text-purple-600 text-right">
                          {ratio}%
                        </div>
                      </div>

                      {qt.quantity > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Tự chia mức độ:</span>
                          <div className="flex items-center gap-2 font-medium">
                            <span className="text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                              B: {autoSplit.knowledge}
                            </span>
                            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              H: {autoSplit.comprehension}
                            </span>
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              VD: {autoSplit.application}
                            </span>
                            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                              VDC: {autoSplit.highApplication}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between px-2 pt-1 text-xs font-semibold text-slate-600">
                <span>Tổng đề kiểm tra: {totalQuestions} câu</span>
                <span className="text-purple-700">
                  Tổng điểm: {totalPoints.toFixed(2).replace(/\.00$/, '')} điểm
                </span>
              </div>
            </div>

            {/* Cognitive Levels (%) */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-700 uppercase tracking-wide">
                  Mức độ nhận thức (%)
                </h3>
                <button
                  type="button"
                  onClick={() => onChangeAllocationMode('manual')}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium underline"
                >
                  Chuyển sang nhập số câu thủ công
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 px-1">
                <div className="text-center">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    Biết
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={cognitiveLevels.knowledge === 0 ? '' : cognitiveLevels.knowledge}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateCognitiveLevel(
                        'knowledge',
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
                <div className="text-center">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    Hiểu
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={
                      cognitiveLevels.comprehension === 0 ? '' : cognitiveLevels.comprehension
                    }
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateCognitiveLevel(
                        'comprehension',
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
                <div className="text-center">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    Vận dụng
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={cognitiveLevels.application === 0 ? '' : cognitiveLevels.application}
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateCognitiveLevel(
                        'application',
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
                <div className="text-center">
                  <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                    VD Cao
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full border border-slate-200 rounded-lg px-2 py-2 text-center text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    value={
                      cognitiveLevels.highApplication === 0
                        ? ''
                        : cognitiveLevels.highApplication
                    }
                    placeholder="0"
                    onChange={(e) =>
                      onUpdateCognitiveLevel(
                        'highApplication',
                        Math.max(0, parseInt(e.target.value) || 0)
                      )
                    }
                  />
                </div>
              </div>

              <div className="px-1 pt-1 flex justify-between items-center text-sm">
                <span className="text-slate-500">Tổng tỉ lệ nhận thức:</span>
                <span
                  className={`font-bold ${
                    sumCognitivePercent === 100 ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {sumCognitivePercent}%
                </span>
              </div>
            </div>
          </>
        ) : (
          /* ================= CHẾ ĐỘ THỦ CÔNG (CHỌN SỐ CÂU -> TỰ CHIA TỈ LỆ %) ================= */
          <>
            <div className="bg-purple-50/80 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex items-start justify-between gap-2">
              <div>
                <span className="font-bold">Chế độ chọn câu thủ công:</span> Nhập số câu ở từng mức độ{' '}
                <strong>Biết / Hiểu / VD / VDC</strong> cho mỗi loại câu hỏi. Hệ thống sẽ{' '}
                <strong>tự động tính tổng câu và tự chia tỉ lệ %</strong>.
              </div>
              {onSyncManualFromAuto && (
                <button
                  type="button"
                  onClick={onSyncManualFromAuto}
                  className="shrink-0 bg-white hover:bg-purple-100 text-purple-700 border border-purple-200 px-2 py-1 rounded font-semibold flex items-center gap-1 shadow-xs transition-colors"
                  title="Lấy số câu gợi ý từ cấu hình Tự động"
                >
                  <RefreshCw className="w-3 h-3" />
                  Gợi ý
                </button>
              )}
            </div>

            {/* Manual Per-Level Inputs for Each Question Type */}
            <div className="space-y-3">
              {questionTypes.map((qt) => {
                const ml = qt.manualLevels || {
                  knowledge: qt.quantity,
                  comprehension: 0,
                  application: 0,
                  highApplication: 0,
                };
                const rowSum =
                  toInt(ml.knowledge) +
                  toInt(ml.comprehension) +
                  toInt(ml.application) +
                  toInt(ml.highApplication);
                const ratio =
                  totalPoints > 0 ? ((qt.points / totalPoints) * 100).toFixed(0) : 0;

                return (
                  <div
                    key={qt.id}
                    className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800">{qt.name}</span>
                        <span className="text-xs font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">
                          Tổng: {rowSum} câu
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">Điểm:</span>
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-center text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={qt.points === 0 ? '' : qt.points}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateQuestionType(
                              qt.id,
                              'points',
                              Math.max(0, parseFloat(e.target.value) || 0)
                            )
                          }
                        />
                        <span className="text-xs font-bold text-purple-600 w-10 text-right">
                          ({ratio}%)
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-sky-700 uppercase text-center mb-1">
                          Biết
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white border border-sky-200 rounded-md px-2 py-1.5 text-center text-sm font-bold text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                          value={ml.knowledge === 0 ? '' : ml.knowledge}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateManualLevel?.(
                              qt.id,
                              'knowledge',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-emerald-700 uppercase text-center mb-1">
                          Hiểu
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white border border-emerald-200 rounded-md px-2 py-1.5 text-center text-sm font-bold text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          value={ml.comprehension === 0 ? '' : ml.comprehension}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateManualLevel?.(
                              qt.id,
                              'comprehension',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-700 uppercase text-center mb-1">
                          Vận dụng
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white border border-amber-200 rounded-md px-2 py-1.5 text-center text-sm font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          value={ml.application === 0 ? '' : ml.application}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateManualLevel?.(
                              qt.id,
                              'application',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-rose-700 uppercase text-center mb-1">
                          VD Cao
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="w-full bg-white border border-rose-200 rounded-md px-2 py-1.5 text-center text-sm font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                          value={ml.highApplication === 0 ? '' : ml.highApplication}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateManualLevel?.(
                              qt.id,
                              'highApplication',
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Auto-calculated Ratios Summary Box */}
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/70 to-indigo-50/40 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 uppercase tracking-wider">
                  <Calculator className="w-4 h-4 text-purple-600" />
                  Tỉ lệ % tự động chia theo số câu
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Tổng: 100%
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-white rounded-lg p-2 border border-sky-100 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Biết</div>
                  <div className="text-base font-extrabold text-sky-700">
                    {manualSummary.levels.knowledge}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {manualSummary.levelCounts.knowledge} câu ({manualSummary.levelPoints.knowledge}đ)
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-emerald-100 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Hiểu</div>
                  <div className="text-base font-extrabold text-emerald-700">
                    {manualSummary.levels.comprehension}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {manualSummary.levelCounts.comprehension} câu ({manualSummary.levelPoints.comprehension}đ)
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-amber-100 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Vận dụng</div>
                  <div className="text-base font-extrabold text-amber-700">
                    {manualSummary.levels.application}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {manualSummary.levelCounts.application} câu ({manualSummary.levelPoints.application}đ)
                  </div>
                </div>
                <div className="bg-white rounded-lg p-2 border border-rose-100 shadow-2xs">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">VD Cao</div>
                  <div className="text-base font-extrabold text-rose-700">
                    {manualSummary.levels.highApplication}%
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {manualSummary.levelCounts.highApplication} câu ({manualSummary.levelPoints.highApplication}đ)
                  </div>
                </div>
              </div>

              {/* Progress bar visualization */}
              <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden flex">
                <div
                  style={{ width: `${manualSummary.levels.knowledge}%` }}
                  className="bg-sky-500 transition-all duration-300"
                  title={`Biết: ${manualSummary.levels.knowledge}%`}
                />
                <div
                  style={{ width: `${manualSummary.levels.comprehension}%` }}
                  className="bg-emerald-500 transition-all duration-300"
                  title={`Hiểu: ${manualSummary.levels.comprehension}%`}
                />
                <div
                  style={{ width: `${manualSummary.levels.application}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Vận dụng: ${manualSummary.levels.application}%`}
                />
                <div
                  style={{ width: `${manualSummary.levels.highApplication}%` }}
                  className="bg-rose-500 transition-all duration-300"
                  title={`Vận dụng cao: ${manualSummary.levels.highApplication}%`}
                />
              </div>

              <div className="flex items-center justify-between text-xs font-semibold text-slate-600 pt-0.5">
                <span>Tổng số câu: {manualSummary.totalQuestions} câu</span>
                <span className="text-purple-700">Tổng điểm: {manualSummary.totalPoints} điểm</span>
              </div>
            </div>
          </>
        )}

        {onOpenManualMatrix && (
          <div className="pt-2 mt-auto border-t border-slate-100">
            <button
              type="button"
              onClick={onOpenManualMatrix}
              className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs"
            >
              <Edit3 className="w-4 h-4 text-purple-600" />
              Mở Bảng 1. Khung Ma Trận để sửa trực tiếp từng ô
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
