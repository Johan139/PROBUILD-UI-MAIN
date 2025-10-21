import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators, FormControl, FormArray } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { startWith, map } from 'rxjs/operators';
import { trades } from '../../../data/registration-data';

@Component({
  selector: 'app-initiate-bidding-dialog',
  templateUrl: './initiate-bidding-dialog.component.html',
  styleUrls: ['./initiate-bidding-dialog.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatChipsModule,
    MatIconModule,
    MatTooltipModule
  ]
})
export class InitiateBiddingDialogComponent implements OnInit {
  form: FormGroup;
  tradeCtrl = new FormControl();
  filteredTrades: Observable<{ value: string; display: string; }[]>;
  selectedTrades: { value: string; display: string; }[] = [];
  allTrades = trades;

  constructor(
    public dialogRef: MatDialogRef<InitiateBiddingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      biddingType: ['PUBLIC', Validators.required],
      requiredSubcontractorTypes: this.fb.array([], Validators.required)
    });

    this.filteredTrades = this.tradeCtrl.valueChanges.pipe(
      startWith(null),
      map((trade: string | null) => trade ? this._filter(trade) : this.allTrades.slice())
    );
  }

  ngOnInit(): void {
  }

  private _filter(value: string): { value: string; display: string; }[] {
    const filterValue = value.toLowerCase();
    return this.allTrades.filter(trade => trade.display.toLowerCase().includes(filterValue));
  }

  remove(trade: { value: string; display: string; }): void {
    const index = this.selectedTrades.indexOf(trade);
    if (index >= 0) {
      this.selectedTrades.splice(index, 1);
      const formArray = this.form.get('requiredSubcontractorTypes') as FormArray;
      formArray.clear();
      this.selectedTrades.forEach(t => formArray.push(new FormControl(t.value)));
    }
  }

  selected(event: any): void {
    const selectedTrade = event.option.value;
    if (!this.selectedTrades.some(t => t.value === selectedTrade.value)) {
      this.selectedTrades.push(selectedTrade);
      const formArray = this.form.get('requiredSubcontractorTypes') as FormArray;
      formArray.push(new FormControl(selectedTrade.value));
    }
    this.tradeCtrl.setValue(null);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
