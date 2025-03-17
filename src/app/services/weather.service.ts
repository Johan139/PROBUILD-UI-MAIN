import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import {environment} from "../../environments/environment";
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private baseUrl = 'https://api.weatherapi.com/v1/future.json';
  private apiKey = `${environment.API_KEY}`

  constructor(private http: HttpClient) {}

  // Method to get weather data
  getFutureWeather(location: string, date: string): Observable<any> {
    const params = {
      q: location,
      dt: date,
      key: this.apiKey,
    };

    const headers = new HttpHeaders({
      'Accept': 'application/json',
    });

    return this.http.get(this.baseUrl, { headers, params });
  }
}
