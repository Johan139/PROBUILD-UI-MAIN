import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, startWith, switchMap } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { UserService } from '../../../../services/user.service';
import { User } from '../../../../models/user';

@Component({
  selector: 'app-crm-users-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './crm-users-list.component.html',
  styleUrls: ['./crm-users-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrmUsersListComponent {
  private userService = inject(UserService);
  private router = inject(Router);

  search = new FormControl<string>('', { nonNullable: true });

  displayedColumns: string[] = [
    'name',
    'email',
    'userType',
    'isAdmin',
    'companyName',
    'actions',
  ];

  users$: Observable<User[]> = this.search.valueChanges.pipe(
    startWith(this.search.value),
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((term) => {
      const trimmed = (term || '').trim();
      if (!trimmed) {
        return this.userService.getAllUsers();
      }
      if (trimmed.length < 2) {
        return of([]);
      }
      return this.userService.searchUsers(trimmed);
    }),
  );

  trackById(index: number, item: User) {
    return item.id;
  }

  view(user: User) {
    this.router.navigate(['/crm/users', user.id]);
  }

  fullName(user: User) {
    return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;
  }
}
