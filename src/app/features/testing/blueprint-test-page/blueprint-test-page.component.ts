import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { PdfViewerStateService } from '../../../services/pdf-viewer-state.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { marked } from 'marked';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  PdfViewerComponent,
  BlueprintDocument,
} from '../../../components/pdf-viewer/pdf-viewer.component';
import { BlueprintOverlayComponent } from '../../../components/blueprint-overlay/blueprint-overlay.component';
import { SubscriptionWarningComponent } from '../../../shared/dialogs/subscription-warning/subscription-warning.component';
import { RichTextEditorComponent } from '../../../components/rich-text-editor/rich-text-editor.component';
import * as hernandezWallPlanAnalysisData from '../../../../assets/sample-pdfs/json/hernandez_wall_plan_and_frame_plan.json';
import * as hernandezCdPage1 from '../../../../assets/sample-pdfs/json/hernandez_cd/1.json';
import * as hernandezCdPage2 from '../../../../assets/sample-pdfs/json/hernandez_cd/2.json';
import * as hernandezCdPage3 from '../../../../assets/sample-pdfs/json/hernandez_cd/3.json';
import * as hernandezCdPage4 from '../../../../assets/sample-pdfs/json/hernandez_cd/4.json';
import * as hernandezCdPage5 from '../../../../assets/sample-pdfs/json/hernandez_cd/5.json';
import * as hernandezCdPage6 from '../../../../assets/sample-pdfs/json/hernandez_cd/6.json';
import * as hernandezCdPage7 from '../../../../assets/sample-pdfs/json/hernandez_cd/7.json';
import { AuthService } from '../../../authentication/auth.service';

@Component({
  selector: 'app-blueprint-test-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    PdfViewerComponent,
    SubscriptionWarningComponent,
    RichTextEditorComponent,
    MatTabsModule,
    MatExpansionModule,
  ],
  templateUrl: './blueprint-test-page.component.html',
  styleUrls: ['./blueprint-test-page.component.scss'],
})
export class BlueprintTestPageComponent implements OnInit, OnDestroy {
  readonly allowedUserIds = new Set<string>([
    '7deea39b-c4ca-46f8-ae00-4eabf0cc561d',
    '86e3d061-48f4-4424-a0c7-cd3653ad399d',
    '6584a5d1-0c94-452d-8b66-07bab39dc326',
    'cd113971-4cc5-491a-9244-bbe86c5b2fe5',
    'c453f7e4-1134-4bb0-9c73-26b7cdebdfc2',
    '4a00473b-6e73-4727-94b0-5d5778a5f9ed',
    '3b33dbc0-3e07-42f7-a060-de5c619a6a94',
    '1e273d7f-98e8-4f91-8adc-9c568a74b235',
    '0caf7e35-45df-4d2f-8b1e-a661e50bd43c',
    '4929f316-4a97-4c9b-a671-8962532b6ab5',
  ]);

  hasAccess = false;
  blueprints: BlueprintDocument[] = [];
  isPoppedOut = false;
  isViewerVisible = true;
  private popoutSubscription!: Subscription;
  private visibilitySubscription!: Subscription;

  apolloApiKey = '';
  apolloCompanyName = '';
  apolloDomain = '';
  apolloTrade = 'Plumbing';
  apolloCity = '';
  apolloState = '';
  apolloLimit = 10;
  apolloPage = 1;
  apolloPagesToScan = 1;
  apolloApplyRelevanceFilter = true;

  apolloPostalCode = '78628';
  apolloCountry = 'United States';
  apolloRadiusMiles = 100;

  // How many top results to enrich (to get location, etc.)
  apolloEnrichTopN = 5;

  backendTestLoading = false;
  backendTestResponse = '';
  backendTestError = '';

  apolloSearchLoading = false;
  apolloEnrichLoading = false;
  apolloSearchResponse = '';
  apolloEnrichResponse = '';
  apolloSearchError = '';
  apolloEnrichError = '';

