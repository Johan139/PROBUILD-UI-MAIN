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
import { combineLatest, of, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { LoaderComponent } from '../../loader/loader.component';
import { UserService } from '../../services/user.service';
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
    ]
})
export class ArchiveComponent implements OnInit {
  archivedNotes: any[] = [];
  archivedJobs: any[] = [];
  isLoading = true;
  displayedColumns: string[] = ['project', 'task', 'created', 'status', 'view'];
  jobDisplayedColumns: string[] = ['projectName', 'jobType', 'status', 'completionDate'];
  private userId: string | null = null;
  openingNoteId: string | null = null;

  constructor(
    private noteService: NoteService,
    private jobsService: JobsService,
    private dialog: MatDialog,
    private authService: AuthService,
    private userService: UserService,
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
    this.openingNoteId = note.notes[0].id;
    const userIds = [...new Set(note.notes.map((n: any) => n.createdByUserId))].filter(id => !!id) as string[];
    if (userIds.length === 0) {
      this.openDialogWithUserNames(note, new Map<string, string>());
      return;
    }

    const userRequests = userIds.map(id => this.userService.getUserById(id));

    forkJoin(userRequests).subscribe(users => {
      const userNames = new Map<string, string>();
      users.forEach(user => {
        if (user) {
          userNames.set(user.id, `${user.firstName} ${user.lastName}`);
        }
      });
      this.openDialogWithUserNames(note, userNames);
    });
  }

  openDialogWithUserNames(note: any, userNames: Map<string, string>) {
    const dialogRef = this.dialog.open(NoteDetailDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      data: { ...note, userNames, isArchived: true }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.openingNoteId = null;
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
