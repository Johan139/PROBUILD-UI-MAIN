import { Injectable } from '@angular/core';
import { Store } from '../../../store/store.service';
import { SubtasksState } from '../../../state/subtasks.state';
import {
  TimelineTask,
  TimelineGroup,
} from '../../../components/timeline/timeline.component';
import { differenceInCalendarDays, format, isValid, parse } from 'date-fns';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import {
  Observable,
  catchError,
  forkJoin,
  map,
  of,
  switchMap,
  throwError,
} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { JobsService } from '../../../services/jobs.service';

@Injectable({
  providedIn: 'root',
})
export class TimelineService {
  timelineGroups$: Observable<TimelineGroup[]>;

  constructor(
    private store: Store<SubtasksState>,
    private dialog: MatDialog,
    private http: HttpClient,
    private jobsService: JobsService,
  ) {
    this.timelineGroups$ = this.store
      .select((state) => state.subtaskGroups)
      .pipe(
        map((subtaskGroups) => {
          return ((subtaskGroups || [])
            .map(
            (group: { title: string; subtasks: any[] }): TimelineGroup | null => {
              const tasks = group.subtasks.filter((task: any) => !task.deleted);

              if (tasks.length === 0) {
                return null;
              }

              const startDates = tasks
                .map((task: any) => this.parseTaskDate(task.startDate || task.start))
                .filter((date): date is Date => !!date);

              const endDates = tasks
                .map((task: any) => this.parseTaskDate(task.endDate || task.end))
                .filter((date): date is Date => !!date);

              if (startDates.length === 0 || endDates.length === 0) {
                return null;
              }

              const groupStartDate =
                startDates.length > 0
                  ? new Date(
                      Math.min(...startDates.map((d: Date) => d.getTime())),
                    )
                  : new Date();

              const groupEndDate =
                endDates.length > 0
                  ? new Date(
                      Math.max(...endDates.map((d: Date) => d.getTime())),
                    )
                  : new Date();

              const completedTasks = tasks.filter(
                (task: any) => task.status === 'completed' || task.accepted,
              ).length;
              const progress =
                tasks.length > 0
                  ? Math.round((completedTasks / tasks.length) * 100)
                  : 0;

              const today = new Date();
              const isOverdue = tasks.some((task: any) => {
                const taskEnd = new Date(task.endDate || task.end);
                return (
                  taskEnd < today &&
                  task.status !== 'completed' &&
                  !task.accepted
                );
              });

              const scheduleStatus = isOverdue
                ? 'behind'
                : progress === 100
                  ? 'ahead'
                  : 'on-track';

              const mappedSubtasks = tasks
                .map((task: any) => {
                  const parsedStart = this.parseTaskDate(task.startDate || task.start);
                  const parsedEnd = this.parseTaskDate(task.endDate || task.end);

                  if (!parsedStart || !parsedEnd) {
                    return null;
                  }

                  return {
                    id: task.id || Math.random().toString(),
                    name: task.task || task.name || 'Untitled Task',
                    task: task.task || task.name || 'Untitled Task',
                    start: parsedStart,
                    end: parsedEnd,
                    startDate: parsedStart.toISOString().split('T')[0],
                    endDate: parsedEnd.toISOString().split('T')[0],
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
                  };
                })
                .filter((task): task is any => !!task);

              if (mappedSubtasks.length === 0) {
                return null;
              }

              return {
                title: group.title,
                subtasks: mappedSubtasks,
                startDate: groupStartDate,
                endDate: groupEndDate,
                progress,
                scheduleStatus: scheduleStatus as 'on-track' | 'behind' | 'ahead',
              };
            },
          )
            .filter((group) => group !== null) as TimelineGroup[]);
        }),
      );
  }

