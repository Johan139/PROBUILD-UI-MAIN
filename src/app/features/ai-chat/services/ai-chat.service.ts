import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AiChatStateService } from './ai-chat-state.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { Conversation, Prompt } from '../models/ai-chat.models';
import {environment} from "../../../../environments/environment";

const BASE_URL = `${environment.BACKEND_URL}/Chat`;

@Injectable({
  providedIn: 'root'
})
export class AiChatService {
  constructor(
    private http: HttpClient,
    private state: AiChatStateService
  ) { }

  getMyPrompts() {
    this.state.setLoading(true);
    this.http.get<Prompt[]>(`${BASE_URL}/my-prompts`)
      .pipe(
        catchError(err => {
          this.state.setError('Failed to fetch prompts.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(prompts => {
        this.state.setPrompts(prompts);
        this.state.setLoading(false);
      });
  }

  startConversation(initialMessage: string, promptKey: string, blueprintUrls: string[]) {
    this.state.setLoading(true);
    this.http.post(`${BASE_URL}/start`, { initialMessage, promptKey, blueprintUrls })
      .pipe(
        catchError(err => {
          this.state.setError('Failed to start conversation.');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(conversation => {
        // Assuming the conversation object is returned and needs to be handled
        this.state.setLoading(false);
      });
  }

  sendMessage(conversationId: string, message: string) {
    this.state.setLoading(true);
    this.http.post(`${BASE_URL}/${conversationId}/message`, { message })
      .pipe(
        catchError(err => {
          this.state.setError('Failed to send message.');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(response => {
        // Handle response if necessary
        this.state.setLoading(false);
      });
  }

  getConversation(conversationId: string) {
    this.state.setLoading(true);
    this.http.get<Conversation>(`${BASE_URL}/${conversationId}`)
      .pipe(
        catchError(err => {
          this.state.setError('Failed to fetch conversation.');
          this.state.setLoading(false);
          return of(null);
        })
      )
      .subscribe(conversation => {
        // Handle conversation data
        this.state.setLoading(false);
      });
  }

  getMyConversations() {
    this.state.setLoading(true);
    this.http.get<Conversation[]>(`${BASE_URL}/my-conversations`)
      .pipe(
        catchError(err => {
          this.state.setError('Failed to fetch conversations.');
          this.state.setLoading(false);
          return of([]);
        })
      )
      .subscribe(conversations => {
        this.state.setConversations(conversations);
        this.state.setLoading(false);
      });
  }
}
