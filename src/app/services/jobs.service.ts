import { Injectable } from '@angular/core';
import {HttpClient} from "@angular/common/http";
import {environment} from "../../environments/environment";
import { Observable } from 'rxjs';

const BASE_URL = `${environment.BACKEND_URL}/Jobs`;

@Injectable({
  providedIn: 'root'
})
export class JobsService {
  private jobQuote: any;

  constructor(private httpClient: HttpClient) { }

  createJob(jobForm:any) {
      this.httpClient.post(BASE_URL, jobForm);
  }

  updateJob(jobData: any, id: any): Observable<any> {
    return this.httpClient.put<any>(BASE_URL+'/'+id, jobData,{headers:{'Content-Type': 'application/json'}});
  }

  getAllJobsByUserId(userId: string): Observable<any> {
    return this.httpClient.get(BASE_URL+'/userId/'+userId, {headers:{'Content-Type': 'application/json'}})
  }

  getAllJobs() {
    this.httpClient.get(BASE_URL)
  }

  getSpecificJob(jobId: any):  Observable<any>  {
    return this.httpClient.get(BASE_URL+'/Id/' +jobId)
  }

  setJobCard(jobForm:any){
    this.jobQuote = jobForm;
  }
  getJobCard(){
    return this.jobQuote;
  }

}
