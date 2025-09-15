import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleDisplayPipe } from './pipes/role-display.pipe';
import { ContractSigningComponent } from '../features/contracts/contract-signing.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    RoleDisplayPipe,
    ContractSigningComponent
  ],
  imports: [
    CommonModule,
    FormsModule
  ],
  exports: [
    RoleDisplayPipe,
    ContractSigningComponent
  ]
})
export class SharedModule { }