  get timelineTaskData(): TimelineTask[] {
    const taskData = this.extractMainTasksFromGroups(
      this.store.getState().subtaskGroups,
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
        (t: any) => t.id === event.taskId,
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

  handleGroupMove(
    event: {
      groupId: string;
      newStartDate: Date;
      newEndDate: Date;
    },
    jobId: number,
    senderId: string,
  ) {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Confirm Move',
        message: `Please confirm you want to move this task to ${format(
          event.newStartDate,
          'MMM d, yyyy',
        )}. This will notify all users assigned to this task.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.moveGroup(event.groupId, event.newStartDate, jobId, senderId);
      }
    });
  }

  moveGroup(
    groupId: string,
    newStartDate: Date,
    jobId: number,
    senderId: string,
  ): void {
    const subtaskGroups = this.store.getState().subtaskGroups || [];
    const groupIndex = subtaskGroups.findIndex((g: any) => g.title === groupId);

    if (groupIndex !== -1) {
      const group = subtaskGroups[groupIndex];
      const oldStartDate = new Date(
        Math.min(
          ...group.subtasks.map((t: any) =>
            new Date(t.startDate || t.start).getTime(),
          ),
        ),
      );

      const daysDelta = differenceInCalendarDays(newStartDate, oldStartDate);

      const tasksToSave: any[] = [];

      group.subtasks.forEach((task: any) => {
        const taskStart = new Date(task.startDate || task.start);
        const taskEnd = new Date(task.endDate || task.end);

        taskStart.setDate(taskStart.getDate() + daysDelta);
        taskEnd.setDate(taskEnd.getDate() + daysDelta);

        task.startDate = taskStart.toISOString().split('T')[0];
        task.endDate = taskEnd.toISOString().split('T')[0];

        tasksToSave.push({
          ...task,
          groupTitle: group.title,
          jobId: jobId,
          deleted: task.deleted ?? false,
        });

        this.notifyTimelineUpdate(jobId, task.id, senderId).subscribe();
      });

      this.store.setState({
        subtaskGroups: [...subtaskGroups],
      });

      this.jobsService.saveSubtasks(tasksToSave, senderId).subscribe({
        next: () => console.log('Timeline move saved'),
        error: (err) => console.error('Failed to save timeline move', err),
      });
    }
  }

  moveSubtaskWithinGroup(
    parentGroupTitle: string,
    subtaskIdOrLabel: string,
    newStartDate: Date,
    jobId: number,
    senderId: string,
  ): Observable<void> {
    const subtaskGroups = this.store.getState().subtaskGroups || [];
    const groupIndex = subtaskGroups.findIndex(
      (g: any) => g.title === parentGroupTitle,
    );

    if (groupIndex === -1) {
      return throwError(() => new Error('Parent task group not found.'));
    }

    const group = subtaskGroups[groupIndex];
    const normalizedLookup = String(subtaskIdOrLabel ?? '').trim().toLowerCase();
    const numericLookup = Number(subtaskIdOrLabel);

    const normalizeLabel = (value: unknown): string =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    const subtaskIndex = group.subtasks.findIndex((task: any) => {
      const taskIdRaw = task.id;
      const taskIdString = taskIdRaw != null ? String(taskIdRaw).trim() : '';
      const taskIdNumeric = Number(taskIdRaw);
      const taskLabel = normalizeLabel(task.task || task.name);

      const idStringMatch = taskIdString !== '' && taskIdString === String(subtaskIdOrLabel).trim();
      const idNumberMatch =
        !Number.isNaN(numericLookup) && !Number.isNaN(taskIdNumeric) && taskIdNumeric === numericLookup;
      const labelMatch = taskLabel !== '' && taskLabel === normalizedLookup;

      return idStringMatch || idNumberMatch || labelMatch;
    });

    if (subtaskIndex === -1) {
      console.error('[TimelineService] Subtask lookup failed in selected group', {
        parentGroupTitle,
        lookup: subtaskIdOrLabel,
        availableSubtasks: (group.subtasks || []).map((task: any) => ({
          id: task.id,
          task: task.task,
          name: task.name,
          startDate: task.startDate,
          endDate: task.endDate,
        })),
      });
      return throwError(() => new Error('Subtask not found in selected group.'));
    }

    const targetTask = group.subtasks[subtaskIndex];
    const currentStart = this.parseTaskDate(targetTask.startDate);
    const currentEnd = this.parseTaskDate(targetTask.endDate);

    if (!currentStart || !currentEnd) {
      return throwError(() => new Error('Subtask has invalid dates.'));
    }

    const taskDuration = differenceInCalendarDays(currentEnd, currentStart);
    const daysDelta = differenceInCalendarDays(newStartDate, currentStart);

    if (daysDelta === 0) {
      return of(void 0);
    }

    const updatedStart = new Date(currentStart);
    const updatedEnd = new Date(currentEnd);
    updatedStart.setDate(updatedStart.getDate() + daysDelta);
    updatedEnd.setDate(updatedEnd.getDate() + daysDelta);

    targetTask.startDate = updatedStart.toISOString().split('T')[0];
    targetTask.endDate = updatedEnd.toISOString().split('T')[0];
    targetTask.days = taskDuration + 1;

    this.store.setState({
      subtaskGroups: [...subtaskGroups],
    });

    const taskToSave = {
      ...targetTask,
      groupTitle: group.title,
      jobId,
      deleted: targetTask.deleted ?? false,
    };

    const subtaskId = Number(targetTask.id);
    const notify$ = Number.isNaN(subtaskId)
      ? of(null)
      : this.notifyTimelineUpdate(jobId, subtaskId, senderId).pipe(
          catchError(() => of(null)),
        );

    return this.jobsService.saveSubtasks([taskToSave], senderId).pipe(
      switchMap(() => notify$),
      map(() => void 0),
    );
  }

  shiftTimelineToStartDate(
    newProjectStartDate: Date,
    jobId: number,
    senderId: string,
  ): Observable<void> {
    const subtaskGroups = this.store.getState().subtaskGroups || [];

    const earliestTaskStart = subtaskGroups
      .flatMap((group: any) =>
        (group.subtasks || [])
          .map((task: any) =>
            this.parseTaskDate(task.startDate || task.start),
          )
          .filter((date): date is Date => !!date),
      )
      .sort((a, b) => a.getTime() - b.getTime())[0];

    if (!earliestTaskStart) {
      return of(void 0);
    }

    const daysDelta = differenceInCalendarDays(
      newProjectStartDate,
      earliestTaskStart,
    );

    if (daysDelta === 0) {
      return of(void 0);
    }

    const tasksToSave: any[] = [];
    const notifyRequests: Observable<any>[] = [];

    subtaskGroups.forEach((group: any) => {
      (group.subtasks || []).forEach((task: any) => {
        const taskStart = this.parseTaskDate(task.startDate || task.start);
        const taskEnd = this.parseTaskDate(task.endDate || task.end);

        if (!taskStart || !taskEnd) {
          return;
        }

        taskStart.setDate(taskStart.getDate() + daysDelta);
        taskEnd.setDate(taskEnd.getDate() + daysDelta);

        const startDate = format(taskStart, 'yyyy-MM-dd');
        const endDate = format(taskEnd, 'yyyy-MM-dd');

        task.startDate = startDate;
        task.endDate = endDate;

        tasksToSave.push({
          ...task,
          groupTitle: group.title,
          jobId,
          deleted: task.deleted ?? false,
        });

        const subtaskId = Number(task.id);
        if (!Number.isNaN(subtaskId)) {
          notifyRequests.push(
            this.notifyTimelineUpdate(jobId, subtaskId, senderId).pipe(
              catchError(() => of(null)),
            ),
          );
        }
      });
    });

    this.store.setState({
      subtaskGroups: [...subtaskGroups],
    });

    if (tasksToSave.length === 0) {
      return of(void 0);
    }

    return this.jobsService.saveSubtasks(tasksToSave, senderId).pipe(
      switchMap(() =>
        notifyRequests.length > 0
          ? forkJoin(notifyRequests).pipe(map(() => void 0))
          : of(void 0),
      ),
    );
  }

  notifyTimelineUpdate(
    jobId: number,
    subtaskId: number,
    senderId: string,
  ): Observable<any> {
    return this.http.post(
      `${environment.BACKEND_URL}/Jobs/NotifyTimelineUpdate`,
      { jobId, subtaskId, senderId },
    );
  }

  handleGroupClick(group: TimelineGroup) {
    // console.log('Group clicked:', group);
  }

  handleEditGroup(group: TimelineGroup) {
    // console.log('Edit group:', group);
  }

  private extractMainTasksFromGroups(
    groups: { title: string; subtasks: any[] }[],
  ): any[] {
    return groups
      .map((group, index) => {
        const subtasks = group.subtasks?.filter((st) => !st.deleted) || [];
        if (subtasks.length === 0) return null;
        const start = new Date(subtasks[0].startDate);
        const end = new Date(subtasks[subtasks.length - 1].endDate);
        const completed = subtasks.filter(
          (st) => st.status?.toLowerCase() === 'completed',
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

  private parseTaskDate(dateInput: unknown): Date | null {
    if (!dateInput) {
      return null;
    }

    if (dateInput instanceof Date) {
      return isValid(dateInput) ? dateInput : null;
    }

    const dateStr = String(dateInput).trim();
    if (!dateStr) {
      return null;
    }

    const native = new Date(dateStr);
    if (isValid(native)) {
      return native;
    }

    const formats = [
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'MM/dd/yyyy',
      'MM-dd-yyyy',
      'yyyy-MM-dd',
      'yyyy/MM/dd',
      'dd/MM/yy',
      'dd-MM-yy',
      'MM/dd/yy',
      'MM-dd-yy',
    ];

    for (const formatPattern of formats) {
      const parsed = parse(dateStr, formatPattern, new Date());
      if (isValid(parsed)) {
        return parsed;
      }
    }

    return null;
  }
}
