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
  groupedPermissions!: { group: string; permissions: { name: string; key: string; group: string; }[]; }[];

  constructor(
    public dialogRef: MatDialogRef<ManagePermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { teamMemberId: string, teamMemberName: string, permissions: string[] },
    private fb: FormBuilder,
    private teamManagementService: TeamManagementService
  ) {
    this.teamMemberName = this.data.teamMemberName;
    const formControls = this.permissions.reduce((acc, permission) => {
      acc[permission.key] = new FormControl(this.data.permissions.includes(permission.key));
      return acc;
    }, {});
    this.permissionsForm = this.fb.group(formControls);
  }

  ngOnInit(): void {
    this.groupedPermissions = this.groupPermissions(this.permissions);
  }

  groupPermissions(permissions: { name: string, key: string, group: string }[]): { group: string, permissions: { name: string, key: string, group: string }[] }[] {
    const groups = permissions.reduce((acc, permission) => {
      const group = permission.group;
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(permission);
      return acc;
    }, {});

    return Object.keys(groups).map(group => ({
      group,
      permissions: groups[group]
    }));
  }

  selectAll(checked: boolean): void {
    Object.keys(this.permissionsForm.controls).forEach(key => {
      const control = this.permissionsForm.get(key);
      if (control) {
        control.setValue(checked);
      }
    });
  }

  save(): void {
    const selectedPermissions = Object.keys(this.permissionsForm.value)
      .filter(key => this.permissionsForm.value[key]);
    this.teamManagementService.updatePermissions(this.data.teamMemberId, selectedPermissions)
      .subscribe(() => this.dialogRef.close(true));
    this.close();
  }

  close(): void {
    this.dialogRef.close();
  }
}
