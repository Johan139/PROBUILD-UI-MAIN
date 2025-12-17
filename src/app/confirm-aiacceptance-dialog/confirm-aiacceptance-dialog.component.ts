import {
  Component,
  Inject,
  ChangeDetectorRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-ai-acceptance-dialog',
  standalone: true,
  imports: [MatDialogModule, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-aiacceptance-dialog.component.html',
  styleUrls: ['./confirm-aiacceptance-dialog.component.scss']
})
export class ConfirmAIAcceptanceDialogComponent implements OnInit {
  warningMessage: string | null = null;
  disableConfirm = false;

  constructor(
    private dialogRef: MatDialogRef<ConfirmAIAcceptanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    // Set properties first
    this.warningMessage = this.data?.warningMessage || null;
    this.disableConfirm = !!this.data?.disableConfirm;

    // console.log('Dialog data:', {
    //   warningMessage: this.warningMessage,
    //   disableConfirm: this.disableConfirm,
    //   rawData: this.data
    // });

    // Force change detection
    this.cdr.detectChanges();
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
