import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleDisplayPipe } from './pipes/role-display.pipe';

@NgModule({
  declarations: [
    RoleDisplayPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    RoleDisplayPipe
  ]
})
export class SharedModule { }
