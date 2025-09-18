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
import { Connection } from '../../models/connection';
import { AuthService } from '../../authentication/auth.service';
import { InvitationDialogComponent } from './invitation-dialog/invitation-dialog.component';

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
    MatPaginatorModule
  ],
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss']
})
export class ConnectionsComponent implements OnInit, AfterViewInit {
  searchTerm: string = '';
  allUsers: User[] = [];
  dataSource = new MatTableDataSource<User>([]);
  connections: Connection[] = [];
  incomingRequests: Connection[] = [];
  outgoingRequests: Connection[] = [];
  currentUserId: string | null = null;
  displayedColumns: string[] = ['companyName', 'trade', 'name', 'type', 'email', 'phoneNumber', 'constructionType', 'supplierType', 'productsOffered', 'country', 'city', 'action'];
  showInviteMessage = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private connectionService: ConnectionService,
    private userService: UserService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
    public dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user ? user.id : null;
      this.loadAllUsers();
    });
    this.loadConnections();
    this.loadIncomingRequests();
    this.loadOutgoingRequests();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  loadAllUsers(): void {
    this.userService.getAllUsers().subscribe(users => {
      this.allUsers = users.filter(user => user.id !== this.currentUserId);
      this.dataSource.data = this.allUsers;
      this.cdr.detectChanges();
      this.dataSource.paginator = this.paginator;
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
        // Handle successful invitation
        console.log('Invitation sent');
      }
    });
  }

  loadConnections(): void {
    this.connectionService.getConnections().subscribe(connections => {
      this.connections = connections.filter(c => c.status === 'ACCEPTED');
    });
  }

  loadIncomingRequests(): void {
    this.connectionService.getIncomingRequests().subscribe(requests => {
      this.incomingRequests = requests;
    });
  }

  loadOutgoingRequests(): void {
    this.connectionService.getOutgoingRequests().subscribe(requests => {
      this.outgoingRequests = requests;
    });
  }

  sendConnectionRequest(userId: string): void {
    this.connectionService.requestConnection(userId).subscribe(() => {
      console.log('Request sent');
      this.loadOutgoingRequests();
      // Visually indicate that a request has been sent, e.g., disable the button
      const user = this.allUsers.find(u => u.id === userId);
      if (user) {
        // You might want to add a property to the user object to track this
        // For now, we'll just log it. A more robust solution would update the UI.
        console.log(`Connection request sent to ${user.firstName}`);
      }
    });
  }

  acceptConnectionRequest(connectionId: string): void {
    this.connectionService.acceptConnection(connectionId).subscribe(() => {
      console.log('Request accepted');
      this.loadConnections();
      this.loadIncomingRequests();
    });
  }

  declineConnectionRequest(connectionId: string): void {
    this.connectionService.declineConnection(connectionId).subscribe(() => {
      console.log('Request declined');
      this.loadIncomingRequests();
    });
  }
}
