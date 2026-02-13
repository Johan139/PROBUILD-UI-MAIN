import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { formatDate } from '@angular/common';
import { JobsService } from '../../../../services/jobs.service';

@Injectable({
  providedIn: 'root',
})
export class JobNavigationService {
  constructor(
    private jobsService: JobsService,
    private router: Router,
  ) {}

  navigateToJob(notification: any, dateFormat: string = 'dd/MM/yyyy'): void {
    const jobId = notification.jobId || notification.id || notification;

    this.jobsService.getSpecificJob(jobId).subscribe((job) => {
      const parsedDate = new Date(job.desiredStartDate);
      const formattedDate = formatDate(parsedDate, dateFormat, 'en-GB');

      const params = {
        jobId: job.jobId,
        operatingArea: job.operatingArea,
        address: job.address,
        projectName: job.projectName,
        jobType: job.jobType,
        buildingSize: job.buildingSize,
        wallStructure: job.wallStructure,
        wallInsulation: job.wallInsulation,
        roofStructure: job.roofStructure,
        roofInsulation: job.roofInsulation,
        electricalSupply: job.electricalSupply,
        finishes: job.finishes,
        foundation: job.foundation,
        date: formattedDate,
        documents: job.documents,
        latitude: job.latitude,
        longitude: job.longitude,
        biddingType: job.biddingType,
      };

      this.router.navigate(['/view-quote'], { queryParams: params });
    });
  }
}
