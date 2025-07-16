import { Injectable } from '@angular/core';
import { TimelineGroup, TimelineTask } from '../../../components/timeline/timeline.component';
import { ForecastDay } from '../../../services/weather.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherImpactService {

  // List of task categories affected by rain, based on Demo/weather-impact.txt
  private readonly RAIN_AFFECTED_CATEGORIES = [
    'site preparation', 'excavation', 'foundation', 'concrete',
    'framing', 'structural carpentry', 'roof installation', 'masonry',
    'bricklaying', 'exterior finishes', 'waterproofing', 'damp proofing',
    'window installation', 'door installation', 'landscaping', 'exterior works',
    '1. Pre-construction', '2. Site preparation', '3. Excavation',
    '4. Foundation', '5. Concrete work', '6. Framing', '7. Roofing',
    '8. Exterior finishes', '9. Interior finishes', '10. Landscaping',
    '11. Final inspection', '12. Handover'
  ];

  constructor() { }

  public applyWeatherImpact(taskGroups: TimelineGroup[], dailyForecasts: ForecastDay[]): TimelineGroup[] {
    if (!dailyForecasts || dailyForecasts.length === 0) {
      return taskGroups;
    }

    return taskGroups.map(group => {
      let groupHasWarning = false;
      const warningMessages: string[] = [];

      group.subtasks.forEach(task => {
        const taskNameLower = task.name.toLowerCase();
        const isAffected = this.RAIN_AFFECTED_CATEGORIES.some(cat => taskNameLower.includes(cat));

        if (isAffected) {
          const taskStartDate = new Date(task.start);
          const taskEndDate = new Date(task.end);

          const affectedDays = dailyForecasts.filter(day => {
            const forecastDate = new Date(day.date);
            const isRainy = day.condition.toLowerCase().includes('rain') || day.precipitationProbability > 50;
            return forecastDate >= taskStartDate && forecastDate <= taskEndDate && isRainy;
          });

          if (affectedDays.length > 0) {
            task.hasWeatherWarning = true;
            const warning = `Task '${task.name}' may be delayed due to rain forecast on ${affectedDays.length} day(s).`;
            task.weatherWarningMessage = warning;
            if (!warningMessages.includes(warning)) {
              warningMessages.push(warning);
            }
            groupHasWarning = true;
          }
        }
      });

      if (groupHasWarning) {
        group.hasWeatherWarning = true;
        group.weatherWarningMessage = warningMessages.join('\n');
      }

      return group;
    });
  }
}
