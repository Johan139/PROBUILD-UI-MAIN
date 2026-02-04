import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';

import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import { ArchiveSearchPipe } from './archive-search.pipe';
import { AuthService } from '../../authentication/auth.service';
import { ArchivedItem } from './archive-items-model';
import { ArchiveService } from './archive-service';

@Component({
  selector: 'app-archive',
  standalone: true,
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss'],
  imports: [CommonModule, FormsModule, MatIconModule, ArchiveSearchPipe],
})
export class ArchiveComponent implements OnInit {
  /** All archived items (single source of truth) */
  archivedItems: ArchivedItem[] = [];

  /** UI state */
  searchTerm = '';
  activeFilter: ArchiveFilter = 'projects';

  /** Filter pills */
  filters: {
    key: ArchiveFilter;
    label: string;
    icon: string;
    count: number;
  }[] = [
    { key: 'projects', label: 'Projects', icon: 'work', count: 0 },
    { key: 'quotes', label: 'Quotes', icon: 'request_quote', count: 0 },
    { key: 'invoices', label: 'Invoices', icon: 'receipt', count: 0 },
    { key: 'documents', label: 'Documents', icon: 'description', count: 0 },
    { key: 'jobs', label: 'Job Postings', icon: 'business_center', count: 0 },
    { key: 'tasks', label: 'Tasks', icon: 'check_box', count: 0 },
  ];

  constructor(
    private archiveService: ArchiveService,
    private dialog: MatDialog,
    private authService: AuthService,
  ) {}

  // =====================================================
  // Lifecycle
  // =====================================================
  ngOnInit(): void {
    this.loadArchivedItems();
  }

  // =====================================================
  // Data loading
  // =====================================================
  loadArchivedItems(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) return;

    this.archiveService.getArchivedItems(userId).subscribe((items) => {
      this.archivedItems = items;
      this.updateCounts();
    });
  }

  // =====================================================
  // Counts for filter pills
  // =====================================================
  updateCounts(): void {
    this.filters.find((f) => f.key === 'projects')!.count =
      this.archivedProjects.length;

    this.filters.find((f) => f.key === 'quotes')!.count =
      this.archivedQuotes.length;

    this.filters.find((f) => f.key === 'invoices')!.count =
      this.archivedInvoices.length;

    // These are placeholders for future expansion
    this.filters.find((f) => f.key === 'documents')!.count = 0;
    this.filters.find((f) => f.key === 'jobs')!.count = 0;
    this.filters.find((f) => f.key === 'tasks')!.count = 0;
  }

  // =====================================================
  // Actions
  // =====================================================
  unarchive(item: ArchivedItem): void {
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Restore item',
        message: `Restore "${item.title}"?`,
      },
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;

      this.archiveService
        .unarchive(item.id, item.type)
        .subscribe(() => this.loadArchivedItems());
    });
  }

  delete(item: ArchivedItem): void {
    const ref = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: 'Delete permanently',
        message: 'This cannot be undone. Continue?',
      },
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;

      this.archiveService
        .delete(item.id, item.type)
        .subscribe(() => this.loadArchivedItems());
    });
  }

  emptyArchive(): void {
    console.warn('Empty archive not implemented yet');
  }

  // =====================================================
  // Computed views (used by template)
  // =====================================================
  get archivedProjects(): ArchivedItem[] {
    return this.archivedItems.filter((i) => i.type === 'JOB');
  }

  get archivedQuotes(): ArchivedItem[] {
    return this.archivedItems.filter((i) => i.type === 'QUOTE');
  }

  get archivedInvoices(): ArchivedItem[] {
    return this.archivedItems.filter((i) => i.type === 'INVOICE');
  }

  get filteredItems(): ArchivedItem[] {
    switch (this.activeFilter) {
      case 'projects':
        return this.archivedProjects;
      case 'quotes':
        return this.archivedQuotes;
      case 'invoices':
        return this.archivedInvoices;
      default:
        return [];
    }
  }
}

// =====================================================
// Types
// =====================================================
export type ArchiveFilter =
  | 'projects'
  | 'quotes'
  | 'invoices'
  | 'documents'
  | 'jobs'
  | 'tasks';
