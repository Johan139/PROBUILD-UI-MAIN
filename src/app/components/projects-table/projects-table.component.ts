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
    'progress',
    'status',
    'actions',
  ];
  dataSource = new MatTableDataSource<Project>([]);

  @ViewChild(MatSort) sort!: MatSort;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['projects']) {
      this.dataSource.data = this.projects;
    }
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
  }
}
