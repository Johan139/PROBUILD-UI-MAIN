import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { WeatherService } from '../../../../services/weather.service';
import { MeasurementService } from '../../../../services/measurement.service';

@Component({
  selector: 'app-weather-widget',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule],
  templateUrl: './weather-widget.component.html',
  styleUrls: ['./weather-widget.component.scss'],
})
export class WeatherWidgetComponent implements OnInit {
  forecast: any[] = [];
  weatherError: string | null = null;
  isLoading = true;

  locationLabel = '';
  temperatureUnit: 'C' | 'F' = 'C';

  constructor(
    private weatherService: WeatherService,
    public measurementService: MeasurementService,
  ) {}

  ngOnInit(): void {
    if (!navigator.geolocation) {
      this.weatherError = 'Location not supported by browser';
      const savedUnit = localStorage.getItem('tempUnit') as 'C' | 'F';
      this.temperatureUnit = savedUnit ?? 'C';
      this.isLoading = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        this.resolveLocation(coords.latitude, coords.longitude);

        this.weatherService
          .getWeatherForecast(coords.latitude, coords.longitude)
          .subscribe({
            next: (data: any) => {
              this.forecast = data?.forecast ?? data ?? [];
              this.isLoading = false;
            },
            error: () => {
              this.weatherError = 'Failed to load weather';
              this.isLoading = false;
            },
          });
      },
      () => {
        this.weatherError = 'Location permission denied';
        this.isLoading = false;
      },
    );
  }
  setUnit(unit: 'C' | 'F'): void {
    this.temperatureUnit = unit;
    localStorage.setItem('tempUnit', unit);
  }

  private resolveLocation(lat: number, lon: number): void {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
    )
      .then((res) => res.json())
      .then((data) => {
        const addr = data.address;
        this.locationLabel =
          addr.city || addr.town || addr.village || addr.state || 'Your area';
      })
      .catch(() => {
        this.locationLabel = 'Your area';
      });
  }
}
