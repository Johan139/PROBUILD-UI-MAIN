import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Job as JobModel } from '../../../models/job';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Project } from '../../../models/project';


@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './project-card.component.html',
  styleUrls: ['./project-card.component.scss']
})
export class ProjectCardComponent {
  @Input() project!: Project;
  @Output() onView = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<number>();
  @Output() onDelete = new EventEmitter<number>();
  @Output() onActivate = new EventEmitter<number>();
  @Output() onArchive = new EventEmitter<number>();
  @Output() onUploadThumbnail = new EventEmitter<{ jobId: number, file: File }>();

  constructor(private snackBar: MatSnackBar) {}

  statusColors = {
    BIDDING: "bg-blue-500",
    LIVE: "bg-green-500",
    DRAFT: "bg-gray-500",
    FAILED: "bg-red-500",
    DISCARD: "bg-purple-500",
    NEW: "bg-yellow-500",
  };

  statusLabels = {
    BIDDING: "Bidding Phase",
    LIVE: "Live Project",
    DRAFT: "Preliminary",
    FAILED: "Failed",
    DISCARD: "Discarded",
    NEW: "New",
  };

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const allowedTypes = ['image/png', 'image/jpeg'];
      if (allowedTypes.includes(file.type)) {
        this.onUploadThumbnail.emit({ jobId: this.project.jobId, file: file });
      } else {
        this.snackBar.open('Invalid file type. Please upload a PNG or JPEG file.', 'Close', {
          duration: 3000,
        });
      }
    }
  }
}
