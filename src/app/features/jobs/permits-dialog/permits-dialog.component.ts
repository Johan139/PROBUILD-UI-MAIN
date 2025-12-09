import { Component, Inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Permit } from '../../../models/permit';
import { PermitsService } from '../services/permits.service';
import { ReportService } from '../services/report.service';
import { FileUploadService } from '../../../services/file-upload.service';
import * as uuid from 'uuid';

@Component({
  selector: 'app-permits-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './permits-dialog.component.html',
  styleUrls: ['./permits-dialog.component.scss'],
})
export class PermitsDialogComponent implements OnInit {
  permits: Permit[] = [];
  displayedColumns: string[] = [
    'name',
    'issuingAgency',
    'status',
    'startDate',
    'expirationDate',
    'document',
    'actions',
  ];
  isLoading = false;
  jobId: number;
  editingPermitId: number | null = null;
  newPermit: Partial<Permit> | null = null;
  newPermitFile: File | null = null;

  constructor(
    public dialogRef: MatDialogRef<PermitsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { jobId: number },
    private permitsService: PermitsService,
    private reportService: ReportService,
    public fileUploadService: FileUploadService,
    private snackBar: MatSnackBar,
  ) {
    this.jobId = data.jobId;
  }

  ngOnInit(): void {
    this.loadPermits();
  }

  loadPermits(): void {
    this.isLoading = true;
    this.permitsService.getPermits(this.jobId).subscribe({
      next: (permits) => {
        if (permits.length === 0) {
          this.loadAiSuggestions();
        } else {
          this.permits = permits;
          this.isLoading = false;
        }
      },
      error: (err) => {
        console.error('Error loading permits', err);
        this.isLoading = false;
      },
    });
  }

  loadAiSuggestions(): void {
    this.reportService
      .getPermitsAndApprovalsReport(this.jobId.toString())
      .then((aiPermits) => {
        if (aiPermits.length > 0) {
          // Auto-save AI suggestions so they persist
          this.permitsService.savePermitsBatch(aiPermits).subscribe({
            next: (savedPermits) => {
              this.permits = savedPermits;
              this.isLoading = false;
            },
            error: (err) => {
              console.error('Error saving AI permits', err);
              this.permits = aiPermits; // Show them anyway, even if save failed
              this.isLoading = false;
            },
          });
        } else {
          this.isLoading = false;
        }
      });
  }

  addNewPermit(): void {
    this.newPermit = {
      jobId: this.jobId,
      name: '',
      issuingAgency: '',
      status: 'Pending',
      isAiGenerated: false,
    };
    this.newPermitFile = null;
  }

  onNewPermitFileSelected(event: any): void {
    this.newPermitFile = event.target.files[0];
  }

  saveNewPermit(): void {
    if (!this.newPermit || !this.newPermit.name) return;

    this.isLoading = true;
    this.permitsService.savePermit(this.newPermit as Permit).subscribe({
      next: (savedPermit) => {
        if (this.newPermitFile) {
          const sessionId = uuid.v4();
          this.permitsService
            .uploadPermitDocument(
              this.newPermitFile,
              savedPermit.id!,
              sessionId,
            )
            .subscribe({
              next: (response) => {
                savedPermit.documentId = response.documentId;
                savedPermit.document = {
                  id: response.documentId,
                  fileName: this.newPermitFile!.name,
                  blobUrl: response.url,
                };
                this.finaliseSave(savedPermit);
              },
              error: (err) => {
                console.error('Error uploading new permit document', err);
                this.snackBar.open(
                  'Permit saved, but document upload failed.',
                  'Close',
                  { duration: 3000 },
                );
                this.finaliseSave(savedPermit);
              },
            });
        } else {
          this.finaliseSave(savedPermit);
        }
      },
      error: (err) => {
        console.error('Error adding permit', err);
        this.isLoading = false;
      },
    });
  }

  finaliseSave(permit: Permit): void {
    this.permits.push(permit);
    this.permits = [...this.permits];
    this.newPermit = null;
    this.newPermitFile = null;
    this.isLoading = false;
    this.snackBar.open('Permit added successfully', 'Close', {
      duration: 3000,
    });
  }

  cancelNewPermit(): void {
    this.newPermit = null;
    this.newPermitFile = null;
  }

  editPermit(permit: Permit): void {
    this.editingPermitId = permit.id!;
  }

  saveEdit(permit: Permit): void {
    this.isLoading = true;
    this.permitsService.updatePermit(permit).subscribe({
      next: () => {
        this.editingPermitId = null;
        this.isLoading = false;
        this.snackBar.open('Permit updated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: (err) => {
        console.error('Error updating permit', err);
        this.isLoading = false;
      },
    });
  }

  cancelEdit(): void {
    this.editingPermitId = null;
    this.loadPermits(); // Reload to reset changes
  }

  deletePermit(permit: Permit): void {
    if (confirm(`Are you sure you want to delete "${permit.name}"?`)) {
      this.isLoading = true;
      this.permitsService.deletePermit(permit.id!).subscribe({
        next: () => {
          this.permits = this.permits.filter((p) => p.id !== permit.id);
          this.isLoading = false;
          this.snackBar.open('Permit deleted', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error deleting permit', err);
          this.isLoading = false;
        },
      });
    }
  }

  uploadDocument(permit: Permit, event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.isLoading = true;
      const sessionId = uuid.v4();
      this.permitsService
        .uploadPermitDocument(file, permit.id!, sessionId)
        .subscribe({
          next: (response) => {
            permit.documentId = response.documentId;
            permit.document = {
              id: response.documentId,
              fileName: file.name,
              blobUrl: response.url,
            };
            this.isLoading = false;
            this.snackBar.open('Document uploaded successfully', 'Close', {
              duration: 3000,
            });
          },
          error: (err) => {
            console.error('Error uploading document', err);
            this.isLoading = false;
            this.snackBar.open('Failed to upload document', 'Close', {
              duration: 3000,
            });
          },
        });
    }
  }

  viewDocument(permit: Permit): void {
    if (permit.document?.blobUrl) {
      this.fileUploadService.getFile(permit.document.blobUrl).subscribe((blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      });
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
