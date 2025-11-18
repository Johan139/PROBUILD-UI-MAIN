import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import Quill from 'quill';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss']
})
export class RichTextEditorComponent implements AfterViewInit {
  @ViewChild('editor') editorElement!: ElementRef;
  @Input() initialContent!: string;
  @Output() contentChanged = new EventEmitter<string>();

  private quill!: Quill;

  ngAfterViewInit(): void {
    this.quill = new Quill(this.editorElement.nativeElement, {
      theme: 'snow',
      modules: {
        toolbar: [
          [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered'}, { 'list': 'bullet' }],
          ['link', 'image'],
          ['clean']
        ]
      }
    });

    if (this.initialContent) {
      this.quill.root.innerHTML = this.initialContent;
    }

    this.quill.on('text-change', () => {
      this.contentChanged.emit(this.quill.root.innerHTML);
    });
  }

  public undo(): void {
    this.quill.history.undo();
  }

  public redo(): void {
    this.quill.history.redo();
  }
}
