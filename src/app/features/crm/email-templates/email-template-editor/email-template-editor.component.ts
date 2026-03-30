import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  AfterViewInit,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  effect,
  Injector,
  runInInjectionContext,
} from '@angular/core';

import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  FormBuilder,
  ReactiveFormsModule,
  FormControl,
  Validators,
} from '@angular/forms';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { Subject, finalize, takeUntil } from 'rxjs';
import * as monaco from 'monaco-editor';

import { EmailTemplateService } from '../email-template.service';
import { EmailTemplateSendTestRequest } from '../email-template.service';
import { ThemeService } from '../../../../theme.service';
import {
  EmailTemplateAssetsService,
  EmailTemplateAsset,
} from '../../../../services/email-template-assets.service';

@Component({
  selector: 'app-email-template-editor',
  standalone: true,
  imports: [
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
],
  templateUrl: './email-template-editor.component.html',
  styleUrls: ['./email-template-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmailTemplateEditorComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  // ── DI ────────────────────────────────────────────────────
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private service = inject(EmailTemplateService);
  private assetsService = inject(EmailTemplateAssetsService);
  private sanitizer = inject(DomSanitizer);
  private cdr = inject(ChangeDetectorRef);
  private themeService = inject(ThemeService);
  private injector = inject(Injector);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private destroy$ = new Subject<void>();

  headerAssets: EmailTemplateAsset[] = [];
  footerAssets: EmailTemplateAsset[] = [];
  assetsLoading = false;
  uploadingHeader = false;
  uploadingFooter = false;
  savingTemplate = false;
  sendingTest = false;

  // ── View ──────────────────────────────────────────────────
  @ViewChild('editorContainer', { static: false })
  editorContainer!: ElementRef<HTMLElement>;

  @ViewChild('headerGallery', { static: false })
  headerGallery?: ElementRef<HTMLElement>;

  @ViewChild('footerGallery', { static: false })
  footerGallery?: ElementRef<HTMLElement>;

  // ── State ─────────────────────────────────────────────────
  templateId = Number(this.route.snapshot.paramMap.get('id'));
  previewHtml: SafeHtml | null = null;
  previewSrcdoc: string | null = null;
  previewUrl: SafeResourceUrl | null = null;
  private previewObjectUrl: string | null = null;
  previewMode: 'mobile' | 'desktop' = 'desktop';
  editorLineCount = 0;
  previewOpen = false;
  /** Variables available for insertion into the template body */
  templateVars = [
    'UserName',
    'CompanyName',
    'Date',
    'CtaLink',
    'ConfirmLink',
  ];

  // ── Form ──────────────────────────────────────────────────
  form = this.fb.group({
    templateName: [''],
    subject: [''],
    description: [''],
    fromName: [''],
    fromEmail: [''],
    isHtml: [true],
    isActive: [true],
    headerHtml: [''],
    footerHtml: [''],
    headerImageUrl: [''],
    footerImageUrl: [''],
    body: [''],
  });

  // ── Monaco ────────────────────────────────────────────────
  private editor!: monaco.editor.IStandaloneCodeEditor;

  // ── Lifecycle ─────────────────────────────────────────────
  ngOnInit(): void {
    this.service
      .getById(this.templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((template) => {
        const headerImageUrl = this.extractFirstImageSrc(template.headerHtml);
        const footerImageUrl = this.extractFirstImageSrc(template.footerHtml);

        this.form.patchValue({
          templateName: template.templateName,
          subject: template.subject,
          description: template.description,
          fromName: template.fromName,
          fromEmail: template.fromEmail,
          isHtml: template.isHtml ?? true,
          isActive: template.isActive ?? true,
          headerHtml: template.headerHtml ?? '',
          footerHtml: template.footerHtml ?? '',
          headerImageUrl,
          footerImageUrl,
          body: template.body,
        });

        // Sync body into Monaco if it's already initialised
        if (this.editor) {
          this.editor.setValue(template.body ?? '');
        }

        this.updatePreview(template.body ?? '');
        this.cdr.markForCheck();
      });

    this.loadAssets();
  }

  private loadAssets(): void {
    this.assetsLoading = true;
    this.cdr.markForCheck();

    this.assetsService
      .list('header')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assets) => {
          this.headerAssets = (assets ?? []).filter(
            (a) => !!a?.url && /^(https?:)?\/\//i.test(a.url),
          );
          this.assetsLoading = false;
          this.syncSelectedAssetUrlsFromGallery();
          this.cdr.markForCheck();
          queueMicrotask(() => this.scrollHeaderGalleryToSelected());
        },
        error: () => {
          this.assetsLoading = false;
          this.cdr.markForCheck();
        },
      });

    this.assetsService
      .list('footer')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assets) => {
          this.footerAssets = (assets ?? []).filter(
            (a) => !!a?.url && /^(https?:)?\/\//i.test(a.url),
          );
          this.syncSelectedAssetUrlsFromGallery();
          this.cdr.markForCheck();
          queueMicrotask(() => this.scrollFooterGalleryToSelected());
        },
        error: () => {
          this.cdr.markForCheck();
        },
      });
  }

  deleteAsset(asset: EmailTemplateAsset, kind: 'header' | 'footer'): void {
    const id = asset.id;
    if (!id) return;

    const ok = window.confirm(`Delete "${asset.name}"?`);
    if (!ok) return;

    const selectedUrl =
      kind === 'header'
        ? (this.form.get('headerImageUrl')?.value ?? '')
        : (this.form.get('footerImageUrl')?.value ?? '');

    const selectedNorm = this.stripUrlQuery(selectedUrl);
    const assetNorm = this.stripUrlQuery(asset.url);

    this.assetsService
      .delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          if (selectedNorm && selectedNorm === assetNorm) {
            if (kind === 'header') {
              this.form.patchValue({ headerImageUrl: '' });
            } else {
              this.form.patchValue({ footerImageUrl: '' });
            }
          }

          this.loadAssets();
          this.refreshPreview();
          this.notify('Image deleted');
          this.cdr.markForCheck();
        },
        error: () => {
          this.notify('Failed to delete image', true);
          this.cdr.markForCheck();
        },
      });
  }

  private syncSelectedAssetUrlsFromGallery(): void {
    const rawHeader = this.form.get('headerImageUrl')?.value ?? '';
    const rawFooter = this.form.get('footerImageUrl')?.value ?? '';

    const headerNorm = this.stripUrlQuery(rawHeader);
    const footerNorm = this.stripUrlQuery(rawFooter);

    if (headerNorm) {
      const match = this.headerAssets.find(
        (a) => this.stripUrlQuery(a.url) === headerNorm,
      );
      if (match && rawHeader !== match.url) {
        this.form.patchValue({ headerImageUrl: match.url }, { emitEvent: false });
      }
    }

    if (footerNorm) {
      const match = this.footerAssets.find(
        (a) => this.stripUrlQuery(a.url) === footerNorm,
      );
      if (match && rawFooter !== match.url) {
        this.form.patchValue({ footerImageUrl: match.url }, { emitEvent: false });
      }
    }

    if (this.editor) {
      this.refreshPreview();
    }
  }

  ngAfterViewInit(): void {
    const isDark = this.themeService.isDarkMode();
    this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
      value: this.form.get('body')?.value ?? '',
      language: 'html',
      theme: isDark ? 'vs-dark' : 'vs',
      automaticLayout: true,
      fontSize: 13,
      lineHeight: 21,
      fontFamily: "'DM Mono', 'Fira Mono', monospace",
      minimap: { enabled: false },
      wordWrap: 'on',
      scrollBeyondLastLine: false,
      renderLineHighlight: 'none',
      padding: { top: 16 },
    });

    this.editor.onDidChangeModelContent(() => {
      const value = this.editor.getValue();
      this.editorLineCount = this.editor.getModel()?.getLineCount() ?? 0;
      this.form.patchValue({ body: value }, { emitEvent: false });
      this.updatePreview(value);
      this.cdr.markForCheck();
    });

    // Set initial line count
    this.editorLineCount = this.editor.getModel()?.getLineCount() ?? 0;

    // If assets already loaded, map raw saved URLs to gallery URLs so preview can render correctly.
    this.syncSelectedAssetUrlsFromGallery();

    // React to theme changes
    runInInjectionContext(this.injector, () => {
      effect(() => {
        const dark = this.themeService.isDarkMode();
        monaco.editor.setTheme(dark ? 'vs-dark' : 'vs');
      });
    });
  }
  formatHtml() {
    if (!this.editor) return;

    this.editor?.getAction('editor.action.formatDocument')?.run();
  }
  openPreview() {
    this.previewOpen = true;
    this.syncSelectedAssetUrlsFromGallery();
    this.refreshPreview();
  }

  private buildRenderedEmailHtml(rawHtml: string): string {
    const headerUrl = this.form.get('headerImageUrl')?.value ?? '';
    const footerUrl = this.form.get('footerImageUrl')?.value ?? '';

    const rawHeaderHtml = this.form.get('headerHtml')?.value ?? '';
    const rawFooterHtml = this.form.get('footerHtml')?.value ?? '';

    const hasOwnFooter =
      /<footer[\s>]/i.test(rawHtml) ||
      /class\s*=\s*["'][^"']*\bfooter\b[^"']*["']/i.test(rawHtml);

    const headerHtml = this.applySelectedAssetToHtml(rawHeaderHtml, headerUrl, 'header', {
      stripQuery: false,
    });
    const footerHtml = hasOwnFooter
      ? ''
      : this.applySelectedAssetToHtml(rawFooterHtml, footerUrl, 'footer', {
          stripQuery: false,
        });

    const hasHeaderToken = /\{\{\s*Header\s*\}\}/i.test(rawHtml);
    const hasFooterToken = /\{\{\s*Footer\s*\}\}/i.test(rawHtml);

    let rendered = rawHtml;
    if (hasHeaderToken) {
      rendered = rendered.replace(/\{\{\s*Header\s*\}\}/gi, headerHtml);
    }
    if (hasFooterToken) {
      rendered = rendered.replace(/\{\{\s*Footer\s*\}\}/gi, footerHtml);
    }

    if (!hasHeaderToken && !hasFooterToken && (headerHtml || footerHtml)) {
      if (/<body[\s>]/i.test(rendered)) {
        rendered = rendered.replace(/(<body[^>]*>)/i, `$1\n${headerHtml}`);
        rendered = rendered.replace(/<\/body>/i, `${footerHtml}\n</body>`);
      } else {
        rendered = `${headerHtml}\n${rendered}\n${footerHtml}`;
      }
    }

    return rendered;
  }

  sendTest(): void {
    if (this.sendingTest) return;
    if (!this.editor) return;

    const ref = this.dialog.open(EmailTemplateSendTestDialogComponent, {
      width: '420px',
      data: {
        defaultEmail: '',
      },
    });

    ref
      .afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((toEmail: string | null | undefined) => {
        const email = (toEmail ?? '').trim();
        if (!email) return;

        this.sendTestTo(email);
      });
  }

  private sendTestTo(toEmail: string): void {
    if (this.sendingTest) return;

    const subject = (this.form.get('subject')?.value ?? '').toString();
    const fromEmail = (this.form.get('fromEmail')?.value ?? '').toString();
    const fromName = (this.form.get('fromName')?.value ?? '').toString();
    const templateName = (this.form.get('templateName')?.value ?? '').toString();

    const rawHtml = this.editor.getValue();
    const body = this.buildRenderedEmailHtml(rawHtml);

    const payload: EmailTemplateSendTestRequest = {
      toEmail,
      subject: subject || undefined,
      body,
      fromEmail: fromEmail || undefined,
      fromName: fromName || undefined,
      templateName: templateName || undefined,
    };

    this.sendingTest = true;
    this.cdr.markForCheck();

    this.service
      .sendTest(this.templateId, payload)
      .pipe(takeUntil(this.destroy$))
      .pipe(
        finalize(() => {
          this.sendingTest = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => this.notify('Test email sent'),
        error: () => this.notify('Failed to send test email', true),
      });
  }
  refreshPreview() {
    if (!this.editor) return;

    const html = this.editor.getValue();
    this.updatePreview(html);
  }

  onHeaderAssetSelected(url: string): void {
    this.form.patchValue({ headerImageUrl: url });
    this.refreshPreview();
    queueMicrotask(() => this.scrollHeaderGalleryToSelected());
  }

  onFooterAssetSelected(url: string): void {
    this.form.patchValue({ footerImageUrl: url });
    this.refreshPreview();
    queueMicrotask(() => this.scrollFooterGalleryToSelected());
  }

  onHeaderUploadSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) return;
    const file = input.files[0];

    this.uploadingHeader = true;
    this.cdr.markForCheck();

    this.assetsService
      .upload(file, 'header')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url) => {
          this.form.patchValue({ headerImageUrl: url });
          this.refreshPreview();
          this.uploadingHeader = false;
          input.value = '';
          this.loadAssets();
          this.notify('Header image uploaded');
          this.cdr.markForCheck();
          queueMicrotask(() => this.scrollHeaderGalleryToSelected());
        },
        error: () => {
          this.uploadingHeader = false;
          input.value = '';
          this.notify('Failed to upload header image', true);
          this.cdr.markForCheck();
        },
      });
  }

  onFooterUploadSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) return;
    const file = input.files[0];

    this.uploadingFooter = true;
    this.cdr.markForCheck();

    this.assetsService
      .upload(file, 'footer')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (url) => {
          this.form.patchValue({ footerImageUrl: url });
          this.refreshPreview();
          this.uploadingFooter = false;
          input.value = '';
          this.loadAssets();
          this.notify('Footer image uploaded');
          this.cdr.markForCheck();
          queueMicrotask(() => this.scrollFooterGalleryToSelected());
        },
        error: () => {
          this.uploadingFooter = false;
          input.value = '';
          this.notify('Failed to upload footer image', true);
          this.cdr.markForCheck();
        },
      });
  }
  ngOnDestroy(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    this.editor?.dispose();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Methods ───────────────────────────────────────────────
updatePreview(html: string): void {
  if (!this.previewOpen) {
    this.previewHtml = null;
    this.previewSrcdoc = null;
    this.previewUrl = null;
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
    return;
  }

  const headerUrl = this.form.get('headerImageUrl')?.value ?? '';
  const footerUrl = this.form.get('footerImageUrl')?.value ?? '';

  const rawHeaderHtml = this.form.get('headerHtml')?.value ?? '';
  const rawFooterHtml = this.form.get('footerHtml')?.value ?? '';

  const hasOwnFooter = /<footer[\s>]/i.test(html) || /class\s*=\s*["'][^"']*\bfooter\b[^"']*["']/i.test(html);

  const headerHtml = this.applySelectedAssetToHtml(rawHeaderHtml, headerUrl, 'header', { stripQuery: false });
  const footerHtml = hasOwnFooter
    ? ''
    : this.applySelectedAssetToHtml(rawFooterHtml, footerUrl, 'footer', { stripQuery: false });

  const hasHeaderToken = /\{\{\s*Header\s*\}\}/i.test(html);
  const hasFooterToken = /\{\{\s*Footer\s*\}\}/i.test(html);

  let rendered = html;

  if (hasHeaderToken) {
    rendered = rendered.replace(/\{\{\s*Header\s*\}\}/gi, headerHtml);
  }
  if (hasFooterToken) {
    rendered = rendered.replace(/\{\{\s*Footer\s*\}\}/gi, footerHtml);
  }

  // ← KEY FIX: instead of wrapping, inject into <body> if tokens are absent
  if (!hasHeaderToken && !hasFooterToken && (headerHtml || footerHtml)) {
    // Inject after <body> opening tag if present
    if (/<body[\s>]/i.test(rendered)) {
      rendered = rendered.replace(/(<body[^>]*>)/i, `$1\n${headerHtml}`);
      rendered = rendered.replace(/<\/body>/i, `${footerHtml}\n</body>`);
    } else {
      // No <body> tag — safe to prepend/append
      rendered = `${headerHtml}\n${rendered}\n${footerHtml}`;
    }
  }

  this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(rendered);
  this.previewSrcdoc = rendered;

  if (this.previewObjectUrl) {
    URL.revokeObjectURL(this.previewObjectUrl);
    this.previewObjectUrl = null;
  }

  const blob = new Blob([rendered], { type: 'text/html;charset=utf-8' });
  const objUrl = URL.createObjectURL(blob);
  this.previewObjectUrl = objUrl;
  this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objUrl);
}
onPreviewIframeLoad(event: Event): void {
  const iframe = event.target as HTMLIFrameElement;
  try {
    const height = iframe.contentDocument?.documentElement?.scrollHeight;
    if (height) {
      iframe.style.height = height + 'px';
    }
  } catch {
    // cross-origin guard
  }
}
  private extractFirstImageSrc(html: unknown): string {
    if (!html || typeof html !== 'string') return '';
    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return match?.[1] ?? '';
  }

  private escapeAttr(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  stripUrlQuery(url: string): string {
    if (!url) return '';
    const q = url.indexOf('?');
    return q >= 0 ? url.slice(0, q) : url;
  }

  private normalizeAssetUrl(url: string): string {
    return this.stripUrlQuery((url ?? '').trim());
  }

  trackByAssetUrl(index: number, asset: EmailTemplateAsset): string {
    return asset.url;
  }

  private scrollHeaderGalleryToSelected(): void {
    const selectedUrl = this.normalizeAssetUrl(
      this.form.get('headerImageUrl')?.value ?? '',
    );
    const host = this.headerGallery?.nativeElement;
    if (!host) return;

    if (!selectedUrl) {
      host.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    const tiles = Array.from(host.querySelectorAll<HTMLElement>('[data-asset-url]'));
    const el = tiles.find(
      (t) => this.normalizeAssetUrl(t.dataset['assetUrl'] ?? '') === selectedUrl,
    );
    el?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }

  private scrollFooterGalleryToSelected(): void {
    const selectedUrl = this.normalizeAssetUrl(
      this.form.get('footerImageUrl')?.value ?? '',
    );
    const host = this.footerGallery?.nativeElement;
    if (!host) return;

    if (!selectedUrl) {
      host.scrollTo({ left: 0, behavior: 'smooth' });
      return;
    }

    const tiles = Array.from(
      host.querySelectorAll<HTMLElement>('[data-asset-url]'),
    );
    const el = tiles.find(
      (t) => this.normalizeAssetUrl(t.dataset['assetUrl'] ?? '') === selectedUrl,
    );
    el?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }
  insertVariable(variable: string) {
    if (!this.editor) return;

    const text = `{{${variable}}}`;
    const selection = this.editor.getSelection();

    if (!selection) return;

    this.editor.executeEdits('insert-variable', [
      {
        range: selection,
        text,
        forceMoveMarkers: true,
      },
    ]);

    this.editor.focus();
  }
  save(): void {
    if (this.form.invalid) return;

    if (this.savingTemplate) return;
    this.savingTemplate = true;
    this.cdr.markForCheck();

    const headerUrl = this.form.get('headerImageUrl')?.value ?? '';
    const footerUrl = this.form.get('footerImageUrl')?.value ?? '';

    const bodyHtml = this.form.get('body')?.value ?? '';
    const hasOwnFooter =
      /<footer[\s>]/i.test(bodyHtml) ||
      /class\s*=\s*["'][^"']*\bfooter\b[^"']*["']/i.test(bodyHtml);

    const headerHtml = this.applySelectedAssetToHtml(
      this.form.get('headerHtml')?.value ?? '',
      headerUrl,
      'header',
      { stripQuery: true },
    );
    const footerHtml = hasOwnFooter
      ? ''
      : this.applySelectedAssetToHtml(
          this.form.get('footerHtml')?.value ?? '',
          footerUrl,
          'footer',
          { stripQuery: true },
        );

    const payload: any = {
      templateName: this.form.get('templateName')?.value ?? '',
      subject: this.form.get('subject')?.value ?? '',
      description: this.form.get('description')?.value ?? '',
      fromName: this.form.get('fromName')?.value ?? '',
      fromEmail: this.form.get('fromEmail')?.value ?? '',
      isHtml: this.form.get('isHtml')?.value ?? true,
      isActive: this.form.get('isActive')?.value ?? true,
      body: this.form.get('body')?.value ?? '',
      headerHtml: headerHtml || null,
      footerHtml: footerHtml || null,
    };

    this.service
      .update(this.templateId, payload)
      .pipe(takeUntil(this.destroy$))
      .pipe(
        finalize(() => {
          this.savingTemplate = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.notify('Template saved');
        },
        error: () => {
          this.notify('Failed to save template', true);
        },
      });
  }

  private notify(message: string, isError = false): void {
    this.snackBar.open(message, 'Close', {
      duration: isError ? 6000 : 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }

  private buildHeaderImageHtml(url: string): string {
    const safeUrl = this.escapeAttr(url);
    return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0;padding:0;"><tr><td align="center" style="padding:0;margin:0;"><img src="${safeUrl}" alt="Header" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;line-height:0;" /></td></tr></table>`;
  }

  private buildFooterImageHtml(url: string): string {
    const safeUrl = this.escapeAttr(url);
    return `<div style="display:block;width:100%;max-width:600px;margin:0 auto;"><img src="${safeUrl}" alt="Footer" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0;margin:0;" /></div>`;
  }

  private applySelectedAssetToHtml(
    existingHtml: string,
    selectedUrl: string,
    kind: 'header' | 'footer',
    options?: { stripQuery?: boolean },
  ): string {
    const html = existingHtml ?? '';

    if (!selectedUrl) {
      return html;
    }

    const stripQuery = options?.stripQuery ?? true;
    const urlToUse = stripQuery ? this.normalizeAssetUrl(selectedUrl) : (selectedUrl ?? '').trim();

    if (!html.trim()) {
      return kind === 'header'
        ? this.buildHeaderImageHtml(urlToUse)
        : this.buildFooterImageHtml(urlToUse);
    }

    const safeUrl = this.escapeAttr(urlToUse);
    const imgSrcRegex = /(<img\b[^>]*\bsrc\s*=\s*)(["'])([^"']*)(\2)/i;

    if (imgSrcRegex.test(html)) {
      return html.replace(imgSrcRegex, `$1$2${safeUrl}$2`);
    }

    return html;
  }
}

@Component({
  selector: 'app-email-template-send-test-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
],
  template: `
    <h2 mat-dialog-title>Send test email</h2>
    <div mat-dialog-content>
      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Recipient email</mat-label>
        <input matInput [formControl]="email" placeholder="name@company.com" autocomplete="email" />
        @if (email.invalid) {
          <mat-error>Enter a valid email address</mat-error>
        }
      </mat-form-field>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-flat-button color="primary" [disabled]="email.invalid" (click)="onSend()">
        Send
      </button>
    </div>
    `,
})
export class EmailTemplateSendTestDialogComponent {
  private dialogRef = inject(MatDialogRef<EmailTemplateSendTestDialogComponent>);
  private data = inject<{ defaultEmail?: string }>(MAT_DIALOG_DATA);

  email = new FormControl<string>(this.data?.defaultEmail ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSend(): void {
    if (this.email.invalid) return;
    this.dialogRef.close(this.email.value);
  }
}
