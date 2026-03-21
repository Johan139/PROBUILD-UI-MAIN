import {
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import { catchError, forkJoin, take, throwError } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ProfileService } from './profile.service';
import { AuthService } from '../../authentication/auth.service';
import { Profile, TeamMember, UserAddress } from './profile.model';
import { userTypes } from '../../data/user-types';
import { TeamManagementService } from '../../services/team-management.service';
import {
  constructionTypes,
  preferenceOptions,
  supplierProducts,
  deliveryAreas,
  leadTimeDelivery,
  availabilityOptions,
  certificationOptions,
} from '../../data/registration-data';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { SubscriptionRow } from '../../models/SubscriptionRow';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { ConfirmationDialogComponent } from '../../shared/dialogs/confirmation-dialog/confirmation-dialog.component';
import {
  StripeService,
} from '../../services/StripeService';
import { isPlatformBrowser, NgForOf, NgIf } from '@angular/common';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { v4 as uuidv4 } from 'uuid';
import { JobsService } from '../../services/jobs.service';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { SharedModule } from '../../shared/shared.module';
import { LucideIconsModule } from '../../shared/lucide-icons.module';
import { ManagePermissionsDialogComponent } from '../../shared/dialogs/manage-permissions-dialog/manage-permissions-dialog.component';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { SubscriptionUpgradeComponent } from '../subscription-upgrade/subscription-upgrade.component';
import { SubscriptionCreateComponent } from '../registration/subscription-create/subscription-create.component';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, Observable, of } from 'rxjs';
import { startWith, map, switchMap } from 'rxjs/operators';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { RegistrationService } from '../../services/registration.service';
import { UserAddressStoreService } from '../../services/UserAddressStoreService';
import { CompanyService } from '../../services/company.service';
import { GooglePlacesService } from '../../services/google-places.service';
import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
} from 'libphonenumber-js';
const BASE_URL = environment.BACKEND_URL;

interface SubscriptionPackage {
  value: string;
  amount: number;
}
export interface PaymentRecord {
  id: number;
  userId: string;
  package: string;
  stripeSessionId: string;
  status: string;
  amount: number;
  paidAt: Date;
  validUntil: Date;
  isTrial: boolean;
}
export interface SubscriptionUpgradeDTO {
  subscriptionId: string;
  packageName: string; // use camelCase in TS
  userId: string;
  assignedUser: string | null;
  billingCycle: string | null;
}
export type ActiveMap = Record<
  string,
  { subscriptionId: string; packageLabel?: string }
>;

type SettingsTab =
  | 'profile'
  | 'company'
  | 'team'
  | 'documents'
  | 'subscriptions'
  | 'appearance'
  | 'measurements'
  | 'construction'
  | 'notifications'
  | 'language'
  | 'advanced';

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  group: 'Account' | 'Preferences' | 'Premium';
  icon: string;
}

interface CertDocumentItem {
  id: number;
  name: string;
  type: 'License' | 'Certification' | 'Insurance' | 'Bond' | 'Permit' | 'Other';
  issuer: string;
  number: string;
  expirationDate: string;
  status: 'Active' | 'Expiring' | 'Expired';
}

