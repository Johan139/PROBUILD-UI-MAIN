import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TeamManagementService } from '../../../services/team-management.service';
import { PERMISSIONS } from '../../../data/permissions';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@Component({
  selector: 'app-manage-permissions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCheckboxModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './manage-permissions-dialog.component.html',
  styleUrl: './manage-permissions-dialog.component.scss'
})
export class ManagePermissionsDialogComponent implements OnInit {
  permissionsForm: FormGroup;
  permissions = PERMISSIONS;
  teamMemberName: string;
  teamMemberRole: string;

  constructor(
    public dialogRef: MatDialogRef<ManagePermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teamMemberId: string, teamMemberName: string, teamMemberRole: string },
    private fb: FormBuilder,
    private teamManagementService: TeamManagementService
  ) {
    this.teamMemberName = this.data.teamMemberName;
    this.teamMemberRole = this.data.teamMemberRole;
    const formControls = this.permissions.reduce((acc, permission) => {
      acc[permission.key] = new FormControl(false);
      return acc;
    }, {});
    this.permissionsForm = this.fb.group(formControls);
  }

  ngOnInit(): void {
    this.teamManagementService.getPermissions(this.data.teamMemberId).subscribe(currentPermissions => {
      const newValues = {};
      this.permissions.forEach(permission => {
        newValues[permission.key] = currentPermissions.includes(permission.key);
      });
      this.permissionsForm.patchValue(newValues);
    });
  }

  save(): void {
    const selectedPermissions = Object.keys(this.permissionsForm.value)
      .filter(key => this.permissionsForm.value[key]);
    this.teamManagementService.updatePermissions(this.data.teamMemberId, selectedPermissions)
      .subscribe(() => this.dialogRef.close(true));
  }

  close(): void {
    this.dialogRef.close();
  }
}
