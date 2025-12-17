import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/user';
import { UserAddress } from '../models/userAddress';

const BASE_URL = `${environment.BACKEND_URL}/Account`;

@Injectable({
  providedIn: 'root',
})
export class UserService {
  constructor(private httpClient: HttpClient) {}

  getUserById(id: string): Observable<User> {
    return this.httpClient
      .get<User[]>(`${BASE_URL}/byUserId/${id}`)
      .pipe(map((users) => users[0]));
  }

  getUserAddress(): Observable<UserAddress> {
    return this.httpClient.get<UserAddress>(`${BASE_URL}/address`);
  }

  getUserQuotes() {}

  searchUsers(searchTerm: string): Observable<User[]> {
    return this.httpClient.get<User[]>(
      `${BASE_URL}/search?term=${encodeURIComponent(searchTerm)}`,
    );
  }

  getAllUsers(): Observable<User[]> {
    return this.httpClient.get<User[]>(`${BASE_URL}/users`);
  }

  getUserBids() {}

  getUserProjects(userId: any) {}

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
