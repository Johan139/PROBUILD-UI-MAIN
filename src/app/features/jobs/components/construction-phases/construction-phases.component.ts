import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubtaskService } from '../../services/subtask.service';
import { Subtask } from '../../../../state/subtasks.state';
import { LucideAngularModule } from 'lucide-angular';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-construction-phases',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LucideAngularModule,
    MatButtonModule,
    MatCheckboxModule
  ],
  templateUrl: './construction-phases.component.html',
  styleUrls: ['./construction-phases.component.scss']
})
export class ConstructionPhasesComponent implements OnInit, OnChanges {
  @Input() groups: any[] = [];
  @Input() isProjectOwner: boolean = false;

  selectedGroup: any | null = null;
  tasksExpanded: boolean = true;
  addingTask: boolean = false;

  newTask = {
    name: '',
    days: 5,
    startDate: '',
    endDate: '',
    status: 'Pending'
  };

  editingTask: {
    groupId: string;
    taskId: number;
    field: 'startDate' | 'endDate' | 'name' | 'days' | 'status';
  } | null = null;

  deleteConfirm: { group: any; task: Subtask; index: number } | null = null;

  constructor(
    public subtaskService: SubtaskService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (this.groups && this.groups.length > 0) {
      this.selectedGroup = this.groups[0];
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['groups'] && this.groups && this.groups.length > 0 && !this.selectedGroup) {
      this.selectedGroup = this.groups[0];
    } else if (changes['groups'] && this.selectedGroup) {
        // Keep selection if possible
        const found = this.groups.find(g => g.title === this.selectedGroup.title);
        if (found) {
            this.selectedGroup = found;
        }
    }
  }

  selectGroup(group: any) {
    this.selectedGroup = group;
  }

  toggleTasksExpanded() {
    this.tasksExpanded = !this.tasksExpanded;
  }

  getVisibleSubtasks(group: any): Subtask[] {
    return this.subtaskService.getVisibleSubtasks(group);
  }

  getCompletedCount(group: any): number {
    const tasks = this.getVisibleSubtasks(group);
    return tasks.filter(t => t.status === 'Completed').length;
  }

  getTotalCount(group: any): number {
    return this.getVisibleSubtasks(group).length;
  }

  getTotalDays(group: any): number {
    const tasks = this.getVisibleSubtasks(group);
    return tasks.reduce((sum, t) => sum + (t.days || 0), 0);
  }

  getPhaseStatus(group: any): 'active' | 'completed' | 'pending' {
    const total = this.getTotalCount(group);
    if (total === 0) return 'pending';
    const completed = this.getCompletedCount(group);

    if (completed === total) return 'completed';
    if (completed > 0) return 'active';

    return 'pending';
  }

  toggleAddTask() {
    this.addingTask = !this.addingTask;
    if (this.addingTask) {
       // Pre-fill dates based on group or today
       const today = new Date();
       const start = today.toISOString().split('T')[0];
       const days = 5;
       const end = new Date(today);
       end.setDate(end.getDate() + days);
       const endStr = end.toISOString().split('T')[0];

       this.newTask = {
         name: '',
         days: days,
         startDate: start,
         endDate: endStr,
         status: 'Pending'
       };
    }
  }

  updateNewTaskDate(field: 'startDate' | 'endDate' | 'days', value: any) {
    if (field === 'startDate') {
        const start = new Date(value);
        if (!isNaN(start.getTime())) {
            const end = new Date(start);
            end.setDate(end.getDate() + this.newTask.days);
            this.newTask.startDate = value;
            this.newTask.endDate = end.toISOString().split('T')[0];
        }
    } else if (field === 'days') {
        const days = parseInt(value) || 0;
        this.newTask.days = days;
        if (this.newTask.startDate) {
            const start = new Date(this.newTask.startDate);
            const end = new Date(start);
            end.setDate(end.getDate() + days);
            this.newTask.endDate = end.toISOString().split('T')[0];
        }
    } else if (field === 'endDate') {
        const end = new Date(value);
        this.newTask.endDate = value;
        if (this.newTask.startDate) {
            const start = new Date(this.newTask.startDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            this.newTask.days = diffDays;
        }
    }
  }

  addTask() {
    if (!this.selectedGroup || !this.newTask.name.trim()) return;

    this.subtaskService.addSubtask(this.selectedGroup, {
        task: this.newTask.name,
        days: this.newTask.days,
        startDate: this.newTask.startDate,
        endDate: this.newTask.endDate,
        status: this.newTask.status
    });

    this.snackBar.open('Task added successfully', 'Close', { duration: 3000 });
    this.addingTask = false;
    this.newTask.name = ''; // Reset
  }

  cancelAddTask() {
    this.addingTask = false;
    this.newTask.name = ''; // Reset
  }

  deleteTask(group: any, index: number) {
      const realIndex = group.subtasks.findIndex((t: Subtask) => t === this.getVisibleSubtasks(group)[index]);
      if (realIndex !== -1) {
          this.subtaskService.deleteSubtask(group, realIndex);
      }
  }

  // Inline editing logic
  startEditing(group: any, task: Subtask, field: any) {
    if (!this.isProjectOwner) return;
    this.editingTask = { groupId: group.title, taskId: task.id, field };
  }

  stopEditing() {
    this.editingTask = null;
  }

  // Handling changes for inline edits
  updateTaskField(group: any, task: Subtask, field: string, value: any) {
      // Update local model
      (task as any)[field] = value;

      // If date/days changed, recalculate
      if (field === 'days' || field === 'startDate') {
           const realIndex = group.subtasks.indexOf(task);
           if (realIndex !== -1) {
               this.subtaskService.updateSubtaskDates(group, realIndex);
           }
      }
      this.snackBar.open('Task updated', 'Close', { duration: 2000 });
  }

  handleApproval(group: any, task: Subtask) {
      if (!this.isProjectOwner) return;
      task.accepted = !task.accepted;
      this.snackBar.open(task.accepted ? 'Task approved' : 'Task approval revoked', 'Close', { duration: 2000 });
  }
}
