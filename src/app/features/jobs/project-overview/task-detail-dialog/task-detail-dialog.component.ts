import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LucideAngularModule, MapPin, Camera, CheckCircle2, PlayCircle, X } from 'lucide-angular';
import { Subtask } from '../../../../models/subtask';

@Component({
  selector: 'app-task-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatCheckboxModule,
    LucideAngularModule,
  ],
  templateUrl: './task-detail-dialog.component.html',
  styleUrls: ['./task-detail-dialog.component.scss'],
})
export class TaskDetailDialogComponent implements OnInit {
  task: Subtask;
  editMode = false;

  // Icons
  MapPin = MapPin;
  Camera = Camera;
  CheckCircle2 = CheckCircle2;
  PlayCircle = PlayCircle;
  X = X;

  constructor(
    public dialogRef: MatDialogRef<TaskDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { task: Subtask; isOwner: boolean }
  ) {
    // Clone to avoid direct mutation until save
    this.task = JSON.parse(JSON.stringify(data.task));

    // Initialize complex fields if missing (Mocking for now if not present)
    if (!this.task.materials) this.task.materials = ['Material 1', 'Material 2'];
    if (!this.task.checklist) this.task.checklist = [
        { item: 'Check item 1', done: false },
        { item: 'Check item 2', done: true }
    ];
    if (!this.task.photos) this.task.photos = [];
    if (!this.task.description) this.task.description = 'No description provided.';
    if (!this.task.location) this.task.location = 'Site Location';
  }

  ngOnInit(): void {}

  toggleEdit() {
    this.editMode = !this.editMode;
  }

  save() {
    this.dialogRef.close(this.task);
  }

  close() {
    this.dialogRef.close();
  }

  getStatusColor(status: string): string {
    const s = status?.toLowerCase() || '';
    if (s === 'completed') return 'text-success';
    if (s === 'in-progress' || s === 'active') return 'text-warning'; // or blue/bidding color
    return 'text-muted';
  }

  addMaterial() {
    this.task.materials?.push('');
  }

  removeMaterial(index: number) {
    this.task.materials?.splice(index, 1);
  }

  trackByIndex(index: number, obj: any): any {
    return index;
  }
}
