import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Project } from '../../models/project';
import {
  formatDateDdMmmYyyy,
  formatProjectBuildingAreaDisplay,
  getProjectStatusLabel,
  parseProjectBuildingSizeSqFt,
  parseProjectStartDate,
} from '../../features/my-projects/project-display.utils';

@Component({
  selector: 'app-projects-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './projects-table.component.html',
  styleUrls: ['./projects-table.component.scss'],
})
export class ProjectsTableComponent implements AfterViewInit, OnChanges {
  @Input() projects: Project[] = [];
  @Output() onView = new EventEmitter<number>();
  @Output() onEdit = new EventEmitter<number>();
  @Output() onArchive = new EventEmitter<number>();

  displayedColumns: string[] = [
    'projectName',
    'createdAt',
    'address',
    'startDate',
    'buildingSize',
    'team',
    'progress',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<Project>([]);

  readonly formatProjectDate = formatDateDdMmmYyyy;
  readonly formatProjectArea = formatProjectBuildingAreaDisplay;
  readonly statusLabel = getProjectStatusLabel;

  @ViewChild(MatSort) sort!: MatSort;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.dataSource.data = this.projects;
    }
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.dataSource.sortingDataAccessor = (project, property) => {
      switch (property) {
        case 'createdAt':
          return project.createdAt
            ? new Date(project.createdAt).getTime()
            : 0;
        case 'startDate': {
          const d = parseProjectStartDate(project);
          return d ? d.getTime() : 0;
        }
        case 'buildingSize':
          return parseProjectBuildingSizeSqFt(project) ?? 0;
        case 'team':
          return project.team ?? 0;
        case 'progress':
          return project.progress ?? 0;
        case 'status':
          return getProjectStatusLabel(project.status);
        case 'projectName':
          return project.projectName ?? '';
        case 'address':
          return project.address ?? '';
        default:
          return '';
      }
    };
  }

  startDateDisplay(project: Project): string {
    const d = parseProjectStartDate(project);
    return d ? formatDateDdMmmYyyy(d) : 'TBD';
  }
}
