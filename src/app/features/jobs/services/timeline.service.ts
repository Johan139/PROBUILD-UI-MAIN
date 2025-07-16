import { Injectable } from '@angular/core';
import { Store } from '../../../store/store.service';
import { SubtasksState } from '../../../state/subtasks.state';
import { TimelineTask, TimelineGroup } from '../../../components/timeline/timeline.component';
import { differenceInCalendarDays, format } from 'date-fns';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TimelineService {
  timelineGroups$: Observable<TimelineGroup[]>;

  constructor(
    private store: Store<SubtasksState>,
    private dialog: MatDialog,
    private http: HttpClient
  ) {
    this.timelineGroups$ = this.store.select(state => state.subtaskGroups).pipe(
      map(subtaskGroups => {
        return (subtaskGroups || []).map(
          (group: { title: string; subtasks: any[] }) => {
            const tasks = group.subtasks.filter((task: any) => !task.deleted);

            if (tasks.length === 0) {
              return {
                title: group.title,
                subtasks: [],
                startDate: new Date(),
                endDate: new Date(),
                progress: 0,
                scheduleStatus: 'on-track' as const,
              };
            }

            const startDates = tasks
              .map((task: any) => new Date(task.startDate || task.start))
              .filter((date: Date) => !isNaN(date.getTime()));

            const endDates = tasks
              .map((task: any) => new Date(task.endDate || task.end))
              .filter((date: Date) => !isNaN(date.getTime()));

            const groupStartDate =
              startDates.length > 0
                ? new Date(Math.min(...startDates.map((d: Date) => d.getTime())))
                : new Date();

            const groupEndDate =
              endDates.length > 0
                ? new Date(Math.max(...endDates.map((d: Date) => d.getTime())))
                : new Date();

            const completedTasks = tasks.filter(
              (task: any) => task.status === 'completed' || task.accepted
            ).length;
            const progress =
              tasks.length > 0
                ? Math.round((completedTasks / tasks.length) * 100)
                : 0;

            const today = new Date();
            const isOverdue = tasks.some((task: any) => {
              const taskEnd = new Date(task.endDate || task.end);
              return (
                taskEnd < today && task.status !== 'completed' && !task.accepted
              );
            });

            const scheduleStatus = isOverdue
              ? 'behind'
              : progress === 100
              ? 'ahead'
              : 'on-track';

            return {
              title: group.title,
              subtasks: tasks.map((task: any) => ({
                id: task.id || Math.random().toString(),
                name: task.task,
                task: task.task,
                start: new Date(task.startDate || task.start),
                end: new Date(task.endDate || task.end),
                startDate: task.startDate,
                endDate: task.endDate,
                days: task.days,
                progress: task.accepted
                  ? 100
                  : task.status === 'completed'
                  ? 100
                  : 0,
                status: task.status || 'pending',
                isCritical: this.isTaskCritical(task),
                cost: task.cost,
                deleted: task.deleted,
                accepted: task.accepted,
              })),
              startDate: groupStartDate,
              endDate: groupEndDate,
              progress,
              scheduleStatus,
            };
          }
        );
      })
    );
  }

  get timelineTaskData(): TimelineTask[] {
    const taskData = this.extractMainTasksFromGroups(
      this.store.getState().subtaskGroups
    );
    if (!taskData) return [];

    return taskData.map((task: any) => ({
      id: task.id,
      name: task.name,
      start: new Date(task.start),
      end: new Date(task.end),
      progress: task.progress || 0,
      dependencies: task.dependencies,
      resource: task.resource,
      color: this.getTaskColor(task),
      isCritical: this.isTaskCritical(task),
    }));
  }

  private getTaskColor(task: any): string {
    const colorMap: { [key: string]: string } = {
      Foundation: '#3b82f6',
      'Roof Structure': '#10b981',
      'Wall Structure': '#f59e0b',
      Electrical: '#ef4444',
      Plumbing: '#8b5cf6',
    };

    return colorMap[task.name] || '#61a0af';
  }

  private isTaskCritical(task: any): boolean {
    const criticalKeywords = [
      'foundation',
      'structural',
      'inspection',
      'permit',
    ];
    const taskName = (task.task || task.name || '').toLowerCase();
    return criticalKeywords.some((keyword) => taskName.includes(keyword));
  }

  handleTaskMove(event: {
    taskId: string;
    newStartDate: Date;
    newEndDate: Date;
  }) {
    const subtaskGroups = this.store.getState().subtaskGroups || [];
    for (const group of subtaskGroups) {
      const taskIndex = group.subtasks.findIndex(
        (t: any) => t.id === event.taskId
      );
      if (taskIndex !== -1) {
        group.subtasks[taskIndex].startDate = event.newStartDate
          .toISOString()
          .split('T')[0];
        group.subtasks[taskIndex].endDate = event.newEndDate
          .toISOString()
          .split('T')[0];
        this.store.setState({
          subtaskGroups: [...subtaskGroups],
        });
        break;
      }
    }
  }

  handleGroupMove(event: {
    groupId: string;
    newStartDate: Date;
    newEndDate: Date;
  }, jobId: number) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Move',
        message: `Please confirm you want to move this task to ${format(
          event.newStartDate,
          'MMM d, yyyy'
        )}. This will notify all users assigned to this task.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        const subtaskGroups = this.store.getState().subtaskGroups || [];
        const groupIndex = subtaskGroups.findIndex(
          (g: any) => g.title === event.groupId
        );

        if (groupIndex !== -1) {
          const group = subtaskGroups[groupIndex];
          const oldStartDate = new Date(
            Math.min(
              ...group.subtasks.map((t: any) =>
                new Date(t.startDate || t.start).getTime()
              )
            )
          );

          const daysDelta = differenceInCalendarDays(
            event.newStartDate,
            oldStartDate
          );

          group.subtasks.forEach((task: any) => {
            const taskStart = new Date(task.startDate || task.start);
            const taskEnd = new Date(task.endDate || task.end);

            taskStart.setDate(taskStart.getDate() + daysDelta);
            taskEnd.setDate(taskEnd.getDate() + daysDelta);

            task.startDate = taskStart.toISOString().split('T')[0];
            task.endDate = taskEnd.toISOString().split('T')[0];
            this.notifyTimelineUpdate(jobId, task.id).subscribe();
          });

          this.store.setState({
            subtaskGroups: [...subtaskGroups],
          });
        }
      }
    });
  }

  notifyTimelineUpdate(jobId: number, subtaskId: number): Observable<any> {
    return this.http.post(`${environment.BACKEND_URL}/Jobs/NotifyTimelineUpdate`, { jobId, subtaskId });
  }

  handleGroupClick(group: TimelineGroup) {
    console.log('Group clicked:', group);
  }

  handleEditGroup(group: TimelineGroup) {
    console.log('Edit group:', group);
  }

  private extractMainTasksFromGroups(
    groups: { title: string; subtasks: any[] }[]
  ): any[] {
    return groups
      .map((group, index) => {
        const subtasks = group.subtasks?.filter((st) => !st.deleted) || [];
        if (subtasks.length === 0) return null;
        const start = new Date(subtasks[0].startDate);
        const end = new Date(subtasks[subtasks.length - 1].endDate);
        const completed = subtasks.filter(
          (st) => st.status?.toLowerCase() === 'completed'
        ).length;
        const percentDone = Math.round((completed / subtasks.length) * 100);
        return {
          id: (index + 1).toString(),
          name: this.cleanTaskName(group.title),
          start,
          end,
          progress: percentDone,
          dependencies: null,
        };
      })
      .filter(Boolean);
  }

  private cleanTaskName(name: string): string {
    if (typeof name === 'string') {
      return name.replace(/^\*\*|\*\*$/g, '').trim();
    }
    return name;
  }
}
