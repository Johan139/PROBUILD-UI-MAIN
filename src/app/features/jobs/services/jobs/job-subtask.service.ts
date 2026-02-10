import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JobSubtaskService {
  groupSubtasksByTitle(
    subtasks: any[],
  ): { title: string; subtasks: any[]; progress: number }[] {
    const groupedMap = new Map<string, any[]>();

    for (const st of subtasks) {
      const group = groupedMap.get(st.groupTitle) || [];

      const formatDate = (date: string) => {
        if (!date) return '';
        return new Date(date).toISOString().split('T')[0];
      };

      group.push({
        id: st.id,
        task: this.cleanTaskName(st.task ?? st.taskName),
        days: st.days,
        startDate: formatDate(st.startDate),
        endDate: formatDate(st.endDate),
        status: st.status ?? 'Pending',
        cost: st.cost ?? 0,
        deleted: st.deleted ?? false,
      });

      groupedMap.set(st.groupTitle, group);
    }

    return Array.from(groupedMap.entries()).map(([title, subtasks]) => {
      const completedCount = subtasks.filter(
        (s) => s.status && s.status.toLowerCase() === 'completed',
      ).length;

      const progress =
        subtasks.length > 0
          ? Math.round((completedCount / subtasks.length) * 100)
          : 0;

      return {
        title: this.cleanTaskName(title),
        subtasks,
        progress,
      };
    });
  }

  // ================================
  // HELPERS
  // ================================

  private cleanTaskName(name: string): string {
    if (typeof name === 'string') {
      return name.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return name;
  }
}
