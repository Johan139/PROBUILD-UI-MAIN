import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface PermitItem {
  key: string;
  label: string;
  description: string;
  accepts: string;
}

interface PreConstructionTask {
  id: number;
  task: string;
  owner: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'In Progress' | 'Completed';
}

@Component({
  selector: 'app-phase-pre-construction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './phase-pre-construction.component.html',
  styleUrl: './phase-pre-construction.component.scss',
})
export class PhasePreConstructionComponent {
  @Input() projectDetails: any;

  @Output() back = new EventEmitter<void>();
  @Output() discard = new EventEmitter<void>();
  @Output() proceed = new EventEmitter<void>();

  readonly permitItems: PermitItem[] = [
    {
      key: 'building-permit',
      label: 'Building Permit',
      description: 'General building permit from local authority.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'electrical-permit',
      label: 'Electrical Permit',
      description: 'Permit for electrical and panel work.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'plumbing-permit',
      label: 'Plumbing Permit',
      description: 'Permit for plumbing rough-in and fixtures.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'mechanical-permit',
      label: 'Mechanical / HVAC Permit',
      description: 'Permit for mechanical and HVAC systems.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'grading-permit',
      label: 'Grading & Excavation Permit',
      description: 'Permit for grading and excavation activities.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'demolition-permit',
      label: 'Demolition Permit',
      description: 'Permit for demolition/removal work if required.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'fire-permit',
      label: 'Fire Department Permit',
      description: 'Approval for fire safety systems and access.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'environmental-permit',
      label: 'Environmental / Stormwater',
      description: 'Environmental and SWPPP compliance documents.',
      accepts: 'PDF, JPG, PNG',
    },
    {
      key: 'insurance',
      label: 'Insurance Certificates (COI)',
      description: 'GC and trade partner insurance certificates.',
      accepts: 'PDF',
    },
    {
      key: 'bonds',
      label: 'Bond Requirements',
      description: 'Performance/payment bonds where required.',
      accepts: 'PDF',
    },
    {
      key: 'ifc-drawings',
      label: 'IFC Drawings Issued',
      description: 'Issued for construction drawing package.',
      accepts: 'PDF, DWG',
    },
    {
      key: 'utility-clearances',
      label: 'Utility Clearances',
      description: 'Utility locate and clearance confirmations.',
      accepts: 'PDF, JPG, PNG',
    },
  ];

  permitUploads: Record<string, { name: string; date: string }> = {};
  permitNA = new Set<string>();
  activePermitKey: string | null = null;

  scheduleTasks: PreConstructionTask[] = [
    {
      id: 1,
      task: 'Jurisdiction pre-construction meeting',
      owner: 'Project Manager',
      startDate: '2026-03-01',
      endDate: '2026-03-02',
      days: 1,
      status: 'In Progress',
    },
    {
      id: 2,
      task: 'Long-lead procurement lock-in',
      owner: 'Procurement Lead',
      startDate: '2026-03-03',
      endDate: '2026-03-06',
      days: 3,
      status: 'Pending',
    },
    {
      id: 3,
      task: 'Site logistics and access plan sign-off',
      owner: 'Superintendent',
      startDate: '2026-03-04',
      endDate: '2026-03-05',
      days: 1,
      status: 'Completed',
    },
  ];

  addingScheduleTask = false;
  newScheduleTask = {
    task: '',
    owner: '',
    startDate: '',
    endDate: '',
    days: 3,
    status: 'Pending' as PreConstructionTask['status'],
  };
  private nextTaskId = 4;

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

  get completedCount(): number {
    return this.permitItems.filter((i) => this.permitUploads[i.key] || this.permitNA.has(i.key)).length;
  }

  get canProceed(): boolean {
    return this.completedCount === this.permitItems.length;
  }

  get completedScheduleCount(): number {
    return this.scheduleTasks.filter((task) => task.status === 'Completed').length;
  }

  setActivePermitKey(key: string): void {
    this.activePermitKey = key;
  }

  uploadActivePermit(event: Event): void {
    if (!this.activePermitKey) {
      return;
    }

    this.uploadPermit(this.activePermitKey, event);
    this.activePermitKey = null;
  }

  uploadPermit(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.permitUploads[key] = {
      name: file.name,
      date: new Date().toLocaleDateString(),
    };
    this.permitNA.delete(key);
    input.value = '';
  }

  removePermit(key: string): void {
    delete this.permitUploads[key];
  }

  markNA(key: string): void {
    this.removePermit(key);
    this.permitNA.add(key);
  }

  undoNA(key: string): void {
    this.permitNA.delete(key);
  }

  toggleAddScheduleTask(): void {
    this.addingScheduleTask = !this.addingScheduleTask;
    if (!this.addingScheduleTask) {
      return;
    }

    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 3);

    this.newScheduleTask = {
      task: '',
      owner: '',
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      days: 3,
      status: 'Pending',
    };
  }

  updateNewScheduleDates(field: 'startDate' | 'endDate' | 'days', value: string | number): void {
    if (field === 'startDate') {
      const start = new Date(String(value));
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start);
        end.setDate(end.getDate() + this.newScheduleTask.days);
        this.newScheduleTask.startDate = String(value);
        this.newScheduleTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    if (field === 'days') {
      const days = Number(value) || 0;
      this.newScheduleTask.days = days;
      if (this.newScheduleTask.startDate) {
        const start = new Date(this.newScheduleTask.startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + days);
        this.newScheduleTask.endDate = end.toISOString().split('T')[0];
      }
      return;
    }

    this.newScheduleTask.endDate = String(value);
    if (this.newScheduleTask.startDate) {
      const start = new Date(this.newScheduleTask.startDate);
      const end = new Date(this.newScheduleTask.endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      this.newScheduleTask.days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }

  addScheduleTask(): void {
    if (!this.newScheduleTask.task.trim() || !this.newScheduleTask.owner.trim()) {
      return;
    }

    this.scheduleTasks = [
      ...this.scheduleTasks,
      {
        id: this.nextTaskId++,
        task: this.newScheduleTask.task.trim(),
        owner: this.newScheduleTask.owner.trim(),
        startDate: this.newScheduleTask.startDate,
        endDate: this.newScheduleTask.endDate,
        days: this.newScheduleTask.days,
        status: this.newScheduleTask.status,
      },
    ];

    this.addingScheduleTask = false;
  }

  updateScheduleTaskField(
    task: PreConstructionTask,
    field: 'task' | 'owner' | 'startDate' | 'endDate' | 'days' | 'status',
    value: string | number,
  ): void {
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

  removeScheduleTask(taskId: number): void {
    this.scheduleTasks = this.scheduleTasks.filter((task) => task.id !== taskId);
  }
}

