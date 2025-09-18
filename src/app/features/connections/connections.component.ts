import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { ConnectionService } from '../../services/connection.service';
import { UserService } from '../../services/user.service';
import { User } from '../../models/user';
import { Connection } from '../../models/connection';
import { AuthService } from '../../authentication/auth.service';

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
    MatTableModule
  ],
  templateUrl: './connections.component.html',
  styleUrls: ['./connections.component.scss']
})
export class ConnectionsComponent implements OnInit {
  searchTerm: string = '';
  searchResults: User[] = [];
  connections: Connection[] = [];
  incomingRequests: Connection[] = [];
  outgoingRequests: Connection[] = [];
  currentUserId: string | null = null;
  displayedColumns: string[] = ['companyName', 'trade', 'name', 'type', 'email', 'phoneNumber', 'constructionType', 'supplierType', 'productsOffered', 'country', 'city', 'action'];

  constructor(
    private connectionService: ConnectionService,
    private userService: UserService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUserId = user ? user.id : null;
    });
    this.loadConnections();
    this.loadIncomingRequests();
    this.loadOutgoingRequests();
  }

  searchUsers(): void {
    if (this.searchTerm.trim()) {
      this.userService.searchUsers(this.searchTerm).subscribe(results => {
        this.searchResults = results.filter(user => user.id !== this.currentUserId);
      });
    } else {
      this.searchResults = [];
    }
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
