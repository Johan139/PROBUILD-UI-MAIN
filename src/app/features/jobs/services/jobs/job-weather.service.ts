import { Injectable } from '@angular/core';

import { catchError, tap, throwError } from 'rxjs';
import { Store } from '../../../../store/store.service';
import { SubtasksState } from '../../../../state/subtasks.state';
import { WeatherService } from '../../../../services/weather.service';

@Injectable({
  providedIn: 'root',
})
export class JobWeatherService {
  constructor(
    private weatherService: WeatherService,
    private store: Store<SubtasksState>,
  ) {}

  loadWeather(lat: number, lon: number) {
    return this.weatherService.getWeatherForecast(lat, lon).pipe(
      tap((data) => {
        this.store.setState({
          forecast: data,
          weatherDescription: data[0]?.condition || 'Unavailable',
          weatherError: null,
        });
      }),
      catchError((err) => {
        this.store.setState({
          forecast: [],
          weatherDescription: 'Unavailable',
          weatherError: 'Failed to load weather forecast',
        });

        return throwError(() => err);
      }),
    );
  }
}
