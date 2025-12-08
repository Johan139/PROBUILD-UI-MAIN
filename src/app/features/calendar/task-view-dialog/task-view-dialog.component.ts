import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DailyLogisticsEntry {
  day: string;
  date: string;
  phase: string;
  tasks: string;
  materials: string;
  equipment: string;
  personnel: string;
  milestones: string;
}

export interface TaskViewDialogData {
  projectName: string;
  phaseName: string;
  subtaskName: string;
  startDate: string | Date;
  endDate: string | Date;
  duration: number;
  status: string;
  dailyLogistics: DailyLogisticsEntry[];
}

@Component({
  selector: 'app-task-view-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './task-view-dialog.component.html',
  styleUrls: ['./task-view-dialog.component.scss']
})
export class TaskViewDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<TaskViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskViewDialogData
  ) {}

  close(): void {
    this.dialogRef.close();
  }

  formatDate(date: string | Date): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
