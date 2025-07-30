import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { JobDocument } from '../../../models/JobDocument';
import { FileSizePipe } from '../../../features/Documents/filesize.pipe';

@Component({
  selector: 'app-documents-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    FileSizePipe,
  ],
  templateUrl: './documents-dialog.component.html',
  styleUrls: ['./documents-dialog.component.scss']
})
export class DocumentsDialogComponent {
  @Input() documents: JobDocument[] = [];
  @Output() viewDocument = new EventEmitter<JobDocument>();
  @Output() confirm = new EventEmitter<void>();

  constructor(
    public dialogRef: MatDialogRef<DocumentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { documents: JobDocument[] }
  ) {
    if (data && data.documents) {
      this.documents = data.documents;
    }
  }

  onView(document: JobDocument): void {
    this.viewDocument.emit(document);
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
