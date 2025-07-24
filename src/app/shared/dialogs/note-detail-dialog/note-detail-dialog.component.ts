import { Component, Inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoteService } from '../../../features/jobs/services/note.service';
import { CommonModule, DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-note-detail-dialog',
  templateUrl: './note-detail-dialog.component.html',
  styleUrls: ['./note-detail-dialog.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatDialogModule, DatePipe, MatFormFieldModule, MatInputModule, FormsModule]
})
export class NoteDetailDialogComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<NoteDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private noteService: NoteService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
  }

  getStatus(note: any): string {
    if (note.archived) {
      return 'Archived';
    }
    if (note.approved) {
      return 'Approved';
    }
    if (note.rejected) {
      return 'Rejected';
    }
    return 'Pending';
  }

  startApproval(note: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Approve Note',
        message: 'Please enter the reason for approval:',
        input: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.noteService.approveNote(note.id, result).subscribe(() => {
          this.dialogRef.close(true);
        });
      }
    });
  }

  rejectNote(note: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Reject Note',
        message: 'Please enter the reason for rejection:',
        input: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.noteService.rejectNote(note.id, result).subscribe(() => {
          this.dialogRef.close(true);
        });
      }
    });
  }

  archiveNote(note: any): void {
    this.noteService.archiveNote(note.id).subscribe(() => {
      this.dialogRef.close(true);
    });
  }

  openDocumentsDialog(data: any): void {
    // This will be handled by the parent component for now
  }

  Close(): void {
    this.dialogRef.close();
  }
}
