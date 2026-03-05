import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type EmailTemplateAssetKind = 'header' | 'footer';

export interface EmailTemplateAsset {
  id?: number;
  name: string;
  url: string;
}

interface EmailTemplateAssetListResponse {
  assets: EmailTemplateAsset[];
}

interface EmailTemplateAssetUploadResponse {
  url: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailTemplateAssetsService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.BACKEND_URL}/emailtemplates/assets`;

  list(kind: EmailTemplateAssetKind): Observable<EmailTemplateAsset[]> {
    return this.http
      .get<EmailTemplateAssetListResponse>(`${this.baseUrl}`, {
        params: { kind, _ts: Date.now().toString() },
      })
      .pipe(map((res) => res.assets ?? []));
  }

  upload(file: File, kind: EmailTemplateAssetKind): Observable<string> {
    const form = new FormData();
    form.append('file', file, file.name);

    return this.http
      .post<EmailTemplateAssetUploadResponse>(`${this.baseUrl}/upload`, form, {
        params: { kind },
      })
      .pipe(map((res) => res.url));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
