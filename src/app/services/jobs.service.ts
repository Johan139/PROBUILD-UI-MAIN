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

  createJob(jobForm: any, addressModel: any) {
    this.httpClient.post(`${BASE_URL}/Jobs`, { job: jobForm, address: addressModel });
  }

  updateJob(jobData: any, id: any): Observable<any> {
    return this.httpClient.post<any>(BASE_URL+'/'+id, jobData,{headers:{'Content-Type': 'application/json'}});
  }

  getAllJobsByUserId(userId: string): Observable<any> {
    return this.httpClient.get(BASE_URL+'/userId/'+userId, {headers:{'Content-Type': 'application/json'}})
  }

  getAssignedJobsForTeamMember(userId: string): Observable<any> {
    return this.httpClient.get(`${environment.BACKEND_URL}/Jobs/assigned/${userId}`, {headers:{'Content-Type': 'application/json'}})
  }

  getAssignedJobs(userId: string): Observable<any> {
    return this.httpClient.get(`${environment.BACKEND_URL}/JobAssignment/GetAssignedUsers/${userId}`, {headers:{'Content-Type': 'application/json'}})
  }

  getSubtasks(jobId: number) {
    return this.httpClient.get<any[]>(`${BASE_URL}/subtasks/${jobId}`);
  }

  // Updated to use documentId instead of blobUrl
  downloadJobDocument(documentId: number): Observable<Blob> {
    return this.httpClient.get(`${BASE_URL}/download/${documentId}`, { responseType: 'blob' });
  }

  downloadJobDocumentFile(fileUrl: string): Observable<Blob> {
    return this.httpClient.get(`${BASE_URL}/downloadFile?fileUrl=`+ fileUrl, {
      responseType: 'blob'
    });
  }

  downloadNoteDocument(documentId: number): Observable<Blob> {
    return this.httpClient.get(`${BASE_URL}/downloadNote/${documentId}`, { responseType: 'blob' });
  }

  getJobDocuments(jobId: string): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/documents/` +jobId);
  }

  getAllJobs() {
    this.httpClient.get(BASE_URL)
  }

  saveSubtasks(subtaskList: any[], userId: string | null): Observable<any> {
    return this.httpClient.post(`${BASE_URL}/subtask`, {subtasks:subtaskList,userId:userId}, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getJobSubtasks(jobId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/subtasks/${jobId}`);
  }

  getSpecificJob(jobId: any):  Observable<any>  {
    return this.httpClient.get(BASE_URL+'/Id/' +jobId)
  }

  GetBillOfMaterials(jobId: any):  Observable<any>  {
    return this.httpClient.get(BASE_URL+'/processing-results/' +jobId)
  }

  GetBillOfMaterialsStatus(jobId: any):  Observable<any>  {
    return this.httpClient.get(BASE_URL+'processing-results/' +jobId)
  }

  setJobCard(jobForm:any){
    this.jobQuote = jobForm;
  }

  getJobCard(){
    return this.jobQuote;
  }

  archiveJob(jobId: number): Observable<void> {
    return this.httpClient.put<void>(`${BASE_URL}/${jobId}/archive`, {});
  }

  getArchivedJobs(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/archived`);
  }

  getDashboardJobs(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${BASE_URL}/dashboard`);
  }

  archiveNote(noteId: number): Observable<any> {
    return this.httpClient.post(`${BASE_URL}/notes/${noteId}/archive`, {});
  }

  getArchivedNotes(userId: string): Observable<any> {
    return this.httpClient.get(`${BASE_URL}/notes/archived/${userId}`);
  }
}