interface SelectOption {
  value: string;
  label: string;
}
@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    CommonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressBarModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatDialogModule,
    MatMenuModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    NgForOf,
    NgIf,
    SharedModule,
    LucideIconsModule,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  activeTab: SettingsTab = 'profile';
  saveToast = false;
  hasSettingsChanges = false;
  settingsGroups: Array<'Account' | 'Preferences' | 'Premium'> = [
    'Account',
    'Preferences',
    'Premium',
  ];
  settingsNavItems: SettingsNavItem[] = [
    { id: 'profile', label: 'Profile', group: 'Account', icon: 'user' },
    { id: 'company', label: 'Company Profile', group: 'Account', icon: 'building-2' },
    { id: 'team', label: 'Team Members', group: 'Account', icon: 'users' },
    {
      id: 'documents',
      label: 'Certifications & Licenses',
      group: 'Account',
      icon: 'shield',
    },
    { id: 'subscriptions', label: 'Subscription', group: 'Account', icon: 'briefcase' },
    { id: 'appearance', label: 'Appearance', group: 'Preferences', icon: 'sun' },
    { id: 'measurements', label: 'Measurements', group: 'Preferences', icon: 'ruler' },
    { id: 'construction', label: 'Construction', group: 'Preferences', icon: 'hard-hat' },
    { id: 'notifications', label: 'Notifications', group: 'Preferences', icon: 'bell' },
    { id: 'language', label: 'Language', group: 'Preferences', icon: 'map-pin' },
    { id: 'advanced', label: 'Advanced', group: 'Premium', icon: 'zap' },
  ];

  // Demo parity state (front-end placeholders where backend does not exist yet)
  demoUserType = 'General Contractor';
  demoTrade = '';
  demoSupplierType = '';
  demoProductsOffered = 'Other';
  demoDevelopmentType = '';
  demoOperatingRegion = '';
  demoJobPreferences = '';
  demoNotificationRadius = '100';
  openTeamMenuId: string | null = null;
  subBilling: 'monthly' | 'annually' = 'monthly';
  selectedPlan: 'starter' | 'professional' | 'enterprise' = 'professional';
  themeMode: 'light' | 'dark' | 'auto' = 'dark';
  uiDensity: 'compact' | 'comfortable' | 'expanded' = 'comfortable';
  measurementSystem: 'imperial' | 'metric' = 'imperial';
  temperatureUnit: 'fahrenheit' | 'celsius' = 'fahrenheit';
  areaUnit: 'ft²' | 'm²' = 'ft²';
  volumeUnit: 'ft³' | 'm³' = 'ft³';
  blueprintZoom = 'fit';
  autoSave = true;
  defaultLanding = 'projects';
  emailNotif = true;
  inAppNotif = true;
  smsNotif = false;
  pushNotif = true;
  bidAlerts = true;
  timelineAlerts = true;
  budgetAlerts = true;
  connectionAlerts = true;
  inviteAlerts = true;
  appLanguage = 'en';
  dateLocale = 'en-US';
  docCurrency = 'USD';
  docOutputMode: 'single' | 'dual' = 'single';
  docOutputLanguage = 'en';
  dualPrimaryLang = 'en';
  dualSecondaryLang = 'es';
  defaultMarkup = '15';
  laborBurden = '35';
  pricingCountry = 'us';
  pricingRegion = 'texas';
  docHeaderStyle: 'solid' | 'gradient' = 'solid';
  docPrimaryColor = '#FCD109';
  docSecondaryColor = '#1E2329';
  docTextColor = '#FFFFFF';
  docGradientStart = '#FCD109';
  docGradientEnd = '#F59E0B';
  docGradientDir: 'to right' | 'to bottom' | 'to bottom right' = 'to right';
  docLogoUploaded = false;
  docLogoFileName = '';
  docShowBank = false;
  docCompanyName = 'ProBuild Construction LLC';
  docCompanyAddress = '1234 Main St, Austin, TX 78701';
  docCompanyPhone = '+1 (555) 123-4567';
  docCompanyEmail = 'billing@probuildai.com';
  docTaxId = '';
  docNumberPrefix = 'QUO-';
  docInvoicePrefix = 'INV-';
  docPaymentTerms = 'net-30';
  docFooterNote =
    'Thank you for your business. This quote is valid for 30 days from issue date.';
  docBankName = '';
  docBankAccount = '';
  docBankRouting = '';

  showUploadForm = false;
  uploadDocCategory = '';
  uploadDocSubType = '';
  uploadDocName = '';
  uploadIssuer = '';
  uploadNumber = '';
  uploadIssueDate = '';
  uploadExpDate = '';
  certDocuments: CertDocumentItem[] = [
    {
      id: 1,
      name: 'General Contractor License',
      type: 'License',
      issuer: 'Texas Dept. of Licensing & Regulation',
      number: 'TSCL #44210',
      expirationDate: 'Aug 12, 2027',
      status: 'Active',
    },
    {
      id: 2,
      name: 'General Liability Insurance',
      type: 'Insurance',
      issuer: 'Hartford Financial Services',
      number: 'GL-2025-88432',
      expirationDate: 'Jan 5, 2027',
      status: 'Active',
    },
    {
      id: 3,
      name: 'EPA Lead-Safe Certification',
      type: 'Certification',
      issuer: 'U.S. Environmental Protection Agency',
      number: 'NAT-F219856-1',
      expirationDate: 'Jun 10, 2026',
      status: 'Expiring',
    },
  ];

  tradeOptions: SelectOption[] = [
    { value: 'electrician', label: 'Electrician' },
    { value: 'plumber', label: 'Plumber' },
    { value: 'hvac', label: 'HVAC Technician' },
    { value: 'carpenter', label: 'Carpenter' },
    { value: 'roofer', label: 'Roofer' },
    { value: 'painter', label: 'Painter' },
    { value: 'mason', label: 'Mason / Bricklayer' },
    { value: 'concrete', label: 'Concrete Contractor' },
    { value: 'framer', label: 'Framer' },
    { value: 'drywall', label: 'Drywall / Insulation' },
    { value: 'flooring', label: 'Flooring Installer' },
    { value: 'tile', label: 'Tile Installer' },
    { value: 'ironworker', label: 'Ironworker' },
    { value: 'welder', label: 'Welder' },
    { value: 'glazier', label: 'Glazier' },
    { value: 'landscaper', label: 'Landscaper' },
    { value: 'excavation', label: 'Excavation Contractor' },
    { value: 'demolition', label: 'Demolition Contractor' },
    { value: 'fire-protection', label: 'Fire Protection Specialist' },
    { value: 'solar', label: 'Solar Installer' },
    { value: 'low-voltage', label: 'Low Voltage / Data' },
    { value: 'elevator', label: 'Elevator Contractor' },
    { value: 'waterproofing', label: 'Waterproofing Specialist' },
    { value: 'stucco', label: 'Stucco Contractor' },
    { value: 'siding', label: 'Siding Installer' },
    { value: 'fencing', label: 'Fencing Contractor' },
    { value: 'pool', label: 'Pool Contractor' },
    { value: 'septic', label: 'Septic Systems Specialist' },
    { value: 'paving', label: 'Paving Contractor' },
    { value: 'cabinet', label: 'Cabinet Installer' },
    { value: 'countertop', label: 'Countertop Installer' },
    { value: 'window-door', label: 'Window & Door Installer' },
    { value: 'insulation', label: 'Insulation Specialist' },
    { value: 'acoustical', label: 'Acoustical Ceiling Specialist' },
    { value: 'scaffolding', label: 'Scaffolding Contractor' },
    { value: 'environmental', label: 'Environmental Remediation' },
    { value: 'surveyor', label: 'Surveyor' },
    { value: 'other-trade', label: 'Other Trade' },
  ];

  supplierTypeOptions: SelectOption[] = [
    { value: 'lumber', label: 'Lumber & Building Materials' },
    { value: 'electrical-supply', label: 'Electrical Supply' },
    { value: 'plumbing-supply', label: 'Plumbing Supply' },
    { value: 'hvac-supply', label: 'HVAC Supply' },
    { value: 'concrete-supply', label: 'Concrete / Ready-Mix' },
    { value: 'steel-metals', label: 'Steel & Metals' },
    { value: 'roofing-supply', label: 'Roofing Supply' },
    { value: 'insulation-supply', label: 'Insulation Supply' },
    { value: 'flooring-supply', label: 'Flooring & Tile Supply' },
    { value: 'doors-windows', label: 'Doors & Windows' },
    { value: 'paint-coatings', label: 'Paint & Coatings' },
    { value: 'aggregates', label: 'Aggregates & Bulk Materials' },
    { value: 'safety-ppe', label: 'Safety & PPE Supplier' },
    { value: 'tooling-fasteners', label: 'Tools & Fasteners' },
    { value: 'equipment-rental', label: 'Equipment Rental Supplier' },
    { value: 'other-supplier', label: 'Other Supplier' },
  ];

  productsOfferedOptions: SelectOption[] = [
    { value: 'Materials', label: 'Materials' },
    { value: 'Equipment', label: 'Equipment' },
    { value: 'Tools', label: 'Tools' },
    { value: 'Rental Equipment', label: 'Rental Equipment' },
    { value: 'Safety Gear', label: 'Safety Gear / PPE' },
    { value: 'Services', label: 'Services' },
    { value: 'Other', label: 'Other' },
  ];

  developmentTypeOptions: SelectOption[] = [
    { value: 'residential', label: 'Residential Development' },
    { value: 'commercial', label: 'Commercial Development' },
    { value: 'industrial', label: 'Industrial Development' },
    { value: 'mixed', label: 'Mixed-Use Development' },
    { value: 'land', label: 'Land Development' },
    { value: 'infrastructure', label: 'Infrastructure' },
  ];

  serviceAreaOptions: SelectOption[] = [
    { value: 'local', label: 'Local (50 miles)' },
    { value: 'regional', label: 'Regional (200 miles)' },
    { value: 'statewide', label: 'Statewide' },
    { value: 'national', label: 'National' },
    { value: 'international', label: 'International' },
  ];

  availabilityLeadTimeOptions: SelectOption[] = [
    { value: 'immediate', label: 'Immediately Available' },
    { value: '1-week', label: 'Starting in 1 Week' },
    { value: '2-weeks', label: 'Starting in 2 Weeks' },
    { value: '1-month', label: 'Starting in 1 Month+' },
  ];

  languageOptions: SelectOption[] = [
    { value: 'af', label: 'Afrikaans' },
    { value: 'sq', label: 'Shqip (Albanian)' },
    { value: 'am', label: 'አማርኛ (Amharic)' },
    { value: 'ar', label: 'العربية (Arabic)' },
    { value: 'hy', label: 'Հայերեն (Armenian)' },
    { value: 'az', label: 'Azərbaycanca (Azerbaijani)' },
    { value: 'eu', label: 'Euskara (Basque)' },
    { value: 'be', label: 'Беларуская (Belarusian)' },
    { value: 'bn', label: 'বাংলা (Bengali)' },
    { value: 'bs', label: 'Bosanski (Bosnian)' },
    { value: 'bg', label: 'Български (Bulgarian)' },
    { value: 'my', label: 'မြန်မာဘာသာ (Burmese)' },
    { value: 'ca', label: 'Català (Catalan)' },
    { value: 'zh', label: '中文 (Chinese - Simplified)' },
    { value: 'zh-tw', label: '中文繁體 (Chinese - Traditional)' },
    { value: 'hr', label: 'Hrvatski (Croatian)' },
    { value: 'cs', label: 'Čeština (Czech)' },
    { value: 'da', label: 'Dansk (Danish)' },
    { value: 'nl', label: 'Nederlands (Dutch)' },
    { value: 'en', label: 'English' },
    { value: 'et', label: 'Eesti (Estonian)' },
    { value: 'tl', label: 'Filipino (Tagalog)' },
    { value: 'fi', label: 'Suomi (Finnish)' },
    { value: 'fr', label: 'Français (French)' },
    { value: 'gl', label: 'Galego (Galician)' },
    { value: 'ka', label: 'ქართული (Georgian)' },
    { value: 'de', label: 'Deutsch (German)' },
    { value: 'el', label: 'Ελληνικά (Greek)' },
    { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
    { value: 'ha', label: 'Hausa' },
    { value: 'he', label: 'עברית (Hebrew)' },
    { value: 'hi', label: 'हिन्दी (Hindi)' },
    { value: 'hu', label: 'Magyar (Hungarian)' },
    { value: 'is', label: 'Íslenska (Icelandic)' },
    { value: 'ig', label: 'Igbo' },
    { value: 'id', label: 'Bahasa Indonesia (Indonesian)' },
    { value: 'it', label: 'Italiano (Italian)' },
    { value: 'ja', label: '日本語 (Japanese)' },
    { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { value: 'kk', label: 'Қазақ (Kazakh)' },
    { value: 'km', label: 'ខ្មែរ (Khmer)' },
    { value: 'ko', label: '한국어 (Korean)' },
    { value: 'lv', label: 'Latviešu (Latvian)' },
    { value: 'lt', label: 'Lietuvių (Lithuanian)' },
    { value: 'mk', label: 'Македонски (Macedonian)' },
    { value: 'ms', label: 'Bahasa Melayu (Malay)' },
    { value: 'ml', label: 'മലയാളം (Malayalam)' },
    { value: 'mt', label: 'Malti (Maltese)' },
    { value: 'mr', label: 'मराठी (Marathi)' },
    { value: 'mn', label: 'Монгол (Mongolian)' },
    { value: 'ne', label: 'नेपाली (Nepali)' },
    { value: 'no', label: 'Norsk (Norwegian)' },
    { value: 'ps', label: 'پښتو (Pashto)' },
    { value: 'fa', label: 'فارسی (Persian / Farsi)' },
    { value: 'pl', label: 'Polski (Polish)' },
    { value: 'pt', label: 'Português (Portuguese)' },
    { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
    { value: 'ro', label: 'Română (Romanian)' },
    { value: 'ru', label: 'Русский (Russian)' },
    { value: 'sr', label: 'Српски (Serbian)' },
    { value: 'si', label: 'සිංහල (Sinhala)' },
    { value: 'sk', label: 'Slovenčina (Slovak)' },
    { value: 'sl', label: 'Slovenščina (Slovenian)' },
    { value: 'so', label: 'Soomaali (Somali)' },
    { value: 'es', label: 'Español (Spanish)' },
    { value: 'sw', label: 'Kiswahili (Swahili)' },
    { value: 'sv', label: 'Svenska (Swedish)' },
    { value: 'ta', label: 'தமிழ் (Tamil)' },
    { value: 'te', label: 'తెలుగు (Telugu)' },
    { value: 'th', label: 'ภาษาไทย (Thai)' },
    { value: 'tr', label: 'Türkçe (Turkish)' },
    { value: 'uk', label: 'Українська (Ukrainian)' },
    { value: 'ur', label: 'اردو (Urdu)' },
    { value: 'uz', label: 'Oʻzbek (Uzbek)' },
    { value: 'vi', label: 'Tiếng Việt (Vietnamese)' },
    { value: 'xh', label: 'isiXhosa (Xhosa)' },
    { value: 'yo', label: 'Yorùbá (Yoruba)' },
    { value: 'zu', label: 'isiZulu (Zulu)' },
  ];

  dateLocaleOptions: SelectOption[] = [
    { value: 'en-US', label: 'US (MM/DD/YYYY - 1,000.00)' },
    { value: 'en-GB', label: 'UK (DD/MM/YYYY - 1,000.00)' },
    { value: 'en-ZA', label: 'South Africa (YYYY/MM/DD - 1 000,00)' },
    { value: 'de-DE', label: 'German (DD.MM.YYYY - 1.000,00)' },
    { value: 'fr-FR', label: 'French (DD/MM/YYYY - 1 000,00)' },
    { value: 'es-ES', label: 'Spanish (DD/MM/YYYY - 1.000,00)' },
    { value: 'pt-BR', label: 'Brazilian (DD/MM/YYYY - 1.000,00)' },
    { value: 'ar-SA', label: 'Arabic (DD/MM/YYYY - 1,000.00)' },
    { value: 'hi-IN', label: 'Hindi (DD-MM-YYYY - 1,00,000.00)' },
    { value: 'ja-JP', label: 'Japanese (YYYY/MM/DD - 1,000)' },
    { value: 'zh-CN', label: 'Chinese (YYYY-MM-DD - 1,000.00)' },
    { value: 'ko-KR', label: 'Korean (YYYY.MM.DD - 1,000)' },
    { value: 'ru-RU', label: 'Russian (DD.MM.YYYY - 1 000,00)' },
    { value: 'tr-TR', label: 'Turkish (DD.MM.YYYY - 1.000,00)' },
    { value: 'nl-NL', label: 'Dutch (DD-MM-YYYY - 1.000,00)' },
    { value: 'sv-SE', label: 'Swedish (YYYY-MM-DD - 1 000,00)' },
    { value: 'pl-PL', label: 'Polish (DD.MM.YYYY - 1 000,00)' },
  ];

  currencyOptions: SelectOption[] = [
    { value: 'USD', label: 'USD ($) - US Dollar' },
    { value: 'CAD', label: 'CAD ($) - Canadian Dollar' },
    { value: 'GBP', label: 'GBP (£) - British Pound' },
    { value: 'EUR', label: 'EUR (€) - Euro' },
    { value: 'AUD', label: 'AUD ($) - Australian Dollar' },
    { value: 'NZD', label: 'NZD ($) - New Zealand Dollar' },
    { value: 'ZAR', label: 'ZAR (R) - South African Rand' },
    { value: 'NGN', label: 'NGN - Nigerian Naira' },
    { value: 'KES', label: 'KES - Kenyan Shilling' },
    { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
    { value: 'TZS', label: 'TZS - Tanzanian Shilling' },
    { value: 'UGX', label: 'UGX - Ugandan Shilling' },
    { value: 'ETB', label: 'ETB - Ethiopian Birr' },
    { value: 'EGP', label: 'EGP - Egyptian Pound' },
    { value: 'MAD', label: 'MAD - Moroccan Dirham' },
    { value: 'XOF', label: 'XOF - West African CFA Franc' },
    { value: 'XAF', label: 'XAF - Central African CFA Franc' },
    { value: 'AED', label: 'AED - UAE Dirham' },
    { value: 'SAR', label: 'SAR - Saudi Riyal' },
    { value: 'QAR', label: 'QAR - Qatari Riyal' },
    { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
    { value: 'BHD', label: 'BHD - Bahraini Dinar' },
    { value: 'OMR', label: 'OMR - Omani Rial' },
    { value: 'JOD', label: 'JOD - Jordanian Dinar' },
    { value: 'ILS', label: 'ILS - Israeli Shekel' },
    { value: 'TRY', label: 'TRY - Turkish Lira' },
    { value: 'INR', label: 'INR - Indian Rupee' },
    { value: 'PKR', label: 'PKR - Pakistani Rupee' },
    { value: 'LKR', label: 'LKR - Sri Lankan Rupee' },
    { value: 'BDT', label: 'BDT - Bangladeshi Taka' },
    { value: 'NPR', label: 'NPR - Nepalese Rupee' },
    { value: 'CNY', label: 'CNY - Chinese Yuan' },
    { value: 'JPY', label: 'JPY - Japanese Yen' },
    { value: 'KRW', label: 'KRW - South Korean Won' },
    { value: 'TWD', label: 'TWD - Taiwan Dollar' },
    { value: 'HKD', label: 'HKD ($) - Hong Kong Dollar' },
    { value: 'SGD', label: 'SGD ($) - Singapore Dollar' },
    { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
    { value: 'THB', label: 'THB - Thai Baht' },
    { value: 'IDR', label: 'IDR - Indonesian Rupiah' },
    { value: 'PHP', label: 'PHP - Philippine Peso' },
    { value: 'VND', label: 'VND - Vietnamese Dong' },
    { value: 'KHR', label: 'KHR - Cambodian Riel' },
    { value: 'MMK', label: 'MMK - Myanmar Kyat' },
    { value: 'BRL', label: 'BRL (R$) - Brazilian Real' },
    { value: 'MXN', label: 'MXN ($) - Mexican Peso' },
    { value: 'ARS', label: 'ARS ($) - Argentine Peso' },
    { value: 'CLP', label: 'CLP ($) - Chilean Peso' },
    { value: 'COP', label: 'COP ($) - Colombian Peso' },
    { value: 'PEN', label: 'PEN - Peruvian Sol' },
    { value: 'UYU', label: 'UYU ($) - Uruguayan Peso' },
    { value: 'BOB', label: 'BOB - Bolivian Boliviano' },
    { value: 'PYG', label: 'PYG - Paraguayan Guarani' },
    { value: 'VES', label: 'VES - Venezuelan Bolivar' },
    { value: 'DOP', label: 'DOP ($) - Dominican Peso' },
    { value: 'GTQ', label: 'GTQ - Guatemalan Quetzal' },
    { value: 'CRC', label: 'CRC - Costa Rican Colon' },
    { value: 'PAB', label: 'PAB - Panamanian Balboa' },
    { value: 'JMD', label: 'JMD ($) - Jamaican Dollar' },
    { value: 'TTD', label: 'TTD ($) - Trinidad Dollar' },
    { value: 'CHF', label: 'CHF - Swiss Franc' },
    { value: 'SEK', label: 'SEK - Swedish Krona' },
    { value: 'NOK', label: 'NOK - Norwegian Krone' },
    { value: 'DKK', label: 'DKK - Danish Krone' },
    { value: 'ISK', label: 'ISK - Icelandic Krona' },
    { value: 'PLN', label: 'PLN - Polish Zloty' },
    { value: 'CZK', label: 'CZK - Czech Koruna' },
    { value: 'HUF', label: 'HUF - Hungarian Forint' },
    { value: 'RON', label: 'RON - Romanian Leu' },
    { value: 'BGN', label: 'BGN - Bulgarian Lev' },
    { value: 'HRK', label: 'HRK - Croatian Kuna' },
    { value: 'RSD', label: 'RSD - Serbian Dinar' },
    { value: 'UAH', label: 'UAH - Ukrainian Hryvnia' },
    { value: 'RUB', label: 'RUB - Russian Ruble' },
    { value: 'GEL', label: 'GEL - Georgian Lari' },
    { value: 'AMD', label: 'AMD - Armenian Dram' },
    { value: 'AZN', label: 'AZN - Azerbaijani Manat' },
    { value: 'KZT', label: 'KZT - Kazakh Tenge' },
    { value: 'UZS', label: 'UZS - Uzbek Som' },
    { value: 'FJD', label: 'FJD ($) - Fijian Dollar' },
    { value: 'PGK', label: 'PGK - Papua New Guinean Kina' },
    { value: 'WST', label: 'WST - Samoan Tala' },
    { value: 'TOP', label: "TOP - Tongan Pa'anga" },
  ];

  pricingCountryOptions: SelectOption[] = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'au', label: 'Australia' },
    { value: 'nz', label: 'New Zealand' },
    { value: 'za', label: 'South Africa' },
    { value: 'ng', label: 'Nigeria' },
    { value: 'gh', label: 'Ghana' },
    { value: 'ke', label: 'Kenya' },
    { value: 'ae', label: 'United Arab Emirates' },
    { value: 'sa', label: 'Saudi Arabia' },
    { value: 'qa', label: 'Qatar' },
    { value: 'in', label: 'India' },
    { value: 'de', label: 'Germany' },
    { value: 'fr', label: 'France' },
    { value: 'es', label: 'Spain' },
    { value: 'it', label: 'Italy' },
    { value: 'nl', label: 'Netherlands' },
    { value: 'ie', label: 'Ireland' },
    { value: 'br', label: 'Brazil' },
    { value: 'mx', label: 'Mexico' },
    { value: 'co', label: 'Colombia' },
    { value: 'cl', label: 'Chile' },
    { value: 'ar', label: 'Argentina' },
    { value: 'jp', label: 'Japan' },
    { value: 'kr', label: 'South Korea' },
    { value: 'sg', label: 'Singapore' },
    { value: 'my', label: 'Malaysia' },
    { value: 'ph', label: 'Philippines' },
    { value: 'id', label: 'Indonesia' },
    { value: 'th', label: 'Thailand' },
    { value: 'vn', label: 'Vietnam' },
    { value: 'se', label: 'Sweden' },
    { value: 'no', label: 'Norway' },
    { value: 'dk', label: 'Denmark' },
    { value: 'fi', label: 'Finland' },
    { value: 'pl', label: 'Poland' },
    { value: 'ch', label: 'Switzerland' },
    { value: 'at', label: 'Austria' },
    { value: 'pt', label: 'Portugal' },
    { value: 'eg', label: 'Egypt' },
    { value: 'tz', label: 'Tanzania' },
    { value: 'et', label: 'Ethiopia' },
    { value: 'rw', label: 'Rwanda' },
    { value: 'other', label: 'Other' },
  ];

  pricingRegionOptionsByCountry: Record<string, SelectOption[]> = {
    us: [
      { value: 'alabama', label: 'Alabama' },
      { value: 'alaska', label: 'Alaska' },
      { value: 'arizona', label: 'Arizona' },
      { value: 'arkansas', label: 'Arkansas' },
      { value: 'california', label: 'California' },
      { value: 'colorado', label: 'Colorado' },
      { value: 'connecticut', label: 'Connecticut' },
      { value: 'delaware', label: 'Delaware' },
      { value: 'florida', label: 'Florida' },
      { value: 'georgia', label: 'Georgia' },
      { value: 'hawaii', label: 'Hawaii' },
      { value: 'idaho', label: 'Idaho' },
      { value: 'illinois', label: 'Illinois' },
      { value: 'indiana', label: 'Indiana' },
      { value: 'iowa', label: 'Iowa' },
      { value: 'kansas', label: 'Kansas' },
      { value: 'kentucky', label: 'Kentucky' },
      { value: 'louisiana', label: 'Louisiana' },
      { value: 'maine', label: 'Maine' },
      { value: 'maryland', label: 'Maryland' },
      { value: 'massachusetts', label: 'Massachusetts' },
      { value: 'michigan', label: 'Michigan' },
      { value: 'minnesota', label: 'Minnesota' },
      { value: 'mississippi', label: 'Mississippi' },
      { value: 'missouri', label: 'Missouri' },
      { value: 'montana', label: 'Montana' },
      { value: 'nebraska', label: 'Nebraska' },
      { value: 'nevada', label: 'Nevada' },
      { value: 'new-hampshire', label: 'New Hampshire' },
      { value: 'new-jersey', label: 'New Jersey' },
      { value: 'new-mexico', label: 'New Mexico' },
      { value: 'new-york', label: 'New York' },
      { value: 'north-carolina', label: 'North Carolina' },
      { value: 'north-dakota', label: 'North Dakota' },
      { value: 'ohio', label: 'Ohio' },
      { value: 'oklahoma', label: 'Oklahoma' },
      { value: 'oregon', label: 'Oregon' },
      { value: 'pennsylvania', label: 'Pennsylvania' },
      { value: 'rhode-island', label: 'Rhode Island' },
      { value: 'south-carolina', label: 'South Carolina' },
      { value: 'south-dakota', label: 'South Dakota' },
      { value: 'tennessee', label: 'Tennessee' },
      { value: 'texas', label: 'Texas' },
      { value: 'utah', label: 'Utah' },
      { value: 'vermont', label: 'Vermont' },
      { value: 'virginia', label: 'Virginia' },
      { value: 'washington', label: 'Washington' },
      { value: 'west-virginia', label: 'West Virginia' },
      { value: 'wisconsin', label: 'Wisconsin' },
      { value: 'wyoming', label: 'Wyoming' },
    ],
    ca: [
      { value: 'alberta', label: 'Alberta' },
      { value: 'british-columbia', label: 'British Columbia' },
      { value: 'manitoba', label: 'Manitoba' },
      { value: 'new-brunswick', label: 'New Brunswick' },
      { value: 'newfoundland', label: 'Newfoundland & Labrador' },
      { value: 'nova-scotia', label: 'Nova Scotia' },
      { value: 'ontario', label: 'Ontario' },
      { value: 'pei', label: 'Prince Edward Island' },
      { value: 'quebec', label: 'Quebec' },
      { value: 'saskatchewan', label: 'Saskatchewan' },
      { value: 'northwest', label: 'Northwest Territories' },
      { value: 'nunavut', label: 'Nunavut' },
      { value: 'yukon', label: 'Yukon' },
    ],
    uk: [
      { value: 'london', label: 'London' },
      { value: 'south-east', label: 'South East' },
      { value: 'south-west', label: 'South West' },
      { value: 'east-anglia', label: 'East Anglia' },
      { value: 'east-midlands', label: 'East Midlands' },
      { value: 'west-midlands', label: 'West Midlands' },
      { value: 'north-west', label: 'North West' },
      { value: 'north-east', label: 'North East' },
      { value: 'yorkshire', label: 'Yorkshire & Humber' },
      { value: 'wales', label: 'Wales' },
      { value: 'scotland', label: 'Scotland' },
      { value: 'northern-ireland', label: 'Northern Ireland' },
    ],
    au: [
      { value: 'nsw', label: 'New South Wales' },
      { value: 'vic', label: 'Victoria' },
      { value: 'qld', label: 'Queensland' },
      { value: 'wa', label: 'Western Australia' },
      { value: 'sa-au', label: 'South Australia' },
      { value: 'tas', label: 'Tasmania' },
      { value: 'act', label: 'Australian Capital Territory' },
      { value: 'nt', label: 'Northern Territory' },
    ],
    za: [
      { value: 'gauteng', label: 'Gauteng' },
      { value: 'western-cape', label: 'Western Cape' },
      { value: 'kwazulu-natal', label: 'KwaZulu-Natal' },
      { value: 'eastern-cape', label: 'Eastern Cape' },
      { value: 'free-state', label: 'Free State' },
      { value: 'limpopo', label: 'Limpopo' },
      { value: 'mpumalanga', label: 'Mpumalanga' },
      { value: 'north-west', label: 'North West' },
      { value: 'northern-cape', label: 'Northern Cape' },
    ],
    ae: [
      { value: 'abu-dhabi', label: 'Abu Dhabi' },
      { value: 'dubai', label: 'Dubai' },
      { value: 'sharjah', label: 'Sharjah' },
      { value: 'ajman', label: 'Ajman' },
      { value: 'fujairah', label: 'Fujairah' },
      { value: 'ras-al-khaimah', label: 'Ras Al Khaimah' },
      { value: 'umm-al-quwain', label: 'Umm Al Quwain' },
    ],
    in: [
      { value: 'maharashtra', label: 'Maharashtra' },
      { value: 'karnataka', label: 'Karnataka' },
      { value: 'tamil-nadu', label: 'Tamil Nadu' },
      { value: 'delhi', label: 'Delhi NCR' },
      { value: 'telangana', label: 'Telangana' },
      { value: 'gujarat', label: 'Gujarat' },
      { value: 'uttar-pradesh', label: 'Uttar Pradesh' },
      { value: 'rajasthan', label: 'Rajasthan' },
      { value: 'west-bengal', label: 'West Bengal' },
      { value: 'kerala', label: 'Kerala' },
      { value: 'punjab', label: 'Punjab' },
      { value: 'other-in', label: 'Other' },
    ],
    ng: [
      { value: 'lagos', label: 'Lagos' },
      { value: 'abuja', label: 'Abuja (FCT)' },
      { value: 'rivers', label: 'Rivers' },
      { value: 'oyo', label: 'Oyo' },
      { value: 'kano', label: 'Kano' },
      { value: 'enugu', label: 'Enugu' },
      { value: 'delta', label: 'Delta' },
      { value: 'kaduna', label: 'Kaduna' },
      { value: 'other-ng', label: 'Other' },
    ],
    mx: [
      { value: 'cdmx', label: 'Ciudad de Mexico' },
      { value: 'jalisco', label: 'Jalisco' },
      { value: 'nuevo-leon', label: 'Nuevo Leon' },
      { value: 'estado-de-mexico', label: 'Estado de Mexico' },
      { value: 'quintana-roo', label: 'Quintana Roo' },
      { value: 'puebla', label: 'Puebla' },
      { value: 'guanajuato', label: 'Guanajuato' },
      { value: 'other-mx', label: 'Other' },
    ],
    de: [
      { value: 'bayern', label: 'Bayern (Bavaria)' },
      { value: 'berlin', label: 'Berlin' },
      { value: 'hamburg', label: 'Hamburg' },
      { value: 'hessen', label: 'Hessen' },
      { value: 'nrw', label: 'Nordrhein-Westfalen' },
      { value: 'bw', label: 'Baden-Wurttemberg' },
      { value: 'sachsen', label: 'Sachsen' },
      { value: 'niedersachsen', label: 'Niedersachsen' },
      { value: 'other-de', label: 'Other' },
    ],
    br: [
      { value: 'sao-paulo', label: 'Sao Paulo' },
      { value: 'rio', label: 'Rio de Janeiro' },
      { value: 'minas-gerais', label: 'Minas Gerais' },
      { value: 'bahia', label: 'Bahia' },
      { value: 'parana', label: 'Parana' },
      { value: 'rs', label: 'Rio Grande do Sul' },
      { value: 'other-br', label: 'Other' },
    ],
  };

  teamRoleOptions: SelectOption[] = [
    { value: 'Laborer', label: 'Laborer' },
    { value: 'Apprentice', label: 'Apprentice' },
    { value: 'Foreman', label: 'Foreman' },
    { value: 'Superintendent', label: 'Superintendent' },
    { value: 'Project Manager', label: 'Project Manager' },
    { value: 'Operations Manager', label: 'Operations Manager' },
    { value: 'Admin', label: 'Admin' },
  ];

  docCategoryOptions: SelectOption[] = [
    { value: 'License', label: 'License' },
    { value: 'Certification', label: 'Certification' },
    { value: 'Insurance', label: 'Insurance' },
    { value: 'Bond', label: 'Bond' },
    { value: 'Permit', label: 'Permit' },
    { value: 'Safety', label: 'Safety Document' },
    { value: 'Tax', label: 'Tax / Business Registration' },
    { value: 'Other', label: 'Other' },
  ];

  docSubTypesByCategory: Record<string, SelectOption[]> = {
    License: [
      { value: 'General Contractor License', label: 'General Contractor License' },
      { value: 'Electrical Contractor License', label: 'Electrical Contractor License' },
      { value: 'Plumbing Contractor License', label: 'Plumbing Contractor License' },
      { value: 'HVAC Contractor License', label: 'HVAC Contractor License' },
      { value: 'Roofing Contractor License', label: 'Roofing Contractor License' },
      { value: 'Excavation Contractor License', label: 'Excavation Contractor License' },
      { value: 'Demolition Contractor License', label: 'Demolition Contractor License' },
      { value: 'Specialty Trade License', label: 'Specialty Trade License' },
      { value: 'Other License', label: 'Other License' },
    ],
    Certification: [
      { value: 'OSHA 10-Hour', label: 'OSHA 10-Hour' },
      { value: 'OSHA 30-Hour', label: 'OSHA 30-Hour' },
      { value: 'EPA Lead-Safe Certification', label: 'EPA Lead-Safe Certification' },
      { value: 'NCCER Certification', label: 'NCCER Certification' },
      { value: 'LEED Accreditation', label: 'LEED Accreditation' },
      { value: 'First Aid / CPR', label: 'First Aid / CPR' },
      { value: 'Other Certification', label: 'Other Certification' },
    ],
    Insurance: [
      { value: 'General Liability Insurance', label: 'General Liability Insurance' },
      { value: 'Workers Compensation Insurance', label: 'Workers Compensation Insurance' },
      { value: 'Commercial Auto Insurance', label: 'Commercial Auto Insurance' },
      { value: 'Professional Liability Insurance', label: 'Professional Liability Insurance' },
      { value: 'Umbrella Liability Insurance', label: 'Umbrella Liability Insurance' },
      { value: 'Other Insurance', label: 'Other Insurance' },
    ],
    Bond: [
      { value: 'Surety Bond', label: 'Surety Bond' },
      { value: 'Bid Bond', label: 'Bid Bond' },
      { value: 'Performance Bond', label: 'Performance Bond' },
      { value: 'Payment Bond', label: 'Payment Bond' },
      { value: 'Maintenance Bond', label: 'Maintenance Bond' },
      { value: 'Other Bond', label: 'Other Bond' },
    ],
    Permit: [
      { value: 'Building Permit', label: 'Building Permit' },
      { value: 'Electrical Permit', label: 'Electrical Permit' },
      { value: 'Plumbing Permit', label: 'Plumbing Permit' },
      { value: 'Mechanical Permit', label: 'Mechanical Permit' },
      { value: 'Demolition Permit', label: 'Demolition Permit' },
      { value: 'Other Permit', label: 'Other Permit' },
    ],
    Safety: [
      { value: 'Site Safety Plan', label: 'Site Safety Plan' },
      { value: 'Job Hazard Analysis', label: 'Job Hazard Analysis' },
      { value: 'Incident Report', label: 'Incident Report' },
      { value: 'Safety Training Record', label: 'Safety Training Record' },
      { value: 'Toolbox Talk Log', label: 'Toolbox Talk Log' },
      { value: 'Other Safety Document', label: 'Other Safety Document' },
    ],
    Tax: [
      { value: 'W-9 Form', label: 'W-9 Form' },
      { value: 'Tax ID / EIN Letter', label: 'Tax ID / EIN Letter' },
      { value: 'Business Registration', label: 'Business Registration' },
      { value: 'Other Tax / Business Document', label: 'Other Tax / Business Document' },
    ],
    Other: [{ value: 'Other', label: 'Other' }],
  };

  starterPlanFeatures = [
    'Up to 3 Projects',
    'Basic AI Estimating',
    'Marketplace Access',
    'Email Support',
    '1 Team Member',
  ];

  professionalPlanFeatures = [
    'Unlimited Projects',
    'Advanced AI Estimating',
    'Priority Marketplace Access',
    'Phone & Chat Support',
    'Up to 10 Team Members',
    'Blueprint AI',
    'Budget Tracking',
  ];

  enterprisePlanFeatures = [
    'Everything in Professional',
    'Unlimited Team Members',
    'Dedicated Success Manager',
    'Custom Integrations',
    'Advanced Analytics',
    'White Label Options',
    'SLA Guarantee',
    'On-Site Training',
  ];
  @ViewChild('countryAutoTrigger') countryAutoTrigger!: MatAutocompleteTrigger;
  @ViewChild('stateAutoTrigger') stateAutoTrigger!: MatAutocompleteTrigger;

  @ViewChild('profileTabs') profileTabs!: MatTabGroup;
  addressControl = new FormControl<string>('');
  options: { description: string; place_id: string }[] = [];

  billingAddressOptions: google.maps.places.AutocompletePrediction[] = [];
  physicalAddressOptions: google.maps.places.AutocompletePrediction[] = [];

  profile: Profile | null = null;
  profileForm: FormGroup;
  teamForm: FormGroup;
  cancelTrail: boolean = false;
  isLoading = true;
  isSaving = false;
  rowBusy = new Set<string>();
  isSendingInvite = false;
  userLatitude: number | null = null;
  userLongitude: number | null = null;

  isBrowser: boolean;
  subscriptionPackages: {
    value: string;
    display: string;
    amount: number;
    annualAmount: number;
  }[] = [];
  subscriptionuserPackages: {
    value: string;
    display: string;
    amount: number;
  }[] = [];
  progress: number = 0;
  isUploading: boolean = false;
  uploadedFilesCount: number = 0;
  uploadedFileNames: string[] = [];
  uploadedFileUrls: string[] = [];
  sessionId: string = '';
  subscriptionActive: boolean = false;
  jobCardForm: FormGroup;
  userRole: string | null = null;
  today: Date = new Date();

  selectedCompanyCountryCode: any = null;

  billingAddressPayload: any | null = null;
  physicalAddressPayload: any | null = null;

  isVerified = false;
  countries: any[] = [];
  states: any[] = [];
  filteredCountries: Observable<any[]> = of([]);
  filteredStates: Observable<any[]> = of([]);
  availableRoles: { value: string; display: string }[] = userTypes
    .filter((ut) => ut.value !== 'GENERAL_CONTRACTOR')
    .filter((ut) => ut.value !== 'SUBCONTRACTOR')
    .filter((ut) => ut.value !== 'VENDOR');

  teamMembers: TeamMember[] = [];
  activeTeamMembers: TeamMember[] = [];
  deactivatedTeamMembers: TeamMember[] = [];
  documents: ProfileDocument[] = [];
  displayedColumns: string[] = ['name', 'role', 'email', 'status', 'actions'];
  documentColumns: string[] = ['name', 'type', 'uploadedDate', 'actions'];

  selectedCountryCode: any;
  countryNumberCode: any[] = [];
  countryFilterCtrl = new FormControl('');
  filteredCountryCodes!: Observable<any[]>;
  //subscription variables
  activeSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
  teamSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
  inactiveSubscriptionsData = new MatTableDataSource<SubscriptionRow>([]);
  subscriptionColumns: string[] = [
    'package',
    'validUntil',
    'amount',
    'assignedUser',
    'status',
    'actions',
  ];
  subscriptionsData = new MatTableDataSource<SubscriptionRow>([]);

  addresses: UserAddress[] = [];
  isLoadingAddresses = false;
  addressColumns: string[] = [
    'formattedAddress',
    'city',
    'state',
    'country',
    'actions',
  ];
  addressDataSource = new MatTableDataSource<UserAddress>([]);

  isLoadingSubscriptions = false;
  subscriptionsError: string | null = null;
  constructionTypes = constructionTypes;
  preferenceOptions = preferenceOptions;
  supplierProducts = supplierProducts;
  deliveryAreas = deliveryAreas;
  leadTimeDelivery = leadTimeDelivery;
  availabilityOptions = availabilityOptions;
  certificationOptions = certificationOptions;

  alertMessage: string | undefined;
  showAlert: boolean | undefined;

  @ViewChild(MatPaginator) subscriptionsPaginator!: MatPaginator;
  @ViewChild(MatSort) subscriptionsSort!: MatSort;
  //subscription children
  @ViewChild('activePaginator') activePaginator!: MatPaginator;
  @ViewChild('teamPaginator') teamPaginator!: MatPaginator;
  @ViewChild('inactivePaginator') inactivePaginator!: MatPaginator;
  //subscription sorting
  @ViewChild('activeSort') activeSort!: MatSort;
  @ViewChild('teamSort') teamSort!: MatSort;
  @ViewChild('inactiveSort') inactiveSort!: MatSort;

  constructor(
    private profileService: ProfileService,
    public authService: AuthService,
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private stripeService: StripeService,
    private dialog: MatDialog,
    private matIconRegistry: MatIconRegistry,
    private addressStore: UserAddressStoreService,
    private route: ActivatedRoute,
    private googlePlaces: GooglePlacesService,
    private registrationService: RegistrationService,
    private router: Router,
    private domSanitizer: DomSanitizer,
    private jobsService: JobsService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private snackBar: MatSnackBar,
    private teamManagementService: TeamManagementService,
    private companyService: CompanyService,
  ) {
    this.jobCardForm = new FormGroup({});
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.profileForm = this.fb.group({
      id: [null],
      email: [null],
      firstName: [null, Validators.required],
      lastName: [null, Validators.required],
      phoneNumber: [null, [Validators.required, this.phoneValidator()]],
      userType: [null],
      companyEmail: [null],
      companyPhone: [null, [this.phoneValidator()]],
      companyName: [null],
      companyRegNo: [null],
      companyCountryNumberCode: [''],
      vatNo: [null],
      constructionType: [null],
      nrEmployees: [null],
      yearsOfOperation: [null],
      certificationStatus: [null],
      certificationDocumentPath: [null],
      availability: [null],
      trade: [null],
      SessionId: [null],
      supplierType: [null],
      productsOffered: [[]],
      projectPreferences: [[]],
      deliveryArea: [null],
      deliveryTime: [null],
      country: [null],
      countryCode: [''],
      state: [null],
      city: [null],
      subscriptionPackage: ['', Validators.required],
      isVerified: [false],
      address: [null],
      formattedAddress: [''],
      streetNumber: [''],
      streetName: [''],
      postalCode: [''],
      countryNumberCode: [''],
      latitude: [null],
      longitude: [null],
      googlePlaceId: [''],
      notificationRadius: [100],
      jobPreferences: [[]],
      billingAddress: [null],
      physicalAddress: [null],
      billingAddressInput: [''],
      physicalAddressInput: [''],
    });

    this.teamForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      role: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });

    this.matIconRegistry.addSvgIcon(
      'verified',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/custom-svg/verification-symbol-svgrepo-com.svg',
      ),
    );
    this.matIconRegistry.addSvgIcon(
      'notVerified',
      this.domSanitizer.bypassSecurityTrustResourceUrl(
        'app/assets/custom-svg/status-failed-svgrepo-com.svg',
      ),
    );
  }

  ngAfterViewInit(): void {
    this.subscriptionsData.paginator = this.subscriptionsPaginator;
    this.subscriptionsData.sort = this.subscriptionsSort;

    this.activeSubscriptionsData.paginator = this.activePaginator;
    this.teamSubscriptionsData.paginator = this.teamPaginator;
    this.inactiveSubscriptionsData.paginator = this.inactivePaginator;

    this.activeSubscriptionsData.sort = this.activeSort;
    this.teamSubscriptionsData.sort = this.teamSort;
    this.inactiveSubscriptionsData.sort = this.inactiveSort;

    this.addressControl.valueChanges.subscribe(async (value) => {
      if (!value || typeof value !== 'string') {
        this.options = [];
        return;
      }

      this.options = (
        await this.googlePlaces.getPredictions(
          value,
          this.userLatitude && this.userLongitude
            ? { lat: this.userLatitude, lng: this.userLongitude }
            : undefined,
        )
      ).map((p) => ({
        description: p.description,
        place_id: p.place_id,
      }));
    });
  }

  ngOnInit(): void {
    this.loadSubscriptionPackages();
    this.googlePlaces.load();
    this.profileForm
      .get('billingAddressInput')
      ?.valueChanges.subscribe(async (value) => {
        this.billingAddressOptions = value
          ? await this.googlePlaces.getPredictions(value)
          : [];
      });

    this.profileForm
      .get('physicalAddressInput')
      ?.valueChanges.subscribe(async (value) => {
        this.physicalAddressOptions = value
          ? await this.googlePlaces.getPredictions(value)
          : [];
      });
    this.registrationService.getCountries().subscribe((countries) => {
      this.countries = countries;
    });

    this.registrationService.getAllStates().subscribe((allStates) => {
      this.states = allStates;

      // Load all country dial codes just like registration
      this.registrationService.getAllCountryNumberCodes().subscribe((data) => {
        this.countryNumberCode = data;

        // Default to user’s saved or ZA
        const savedCode = this.profileForm.get('countryCode')?.value;
        this.selectedCountryCode =
          this.countryNumberCode.find(
            (c) => c.countryPhoneNumberCode === savedCode,
          ) || this.countryNumberCode.find((c) => c.countryCode === 'ZA');

        // Initialize the async filter observable
        this.filteredCountryCodes = this.countryFilterCtrl.valueChanges.pipe(
          startWith(''),
          map((value) => this._filterCountryCodes(value ?? '')),
        );
      });

      const countryCtrl = this.profileForm.get('country')!;
      const stateCtrl = this.profileForm.get('state')!;

      this.filteredStates = combineLatest([
        countryCtrl.valueChanges.pipe(startWith(countryCtrl.value)),
        stateCtrl.valueChanges.pipe(startWith('')),
      ]).pipe(
        map(([countryId, search]) => {
          const term = (typeof search === 'string' ? search : '').toLowerCase();
          if (!countryId) return [];

          const normalizedCountryId = (countryId + '').toLowerCase();
          const inCountry = this.states.filter(
            (s) => (s.countryId + '').toLowerCase() === normalizedCountryId,
          );

          return term
            ? inCountry.filter(
                (s) =>
                  (s.stateName ?? '').toLowerCase().includes(term) ||
                  (s.stateCode ?? '').toLowerCase().includes(term),
              )
            : inCountry;
        }),
      );
    });

    this.filteredCountries = this.profileForm.get('country')!.valueChanges.pipe(
      startWith(''),
      map((value) => this._filterCountries(value)),
    );

    this.authService.currentUser$.subscribe((user) => {
      this.userRole = this.authService.getUserRole();
      if (user && user.id) {
        this.loadProfile();
        this.loadDocuments();
        combineLatest([
          this.registrationService.getAllCountryNumberCodes().pipe(take(1)),
        ]).subscribe(([codes]) => {
          this.countryNumberCode = codes;
          this.loadCompanyProfile(user.id);
        });
        this.checkSubscription();
        this.manageSubscriptions();
        this.GetUserSubscription();
      } else if (!this.authService.isLoggedIn()) {
        this.isLoading = false;
      }
    });
    console.log(this.subscriptionPackages);
    this.route.queryParamMap.pipe(take(1)).subscribe((params) => {
      if (params.get('subSuccess') === '1') {
        this.snackBar.open('Subscription successfully added', 'Dismiss', {
          duration: 5000,
        });
        // remove the param from the URL
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { subSuccess: null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    this.sessionId = uuidv4();
    this.profileService.initializeSignalR();

    this.profileService.progress$.subscribe((progress) => {
      this.progress = progress;
    });

    this.profileService.uploadComplete$.subscribe((fileCount) => {
      this.isUploading = false;
      this.loadDocuments(); // reload automatically after upload
      this.resetFileInput();
      console.log(`Upload complete. Total ${fileCount} file(s) uploaded.`);
    });

    if (!this.profileForm.get('subscriptionPackage')?.value) {
      this.profileForm.patchValue({ subscriptionPackage: 'professional' });
    }
  }

  setActiveTab(tab: SettingsTab): void {
    this.activeTab = tab;
  }

  onDemoUserTypeChanged(nextValue: string): void {
    this.demoUserType = nextValue;
    this.profileForm.patchValue({ userType: this.mapDemoUserTypeToBackend(nextValue) });
    this.markSettingsChanged();
  }

  private mapDemoUserTypeToBackend(demo: string): string {
    if (demo === 'General Contractor') return 'GENERAL_CONTRACTOR';
    if (demo === 'Subcontractor / Tradesman') return 'SUBCONTRACTOR';
    if (demo === 'Vendor / Supplier') return 'VENDOR';
    return 'PROJECT_MANAGER';
  }

  private mapBackendUserTypeToDemo(backend: string | null | undefined): string {
    if (backend === 'GENERAL_CONTRACTOR') return 'General Contractor';
    if (backend === 'SUBCONTRACTOR') return 'Subcontractor / Tradesman';
    if (backend === 'VENDOR') return 'Vendor / Supplier';
    return 'Owner / Developer';
  }

  onTeamRoleChanged(member: TeamMember, nextRole: string): void {
    member.role = nextRole;
    this.markSettingsChanged();
  }

  toggleTeamActionMenu(member: TeamMember): void {
    this.openTeamMenuId = this.openTeamMenuId === member.id ? null : member.id;
  }

  isTeamActionMenuOpen(member: TeamMember): boolean {
    return this.openTeamMenuId === member.id;
  }

  resendInvite(member: TeamMember): void {
    member.status = 'Invited';
    this.snackBar.open(`Invite re-sent to ${member.email}`, 'Close', {
      duration: 2500,
    });
    this.markSettingsChanged();
  }

  removeMember(member: TeamMember): void {
    this.openTeamMenuId = null;
    this.openConfirmationDialog(member.id, 'delete');
  }

  sanitizeNumericInput(
    event: Event,
    formControlName?: string,
    modelProp?: 'demoNotificationRadius',
  ): void {
    const input = event.target as HTMLInputElement;
    const cleaned = (input.value || '').replace(/\D+/g, '');
    input.value = cleaned;

    if (formControlName) {
      this.profileForm.get(formControlName)?.setValue(cleaned, { emitEvent: false });
    }

    if (modelProp) {
      this[modelProp] = cleaned;
    }
  }

  onUploadDocCategoryChanged(nextValue: string): void {
    this.uploadDocCategory = nextValue;
    this.uploadDocSubType = '';
    this.markSettingsChanged();
  }

  onUploadDocSubTypeChanged(nextValue: string): void {
    this.uploadDocSubType = nextValue;
    if (!this.uploadDocName) {
      this.uploadDocName = nextValue;
    }
    this.markSettingsChanged();
  }

  getUploadSubTypeOptions(): SelectOption[] {
    return this.docSubTypesByCategory[this.uploadDocCategory] ?? [];
  }

  planActionLabel(plan: 'starter' | 'professional' | 'enterprise'): string {
    const order: Array<'starter' | 'professional' | 'enterprise'> = [
      'starter',
      'professional',
      'enterprise',
    ];
    const currentIdx = order.indexOf(this.selectedPlan);
    const planIdx = order.indexOf(plan);
    if (plan === this.selectedPlan) return 'Current Plan';
    return planIdx > currentIdx ? 'Upgrade' : 'Downgrade';
  }

  navItemsByGroup(group: 'Account' | 'Preferences' | 'Premium'): SettingsNavItem[] {
    return this.settingsNavItems.filter((item) => item.group === group);
  }

  markSettingsChanged(): void {
    this.hasSettingsChanges = true;
  }

  saveSettingsPreferences(): void {
    this.hasSettingsChanges = false;
    this.saveToast = true;
    this.snackBar.open('Preferences updated successfully.', 'Close', {
      duration: 2500,
    });
    setTimeout(() => {
      this.saveToast = false;
    }, 2500);
  }

  resetSettingsPreferences(): void {
    this.themeMode = 'dark';
    this.uiDensity = 'comfortable';
    this.measurementSystem = 'imperial';
    this.temperatureUnit = 'fahrenheit';
    this.areaUnit = 'ft²';
    this.volumeUnit = 'ft³';
    this.blueprintZoom = 'fit';
    this.autoSave = true;
    this.defaultLanding = 'projects';
    this.emailNotif = true;
    this.inAppNotif = true;
    this.smsNotif = false;
    this.pushNotif = true;
    this.bidAlerts = true;
    this.timelineAlerts = true;
    this.budgetAlerts = true;
    this.connectionAlerts = true;
    this.inviteAlerts = true;
    this.appLanguage = 'en';
    this.dateLocale = 'en-US';
    this.docCurrency = 'USD';
    this.docOutputMode = 'single';
    this.docOutputLanguage = 'en';
    this.dualPrimaryLang = 'en';
    this.dualSecondaryLang = 'es';
    this.defaultMarkup = '15';
    this.laborBurden = '35';
    this.pricingCountry = 'us';
    this.pricingRegion = 'texas';
    this.docGradientStart = '#FCD109';
    this.docGradientEnd = '#F59E0B';
    this.docGradientDir = 'to right';
    this.docLogoUploaded = false;
    this.docLogoFileName = '';
    this.hasSettingsChanges = false;
  }

  getPlanPrice(plan: 'starter' | 'professional' | 'enterprise'): string {
    if (plan === 'starter') return this.subBilling === 'monthly' ? '$179/mo' : '$1,790/yr';
    if (plan === 'professional') return this.subBilling === 'monthly' ? '$280/mo' : '$2,800/yr';
    return this.subBilling === 'monthly' ? '$440/mo' : '$4,400/yr';
  }

  choosePlan(plan: 'starter' | 'professional' | 'enterprise'): void {
    this.selectedPlan = plan;
    this.profileForm.patchValue({ subscriptionPackage: plan });
    this.markSettingsChanged();
  }

  setBillingCycle(cycle: 'monthly' | 'annually'): void {
    this.subBilling = cycle;
    this.markSettingsChanged();
  }

  onPricingCountryChanged(nextValue: string): void {
    this.pricingCountry = nextValue;
    this.pricingRegion = '';
    this.markSettingsChanged();
  }

  getPricingRegionOptions(): SelectOption[] {
    return this.pricingRegionOptionsByCountry[this.pricingCountry] ?? [];
  }

  hasPricingRegionOptions(): boolean {
    return this.getPricingRegionOptions().length > 0;
  }

  getPricingRegionLabel(): string {
    if (this.pricingCountry === 'us' || this.pricingCountry === 'au') return 'State';
    if (this.pricingCountry === 'ca' || this.pricingCountry === 'za') return 'Province';
    if (this.pricingCountry === 'ae') return 'Emirate';
    return 'State / Province / Region';
  }

  getDocHeaderBackground(): string {
    if (this.docHeaderStyle === 'gradient') {
      return `linear-gradient(${this.docGradientDir}, ${this.docGradientStart}, ${this.docGradientEnd})`;
    }
    return this.docPrimaryColor;
  }

  onDocLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.docLogoUploaded = true;
    this.docLogoFileName = file.name;
    this.markSettingsChanged();
  }

  clearDocLogo(event?: Event): void {
    event?.stopPropagation();
    this.docLogoUploaded = false;
    this.docLogoFileName = '';
    this.markSettingsChanged();
  }

  getPreferenceFooterVisible(): boolean {
    return (
      this.activeTab === 'appearance' ||
      this.activeTab === 'measurements' ||
      this.activeTab === 'construction' ||
      this.activeTab === 'notifications' ||
      this.activeTab === 'language' ||
      this.activeTab === 'advanced'
    );
  }

  get totalCertDocs(): number {
    return this.certDocuments.length;
  }

  get activeCertDocs(): number {
    return this.certDocuments.filter((d) => d.status === 'Active').length;
  }

  get expiringCertDocs(): number {
    return this.certDocuments.filter((d) => d.status === 'Expiring').length;
  }

  get expiredCertDocs(): number {
    return this.certDocuments.filter((d) => d.status === 'Expired').length;
  }

  addCertDocumentPlaceholder(): void {
    if (!this.uploadDocCategory || !this.uploadDocName) {
      this.snackBar.open('Please select a category and document name.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.certDocuments = [
      {
        id: Date.now(),
        name: this.uploadDocName,
        type: (this.uploadDocCategory as CertDocumentItem['type']) || 'Other',
        issuer: this.uploadIssuer || '—',
        number: this.uploadNumber || '—',
        expirationDate: this.uploadExpDate || 'N/A',
        status: 'Active',
      },
      ...this.certDocuments,
    ];

    this.uploadDocCategory = '';
    this.uploadDocName = '';
    this.uploadIssuer = '';
    this.uploadNumber = '';
    this.uploadExpDate = '';
    this.showUploadForm = false;
    this.markSettingsChanged();
  }

  removeCertDocument(id: number): void {
    this.certDocuments = this.certDocuments.filter((d) => d.id !== id);
    this.markSettingsChanged();
  }
  private _filterCountries(value: string | null): any[] {
    const filterValue = (value ?? '').toLowerCase();
    return !filterValue
      ? this.countries
      : this.countries.filter(
          (c) =>
            c.countryName.toLowerCase().includes(filterValue) ||
            c.countryCode.toLowerCase().includes(filterValue),
        );
  }
  private _filterCountryCodes(value: string): any[] {
    const search = (value || '').toLowerCase().trim();
    if (!search) return this.countryNumberCode;

    return this.countryNumberCode.filter(
      (c) =>
        c.countryCode?.toLowerCase().includes(search) ||
        c.countryPhoneNumberCode?.toLowerCase().includes(search),
    );
  }
  countryDisplayFn = (id: string) =>
    this.countries.find((c) => c.id === id)?.countryName ?? '';

  stateDisplayFn = (state: any) => {
    if (typeof state === 'string') {
      return this.states.find((s) => s.id === state)?.stateName ?? '';
    } else if (state && typeof state === 'object') {
      return state.stateName || '';
    }
    return '';
  };
  openCountryPanel() {
    const ctrl = this.profileForm.get('country');
    ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
    setTimeout(() => this.countryAutoTrigger?.openPanel());
  }

  openStatePanel() {
    const ctrl = this.profileForm.get('state');
    ctrl?.setValue(ctrl.value ?? '', { emitEvent: true });
    setTimeout(() => this.stateAutoTrigger?.openPanel());
  }
  loadProfile(): void {
    this.isLoading = true;

    this.profileService
      .getProfile()
      .pipe(
        catchError((err) => {
          const currentUser = this.authService.currentUserSubject.value;
          if (currentUser && currentUser.isTeamMember && currentUser.id) {
            return this.profileService.getTeamMemberProfile(currentUser.id);
          }
          return throwError(() => err);
        }),
        switchMap((data: Profile | Profile[]) => {
          const profileData = Array.isArray(data) ? data[0] : data;
          this.profile = profileData;

          // Load countries & states in parallel before patching form
          return combineLatest([
            this.registrationService.getCountries(),
            this.registrationService.getAllStates(),
          ]).pipe(
            take(1),
            map(([countries, states]) => ({ profileData, countries, states })),
          );
        }),
      )
      .subscribe({
        next: ({ profileData, countries, states }) => {
          this.countries = countries;
          this.states = states;
          const rawCT: any = profileData.constructionType;
          profileData.constructionType =
            typeof rawCT === 'string'
              ? rawCT.split(',').map((s) => s.trim())[0] ?? null
              : Array.isArray(rawCT)
                ? (rawCT[0] ?? null)
                : rawCT ?? null;

          const rawDA: any = profileData.deliveryArea;
          profileData.deliveryArea =
            typeof rawDA === 'string'
              ? rawDA.split(',').map((s) => s.trim())[0] ?? null
              : Array.isArray(rawDA)
                ? (rawDA[0] ?? null)
                : rawDA ?? null;

          const rawPO: any = profileData.productsOffered;
          profileData.productsOffered =
            typeof rawPO === 'string'
              ? rawPO.split(',').map((s) => s.trim()) // ✅ FIXED — THIS WAS WRONG
              : Array.isArray(rawPO)
                ? rawPO
                : [];

          const rawJP: any = profileData.projectPreferences;
          profileData.projectPreferences =
            typeof rawJP === 'string'
              ? rawJP.split(',').map((s) => s.trim())
              : Array.isArray(rawJP)
                ? rawJP
                : [];
          const rawJPr: any = profileData.jobPreferences;
          profileData.jobPreferences =
            typeof rawJPr === 'string'
              ? rawJPr.split(',').map((s) => s.trim())
              : Array.isArray(rawJPr)
                ? rawJPr
                : [];
          this.profileForm.patchValue(profileData);

          // --- ✅ DIAL CODE PRESELECTION & SYNC ---
          if (
            profileData.countryNumberCode &&
            this.countryNumberCode.length > 0
          ) {
            // Match by GUID
            const matched = this.countryNumberCode.find(
              (c) => c.id === profileData.countryNumberCode,
            );

            this.selectedCountryCode =
              matched ||
              this.countryNumberCode.find((c) => c.countryCode === 'ZA') ||
              this.countryNumberCode[0];

            const savedPhone = this.profileForm.get('phoneNumber')?.value || '';
            const savedCountryCode = (this.selectedCountryCode?.countryCode ||
              'ZA') as CountryCode;
            const savedParsed = parsePhoneNumberFromString(
              savedPhone,
              savedCountryCode,
            );
            if (savedParsed?.isValid()) {
              this.profileForm.patchValue({
                phoneNumber: savedParsed.formatNational(),
              });
            }

            // Initialize search filter
            this.filteredCountryCodes =
              this.countryFilterCtrl.valueChanges.pipe(
                startWith(''),
                map((v) => this._filterCountryCodes(v ?? '')),
              );
          }

          //Here we are going to set the user address that was saved on registration.
          // --- populate Google address field from UserAddresses ---
          if (
            profileData.userAddresses &&
            profileData.userAddresses.length > 0
          ) {
            const saved = profileData.userAddresses[0];
            const patchObj = {
              address: saved.formattedAddress,
              formattedAddress: saved.formattedAddress,
              streetNumber: saved.streetNumber,
              streetName: saved.streetName,
              city: saved.city,
              state: saved.state,
              postalCode: saved.postalCode,
              country: saved.country,
              countrycode: saved.countryCode,
              latitude: saved.latitude,
              longitude: saved.longitude,
              googlePlaceId: saved.googlePlaceId,
            };

            this.profileForm.patchValue(patchObj);
            this.addressControl.setValue(saved.formattedAddress);

            if (
              profileData.userAddresses &&
              profileData.userAddresses.length > 0
            ) {
              this.addresses = profileData.userAddresses;
              this.addressDataSource.data = profileData.userAddresses;

              // ⭐ NEW: Cache addresses for the entire app
              this.addressStore.setAddresses(profileData.userAddresses);
            } else {
              this.addressStore.setAddresses([]); // no addresses
            }
          }

          this.isVerified = profileData.isVerified ?? false;

          this.loadTeamMembers();
          this.isLoading = false;
        },
        error: () => {
          this.snackBar.open(
            'Failed to load profile. Please try again.',
            'Close',
            { duration: 3000 },
          );
          this.isLoading = false;
        },
      });
  }

  async onAddressSelected(
    event: MatAutocompleteSelectedEvent,
    type: 'billing' | 'physical',
  ): Promise<void> {
    const selected = event.option.value;
    if (!selected?.place_id) return;

    const place = await this.googlePlaces.getPlaceDetails(selected.place_id);
    if (!place) return;

    const components = place.address_components || [];
    const get = (t: string) =>
      components.find((c) => c.types.includes(t))?.long_name || '';

    const payload = {
      streetNumber: get('street_number'),
      streetName: get('route'),
      city: get('locality'),
      state: get('administrative_area_level_1'),
      postalCode: get('postal_code'),
      country: get('country'),
      latitude: place.geometry?.location?.lat() ?? null,
      longitude: place.geometry?.location?.lng() ?? null,
      formattedAddress: place.formatted_address,
      googlePlaceId: place.place_id,
    };

    if (type === 'billing') {
      this.profileForm.patchValue({
        billingAddress: payload,
        billingAddressInput: payload.formattedAddress || '',
      });
    }

    if (type === 'physical') {
      this.profileForm.patchValue({
        physicalAddress: payload,
        physicalAddressInput: payload.formattedAddress || '',
      });
    }
  }

  private loadCompanyProfile(userId: string): void {
    this.companyService
      .getCompanyProfile(userId)
      .pipe(take(1))
      .subscribe({
        next: (company) => {
          if (!company) return;

          const normalizeArray = (v: any) =>
            typeof v === 'string'
              ? v.split(',').map((x) => x.trim())
              : Array.isArray(v)
                ? v
                : [];

          const normalizeSingle = (v: any) => {
            const arr = normalizeArray(v);
            if (arr.length > 0) return arr[0];
            return v ?? null;
          };

          const patch = {
            companyName: company.name ?? null,
            companyRegNo: company.companyRegNo ?? null,
            vatNo: company.vatNo ?? null,
            constructionType: normalizeSingle(company.constructionType),
            nrEmployees: company.nrEmployees ?? null,
            yearsOfOperation: company.yearsOfOperation ?? null,
            certificationStatus: company.certificationStatus ?? null,
            certificationDocumentPath:
              company.certificationDocumentPath ?? null,
            trade: company.trade ?? null,
            supplierType: company.supplierType ?? null,
            productsOffered: normalizeArray(company.productsOffered),
            jobPreferences: normalizeArray(company.jobPreferences),
            deliveryArea: normalizeSingle(company.deliveryArea),
            deliveryTime: company.deliveryTime ?? null,
            companyPhone: company.phoneNumber ?? null,
            companyEmail: company.email ?? null,
            billingAddress: company.billingAddress ?? null,
            physicalAddress: company.physicalAddress ?? null,

            billingAddressInput: company.billingAddress?.formattedAddress ?? '',
            physicalAddressInput:
              company.physicalAddress?.formattedAddress ?? '',
          };

          this.profileForm.patchValue(patch);

          console.log('company.countryNumberCode:', company.countryNumberCode);
          console.log(
            'countryNumberCode array length:',
            this.countryNumberCode.length,
          );
          console.log(
            'matched:',
            this.countryNumberCode.find(
              (c) => c.id === company.countryNumberCode,
            ),
          );

          if (this.countryNumberCode.length > 0) {
            const matched = company.countryNumberCode
              ? this.countryNumberCode.find(
                  (c) => c.id === company.countryNumberCode,
                )
              : null;

            const resolved =
              matched ||
              this.countryNumberCode.find((c) => c.countryCode === 'ZA') ||
              this.countryNumberCode[0];

            // setTimeout forces Angular change detection AFTER mat-select options are rendered
            setTimeout(() => {
              this.selectedCompanyCountryCode = resolved;
            });
          }
        },
        error: (err) => {
          console.error('Failed to load company profile', err);
        },
      });
  }
  compareCountryCodes(a: any, b: any): boolean {
    if (!a || !b) return false;
    return a.id === b.id;
  }
  private loadSubscriptionPackages(): void {
    this.stripeService.getSubscriptions().subscribe({
      next: (subscriptions) => {
        console.log(subscriptions);
        this.subscriptionPackages = subscriptions.map((s) => ({
          value: s.subscription,
          display: `${s.subscription}`,
          amount: s.amount,
          annualAmount: s.annualAmount,
        }));
      },
      error: (err) => {
        console.error('Failed to load subscription packages:', err);
      },
    });
  }

  checkSubscription(): void {
    this.profileService.hasActiveSubscription().subscribe({
      next: (res) => {
        this.subscriptionActive = res.hasActive;
        if (!res.hasActive) {
          this.alertMessage =
            'You do not have an active subscription. Please subscribe to create a job quote.';
        }
      },
      error: (err) => {
        console.error('Subscription check failed', err);
        this.alertMessage = 'Unable to verify subscription. Try again later.';
        this.showAlert = true;
      },
    });
  }
  isInactiveRow(r: SubscriptionRow): boolean {
    return !r.status || r.status.toLowerCase() !== 'active';
  }
  manageSubscriptions(): void {
    this.isLoadingSubscriptions = true;
    this.subscriptionsError = null;

    const userId = String(localStorage.getItem('userId') ?? '');

    this.stripeService.getStripeSubscriptions(userId).subscribe({
      next: (res) => {
        console.log(res);
        const raw = Array.isArray(res) ? res : (res ?? []);

        const normalized: SubscriptionRow[] = (raw || []).map((x: any) => {
          const pkg =
            x.package ??
            x.plan ??
            x.planName ??
            x.product ??
            x.subscription ??
            x.packageName ??
            '—';

          const validUntilRaw =
            x.validUntil ??
            x.current_period_end ??
            x.currentPeriodEnd ??
            x.endDate ??
            x.expiresAt ??
            null;

          let validUntil: Date | null = null;
          if (validUntilRaw != null) {
            if (typeof validUntilRaw === 'number') {
              // Stripe timestamps are ALWAYS seconds
              validUntil = new Date(validUntilRaw * 1000);
            } else if (validUntilRaw) {
              validUntil = new Date(validUntilRaw);
            }
          }

          // Debug logging
          console.log('Processing subscription:', {
            pkg,
            validUntilRaw,
            validUntil,
            cancelAtPeriodEnd: x.cancel_at_period_end ?? x.cancelAtPeriodEnd,
            status: x.status,
          });
          const amountRaw =
            x.amount ??
            x.amount_total ??
            x.unit_amount ??
            x.price ??
            x.total ??
            0;
          const amount =
            typeof amountRaw === 'number' && amountRaw > 10000
              ? amountRaw / 100
              : amountRaw;

          const assignedUser =
            x.assignedUser ?? x.user ?? x.userEmail ?? x.customer_email ?? null;
          const assignedUserName =
            x.assignedUserName ??
            x.user ??
            x.userEmail ??
            x.customer_email ??
            null;

          const subscriptionId =
            x.subscriptionId ??
            x.subscriptionID ??
            x.id ??
            x.subscription?.id ??
            '';

          const isTrial =
            x.isTrial === true ||
            String(x.status ?? '').toLowerCase() === 'trialing';
          let status = String(x.status ?? '').toLowerCase();
          if (!status && isTrial) status = 'trialing';

          // ✅ FIX: Map cancel_at_period_end to cancelAtPeriodEnd (camelCase)
          const cancelAtPeriodEnd =
            x.cancel_at_period_end ?? x.cancelAtPeriodEnd ?? false;

          return {
            package: pkg,
            validUntil,
            amount,
            assignedUser,
            assignedUserName,
            status,
            subscriptionId,
            cancelAtPeriodEnd, // ✅ Now correctly mapped
          };
        });

        // viewer-aware bucketing
        const meId = (
          this.authService.currentUserSubject.value?.id ??
          String(localStorage.getItem('userId') || '')
        )
          .trim()
          .toLowerCase();

        const meEmail = (
          this.authService.currentUserSubject.value?.email ??
          this.profileForm.get('email')?.value ??
          ''
        )
          .trim()
          .toLowerCase();

        const iAmTeamMember = this.authService.isTeamMember();

        const isActive = (r: SubscriptionRow) =>
          String(r.status || '').toLowerCase() === 'active';

        const assignedLower = (r: SubscriptionRow) =>
          String(r.assignedUser ?? '')
            .trim()
            .toLowerCase();

        const assignedNameLower = (r: SubscriptionRow) =>
          String((r as any).assignedUserName ?? '')
            .trim()
            .toLowerCase();

        const isAssignedToMe = (r: SubscriptionRow) => {
          const a = assignedLower(r);
          const an = assignedNameLower(r);
          return (a && (a === meId || a === meEmail)) || (an && an === meEmail);
        };

        const isUnassigned = (r: SubscriptionRow) => assignedLower(r) === '';

        const mine = normalized.filter(
          (r) =>
            isActive(r) &&
            (iAmTeamMember
              ? isAssignedToMe(r)
              : isUnassigned(r) || isAssignedToMe(r)),
        );

        const team = normalized.filter(
          (r) => isActive(r) && !isUnassigned(r) && !isAssignedToMe(r),
        );

        const inactive = normalized.filter((r) => this.isInactiveRow(r));

        this.activeSubscriptionsData.data = mine;
        this.teamSubscriptionsData.data = team;
        this.inactiveSubscriptionsData.data = inactive;
        this.subscriptionsData.data = normalized;

        setTimeout(() => {
          this.activeSubscriptionsData.data = [
            ...this.activeSubscriptionsData.data,
          ];
          this.teamSubscriptionsData.data = [
            ...this.teamSubscriptionsData.data,
          ];
          this.inactiveSubscriptionsData.data = [
            ...this.inactiveSubscriptionsData.data,
          ];
          this.subscriptionsData.data = [...this.subscriptionsData.data];
        });

        // ✅ Debug: Log the first active subscription to verify data structure
        if (mine.length > 0) {
          console.log('First active subscription data:', {
            subscription: mine[0],
            validUntilType: typeof mine[0].validUntil,
            validUntilValue: mine[0].validUntil,
            cancelAtPeriodEnd: mine[0].cancelAtPeriodEnd,
            status: mine[0].status,
            isBeforeToday: mine[0].validUntil
              ? mine[0].validUntil < this.today
              : 'N/A',
          });
        }

        this.isLoadingSubscriptions = false;
      },
      error: (err) => {
        console.error('manageSubscriptions failed', err);
        this.subscriptionsError =
          'Unable to load subscriptions. Try again later.';
        this.isLoadingSubscriptions = false;
      },
    });
  }

  GetUserSubscription(): void {
    this.profileService.getUserSubscription().subscribe({
      next: (res) => {
        this.subscriptionuserPackages = res.map((s) => ({
          value: s.package, // server’s code/name
          display: `${s.package} ($${s.amount.toFixed(2)})`,
          amount: s.amount,
        }));

        const activeCode = this.subscriptionuserPackages?.[0]?.value ?? null;
        if (activeCode) {
          // Prefer direct code match in your known packages
          const match = this.subscriptionPackages.find(
            (p) =>
              p.value.toLowerCase() === activeCode.toLowerCase() ||
              p.display.toLowerCase().startsWith(activeCode.toLowerCase()), // fallback if backend sends display text
          );
          if (match) {
            this.profileForm.get('subscriptionPackage')?.setValue(match.value);
          }
        }
      },
      error: (err) => {
        console.error('Subscription check failed', err);
        this.alertMessage = 'Unable to verify subscription. Try again later.';
        this.showAlert = true;
      },
    });
  }

  loadTeamMembers(): void {
    const currentUser = this.authService.currentUserSubject.value;
    if (!currentUser || !currentUser.id) {
      this.snackBar.open('User not fully loaded. Please try again.', 'Close', {
        duration: 3000,
      });
      return;
    }
    const userId = currentUser.isTeamMember
      ? currentUser.inviterId
      : currentUser.id;
    this.teamManagementService.getTeamMembers(userId).subscribe({
      next: (members: TeamMember[]) => {
        this.teamMembers = members;
        this.activeTeamMembers = members.filter(
          (m) => m.status !== 'Deactivated' && m.status !== 'Deleted',
        );
        this.deactivatedTeamMembers = members.filter(
          (m) => m.status === 'Deactivated',
        );
      },
      error: (error) => {
        console.error('[ProfileComponent] Error loading team members:', error);
        this.snackBar.open('Failed to load team members.', 'Close', {
          duration: 3000,
        });
      },
    });
  }
  archiveDocument(doc: ProfileDocument): void {
    this.profileService.archiveDocument(doc.id).subscribe({
      next: () => {
        this.snackBar.open('Document archived successfully.', 'Close', {
          duration: 3000,
        });

        // 🔄 Refresh the grid
        this.loadDocuments();
      },
      error: (err) => {
        console.error('Failed to archive document:', err);
        this.snackBar.open('Failed to archive document.', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  loadDocuments(): void {
    const userId = this.authService.currentUserSubject.value?.id;
    if (!userId) {
      console.warn('UserId not found for document fetch');
      return;
    }

    this.profileService.getUserDocuments(userId).subscribe({
      next: (docs: ProfileDocument[]) => {
        this.documents = docs.map((doc) => ({
          ...doc,
          name: doc.fileName,
          type: 'Uploaded', // Placeholder until backend sends a real type
          uploadedDate: new Date(), // Or parse if available
          path: doc.blobUrl,
        }));
      },
      error: (err) => {
        console.error('Failed to fetch documents:', err);
      },
    });
  }
  deleteDocument(doc: any): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Document',
        message:
          'Are you sure you want to delete this document? This action cannot be undone.',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (!result) return; // user clicked NO

      this.profileService.deleteUserDocument(doc.id).subscribe({
        next: () => {
          this.documents = this.documents.filter((d) => d.id !== doc.id);

          this.snackBar.open('Document deleted.', 'Close', {
            duration: 3000,
          });
        },
        error: (err) => {
          console.error('Delete failed:', err);
          this.snackBar.open('Failed to delete document.', 'Close', {
            duration: 3000,
          });
        },
      });
    });
  }
  viewDocument(document: any): void {
    this.profileService.downloadJobDocument(document.id).subscribe({
      next: (response: Blob) => {
        // Infer MIME type based on extension
        const extension = document.name?.split('.').pop()?.toLowerCase();
        let mimeType = 'application/octet-stream'; // fallback

        if (extension === 'pdf') mimeType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg'].includes(extension))
          mimeType = `image/${extension}`;
        else if (extension === 'docx')
          mimeType =
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (extension === 'doc') mimeType = 'application/msword';

        const blob = new Blob([response], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const newTab = window.open(url, '_blank');

        if (!newTab) {
          this.alertMessage =
            'Failed to open document. Please allow pop-ups for this site.';
          this.showAlert = true;
        }

        // Cleanup after 10 seconds
        setTimeout(() => window.URL.revokeObjectURL(url), 10000);
      },
      error: (err) => {
        console.error('Error viewing document:', err);
        this.alertMessage = 'Failed to view document.';
        this.showAlert = true;
      },
    });
  }

  // ---------- ADDRESS MANAGEMENT ----------

  // openAddressDialog(address?: UserAddress): void {
  //   const dialogRef = this.dialog.open(AddressDialogComponent, {
  //     width: '600px',
  //     data: address ?? null,
  //   });

  //   dialogRef.afterClosed().subscribe((result: UserAddress | null) => {
  //     if (!result) return;

  //     // -----------------------------------
  //     // 🔥 CRITICAL FIX:
  //     // When editing, force the ID to remain
  //     // -----------------------------------
  //     if (address) {
  //       result.id = address.id; // ensure update always has correct ID
  //       this.updateAddress(result);
  //     } else {
  //       this.saveNewAddress(result);
  //     }
  //   });
  // }

  // editAddress(address: UserAddress): void {
  //   this.openAddressDialog(address);
  // }

  // deleteAddress(address: UserAddress): void {
  //   if (!address?.id) return;

  //   const confirmed = confirm('Are you sure you want to delete this address?');
  //   if (!confirmed) return;

  //   this.profileService.deleteUserAddress(address.id).subscribe({
  //     next: () => {
  //       this.snackBar.open('Address deleted successfully.', 'Close', {
  //         duration: 3000,
  //       });
  //       // ✅ use the actual array name
  //       this.addresses = this.addresses.filter((a) => a.id !== address.id);
  //       this.addressDataSource.data = this.addresses;
  //     },
  //     error: (err) => {
  //       console.error('Error deleting address', err);
  //       this.snackBar.open('Failed to delete address.', 'Close', {
  //         duration: 3000,
  //       });
  //     },
  //   });
  // }

  // saveNewAddress(address: UserAddress): void {
  //   const payload = {
  //     ...address,
  //     userId: String(localStorage.getItem('userId') ?? ''), // <-- make sure this is set!
  //   };

  //   this.profileService.addUserAddress(payload).subscribe({
  //     next: (saved) => {
  //       this.snackBar.open('Address added successfully.', 'Close', {
  //         duration: 3000,
  //       });
  //       this.addresses.push(saved);
  //       this.addressDataSource.data = [...this.addresses];
  //     },
  //     error: (err) => {
  //       console.error('Error saving address', err);
  //       this.snackBar.open('Failed to save address.', 'Close', {
  //         duration: 3000,
  //       });
  //     },
  //   });
  // }

  // updateAddress(address: UserAddress): void {
  //   this.profileService.updateUserAddress(address.id!, address).subscribe({
  //     next: (updated) => {
  //       this.snackBar.open('Address updated successfully.', 'Close', {
  //         duration: 3000,
  //       });
  //       const idx = this.addresses.findIndex((a) => a.id === updated.id);
  //       if (idx !== -1) this.addresses[idx] = updated;
  //       this.addressDataSource.data = [...this.addresses];
  //     },
  //     error: (err) => {
  //       console.error('Error updating address', err);
  //       this.snackBar.open('Failed to update address.', 'Close', {
  //         duration: 3000,
  //       });
  //     },
  //   });
  // }

  onSubmit(): void {
    if (this.profileForm.valid && !this.isSaving) {
      this.isSaving = true;

      this.profileForm.patchValue({
        SessionId: this.sessionId,
      });

      const updatedProfile: Profile = this.profileForm.value;
      updatedProfile.countryNumberCode = this.selectedCountryCode?.id || null;

      const personalPhone = this.profileForm.get('phoneNumber')?.value || '';
      const personalParsed = parsePhoneNumberFromString(
        personalPhone,
        this.getCountryCode(false),
      );
      if (personalParsed) {
        updatedProfile.phoneNumber = personalParsed.format('E.164');
      }
      const companyPhone = this.profileForm.get('companyPhone')?.value || '';
      const companyParsed = parsePhoneNumberFromString(
        companyPhone,
        this.getCountryCode(true),
      );
      const e164CompanyPhone = companyParsed
        ? companyParsed.format('E.164')
        : companyPhone;
      const selectedConstructionType = this.profileForm.value.constructionType;
      const selectedDeliveryArea = this.profileForm.value.deliveryArea;

      const companyPayload = {
        name: this.profileForm.value.companyName,
        companyRegNo: this.profileForm.value.companyRegNo,
        vatNo: this.profileForm.value.vatNo,
        email: this.profileForm.value.companyEmail,
        phoneNumber: e164CompanyPhone,
        countryNumberCode: this.profileForm.value.companyCountryNumberCode,
        constructionType: selectedConstructionType
          ? [selectedConstructionType]
          : [],
        nrEmployees: this.profileForm.value.nrEmployees,
        yearsOfOperation: this.profileForm.value.yearsOfOperation,
        certificationStatus: this.profileForm.value.certificationStatus,

        certificationDocumentPath:
          this.profileForm.value.certificationDocumentPath,
        trade: this.profileForm.value.trade,
        supplierType: this.profileForm.value.supplierType,
        productsOffered: this.profileForm.value.productsOffered,
        jobPreferences: this.profileForm.value.jobPreferences,
        deliveryArea: selectedDeliveryArea ? [selectedDeliveryArea] : [],
        deliveryTime: this.profileForm.value.deliveryTime,

        billingAddress: this.profileForm.value.billingAddress,
        physicalAddress: this.profileForm.value.physicalAddress,
      };

      console.log('Company payload', companyPayload);
      forkJoin({
        profile: this.profileService.updateProfile(updatedProfile),
        company: this.companyService.updateCompanyProfile(
          companyPayload,
          updatedProfile.id,
        ),
      }).subscribe({
        next: ({ profile }) => {
          this.profile = profile;
          this.profileForm.patchValue(profile);
          this.authService.updateCompanyName(
            this.profileForm.value.companyName,
          );

          const selectedPackageValue =
            this.profileForm.value.subscriptionPackage;

          const selectedPackage = this.subscriptionPackages.find(
            (p) => p.value === selectedPackageValue,
          );

          this.snackBar.open('Profile updated successfully', 'Close', {
            duration: 3000,
          });

          this.isSaving = false;
        },
        error: (error) => {
          console.error('Error updating profile/company:', error);

          this.snackBar.open(
            'Failed to update profile. Please try again.',
            'Close',
            { duration: 3000 },
          );

          this.isSaving = false;
        },
      });
    } else {
      this.snackBar.open(
        'Please fill all required fields correctly.',
        'Close',
        { duration: 3000 },
      );
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input?.files?.length) {
      console.error('No files selected');
      return;
    }
    const userId = localStorage.getItem('userId');
    const newFileNames = Array.from(input.files).map((file) => file.name);
    this.uploadedFileNames = [...this.uploadedFileNames, ...newFileNames];

    const formData = new FormData();
    Array.from(input.files).forEach((file) => {
      formData.append('Blueprint', file);
    });
    formData.append('Title', this.jobCardForm.get('Title')?.value || 'test');
    formData.append(
      'Description',
      this.jobCardForm.get('Description')?.value || 'tester',
    );
    formData.append('sessionId', this.sessionId);

    this.progress = 0;
    this.isUploading = true;

    this.profileService.uploadImage(formData, userId).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          this.progress = Math.round((100 * event.loaded) / event.total);
        } else if (event.type === HttpEventType.Response) {
          const newFilesCount = newFileNames.length;
          this.uploadedFilesCount += newFilesCount;
          if (event.body?.fileUrls) {
            this.uploadedFileUrls = [
              ...this.uploadedFileUrls,
              ...event.body.fileUrls,
            ];
          }
          this.isUploading = false;
          this.resetFileInput();
          this.loadDocuments();
        }
      },
      error: (error) => {
        console.error('Upload error:', error);
        this.progress = 0;
        this.isUploading = false;
        this.uploadedFileNames = this.uploadedFileNames.filter(
          (name) => !newFileNames.includes(name),
        );
        this.resetFileInput();
      },
    });
  }

  addTeamMember(): void {
    if (this.teamForm.valid) {
      this.isSendingInvite = true;
      const newMember: TeamMember = this.teamForm.value;
      const inviterId = this.authService.currentUserSubject.value?.id;
      if (!inviterId) {
        this.snackBar.open(
          'Cannot add team member: User not logged in.',
          'Close',
          { duration: 3000 },
        );
        this.isSendingInvite = false;
        return;
      }
      this.teamManagementService.addTeamMember(newMember, inviterId).subscribe({
        next: (member: TeamMember) => {
          this.teamMembers = [...this.teamMembers, member];
          this.loadTeamMembers();
          this.teamForm.reset({
            firstName: null,
            lastName: null,
            role: null,
            email: null,
          });

          // Reset every control state manually
          Object.keys(this.teamForm.controls).forEach((key) => {
            const control = this.teamForm.get(key);
            control?.markAsPristine();
            control?.markAsUntouched();
            control?.setErrors(null); // <-- THIS IS THE MISSING PIECE
          });

          this.teamForm.updateValueAndValidity();
          this.snackBar.open('Team member invited successfully', 'Close', {
            duration: 3000,
          });
          this.isSendingInvite = false;
        },
        error: (error) => {
          if (error.status === 409) {
            this.snackBar.open(error.error.message, 'Close', {
              duration: 5000,
              panelClass: ['error-snackbar'],
            });
          } else {
            this.snackBar.open('Failed to add team member.', 'Close', {
              duration: 3000,
            });
          }
          this.isSendingInvite = false;
        },
      });
    } else {
      this.snackBar.open(
        'Please fill all required fields correctly.',
        'Close',
        { duration: 3000 },
      );
    }
  }

  resetFileInput(): void {
    const fileInput = document.getElementById(
      'file-upload',
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
      console.log('File input reset');
    }
  }

  openConfirmationDialog(
    memberId: string,
    action: 'deactivate' | 'reactivate' | 'delete',
  ): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      data: {
        title: `Confirm ${action}`,
        message: `Are you sure you want to ${action} this team member?`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        switch (action) {
          case 'deactivate':
            this.deactivateTeamMember(memberId);
            break;
          case 'reactivate':
            this.reactivateTeamMember(memberId);
            break;
          case 'delete':
            this.deleteTeamMember(memberId);
            break;
        }
      }
    });
  }
  private lc(v: any): string {
    return String(v ?? '')
      .trim()
      .toLowerCase();
  }

  /** True if this row’s seat is assigned to the current viewer (id or email match) */
  private isAssignedToMe(row: SubscriptionRow): boolean {
    const meId = this.lc(
      this.authService.currentUserSubject.value?.id ??
        localStorage.getItem('userId'),
    );
    const meEmail = this.lc(
      this.authService.currentUserSubject.value?.email ??
        this.profileForm.get('email')?.value,
    );

    const a = this.lc(row.assignedUser);
    const an = this.lc((row as any).assignedUserName);

    // assignedUser may carry id or email; assignedUserName often carries email
    return (!!a && (a === meId || a === meEmail)) || (!!an && an === meEmail);
  }

  /** Only allow manage if the seat is NOT assigned to me (i.e., I’m the payer/owner view) */
  canManageRow(row: SubscriptionRow): boolean {
    return !this.isAssignedToMe(row);
  }
  cancelSubscription(row: SubscriptionRow): void {
    if (!this.canManageRow(row) || this.isInactiveRow(row)) return;
    const id = row.subscriptionId;

    if (!id) {
      this.snackBar.open('Missing subscription id.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.rowBusy.add(id!);
    this.stripeService.cancelSubscription(id!).subscribe({
      next: () => {
        this.snackBar.open('Subscription cancelled.', 'Close', {
          duration: 3000,
        });
        this.manageSubscriptions(); // refresh table
      },
      error: (err) => {
        console.error('cancelSubscriptionById failed', err);
        this.snackBar.open('Failed to cancel subscription.', 'Close', {
          duration: 3000,
        });
      },
      //complete: () => this.rowBusy.delete(id),
    });
  }
  canceltrailSubscription(row: string): void {
    if (!row) {
      this.snackBar.open('Missing subscription id.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.rowBusy.add(row!);
    this.stripeService.cancelSubscription(row!).subscribe({
      next: () => {
        this.snackBar.open('Subscription cancelled.', 'Close', {
          duration: 3000,
        });
        this.manageSubscriptions(); // refresh table
      },
      error: (err) => {
        console.error('cancelSubscriptionById failed', err);
        this.snackBar.open('Failed to cancel subscription.', 'Close', {
          duration: 3000,
        });
      },
      //complete: () => this.rowBusy.delete(id),
    });
  }
  upgradeSubscription(row: SubscriptionRow) {
    if (!this.canManageRow(row) || this.isInactiveRow(row)) return;
    this.openSubscriptionUpgradeDialog(row);
  }

  createPaymentSession(selectedPackage: { display: string; amount: number }) {
    this.openSubscriptionCreateDialog();
  }

  /** Try to resolve the active plan's *code* (the same value you use in subscriptionPackages[].value). */
  /** Resolve the active plan *code* (matches subscriptionPackages[].value). */
  private getActivePlanCode(): string | null {
    const normalize = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/\s*\(\$[\d.,]+.*?\)\s*/g, '') // strip "( $xxx ... )"
        .replace(/\s*until\s+\d{4}-\d{2}-\d{2}.*/i, '') // strip "Until YYYY-MM-DD ..."
        .replace(/\s*:\s*\$[\d.,]+.*$/, '') // strip ": $xxx ..." tails
        .replace(/\s+/g, ' ')
        .trim();

    // 1) Prefer the row that is Active AND has no assigned user
    const allRows = (this.subscriptionsData?.data ?? []).concat(
      this.activeSubscriptionsData?.data ?? [],
    ); // safe union

    const selfActive = allRows.find(
      (r) =>
        (r.status ?? '').toLowerCase() === 'active' &&
        (!r.assignedUser || String(r.assignedUser).trim() === ''),
    );

    if (selfActive?.package) {
      const rowName = normalize(selfActive.package);
      const match = (this.subscriptionPackages ?? []).find(
        (p) =>
          normalize(p.value) === rowName || normalize(p.display) === rowName,
      );
      if (match) return match.value; // ✅ the code your mat-options use
    }

    // 2) Fallback: first entry from getUserSubscription() (if you kept that)
    const codeFromUserList = this.subscriptionuserPackages?.[0]?.value ?? null;
    if (codeFromUserList) return codeFromUserList;

    // 3) Last resort: whatever is in the form
    return this.profileForm.get('subscriptionPackage')?.value ?? null;
  }

  private getRowPlanCode(row: SubscriptionRow): string | null {
    // If your row already carries a code, use it directly
    const direct =
      (row as any).packageCode ??
      (row as any).planCode ??
      (row as any).packageName ??
      null;
    if (direct) return String(direct);

    const normalize = (s: string) =>
      (s || '')
        .toLowerCase()
        .replace(/\s*\(\$[\d.,]+.*?\)\s*/g, '') // drop "( $xxx ... )"
        .replace(/\s*[—-]\s*current.*/i, '') // drop "— current"
        .replace(/\s*until\s+\d{4}-\d{2}-\d{2}.*/i, '') // drop "until YYYY-MM-DD …"
        .replace(/\s*:\s*\$[\d.,]+.*$/, '') // drop ": $xxx …"
        .replace(/\s+/g, ' ')
        .trim();

    const label =
      (row as any).package ?? (row as any).plan ?? (row as any).name ?? '';

    if (!label) return null;

    const n = normalize(String(label));

    const match = (this.subscriptionPackages ?? []).find((p: any) => {
      const candidates = [p.value, p.display, p.name, p.label]
        .filter(Boolean)
        .map((x: string) => normalize(String(x)));
      return candidates.includes(n);
    });

    return match?.value ?? null;
  }
  startCheckoutForUpgrade(
    pkgCode: string,
    assignedUser: string | null,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    subscriptionId: string,
  ): void {
    const pkgMeta = this.subscriptionPackages.find(
      (p) => String(p.value).toLowerCase() === String(pkgCode).toLowerCase(),
    );
    if (!pkgMeta) {
      this.snackBar.open('Unknown package selected.', 'Close', {
        duration: 3000,
      });
      return;
    }

    const userId = String(localStorage.getItem('userId') ?? '');
    this.stripeService
      .createCheckoutSession({
        userId,
        packageName: pkgMeta.value,
        amount:
          billingCycle === 'yearly'
            ? (pkgMeta.annualAmount ?? pkgMeta.amount)
            : pkgMeta.amount,
        source: 'profile', // 👈 makes intent explicit on backend
        assignedUser: assignedUser ?? userId,
        billingCycle,
        SubscriptionId: subscriptionId,
      })
      .subscribe({
        next: (res) => {
          window.location.assign(res.url);
          //this.canceltrailSubscription(subscriptionId);
        },
        error: (err) => {
          console.error('Checkout session error', err);
          this.snackBar.open('Failed to start checkout.', 'Close', {
            duration: 3500,
          });
        },
      });
  }
  openSubscriptionUpgradeDialog(subscription: SubscriptionRow): void {
    const subscriptionId =
      subscription.subscriptionId ?? (subscription as any)['id'] ?? null;
    const assignedUser =
      subscription.assignedUser ??
      (subscription as any)['assignedUser'] ??
      null;

    // Determine current plan code for preselect
    const currentValueFromRow = this.getRowPlanCode(subscription);
    const currentValue =
      currentValueFromRow ??
      this.getActivePlanCode() ??
      this.profileForm.get('subscriptionPackage')?.value ??
      null;

    const dialogRef = this.dialog.open(SubscriptionUpgradeComponent, {
      width: '600px',
      autoFocus: false,
      data: {
        packages: this.subscriptionPackages.filter((p) => {
          const val = (p.value || '').toLowerCase();
          return !val.startsWith('basic') && !val.startsWith('trial');
        }),
        currentValue,
        isTeamMember: this.authService.isTeamMember(),
        subscriptionId, // MAY be null for trial
        userId: String(localStorage.getItem('userId') || ''),
      },
    });

    // Expect either a string (pkgCode) or an object with pkgCode & billingCycle
    dialogRef.afterClosed().subscribe(
      (
        result?:
          | string
          | {
              subscriptionPackage: string;
              billingCycle?: 'monthly' | 'yearly';
            },
      ) => {
        if (!result) return;

        const pkgCode =
          typeof result === 'string' ? result : result.subscriptionPackage;
        const billingCycle =
          typeof result === 'string'
            ? 'monthly'
            : (result.billingCycle ?? 'monthly');
        console.log(pkgCode);
        // reflect selection
        this.profileForm.patchValue({ subscriptionPackage: pkgCode });
        this.profileForm.get('subscriptionPackage')?.markAsDirty();

        // 🔀 Branch: trial (no subscription) → Checkout; normal (has subscription) → API upgrade
        if (subscriptionId.includes('trial')) {
          this.startCheckoutForUpgrade(
            pkgCode,
            assignedUser,
            billingCycle,
            subscriptionId,
          );

          return;
        }

        this.rowBusy.add(subscriptionId);
        const payload: SubscriptionUpgradeDTO = {
          subscriptionId,
          packageName: pkgCode,
          userId: String(localStorage.getItem('userId')),
          assignedUser,
          billingCycle,
        };

        this.stripeService.upgradeSubscriptionByPackage(payload).subscribe({
          next: () => {
            this.snackBar.open('Subscription upgraded.', 'Close', {
              duration: 3500,
            });
            this.manageSubscriptions();
          },
          error: (err) => {
            console.error('Upgrade failed', err);
            this.snackBar.open('Failed to upgrade subscription.', 'Close', {
              duration: 3500,
            });
          },
          complete: () => this.rowBusy.delete(subscriptionId),
        });
      },
    );
  }

  /** Emails with an active/trial subscription */
  private getActiveSubscriptionEmails(): Set<string> {
    const ACTIVE = new Set(['active', 'trialing']);
    const rows = (this.subscriptionsData?.data ?? [])
      .concat(this.teamSubscriptionsData?.data ?? [])
      .concat(this.activeSubscriptionsData?.data ?? []);

    const emails = new Set<string>();
    for (const r of rows) {
      const status = String(r.status || '').toLowerCase();
      const email = String(r.assignedUserName ?? '')
        .trim()
        .toLowerCase();
      console.log(email);
      if (email && ACTIVE.has(status)) emails.add(email);
    }
    return emails;
  }
  getActiveByUserIdForSelf(): ActiveMap {
    const map: ActiveMap = {};
    const selfId =
      this.authService.currentUserSubject.value?.id ??
      String(localStorage.getItem('userId') || '');

    if (!selfId) return map;

    const ACTIVE = new Set(['active', 'trialing']);
    const rows = (this.subscriptionsData?.data ?? [])
      .concat(this.teamSubscriptionsData?.data ?? [])
      .concat(this.activeSubscriptionsData?.data ?? []);

    const selfActive = rows.find(
      (r) =>
        // self rows have no assigned user
        (!r.assignedUser || String(r.assignedUser).trim() === '') &&
        ACTIVE.has(String(r.status || '').toLowerCase()),
    );

    if (selfActive) {
      map[selfId] = {
        subscriptionId: String(
          selfActive.subscriptionId ?? selfActive['id'] ?? '',
        ),
        packageLabel: String(selfActive.package ?? ''),
      };
    }
    return map;
  }

  openSubscriptionCreateDialog(): void {
    const activeEmails = this.getActiveSubscriptionEmails();

    // get all registered first so we can count who got hidden
    const allRegisteredTeam = (this.teamMembers ?? []).filter(
      (m) => (m.status ?? '').toLowerCase().trim() === 'registered',
    );

    const teamBlockedCount = allRegisteredTeam.filter(
      (m) => m.email && activeEmails.has(m.email.toLowerCase()),
    ).length;

    // keep your existing email-based filtering
    const registeredTeam = allRegisteredTeam.filter(
      (m) => !m.email || !activeEmails.has(m.email.toLowerCase()),
    );

    // self-block using your existing self map
    const selfMap = this.getActiveByUserIdForSelf();
    const selfId = String(localStorage.getItem('userId') || '');
    const selfBlocked = !!selfMap[selfId];

    // short, descriptive message
    const notice =
      selfBlocked && teamBlockedCount > 0
        ? `You already have a subscription. ${teamBlockedCount} team member${
            teamBlockedCount > 1 ? 's' : ''
          } already subscribed.`
        : selfBlocked
          ? 'You already have an active subscription. Please cancel your existing subscription or change your current plan.'
          : teamBlockedCount > 0
            ? `${teamBlockedCount} team member${
                teamBlockedCount > 1 ? 's' : ''
              } already subscribed.`
            : null;

    // Updated dialog opening code with consistent filtering
    this.dialog
      .open(SubscriptionCreateComponent, {
        width: '600px',
        autoFocus: false,
        data: {
          // Filter packages that START WITH "basic" or "trial" (case-insensitive)
          packages: this.subscriptionPackages.filter((p) => {
            const val = (p.value || '').toLowerCase();
            return !val.startsWith('basic') && !val.startsWith('trial');
          }),
          currentValue:
            this.profileForm.get('subscriptionPackage')?.value ?? null,
          isTeamMember: this.authService.isTeamMember(),
          userId: selfId,

          // Only pass self's active subscription
          activeSubscription: selfMap[selfId] ?? null,

          notice,
        },
      })
      .afterClosed()
      .subscribe(
        (sel?: {
          pkg: { value: string; amount: number };
          assigneeUserId: string;
          billingCycle: 'monthly' | 'yearly';
          annualAmount: number;
        }) => {
          if (!sel) return;
          const { pkg, assigneeUserId, billingCycle } = sel;

          this.profileForm.patchValue({ subscriptionPackage: pkg.value });
          this.profileForm.get('subscriptionPackage')?.markAsDirty();
          if (
            String(pkg?.value ?? '')
              .toLowerCase()
              .includes('Basic')
          ) {
            //this.routeURL = 'login';
            this.showAlert = true;
          } else if (
            String(pkg?.value ?? '')
              .toLowerCase()
              .includes('trial')
          ) {
            const userId = String(localStorage.getItem('userId') ?? '');
            const packageName = pkg.value;
            // Trigger trial subscription
            this.httpClient
              .post(
                `${BASE_URL}/Account/trailversion`,
                { userId, packageName },
                {
                  headers: { 'Content-Type': 'application/json' },
                },
              )
              .subscribe(() => {
                this.dialog.closeAll();

                this.snackBar.open(
                  'Your trial account is now active.',
                  'Close',
                  {
                    duration: 3000,
                  },
                );

                // 🔥🔥🔥 Critical: Refresh subscription table UI
                this.manageSubscriptions();

                // Refresh dropdown/form logic
                this.profileService.getUserSubscription().subscribe({
                  next: (res) => {
                    this.subscriptionuserPackages = res.map((s) => ({
                      value: s.package,
                      display: `${s.package} ($${s.amount.toFixed(2)})`,
                      amount: s.amount,
                    }));

                    this.loadSubscriptionPackages();

                    const activeCode =
                      this.subscriptionuserPackages?.[0]?.value ?? null;

                    if (activeCode) {
                      const match = this.subscriptionPackages.find(
                        (p) =>
                          p.value.toLowerCase() === activeCode.toLowerCase(),
                      );
                      if (match) {
                        this.profileForm
                          .get('subscriptionPackage')
                          ?.setValue(match.value);
                        this.profileForm
                          .get('subscriptionPackage')
                          ?.markAsDirty();
                      }
                    }
                  },
                });
              });
          } else {
            this.stripeService
              .createCheckoutSession({
                userId: String(localStorage.getItem('userId') ?? ''),
                packageName: pkg.value,
                amount: pkg.amount,
                source: 'profile',
                assignedUser: assigneeUserId,
                billingCycle,
                SubscriptionId: '',
              })
              .subscribe({
                next: (res) => window.location.assign(res.url),
                error: (err) => console.error('Checkout session error', err),
              });
          }
        },
      );
  }

  openPermissionsDialog(
    teamMemberId: string,
    firstName: string,
    lastName: string,
  ): void {
    this.teamManagementService
      .getPermissions(teamMemberId)
      .subscribe((permissions) => {
        const dialogRef = this.dialog.open(ManagePermissionsDialogComponent, {
          width: '500px',
          data: {
            teamMemberId,
            teamMemberName: `${firstName} ${lastName}`,
            permissions,
          },
        });

        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.snackBar.open('Permissions updated successfully', 'Close', {
              duration: 3000,
            });
          }
        });
      });
  }

  deactivateTeamMember(id: string): void {
    this.teamManagementService.deactivateTeamMember(id).subscribe({
      next: () => {
        const member = this.teamMembers.find((m) => m.id === id);
        if (member) {
          member.status = 'Deactivated';
          this.activeTeamMembers = this.teamMembers.filter(
            (m) => m.status !== 'Deactivated' && m.status !== 'Deleted',
          );
          this.deactivatedTeamMembers = this.teamMembers.filter(
            (m) => m.status === 'Deactivated',
          );
        }
        this.snackBar.open('Team member deactivated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.snackBar.open('Failed to deactivate team member', 'Close', {
          duration: 3000,
        });
      },
    });
  }
  undoCancellation(row: SubscriptionRow): void {
    if (!this.canManageRow(row) || this.isInactiveRow(row)) return;

    const id = row.subscriptionId;
    if (!id) {
      this.snackBar.open('Missing subscription id.', 'Close', {
        duration: 2500,
      });
      return;
    }

    this.rowBusy.add(id);

    this.stripeService.undoCancellation(id).subscribe({
      next: () => {
        this.snackBar.open('Subscription reactivated.', 'Close', {
          duration: 3000,
        });

        this.manageSubscriptions(); // refresh tables
      },
      error: (err) => {
        console.error('undoCancellation failed', err);
        this.snackBar.open('Failed to restore subscription.', 'Close', {
          duration: 3000,
        });
      },
      complete: () => this.rowBusy.delete(id),
    });
  }
  private getDial(isCompany = false): string {
    return isCompany
      ? this.selectedCompanyCountryCode?.countryPhoneNumberCode || ''
      : this.selectedCountryCode?.countryPhoneNumberCode || '';
  }

  private getPhoneCtrl(isCompany = false) {
    return isCompany
      ? this.profileForm.get('companyPhone')
      : this.profileForm.get('phoneNumber');
  }

  onPhoneBlur(isCompany = false): void {
    const ctrl = this.getPhoneCtrl(isCompany);
    const value = ctrl?.value || '';
    const countryCode = this.getCountryCode(isCompany);
    const parsed = parsePhoneNumberFromString(value, countryCode);
    if (parsed?.isValid()) {
      ctrl?.setValue(parsed.formatNational(), { emitEvent: false });
    }
    ctrl?.markAsTouched();
  }
  onCountryChanged(isCompany = false): void {
    // Sync the country code ID into the form
    if (isCompany && this.selectedCompanyCountryCode?.id) {
      this.profileForm.patchValue({
        companyCountryNumberCode: this.selectedCompanyCountryCode.id,
      });
    }
    // Re-run validation on the phone field with the new country context
    this.getPhoneCtrl(isCompany)?.updateValueAndValidity();
  }

  onPhonePaste(event: ClipboardEvent, isCompany = false): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') || '';
    const countryCode = this.getCountryCode(isCompany);
    const parsed = parsePhoneNumberFromString(pasted, countryCode);
    const ctrl = this.getPhoneCtrl(isCompany);
    if (parsed) {
      ctrl?.setValue(parsed.formatNational(), { emitEvent: false });
    } else {
      ctrl?.setValue(new AsYouType(countryCode).input(pasted), {
        emitEvent: false,
      });
    }
  }

  reactivateTeamMember(id: string): void {
    this.teamManagementService.reactivateTeamMember(id).subscribe({
      next: () => {
        this.loadTeamMembers();
        this.snackBar.open('Team member reactivated successfully', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.snackBar.open('Failed to reactivate team member', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  deleteTeamMember(id: string): void {
    this.teamManagementService.removeTeamMember(id).subscribe({
      next: () => {
        this.teamMembers = this.teamMembers.filter((m) => m.id !== id);
        this.activeTeamMembers = this.teamMembers.filter(
          (m) => m.status !== 'Deactivated' && m.status !== 'Deleted',
        );
        this.deactivatedTeamMembers = this.teamMembers.filter(
          (m) => m.status === 'Deactivated',
        );
        this.snackBar.open('Team member permanently deleted', 'Close', {
          duration: 3000,
        });
      },
      error: () => {
        this.snackBar.open('Failed to delete team member', 'Close', {
          duration: 3000,
        });
      },
    });
  }

  ngOnDestroy(): void {
    this.profileService.stopSignalR();
  }

  changeUserRole(newRole: string): void {
    this.userRole = newRole;
    this.authService.changeUserRole(newRole);
    // this.snackBar.open(`Switched to ${newRole} role`, 'Close', {
    //   duration: 3000,
    // });
    console.log('Role switched to:', newRole);
    console.log('Visibility - Personal:', this.canViewPersonalInfo());
    console.log('Visibility - Company:', this.canViewCompanyDetails());
    console.log('Visibility - Certification:', this.canViewCertification());
    console.log('Visibility - Trade:', this.canViewTradeSupplier());
    console.log('Visibility - Delivery:', this.canViewDeliveryLocation());
    console.log('Visibility - Subscription:', this.canViewSubscription());
  }

  // TODO: Implement these methods based on user roles once development complete
  canViewPersonalInfo(): boolean {
    return true;
  }

  canViewCompanyDetails(): boolean {
    return [
      'GENERAL_CONTRACTOR',
      'PROJECT_MANAGER',
      'CHIEF_ESTIMATOR',
      'GENERAL_SUPERINTENDANT',
      'SUPERINTENDANT',
      'ASSISTANT_SUPERINTENDANT',
      'FOREMAN',
      'SUBCONTRACTOR',
      'VENDOR',
    ].includes(this.userRole || '');
  }

  canViewCertification(): boolean {
    return [
      'GENERAL_CONTRACTOR',
      'PROJECT_MANAGER',
      'CHIEF_ESTIMATOR',
      'GENERAL_SUPERINTENDANT',
      'SUPERINTENDANT',
      'ASSISTANT_SUPERINTENDANT',
      'FOREMAN',
      'SUBCONTRACTOR',
      'VENDOR',
    ].includes(this.userRole || '');
  }
  private phoneValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;
      const isCompany = control === this.profileForm?.get('companyPhone');
      const countryCode = this.getCountryCode(isCompany) as CountryCode;
      const parsed = parsePhoneNumberFromString(value, countryCode);
      return parsed?.isValid() ? null : { invalidPhone: true };
    };
  }
  canViewTradeSupplier(): boolean {
    return [
      'GENERAL_CONTRACTOR',
      'PROJECT_MANAGER',
      'CHIEF_ESTIMATOR',
      'GENERAL_SUPERINTENDANT',
      'SUPERINTENDANT',
      'ASSISTANT_SUPERINTENDANT',
      'FOREMAN',
      'SUBCONTRACTOR',
      'VENDOR',
    ].includes(this.userRole || '');
  }

  canViewDeliveryLocation(): boolean {
    return true;
  }

  canViewSubscription(): boolean {
    return [
      'GENERAL_CONTRACTOR',
      'PROJECT_MANAGER',
      'CHIEF_ESTIMATOR',
      'GENERAL_SUPERINTENDANT',
      'SUPERINTENDANT',
      'ASSISTANT_SUPERINTENDANT',
      'FOREMAN',
      'SUBCONTRACTOR',
      'VENDOR',
    ].includes(this.userRole || '');
  }
  private getCountryCode(isCompany = false): CountryCode {
    const code = isCompany
      ? this.selectedCompanyCountryCode?.countryCode
      : this.selectedCountryCode?.countryCode;
    return (code || 'US') as CountryCode;
  }
  onPhoneInput(event: Event, isCompany = false): void {
    const input = event.target as HTMLInputElement;
    const inputEvent = event as InputEvent;

    // Don't reformat on deletion — let the user delete freely
    if (inputEvent.inputType?.startsWith('delete')) {
      this.getPhoneCtrl(isCompany)?.setValue(input.value, { emitEvent: false });
      return;
    }

    const countryCode = this.getCountryCode(isCompany);
    const formatted = new AsYouType(countryCode).input(input.value);
    this.getPhoneCtrl(isCompany)?.setValue(formatted, { emitEvent: false });
  }
}
// To this:
export interface ProfileDocument {
  id: number;
  userId: string;
  fileName: string;
  size: number;
  blobUrl: string;
}
