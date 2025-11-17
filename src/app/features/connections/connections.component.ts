import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { ConnectionService } from '../../services/connection.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user';
import { AuthService } from '../../authentication/auth.service';
import { InvitationDialogComponent } from './invitation-dialog/invitation-dialog.component';
import { InvitationService } from '../../services/invitation.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SharedModule } from '../../shared/shared.module';
import { LoaderComponent } from "../../loader/loader.component";

export interface ConnectionDto {
  id: string;
  otherUserId?: string;
  otherUserEmail?: string;
  firstName?: string;
  lastName?: string;
  status: string;
  isInSystem: boolean;
  user?: User;
  requesterId?: string;
  receiverId?: string;
}

export interface DisplayUser extends User {
  isInSystem: boolean;
}

@Component({
    selector: 'app-connections',
    standalone: true,
    imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSnackBarModule,
    SharedModule,
    LoaderComponent
],
    templateUrl: './connections.component.html',
    styleUrls: ['./connections.component.scss']
})
export class ConnectionsComponent implements OnInit, AfterViewInit {
  searchTerm: string = '';
  allUsers: User[] = [];
  dataSource = new MatTableDataSource<DisplayUser>([]);
  connectionsDataSource = new MatTableDataSource<ConnectionDto>([]);

  allConnections: ConnectionDto[] = [];
  connections: ConnectionDto[] = [];
  invited: ConnectionDto[] = [];
  currentUserId: string | null = null;
  displayedColumns: string[] = ['companyName', 'trade', 'name', 'type', 'constructionType', 'supplierType', 'productsOffered', 'country', 'city', 'action'];
  connectionsColumns: string[] = ['name', 'email', 'phoneNumber', 'status', 'action'];
  showInviteMessage = false;
  hoveredUserId: string | null = null;
  isLoading = false;

  private paginator!: MatPaginator;
  @ViewChild(MatPaginator) set matPaginator(mp: MatPaginator) {
    this.paginator = mp;
    this.dataSource.paginator = this.paginator;
  }

  constructor(
    private connectionService: ConnectionService,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog,
    private invitationService: InvitationService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.loadConnections();
      }
    });
  }

  ngAfterViewInit() {
    // Now handled by the setter
  }

  loadAllUsers(): void {
    this.userService.getAllUsers().subscribe(users => {
      this.allUsers = users.filter(user => user.id !== this.currentUserId);
      this.loadConnections();
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    const searchTerms = filterValue.trim().toLowerCase().split(/\s+/);

    this.dataSource.filterPredicate = (data: User, filter: string) => {
      const dataStr = Object.values(data).join(' ').toLowerCase();
      return searchTerms.every(term => dataStr.includes(term));
    };

    this.dataSource.filter = filterValue;
    this.showInviteMessage = this.dataSource.filteredData.length === 0 && filterValue.length > 0;

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  openInvitationDialog(): void {
    const dialogRef = this.dialog.open(InvitationDialogComponent, {
      width: '800px',
      data: { email: '' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('[ConnectionsComponent] Invitation dialog closed with result:', result);
        console.log('[ConnectionsComponent] Calling invitationService.inviteUser...');
        this.invitationService.inviteUser(result).subscribe({
          next: (response) => {
            console.log('[ConnectionsComponent] inviteUser call successful:', response);
            this.snackBar.open('Invitation sent successfully!', 'Close', { duration: 3000 });
            console.log('[ConnectionsComponent] Reloading connections...');
            this.loadConnections();
          },
          error: (err) => {
            console.error('[ConnectionsComponent] inviteUser call failed:', err);
            this.snackBar.open(`Error: ${err.error?.message || 'An unknown error occurred'}`, 'Close', { duration: 5000 });
          }
        });
      } else {
        console.log('[ConnectionsComponent] Invitation dialog closed without result.');
      }
    });
  }

  loadConnections(): void {
    this.isLoading = true;
    this.connectionService.getConnections().subscribe((connections: ConnectionDto[]) => {
      this.allConnections = connections;
      console.log('All connections from backend:', this.allConnections);
      this.connections = connections.filter(c => c.isInSystem);
      this.invited = connections.filter(c => !c.isInSystem);
      this.connections.forEach(conn => {
        if (conn.otherUserId) {
          this.userService.getUserById(conn.otherUserId).subscribe(user => {
            conn.user = user;
          });
        }
      });
      this.connectionsDataSource.data = [...this.connections, ...this.invited];
      console.log('Filtered invited users:', this.invited);
      this.userService.getAllUsers().subscribe(users => {
        this.allUsers = users.filter(user => user.id !== this.currentUserId);
        this.updateDataSource();
        this.isLoading = false;
      });
    });
  }

  updateDataSource(): void {
    const displayUsers: DisplayUser[] = this.allUsers.map(u => ({ ...u, isInSystem: true }));
    const invitedUsers: DisplayUser[] = this.invited.map(i => ({
      id: i.id,
      email: i.otherUserEmail || '',
      firstName: i.firstName,
      lastName: i.lastName,
      name: `${i.firstName} ${i.lastName}`,
      isInSystem: false,
      userType: 'Invited',
    } as DisplayUser));

    console.log('Processed invited users for display:', invitedUsers);

    this.dataSource.data = [...displayUsers, ...invitedUsers];
    this.cdr.detectChanges();
    // Now handled by the setter
  }


  sendConnectionRequest(userId: string): void {
    this.connectionService.requestConnection(userId).subscribe({
      next: () => {
        console.log('Request sent');
        this.snackBar.open('Connection request sent.', 'Close', { duration: 3000 });
        this.loadConnections();
      },
      error: (err) => {
        console.error('Failed to send connection request:', err);
        this.snackBar.open(err.error?.message || 'Failed to send request.', 'Close', { duration: 5000 });
      }
    });
  }

  acceptConnectionRequest(connectionId: string): void {
    this.connectionService.acceptConnection(connectionId).subscribe(() => {
      console.log('Request accepted');
      this.loadConnections();
    });
  }

  declineConnectionRequest(connectionId: string): void {
    this.connectionService.declineConnection(connectionId).subscribe(() => {
      console.log('Request declined');
    });
  }
  isRequestSent(userId: string): boolean {
    return this.allConnections.some(c => c.otherUserId === userId && c.status === 'PENDING' && c.requesterId === this.currentUserId);
  }

  isRequestReceived(userId: string): boolean {
    return this.allConnections.some(c => c.otherUserId === userId && c.status === 'PENDING' && c.receiverId === this.currentUserId);
  }

  cancelConnectionRequest(userId: string): void {
    const connection = this.allConnections.find(c => c.otherUserId === userId && c.status === 'PENDING');
    if (connection) {
      this.connectionService.declineConnection(connection.id).subscribe(() => {
        console.log('Request cancelled');
        this.allConnections = this.allConnections.filter(c => c.id !== connection.id);
        this.updateDataSource();
      });
    }
  }

  getConnectionStatus(userId: string): string {
    const connection = this.allConnections.find(c => c.otherUserId === userId);
    if (connection) {
      if (connection.status === 'PENDING') {
        return connection.requesterId === this.currentUserId ? 'Request Sent' : 'Request Received';
      }
        return connection.status;
      }
      return 'Connect';
    }

  removeConnection(connectionId: string): void {
    this.connectionService.declineConnection(connectionId).subscribe(() => {
      console.log('Connection removed');
      this.loadConnections();
    });
  }
}
