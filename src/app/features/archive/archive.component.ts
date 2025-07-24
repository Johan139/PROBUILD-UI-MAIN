import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { NoteService } from '../jobs/services/note.service';
import { NoteDetailDialogComponent } from '../../shared/dialogs/note-detail-dialog/note-detail-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';

import { LoaderComponent } from '../../loader/loader.component';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-archive',
  templateUrl: './archive.component.html',
  styleUrls: ['./archive.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatButtonModule,
    DatePipe,
    LoaderComponent,
    MatCardModule,
  ],
})
export class ArchiveComponent implements OnInit {
  archivedNotes: any[] = [];
  isLoading = true;
  displayedColumns: string[] = ['project', 'task', 'created', 'status', 'view'];

  constructor(
    private noteService: NoteService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadArchivedNotes();
  }

  loadArchivedNotes(): void {
    this.isLoading = true;
    this.noteService.getArchivedNotes().subscribe({
      next: (notes) => {
        this.archivedNotes = notes;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  openNoteDetail(note: any): void {
    this.dialog.open(NoteDetailDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      data: { notes: [note] }
    });
  }

  getStatus(note: any): string {
    if (note.approved) return 'Approved';
    if (note.rejected) return 'Rejected';
    return 'Archived';
  }
}
