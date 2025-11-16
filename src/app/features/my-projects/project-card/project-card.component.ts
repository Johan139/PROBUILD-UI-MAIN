import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Job as JobModel } from '../../../models/job';

export interface Project extends JobModel {
  team?: number;
  progress?: number;
  thumbnailUrl?: string;
  budget?: string; // Added for future use
  deadline?: string; // Added for future use
  status: "BIDDING" | "LIVE" | "DRAFT" | "FAILED" | "DISCARD" | "NEW";
}

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
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
    DRAFT: "Draft",
    FAILED: "Failed",
    DISCARD: "Discarded",
    NEW: "New",
  };
}
