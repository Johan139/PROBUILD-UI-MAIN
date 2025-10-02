import { Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PdfJsViewerModule, PagesInfo } from 'ng2-pdfjs-viewer';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    PdfJsViewerModule
  ],
  templateUrl: './pdf-viewer.component.html',
  styleUrls: ['./pdf-viewer.component.scss']
})
export class PdfViewerComponent implements OnChanges {
  @Input() documents: { url: string, name: string }[] = [];

  selectedDocument: { url: string, name: string } | null = null;

  page = 1;
  totalPages = 1;

  constructor() { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['documents'] && this.documents.length > 0) {
      this.selectedDocument = this.documents[0];
    }
  }

  onDocumentChange(document: { url: string, name: string }): void {
    this.selectedDocument = document;
    this.page = 1;
  }

  onPageChange(page: any): void {
    this.page = page;
  }

  onTotalPages(pagesInfo: PagesInfo): void {
    this.totalPages = pagesInfo.pagesCount;
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
    }
  }
}
