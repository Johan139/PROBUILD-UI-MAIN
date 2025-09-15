import { Injectable } from '@angular/core';
import { environment } from "../../environments/environment";
import { HttpClient } from "@angular/common/http";
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/user';

const BASE_URL = `${environment.BACKEND_URL}/Account`;

@Injectable({
    providedIn: 'root'
})
export class UserService {

    constructor(private httpClient: HttpClient) {
    }

    getUserById(id: string): Observable<User> {
        return this.httpClient.get<User[]>(`${BASE_URL}/byUserId/${id}`).pipe(
            map(users => users[0])
        );
    }

    getUserQuotes() {
    }

    searchUsers(searchTerm: string): Observable<User[]> {
        return this.httpClient.get<User[]>(`${BASE_URL}/search?term=${searchTerm}`);
    }

    getUserBids() {
    }

    getUserProjects(userId: any) {
    }

}
