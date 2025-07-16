import { Injectable } from '@angular/core';
import { TimelineGroup, TimelineTask } from '../../../components/timeline/timeline.component';
import { ForecastDay } from '../../../services/weather.service';

@Injectable({
  providedIn: 'root'
})
export class WeatherImpactService {

  // List of task categories affected by rain
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
    console.log('Processing weather impact for tasks:', JSON.stringify(taskGroups, null, 2));
    console.log('Using weather forecast:', JSON.stringify(dailyForecasts, null, 2));
    if (!dailyForecasts || dailyForecasts.length === 0) {
      return taskGroups;
    }

    return taskGroups.map(group => {
      let groupHasWarning = false;
      const warningMessages: string[] = [];

      group.subtasks.forEach(task => {
        const taskNameLower = task.name.toLowerCase();
        const isAffected = this.RAIN_AFFECTED_CATEGORIES.some(cat => taskNameLower.includes(cat));

        console.log(`Checking task: '${task.name}' (Start: ${task.start}, End: ${task.end}) - Weather-sensitive: ${isAffected}`);

        if (isAffected) {
          const taskStartDate = new Date(task.start);
          taskStartDate.setHours(0, 0, 0, 0);
          const taskEndDate = new Date(task.end);
          taskEndDate.setHours(0, 0, 0, 0);
          const taskYear = taskStartDate.getFullYear();

          const affectedDays = dailyForecasts.filter(day => {
            const forecastDate = new Date(`${day.date} ${taskYear}`);
            forecastDate.setHours(0, 0, 0, 0);

            const isAdverse = day.condition.toLowerCase().includes('rain') ||
                              day.condition.toLowerCase().includes('thunderstorm') ||
                              day.precipitationProbability > 50;

            const withinRange = forecastDate >= taskStartDate && forecastDate <= taskEndDate;

            if (withinRange) {
              console.log(`  - Checking forecast for ${day.date}: Condition='${day.condition}', Precip.=${day.precipitationProbability}%. Is adverse? ${isAdverse}`);
            }
            return withinRange && isAdverse;
          });

          if (affectedDays.length > 0) {
            task.hasWeatherWarning = true;
            const firstAffectedDay = affectedDays[0];
            task.weatherWarningMessage = `Potential delay due to ${firstAffectedDay.condition}.`;
            task.weatherIconUrl = firstAffectedDay.iconUrl;
            const warning = `Task '${task.name}' may be delayed due to rain forecast on ${affectedDays.length} day(s).`;
            if (!warningMessages.includes(warning)) {
              warningMessages.push(warning);
            }
            groupHasWarning = true;
          } else {
            task.hasWeatherWarning = false;
          }
        } else {
          task.hasWeatherWarning = false;
        }
        console.log(`  => Final decision for '${task.name}': hasWeatherWarning = ${task.hasWeatherWarning}`);
      });

      if (groupHasWarning) {
        group.hasWeatherWarning = true;
        group.weatherWarningMessage = warningMessages.join('\n');
      }

      return group;
    });
  }
}
