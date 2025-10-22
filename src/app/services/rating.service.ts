import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Rating } from '../models/rating';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RatingService {
  private apiUrl = `${environment.BACKEND_URL}/ratings`;

  constructor(private http: HttpClient) { }

  getRatingsForUser(userId: string): Observable<Rating[]> {
    return this.http.get<Rating[]>(`${this.apiUrl}/user/${userId}`);
  }

  addRating(rating: Rating): Observable<Rating> {
    return this.http.post<Rating>(this.apiUrl, rating);
  }
}
