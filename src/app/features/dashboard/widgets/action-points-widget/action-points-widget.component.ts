import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { UserService } from '../../../../services/user.service';
import { NoteDetailDialogComponent } from '../../../../shared/dialogs/note-detail-dialog/note-detail-dialog.component';
import { filter, forkJoin, of, switchMap, take } from 'rxjs';
import { AuthService } from '../../../../authentication/auth.service';
import { NoteService } from '../../../jobs/services/note.service';

@Component({
  selector: 'app-action-points-widget',
  standalone: true,
  templateUrl: './action-points-widget.component.html',
  styleUrls: ['./action-points-widget.component.scss'],
  imports: [
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatTableModule,
    MatButtonModule,
    MatTooltipModule,
    MatIconModule,
  ],
})
export class ActionPointsWidgetComponent {
  @Input() notes: any[] = [];

  openingNoteId: string | null = null;
  isLoading = false;

  constructor(
    private dialog: MatDialog,
    private userService: UserService,
    private authService: AuthService,
    private noteService: NoteService,
  ) {}

  getStatusClass(note: any): string {
    return (note.status || 'pending').toLowerCase();
  }

  openNoteDialog(note: any) {
    this.openingNoteId = note.id;

    // Get ALL notes (could be an array)
    const allNotes = note.notes || [note];

    // Extract ALL unique user IDs from ALL notes
    const allUserIds: string[] = Array.from(
      new Set(
        allNotes
          .map((n: any) => n.createdByUserId)
          .filter(
            (id: any): id is string => typeof id === 'string' && id.length > 0,
          ),
      ),
    );

    if (allUserIds.length === 0) {
      this.openDialogWithUserNames(note, new Map());
      return;
    }

    // Fetch ALL users at once
    forkJoin(
      allUserIds.map((id) => this.userService.getUserById(id)),
    ).subscribe((users) => {
      const userNames = new Map<string, string>();
      users.forEach((user) => {
        if (user) {
          userNames.set(user.id, `${user.firstName} ${user.lastName}`);
        }
      });
      this.openDialogWithUserNames(note, userNames);
    });
  }

  private openDialogWithUserNames(note: any, userNames: Map<string, string>) {
    const allNotes = note.notes || [note];

    // Explicitly type each step
    const userIds: string[] = allNotes
      .map((n: any) => n.createdByUserId)
      .filter(
        (id: any): id is string => typeof id === 'string' && id.length > 0,
      );

    const allUserIds: string[] = Array.from(new Set(userIds));

    const userNameMap = new Map(userNames);

    allUserIds.forEach((id: string) => {
      if (!userNameMap.has(id)) {
        userNameMap.set(id, 'Unknown User');
      }
    });

    const groupData = {
      jobSubtaskId: note.jobSubtaskId,
      jobId: note.jobId,
      subtaskName: note.subtaskName || 'Task',
      projectName: note.projectName || 'Project',
      createdAt: note.createdAt,
      notes: allNotes,
      userNames: userNameMap,
      isArchived: note.archived || false,
    };

    const dialogRef = this.dialog.open(NoteDetailDialogComponent, {
      width: '80vw',
      maxWidth: '900px',
      maxHeight: '100vh',
      panelClass: 'custom-dialog-container',
      data: groupData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      this.openingNoteId = null;
      if (result === true) {
        this.refreshNotes();
      }
    });
  }

  private refreshNotes() {
    this.isLoading = true;

    this.authService.currentUser$
      .pipe(
        filter(Boolean),
        take(1),
        switchMap((user) => {
          if (user.inviterId && this.authService.hasPermission('14')) {
            return this.noteService.getNotesForAssignedJobs(user.id);
          }
          if (!user.inviterId) {
            return this.noteService.getNotesByUserId(user.id);
          }
          return of([]);
        }),
      )
      .subscribe({
        next: (notes) => {
          this.notes = notes;
          this.isLoading = false;
        },
        error: () => (this.isLoading = false),
      });
  }
}
