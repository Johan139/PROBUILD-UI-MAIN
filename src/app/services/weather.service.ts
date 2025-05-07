import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// Interface for Google Weather API daily forecast response
interface GoogleForecastResponse {
  forecastDays: {
    interval: { startTime: string; endTime: string };
    displayDate: { year: number; month: number; day: number };
    daytimeForecast: {
      weatherCondition: { description: { text: string }; type: string; iconBaseUri: string };
      temperature: { degrees: number; unit: string };
      precipitation: { probability: { percent: number; type: string }; qpf: { quantity: number; unit: string } };
    };
    nighttimeForecast: {
      weatherCondition: { description: { text: string }; type: string; iconBaseUri: string };
      temperature: { degrees: number; unit: string };
      precipitation: { probability: { percent: number; type: string }; qpf: { quantity: number; unit: string } };
    };
    maxTemperature: { degrees: number; unit: string };
    minTemperature: { degrees: number; unit: string };
  }[];
  timeZone: { id: string };
}

// Interface for simplified forecast data to display
export interface ForecastDay {
  date: string; // e.g., "May 1, 2025"
  iconUrl: string; // Weather icon URL
  condition: string; // e.g., "Partly sunny"
  highTemp: number; // Max temperature
  lowTemp: number; // Min temperature
  precipitationProbability: number; // e.g., 10 (%)
}
const BASE_URL = `${environment.BACKEND_URL}/Jobs`;
@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private baseUrl = 'https://weather.googleapis.com/v1/forecast/days:lookup';

  constructor(private httpClient: HttpClient) {}

  getWeatherForecast(lat: number, lon: number): Observable<ForecastDay[]> {
    const url = `${BASE_URL}/weather-forecast?lat=${lat}&lon=${lon}`; // Your backend proxy
    console.log('Calling backend weather endpoint:', url);
  
    return this.httpClient.get<GoogleForecastResponse>(url).pipe(
      map((data) => {
  
        if (!data.forecastDays) {
          throw new Error('No forecast data available');
        }
  
        return data.forecastDays.map((day) => {
          const displayDate = new Date(
            day.displayDate.year,
            day.displayDate.month - 1,
            day.displayDate.day
          );
  
          return {
            date: displayDate.toLocaleDateString('en-US', {
              weekday: 'short',  // e.g., "Thu"
              month: 'short',    // e.g., "May"
              day: 'numeric',    // e.g., "2"
            }),
            iconUrl:
              (day.daytimeForecast.weatherCondition.iconBaseUri
                ? day.daytimeForecast.weatherCondition.iconBaseUri + '.png'
                : 'https://via.placeholder.com/50'),
            condition: this.capitalize(
              day.daytimeForecast.weatherCondition.description.text
            ),
            highTemp: Math.round(day.maxTemperature.degrees),
            lowTemp: Math.round(day.minTemperature.degrees),
            precipitationProbability:
              day.daytimeForecast.precipitation.probability.percent,
          };
        });
      }),
      catchError((err) => {
        return throwError(() => new Error('Unable to fetch weather forecast'));
      })
    );
  }
  
  

  private capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Preserve existing getFutureWeather method for compatibility
  getFutureWeather(location: string, date: string): Observable<any> {
    // Replace with actual implementation if different
    return this.httpClient.get<any>(`https://some-other-api?location=${location}&date=${date}`);
  }
}