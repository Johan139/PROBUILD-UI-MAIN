import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PhaseNavigationHeaderComponent,
  PhaseReportRequestType,
} from '../shared/phase-navigation-header.component';

interface LiveTask {
  id: number;
  task: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  startDate: string;
  endDate: string;
  days: number;
  accepted?: boolean;
}

interface LiveTaskGroup {
  id: string;
  title: string;
  subtasks: LiveTask[];
}

@Component({
  selector: 'app-phase-construction-live',
  standalone: true,
  imports: [CommonModule, FormsModule, PhaseNavigationHeaderComponent],
  templateUrl: './phase-construction-live.component.html',
  styleUrl: './phase-construction-live.component.scss',
})
export class PhaseConstructionLiveComponent {
  @Input() projectDetails: any;
  @Input() liveStageTemplate: TemplateRef<any> | null = null;
  @Input() isReportLoading = false;
  @Input() showEnvironmentalReport = true;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();
  @Output() documentsRequested = new EventEmitter<void>();
  @Output() reportRequested = new EventEmitter<PhaseReportRequestType>();

  readonly liveMetrics = {
    activeCrews: 6,
    openSubtasks: 24,
    blockedItems: 3,
    scheduleHealth: 92,
  };

  readonly taskGroups: LiveTaskGroup[] = [
    {
      id: 'site-ops',
      title: 'Site Operations',
      subtasks: [
        {
          id: 1001,
          task: 'Daily logistics and delivery routing',
          status: 'In Progress',
          startDate: '2026-02-20',
          endDate: '2026-02-26',
          days: 6,
          accepted: true,
        },
        {
          id: 1002,
          task: 'Safety stand-up and incident review',
          status: 'Completed',
          startDate: '2026-02-18',
          endDate: '2026-02-19',
          days: 1,
          accepted: true,
        },
      ],
    },
    {
      id: 'mep-roughin',
      title: 'MEP Rough-In',
      subtasks: [
        {
          id: 2001,
          task: 'Electrical rough-in inspection prep',
          status: 'Pending',
          startDate: '2026-02-26',
          endDate: '2026-03-01',
          days: 3,
          accepted: false,
        },
        {
          id: 2002,
          task: 'Plumbing pressure test witness',
          status: 'In Progress',
          startDate: '2026-02-25',
          endDate: '2026-02-28',
          days: 3,
          accepted: false,
        },
      ],
    },
  ];

  selectedGroupId = this.taskGroups[0]?.id || '';
  tasksExpanded = true;
  addingTask = false;
  newTask = {
    name: '',
    days: 5,
    startDate: '',
    endDate: '',
    status: 'Pending' as LiveTask['status'],
  };

  editingTask: { taskId: number; field: 'task' | 'startDate' | 'endDate' | 'days' | 'status' } | null =
    null;

  private nextTaskId = 3000;

  get projectSizeSqFt(): string {
    return this.projectDetails?.buildingSize || this.projectDetails?.projectSize || '2,450';
  }

  get projectSizeSqM(): string {
    const numeric = Number(String(this.projectSizeSqFt).replace(/,/g, ''));
    if (Number.isNaN(numeric) || numeric <= 0) {
      return '228';
    }

    return Math.round(numeric * 0.0929).toLocaleString();
  }

  get canProceed(): boolean {
    return this.completionPercent >= 100;
  }

  get selectedGroup(): LiveTaskGroup | null {
    return this.taskGroups.find((g) => g.id === this.selectedGroupId) || null;
  }

  get completionPercent(): number {
    const tasks = this.taskGroups.flatMap((group) => group.subtasks);
    if (tasks.length === 0) {
      return 0;
    }

    const completed = tasks.filter((task) => task.status === 'Completed').length;
    return Math.round((completed / tasks.length) * 100);
  }

  get visibleSubtasks(): LiveTask[] {
    if (!this.selectedGroup) {
      return [];
    }

    return this.selectedGroup.subtasks;
  }

  selectGroup(groupId: string): void {
    this.selectedGroupId = groupId;
    this.addingTask = false;
    this.editingTask = null;
  }

