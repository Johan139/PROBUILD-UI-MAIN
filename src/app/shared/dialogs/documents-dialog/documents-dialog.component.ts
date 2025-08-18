import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { JobDocument } from '../../../models/JobDocument';
import { FileSizePipe } from '../../../features/Documents/filesize.pipe';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
  @Output() confirm = new EventEmitter<void>();
  private environment = environment;

  constructor(
    public dialogRef: MatDialogRef<DocumentsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { documents: JobDocument[] },
    private http: HttpClient
  ) {
    if (data && data.documents) {
      this.documents = data.documents;
    }
  }

  onView(document: JobDocument): void {
    this.http.post(`${this.environment.BACKEND_URL}/jobs/view`, { documentUrl: document.blobUrl }, { responseType: 'text' }).subscribe({
      next: (url) => {
        window.open(url, '_blank');
      },
      error: (err) => {
        console.error('Error getting viewable URL', err);
      }
    });
  }

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