  testContent = `
  <h3>1. Metadata Report</h3>
  <table>
  <thead>
  <tr>
  <th>Category</th>
  <th>Details</th>
  </tr>
  </thead>
  <tbody>
  <tr>
  <td><strong>Project Name</strong></td>
  <td>Hernandez Residence</td>
  </tr>
  <tr>
  <td><strong>Address</strong></td>
  <td>216 Shelf Rock Road, Georgetown, Williamson County, TX (Source for Location)</td>
  </tr>
  </tbody>
  </table>
  <p>This is a test of the Rich Text Editor component functionality.</p>
  `;

  constructor(
    private pdfViewerState: PdfViewerStateService,
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const userId = this.resolveCurrentUserId();
    this.hasAccess = this.isAllowedUser(userId);

    if (!this.hasAccess) return;

    this.http
      .get('/assets/sample-data/fr1.md', { responseType: 'text' })
      .subscribe((data) => {
        Promise.resolve(marked.parse(data)).then((html) => {
          this.testContent = html as string;
        });
      });

    this.blueprints = [
      {
        name: 'Hernandez Residence CDs',
        pdfUrl: '/assets/sample-pdfs/hernandez_cd.pdf',
        pageImageUrls: [
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-1.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-2.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-3.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-4.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-5.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-6.png',
          '/assets/sample-pdfs/png/hernandez_cd/hernandez_cd-7.png',
        ],
        analysisData: {
          1: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage1),
          2: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage2),
          3: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage3),
          4: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage4),
          5: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage5),
          6: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage6),
          7: BlueprintOverlayComponent.transformBlueprintData(hernandezCdPage7),
        },
        totalPages: 7,
      },
      {
        name: 'Hernandez Wall Plan and Frame Plan',
        pdfUrl: '/assets/sample-pdfs/hernandez_wall_plan_and_frame_plan.pdf',
        pageImageUrls: [
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-1.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-2.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-3.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-4.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-5.png',
          '/assets/sample-pdfs/png/hernandez_wall_plan_and_frame/hernandez_wall_plan_and_frame_plan-6.png',
        ],
        analysisData: {
          1: BlueprintOverlayComponent.transformBlueprintData(
            hernandezWallPlanAnalysisData,
          ),
        },
        totalPages: 6,
      },
    ];

    this.popoutSubscription = this.pdfViewerState.isPoppedOut$.subscribe(
      (isPoppedOut) => (this.isPoppedOut = isPoppedOut),
    );

    this.visibilitySubscription = this.pdfViewerState.visibility$.subscribe(
      (isVisible) => (this.isViewerVisible = isVisible),
    );
  }

  ngOnDestroy(): void {
    this.popoutSubscription?.unsubscribe();
    this.visibilitySubscription?.unsubscribe();
  }

  async runBackendSubcontractorDiscover(): Promise<void> {
    this.backendTestLoading = true;
    this.backendTestResponse = '';
    this.backendTestError = '';

    const request = {
      tradeName: this.apolloTrade || 'Electrical',
      city: this.apolloCity || undefined,
      state: this.apolloState || undefined,
      radiusMiles: 50,
      limit: this.apolloLimit || 10,
      searchText: this.apolloCompanyName || undefined,
    };

    try {
      const result = await firstValueFrom(
        this.http.post(
          'http://localhost:5000/api/ExternalData/subcontractors/discover',
          request,
        ),
      );
      this.backendTestResponse = JSON.stringify(result, null, 2);
    } catch (err) {
      this.backendTestError = this.getErrorMessage(err);
    } finally {
      this.backendTestLoading = false;
    }
  }

  async runApolloMixedCompanySearch(): Promise<void> {
    this.apolloSearchLoading = true;
    this.apolloSearchError = '';
    this.apolloSearchResponse = '';

    const searchKeywords = [
      this.apolloCompanyName,
      this.apolloTrade,
      'contractor',
      'subcontractor',
      'construction',
      this.apolloCity,
      this.apolloState,
    ]
      .filter((x) => !!x && x.trim().length > 0)
      .join(' ')
      .trim();

    const payload: any = {
      q_organization_keyword_tags: [
        this.apolloTrade,
        `${this.apolloTrade} contractor`,
        `${this.apolloTrade} subcontractor`,
      ],
      page: Math.max(1, Number(this.apolloPage || 1)),
      per_page: Math.max(1, Math.min(100, Number(this.apolloLimit || 10))),
      fields: [
        'id',
        'name',
        'city',
        'state',
        'country',
        'country_code',
        'zip',
        'street_address',
        'headquarters_city',
        'headquarters_state',
        'headquarters_country',
        'phone',
        'primary_phone',
        'primary_domain',
        'website_url',
      ],
    };
    if (this.apolloPostalCode.trim()) {
      payload.organization_locations = [
        {
          country: this.apolloCountry.trim(),
          postal_code: this.apolloPostalCode.trim(),
          distance: this.apolloRadiusMiles,
        },
      ];
    }
    const pagesToScan = Math.max(
      1,
      Math.min(20, Number(this.apolloPagesToScan || 1)),
    );

    try {
      const allOrgs: any[] = [];
      const rawCountsByPage: Array<{ page: number; rawOrganizations: number }> =
        [];
      let finalParams = '';

      // 1) SEARCH ONLY (no enrich here)
      for (let i = 0; i < pagesToScan; i++) {
        const currentPage = payload.page + i;
        const params = this.buildMixedCompanyParams(
          currentPage,
          payload.per_page,
        );

        const pagePayload = { ...payload, page: currentPage };
        finalParams = params.toString();

        const response = await firstValueFrom(
          this.http.post('/apollo/api/v1/mixed_companies/search', pagePayload, {
            headers: this.buildApolloHeaders(),
            params,
          }),
        );

        const organizations = this.extractOrganizations(response);
        rawCountsByPage.push({
          page: currentPage,
          rawOrganizations: organizations.length,
        });

        allOrgs.push(...organizations);
      }

      const deduped = allOrgs; // this.dedupeOrganizations(allOrgs);

      // 2) RANK
      const ranked = deduped
        .map((org) => ({ org, score: this.getRelevanceScore(org) }))
        .sort((a, b) => b.score - a.score);

      // 3) FILTER
      let filteredOrganizations = this.apolloApplyRelevanceFilter
        ? ranked.filter((row) => row.score >= 1).map((row) => row.org)
        : deduped;

      let filterNotice: string | null = null;
      if (
        this.apolloApplyRelevanceFilter &&
        filteredOrganizations.length === 0 &&
        deduped.length > 0
      ) {
        filteredOrganizations = deduped;
        filterNotice =
          'No records met local relevance threshold. Showing raw Apollo results instead.';
      }

      // 4) ENRICH TOP N ONLY (to get HQ/location etc.)
      const topN = Math.max(
        0,
        Math.min(20, Number(this.apolloEnrichTopN || 0)),
      );
      const toEnrich = topN > 0 ? filteredOrganizations.slice(0, topN) : [];

      // mark enrich loading separately (optional)
      this.apolloEnrichLoading = toEnrich.length > 0;
      this.apolloEnrichError = '';

      const enrichedTop = await this.enrichOrganizations(toEnrich);

      // Merge back: replace the first N items with enriched versions
      const byKey = new Map<string, any>();
      for (const e of enrichedTop) {
        const key = String(e?.id || e?.primary_domain || e?.name || '')
          .trim()
          .toLowerCase();
        if (key) byKey.set(key, e);
      }

      const finalOrganizations = filteredOrganizations.map((org) => {
        const key = String(org?.id || org?.primary_domain || org?.name || '')
          .trim()
          .toLowerCase();
        return (key && byKey.get(key)) || org;
      });

      this.apolloSearchResponse = JSON.stringify(
        {
          request: payload,
          requestParams: finalParams,
          pagesScanned: pagesToScan,
          pageBreakdown: rawCountsByPage,
          appliedRelevanceFilter: this.apolloApplyRelevanceFilter,
          filterNotice,
          enrichTopN: topN,
          counts: {
            rawOrganizations: allOrgs.length,
            dedupedOrganizations: deduped.length,
            returnedOrganizations: finalOrganizations.length,
          },
          organizations: finalOrganizations,
        },
        null,
        2,
      );
    } catch (err) {
      this.apolloSearchError = this.getErrorMessage(err);
    } finally {
      this.apolloSearchLoading = false;
      this.apolloEnrichLoading = false;
    }
  }

  runApolloOrganizationEnrich(): void {
    this.apolloEnrichLoading = true;
    this.apolloEnrichError = '';

    const query = this.apolloDomain?.trim()
      ? `domain=${encodeURIComponent(this.apolloDomain.trim())}`
      : `organization_name=${encodeURIComponent(this.apolloCompanyName.trim())}`;

    this.http
      .get(`/apollo/api/v1/organizations/enrich?${query}`, {
        headers: this.buildApolloHeaders(),
      })
      .subscribe({
        next: (response) => {
          this.apolloEnrichResponse = JSON.stringify(response, null, 2);
          this.apolloEnrichLoading = false;
        },
        error: (err) => {
          this.apolloEnrichError = this.getErrorMessage(err);
          this.apolloEnrichLoading = false;
        },
      });
  }

  clearApolloResults(): void {
    this.apolloSearchResponse = '';
    this.apolloEnrichResponse = '';
    this.apolloSearchError = '';
    this.apolloEnrichError = '';
  }

  private async enrichOrganizations(orgs: any[]): Promise<any[]> {
    if (!orgs || orgs.length === 0) return [];

    // Dedup by domain/id to avoid wasting enrich calls
    const unique = new Map<string, any>();
    for (const org of orgs) {
      const key = String(org?.primary_domain || org?.id || org?.name || '')
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!unique.has(key)) unique.set(key, org);
    }

    const list = [...unique.values()];

    // Parallel enrich (much faster) with per-item error handling
    const enriched = await Promise.all(
      list.map(async (org) => {
        const domain = String(org?.primary_domain || '').trim();
        if (!domain) return org;

        try {
          const enrich: any = await firstValueFrom(
            this.http.get(
              `/apollo/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
              { headers: this.buildApolloHeaders() },
            ),
          );

          // Apollo enrich often returns { organization: {...} } or the org directly
          const enrichedOrg =
            enrich?.organization && typeof enrich.organization === 'object'
              ? enrich.organization
              : enrich;

          return { ...org, ...enrichedOrg };
        } catch (e) {
          // swallow per-org errors so one bad enrich doesn't kill the whole search
          return org;
        }
      }),
    );

    return enriched;
  }

  private buildApolloHeaders(): HttpHeaders {
    const key = this.apolloApiKey.trim();
    return new HttpHeaders({
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json',
      accept: 'application/json',
      'X-Api-Key': key,
    });
  }

  private getErrorMessage(err: any): string {
    if (err?.error) {
      if (typeof err.error === 'string') return err.error;
      try {
        return JSON.stringify(err.error, null, 2);
      } catch {
        return 'Unknown Apollo error.';
      }
    }
    return err?.message || 'Request failed.';
  }

  private extractOrganizations(response: any): any[] {
    if (!response || typeof response !== 'object') return [];
    if (Array.isArray(response.organizations)) return response.organizations;
    if (Array.isArray(response.companies)) return response.companies;
    if (Array.isArray(response.accounts)) return response.accounts;
    return [];
  }

  private getRelevanceScore(org: any): number {
    const blob = this.flattenStringValues(org).toLowerCase();
    const tradeTerms = this.getTradeTerms(this.apolloTrade);
    const city = this.apolloCity.trim().toLowerCase();
    const stateTerms = this.getStateTerms(this.apolloState);

    const tradeHit = tradeTerms.some((term) => blob.includes(term));
    const cityHit = !!city && blob.includes(city);
    const stateHit = stateTerms.some((term) => blob.includes(term));
    const constructionContextHit =
      blob.includes('subcontractor') ||
      blob.includes('contractor') ||
      blob.includes('construction') ||
      blob.includes('mep');

    let score = 0;
    if (tradeHit) score += 2;
    if (cityHit) score += 1;
    if (stateHit) score += 1;
    if (constructionContextHit) score += 1;
    return score;
  }

  private buildMixedCompanyParams(page: number, perPage: number): HttpParams {
    let params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));

    // 🔥 RADIUS SEARCH
    if (this.apolloPostalCode.trim()) {
      params = params
        .append(
          'q_organization_locations[][postal_code]',
          this.apolloPostalCode.trim(),
        )
        .append(
          'q_organization_locations[][country]',
          this.apolloCountry.trim(),
        );
    }

    return params;
  }

  private dedupeOrganizations(list: any[]): any[] {
    const map = new Map<string, any>();
    for (const org of list) {
      const key = String(org?.id || org?.primary_domain || org?.name || '')
        .trim()
        .toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, org);
    }
    return [...map.values()];
  }

  private flattenStringValues(input: any): string {
    if (input == null) return '';
    if (
      typeof input === 'string' ||
      typeof input === 'number' ||
      typeof input === 'boolean'
    ) {
      return String(input);
    }
    if (Array.isArray(input)) {
      return input.map((x) => this.flattenStringValues(x)).join(' ');
    }
    if (typeof input === 'object') {
      return Object.values(input)
        .map((x) => this.flattenStringValues(x))
        .join(' ');
    }
    return '';
  }

  private getTradeTerms(tradeValue: string): string[] {
    const raw = tradeValue.trim().toLowerCase();
    if (!raw) return [];

    const tradeSynonyms: Record<string, string[]> = {
      electrical: [
        'electrical',
        'electric',
        'electrician',
        'low voltage',
        'wiring',
        'mep',
      ],
      plumbing: ['plumbing', 'plumber', 'pipefitting', 'piping', 'mep'],
      hvac: [
        'hvac',
        'mechanical',
        'heating',
        'ventilation',
        'air conditioning',
        'mep',
      ],
      roofing: ['roofing', 'roofer', 'roof'],
      drywall: ['drywall', 'gypsum', 'sheetrock'],
      concrete: ['concrete', 'foundations', 'formwork'],
    };

    const terms = new Set<string>([raw, ...raw.split(/\s+/)]);
    for (const [key, values] of Object.entries(tradeSynonyms)) {
      if (raw.includes(key)) values.forEach((v) => terms.add(v));
    }
    return [...terms].filter((x) => x.length > 1);
  }

  private getStateTerms(stateValue: string): string[] {
    const raw = stateValue.trim().toLowerCase();
    if (!raw) return [];

    const stateMap: Record<string, string> = {
      texas: 'tx',
      california: 'ca',
      florida: 'fl',
      newyork: 'ny',
      'new york': 'ny',
      georgia: 'ga',
      arizona: 'az',
      colorado: 'co',
      illinois: 'il',
      ohio: 'oh',
      washington: 'wa',
      virginia: 'va',
      pennsylvania: 'pa',
      michigan: 'mi',
    };

    const normalized = raw.replace(/\./g, '').trim();
    const inverse = Object.entries(stateMap).find(
      ([, abbr]) => abbr === normalized,
    )?.[0];
    const abbr = stateMap[normalized];

    const terms = new Set<string>([normalized]);
    if (abbr) terms.add(abbr);
    if (inverse) terms.add(inverse);
    return [...terms];
  }

  private resolveCurrentUserId(): string {
    return String(
      this.authService.currentUserSubject.value?.id ||
        localStorage.getItem('userId') ||
        '',
    )
      .trim()
      .toLowerCase();
  }

  private isAllowedUser(userId: string): boolean {
    return !!userId && this.allowedUserIds.has(userId);
  }
}
