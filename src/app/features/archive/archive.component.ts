import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { NoteService } from '../jobs/services/note.service';
import { JobsService } from '../../services/jobs.service';
import { AuthService } from '../../authentication/auth.service';
import { NoteDetailDialogComponent } from '../../shared/dialogs/note-detail-dialog/note-detail-dialog.component';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
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
    MatTabsModule,
  ],
})
export class ArchiveComponent implements OnInit {
  archivedNotes: any[] = [];
  archivedJobs: any[] = [];
  isLoading = true;
  displayedColumns: string[] = ['project', 'task', 'created', 'status', 'view'];
  jobDisplayedColumns: string[] = ['projectName', 'jobType', 'status', 'completionDate'];
  private userId: string | null = null;

  constructor(
    private noteService: NoteService,
    private jobsService: JobsService,
    private dialog: MatDialog,
    private authService: AuthService,
  ) { }

  ngOnInit(): void {
    this.loadArchivedNotes();
    this.loadArchivedJobs();
  }

  loadArchivedJobs(): void {
    this.isLoading = true;
    this.jobsService.getArchivedJobs().subscribe({
      next: (jobs) => {
        this.archivedJobs = jobs;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  loadArchivedNotes(): void {
    this.isLoading = true;
    combineLatest([
      this.authService.currentUser$,
      this.authService.userPermissions$
    ]).pipe(
      switchMap(([user, permissions]) => {
        if (user) {
          this.userId = user.id;
          const isTeamMember = !!user.inviterId;
          const canManageNotes = permissions.includes('manageSubtaskNotes');

          if (isTeamMember && canManageNotes) {
            return this.noteService.getArchivedNotesForAssignedJobs(user.id);
          } else if (!isTeamMember) {
            return this.noteService.getArchivedNotes(user.id);
          }
        }
        return of([]);
      })
    ).subscribe({
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
      data: note
    });
  }

  getStatus(note: any): string {
    if (!note.notes || note.notes.length === 0) {
      return 'Pending';
    }
    const lastNote = note.notes[note.notes.length - 1];
    if (lastNote.archived) {
      return 'Archived';
    }
    if (lastNote.approved) {
      return 'Approved';
    }
    if (lastNote.rejected) {
      return 'Rejected';
    }
    return 'Pending';
  }
}
