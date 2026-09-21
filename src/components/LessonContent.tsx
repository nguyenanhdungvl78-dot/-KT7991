import { BookOpen } from 'lucide-react';
import { Chapter } from '../types';

interface LessonContentProps {
  chapters: Chapter[];
  selectedLessons: Set<string>;
  onToggleLesson: (lessonId: string) => void;
  onToggleChapter: (chapterId: string, lessonIds: string[]) => void;
}

export default function LessonContent({ chapters, selectedLessons, onToggleLesson, onToggleChapter }: LessonContentProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-purple-700" />
        <h2 className="text-lg font-bold text-purple-700">Nội dung Bài học</h2>
      </div>
      
      <div className="p-5 flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <div className="space-y-4">
          {chapters.map((chapter) => {
            const allLessonsSelected = chapter.lessons.every(l => selectedLessons.has(l.id));
            const someLessonsSelected = chapter.lessons.some(l => selectedLessons.has(l.id));
            
            return (
              <div key={chapter.id} className="space-y-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="pt-0.5">
                    <input 
                      type="checkbox"
                      className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      checked={allLessonsSelected}
                      ref={input => {
                        if (input) {
                          input.indeterminate = someLessonsSelected && !allLessonsSelected;
                        }
                      }}
                      onChange={() => onToggleChapter(chapter.id, chapter.lessons.map(l => l.id))}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-purple-700 transition-colors">
                    {chapter.title}
                  </span>
                </label>
                
                <div className="pl-7 space-y-2.5 mt-2">
                  {chapter.lessons.map((lesson) => (
                    <label key={lesson.id} className="flex items-start gap-3 cursor-pointer group">
                      <div className="pt-0.5">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                          checked={selectedLessons.has(lesson.id)}
                          onChange={() => onToggleLesson(lesson.id)}
                        />
                      </div>
                      <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
                        {lesson.title}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