  toggleTasksExpanded(): void {
    this.tasksExpanded = !this.tasksExpanded;
  }

  getCompletedCount(group: LiveTaskGroup): number {
    return group.subtasks.filter((t) => t.status === 'Completed').length;
  }

  getTotalDays(group: LiveTaskGroup): number {
    return group.subtasks.reduce((sum, t) => sum + (t.days || 0), 0);
  }

  getPhaseStatus(group: LiveTaskGroup): 'active' | 'completed' | 'pending' {
    const total = group.subtasks.length;
    if (total === 0) {
      return 'pending';
    }

    const completed = this.getCompletedCount(group);
    if (completed === total) {
      return 'completed';
    }
    if (completed > 0) {
      return 'active';
    }

    return 'pending';
  }

  toggleAddTask(): void {
    this.addingTask = !this.addingTask;
    if (!this.addingTask) {
      return;
    }

    const today = new Date();
    const start = today.toISOString().split('T')[0];
    const end = new Date(today);
    end.setDate(end.getDate() + 5);

    this.newTask = {
      name: '',
      days: 5,
      startDate: start,
      endDate: end.toISOString().split('T')[0],
      status: 'Pending',
    };
  }

  updateNewTaskDate(field: 'startDate' | 'endDate' | 'days', value: string | number): void {
    if (field === 'startDate') {
      const start = new Date(String(value));
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + this.newTask.days);
        this.newTask.startDate = String(value);
        this.newTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    if (field === 'days') {
      const days = Number(value) || 0;
      this.newTask.days = days;
      if (this.newTask.startDate) {
        const start = new Date(this.newTask.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        this.newTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    this.newTask.endDate = String(value);
    if (this.newTask.startDate) {
      const start = new Date(this.newTask.startDate);
      const end = new Date(this.newTask.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      this.newTask.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  addTask(): void {
    if (!this.selectedGroup || !this.newTask.name.trim()) {
      return;
    }

    this.selectedGroup.subtasks = [
      ...this.selectedGroup.subtasks,
      {
        id: this.nextTaskId++,
        task: this.newTask.name.trim(),
        days: this.newTask.days,
        startDate: this.newTask.startDate,
        endDate: this.newTask.endDate,
        status: this.newTask.status,
        accepted: false,
      },
    ];

    this.addingTask = false;
    this.newTask.name = '';
  }

  cancelAddTask(): void {
    this.addingTask = false;
    this.newTask.name = '';
  }

  startEditing(task: LiveTask, field: 'task' | 'startDate' | 'endDate' | 'days' | 'status'): void {
    this.editingTask = { taskId: task.id, field };
  }

  stopEditing(): void {
    this.editingTask = null;
  }

  updateTaskField(task: LiveTask, field: 'task' | 'startDate' | 'endDate' | 'days' | 'status', value: string | number): void {
    (task as any)[field] = value;

    if (field === 'startDate' || field === 'days') {
      const start = new Date(task.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + Number(task.days || 0));
      task.endDate = end.toISOString().split('T')[0];
      return;
    }

    if (field === 'endDate') {
      const start = new Date(task.startDate);
      const end = new Date(String(value));
      const diffTime = Math.abs(end.getTime() - start.getTime());
      task.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  deleteTask(taskId: number): void {
    if (!this.selectedGroup) {
      return;
    }

    this.selectedGroup.subtasks = this.selectedGroup.subtasks.filter((task) => task.id !== taskId);
    if (this.editingTask?.taskId === taskId) {
      this.editingTask = null;
    }
  }

  handleApproval(task: LiveTask): void {
    task.accepted = !task.accepted;
  }

  updateTaskStatus(task: LiveTask, status: LiveTask['status']): void {
    task.status = status;
  }

  markMilestoneComplete(): void {
    const pendingTask = this.taskGroups
      .flatMap((group) => group.subtasks)
      .find((task) => task.status !== 'Completed');

    if (!pendingTask) {
      return;
    }

    pendingTask.status = 'Completed';
    pendingTask.accepted = true;
  }
}

