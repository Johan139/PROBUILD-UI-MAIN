import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Injectable } from '@angular/core';
import { Store } from '../../../store/store.service';
import { SubtasksState, Subtask } from '../../../state/subtasks.state';
import { MatDialog } from '@angular/material/dialog';
import { DeleteDialogComponent } from '../job-edit/delete-dialog.component';
import { ConfirmAIAcceptanceDialogComponent } from '../../../confirm-aiacceptance-dialog/confirm-aiacceptance-dialog.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JobsService } from '../../../services/jobs.service';
import { AuthService } from '../../../authentication/auth.service';

@Injectable({
  providedIn: 'root',
})
export class SubtaskService {
  constructor(
    private store: Store<SubtasksState>,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private jobsService: JobsService,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  addSubtask(table: any, taskData?: Partial<Subtask>): void {
    const newSubtask: Subtask = {
      id: taskData?.id ?? 0,
      task: taskData?.task ?? '',
      days: taskData?.days ?? 0,
      startDate: taskData?.startDate ?? '',
      endDate: taskData?.endDate ?? '',
      status: taskData?.status ?? 'Pending',
      cost: taskData?.cost ?? 0,
      deleted: false,
      accepted: false,
    };
    table.subtasks.push(newSubtask);
    const updatedState = this.store.getState().subtaskGroups.map((group) => {
      if (group.title === table.title) {
        return { ...group, subtasks: [...table.subtasks] };
      }
      return group;
    });
    this.store.setState({ subtaskGroups: updatedState });
  }

  deleteSubtask(table: any, index: number): void {
    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      width: '400px',
      panelClass: 'custom-dialog-container',
      disableClose: true,
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result === true) {
        table.subtasks[index].deleted = true;
        const updatedState = this.store
          .getState()
          .subtaskGroups.map((group) => {
            if (group.title === table.title) {
              return { ...group, subtasks: [...table.subtasks] };
            }
            return group;
          });
        this.store.setState({ subtaskGroups: updatedState });
      }
    });
  }

  updateSubtaskDates(table: any, index: number): void {
    const subtask = table.subtasks[index];
    if (subtask.days && subtask.startDate) {
      const startDate = new Date(subtask.startDate);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + subtask.days - 1);
      subtask.endDate = endDate.toISOString().split('T')[0];
      for (let i = index + 1; i < table.subtasks.length; i++) {
        const nextSubtask = table.subtasks[i];
        const nextStartDate = new Date(endDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        nextSubtask.startDate = nextStartDate.toISOString().split('T')[0];
        const nextEndDate = new Date(nextStartDate);
        nextEndDate.setDate(nextStartDate.getDate() + nextSubtask.days - 1);
        nextSubtask.endDate = nextEndDate.toISOString().split('T')[0];
        endDate.setDate(nextEndDate.getDate());
      }
    }
  }

  acceptAllSubtasks(): void {
    const updatedGroups = this.store.getState().subtaskGroups.map((group) => ({
      ...group,
      subtasks: group.subtasks.map((st) => ({
        ...st,
        accepted: true,
      })),
    }));
    this.store.setState({ subtaskGroups: updatedGroups });
  }

  saveOnly(): void {
    const unaccepted = this.store
      .getState()
      .subtaskGroups.flatMap((group) => group.subtasks)
      .filter((st) => !st.deleted && !st.accepted);

    const dialogRef = this.dialog.open(ConfirmAIAcceptanceDialogComponent, {
      data: {
        warningMessage:
          unaccepted.length > 0
            ? 'Please accept all subtasks to proceed with saving.'
            : null,
        disableConfirm: unaccepted.length > 0,
      },
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.performSaveJob();
      }
    });
  }

  performSaveJob(): void {
    const unaccepted = this.store
      .getState()
      .subtaskGroups.flatMap((group) => group.subtasks)
      .filter((st) => !st.deleted && !st.accepted);

    if (unaccepted.length > 0) {
      this.snackBar.open(
        '⚠ Please accept all subtasks before saving.',
        'Got it',
        {
          duration: 6000,
          panelClass: ['custom-snackbar'],
          verticalPosition: 'top',
          horizontalPosition: 'center',
        },
      );
      return;
    }

    const updatedSubtaskGroups = this.store
      .getState()
      .subtaskGroups.map((group) => ({
        ...group,
        subtasks: group.subtasks.map(
          ({
            id,
            task,
            days,
            startDate,
            endDate,
            cost,
            status,
            deleted,
            accepted,
          }) => ({
            id,
            task,
            days,
            startDate,
            endDate,
            cost,
            status,
            groupTitle: group.title,
            deleted,
            accepted,
          }),
        ),
      }));
    this.store.setState({ subtaskGroups: updatedSubtaskGroups });
    const jobData = this.prepareProjectData('DRAFT');
    const projectDetails = this.store.getState().projectDetails;

    if (!projectDetails?.jobId) {
      throw new Error('Missing project details');
    }

    const subtaskList = updatedSubtaskGroups.flatMap((group) =>
      group.subtasks.map((subtask) => ({
        ...subtask,
        groupTitle: group.title,
        jobId: projectDetails.jobId,
        deleted: subtask.deleted ?? false,
      })),
    );
    const userId: string | null = localStorage.getItem('userId');

    this.jobsService.updateJob(jobData, projectDetails.jobId).subscribe({
      next: (response) => {
        this.jobsService.saveSubtasks(subtaskList, userId).subscribe({
          next: () => {
            this.snackBar.open('Saved Job Successfully', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            this.snackBar.open('Job saved Successfully', 'Close', {
              duration: 3000,
            });
          },
        });
      },
      error: (err) => {
        this.snackBar.open(
          'An unexpected error occurred while saving the job.',
          'Close',
          { duration: 3000 },
        );
      },
    });
  }

  private prepareProjectData(status: string): any {
    const projectDetails = this.store.getState().projectDetails;

    if (!projectDetails) {
      throw new Error('Missing project details');
    }

    const subtaskGroups = this.store.getState().subtaskGroups;
    const formattedDate = (date: Date | string) => {
      let d;
      if (date instanceof Date) {
        d = date;
      } else if (typeof date === 'string') {
        d = new Date(date);
      } else {
        d = new Date(); // Fallback for null/undefined
      }

      if (isNaN(d.getTime())) {
        d = new Date(); // Fallback for invalid date string
      }

      return d.toISOString();
    };

    return {
      JobId: projectDetails.jobId || 0,
      ProjectName: projectDetails.projectName || '',
      JobType: projectDetails.jobType || '',
      Qty: Number(projectDetails.quantity) || 1,
      DesiredStartDate: formattedDate(
        projectDetails.desiredStartDate
          ? new Date(projectDetails.desiredStartDate)
          : new Date(),
      ),
      WallStructure: projectDetails.wallStructure || '',
      WallStructureSubtask: JSON.stringify(subtaskGroups[2]?.subtasks || []),
      WallInsulation: projectDetails.wallInsulation || '',
      WallInsulationSubtask: JSON.stringify(subtaskGroups[1]?.subtasks || []),
      RoofStructure: projectDetails.roofStructure || '',
      RoofStructureSubtask: JSON.stringify(subtaskGroups[5]?.subtasks || []),
      RoofTypeSubtask: '',
      RoofInsulation: projectDetails.roofInsulation || '',
      RoofInsulationSubtask: JSON.stringify(subtaskGroups[4]?.subtasks || []),
      Foundation: projectDetails.foundation || '',
      FoundationSubtask: JSON.stringify(subtaskGroups[0]?.subtasks || []),
      Finishes: projectDetails.finishes || '',
      FinishesSubtask: JSON.stringify(subtaskGroups[6]?.subtasks || []),
      ElectricalSupplyNeeds: projectDetails.electricalSupply || '',
      ElectricalSupplyNeedsSubtask: JSON.stringify(
        subtaskGroups[3]?.subtasks || [],
      ),
      Stories: Number(projectDetails.stories) || 0,
      BuildingSize: Number(projectDetails.buildingSize) || 0,
      Status: status || 'DRAFT',
      OperatingArea: 'GreenField',
      Address: projectDetails.address || '',
      UserId: localStorage.getItem('userId'),
      Blueprint: projectDetails.blueprintPath || '',
    };
  }

  getVisibleSubtasks(table: any): any[] {
    return table.subtasks?.filter((s: any) => !s.deleted) || [];
  }

  publish(): void {
    const projectData = this.prepareProjectData('PUBLISHED');
    const projectDetails = this.store.getState().projectDetails;

    if (!projectDetails?.jobId) {
      throw new Error('Missing project details');
    }

    this.jobsService.updateJob(projectData, projectDetails.jobId).subscribe({
      next: (response) => {
        this.snackBar.open('Published Job Successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.snackBar.open(
          'An unexpected error occurred. Contact support',
          'Close',
          { duration: 3000 },
        );
      },
    });
  }

  discard(): void {
    const projectData = this.prepareProjectData('DISCARD');
    const projectDetails = this.store.getState().projectDetails;

    if (!projectDetails?.jobId) {
      throw new Error('Missing project details');
    }
    this.jobsService.updateJob(projectData, projectDetails.jobId).subscribe({
      next: (response) => {
        this.snackBar.open('Discarded Job Successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        this.snackBar.open(
          'An unexpected error occurred. Contact support',
          'Close',
          { duration: 3000 },
        );
      },
    });
  }

  publishJob(jobId: number, job: any): Observable<any> {
    return this.jobsService.updateJob(job, jobId);
  }

  updateSubtask(task: any): void {
    const projectDetails = this.store.getState().projectDetails;

    if (!projectDetails?.jobId) {
      throw new Error('Missing project details');
    }

    const targetGroupTitle = task.groupTitle;
    if (!targetGroupTitle) {
      this.snackBar.open('Unable to update task: missing group context.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const normalize = (value: unknown): string =>
      String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');

    let matchedTask: any = null;

    const updatedState = this.store.getState().subtaskGroups.map((group) => {
      if (group.title !== targetGroupTitle) {
        return group;
      }

      const taskId = task.id;
      const hasValidId = taskId !== null && taskId !== undefined && taskId !== '';

      let taskIndex = -1;

      if (hasValidId) {
        taskIndex = group.subtasks.findIndex(
          (t) =>
            t.id !== null &&
            t.id !== undefined &&
            String(t.id).trim() === String(taskId).trim(),
        );
      }

      if (taskIndex === -1) {
        const taskName = normalize(task.task || task.name);
        taskIndex = group.subtasks.findIndex((t) => {
          const sameName = normalize(t.task) === taskName;
          const sameStart = String(t.startDate || '') === String(task.startDate || '');
          return sameName && sameStart;
        });
      }

      if (taskIndex === -1) {
        taskIndex = group.subtasks.findIndex(
          (t) => normalize(t.task) === normalize(task.task || task.name),
        );
      }

      if (taskIndex === -1) {
        return group;
      }

      const updatedSubtasks = [...group.subtasks];
      updatedSubtasks[taskIndex] = { ...updatedSubtasks[taskIndex], ...task };
      matchedTask = updatedSubtasks[taskIndex];
      return { ...group, subtasks: updatedSubtasks };
    });

    if (!matchedTask) {
      this.snackBar.open('Failed to locate task to update.', 'Close', {
        duration: 3000,
      });
      return;
    }

    this.store.setState({ subtaskGroups: updatedState });

    const subtaskToSave = {
      ...matchedTask,
      groupTitle: targetGroupTitle,
      jobId: projectDetails.jobId,
      deleted: matchedTask.deleted ?? false,
    };

    const userId = this.authService.getUserId();

    this.jobsService.saveSubtasks([subtaskToSave], userId).subscribe({
      next: () => {
        this.snackBar.open('Task updated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Failed to save subtask', err);
        this.snackBar.open('Failed to save task', 'Close', { duration: 3000 });
      },
    });
  }
}
