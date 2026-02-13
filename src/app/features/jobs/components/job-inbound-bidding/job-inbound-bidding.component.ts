import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, HardHat, Store, Package, Users, ArrowLeft, Check, Edit, ClipboardList, DollarSign, UserCheck, UserPlus, TrendingUp, Star, Rocket, ArrowRight, RotateCcw } from 'lucide-angular';
import { BomService } from '../../services/bom.service';
import { BiddingService } from '../../../../services/bidding.service';
import { UserService } from '../../../../services/user.service';
import { RatingService } from '../../../../services/rating.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

  interface Bid {
      id: number;
      companyName: string;
      rating: number;
      location: string;
      price: number;
      leadTime: string;
      verified: boolean;
      status: string;
  }

  interface TradePackage {
      id: string;
      jobId: number;
      trade: string;
      category: 'trade' | 'vendor' | 'equipment' | 'supplier';
      icon: string;
      scopeOfWork: string;
      estimatedManHours: number;
      durationDays: number | null;
      hourlyRate: number;
      estimatedDuration: string;
      startDate: string | null;
      laborType: string;
      status?: string;
      bidDeadline?: string | null;
      createdAt?: string;
      csiCode: string;
      budget: number;
      bidType: string;
      postedToMarketplace: boolean;
      bids: Bid[];
      hasInternalQuote: boolean;
  }

@Component({
  selector: 'app-job-inbound-bidding',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './job-inbound-bidding.component.html',
  styleUrls: ['./job-inbound-bidding.component.scss']
})
export class JobInboundBiddingComponent implements OnInit {
  @Input() projectDetails: any;
  @Output() back = new EventEmitter<void>();
  @Output() goLive = new EventEmitter<void>();

  activeTab: 'trades' | 'vendors' | 'suppliers' = 'trades';
  isLoading = false;

  HardHat = HardHat;
  Store = Store;
  Package = Package;
  Users = Users;
  ArrowLeft = ArrowLeft;
  Check = Check;
  Edit = Edit;
  ClipboardList = ClipboardList;
  DollarSign = DollarSign;
  UserCheck = UserCheck;
  UserPlus = UserPlus;
  TrendingUp = TrendingUp;
  Star = Star;
  Rocket = Rocket;
  ArrowRight = ArrowRight;
  RotateCcw = RotateCcw;

  tradePackages: TradePackage[] = [];

  constructor(
    private bomService: BomService,
    private biddingService: BiddingService,
    private userService: UserService,
    private ratingService: RatingService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    if (this.projectDetails?.jobId) {
      this.loadPackages(this.projectDetails.jobId);
    }
  }

  loadPackages(jobId: string) {
    this.isLoading = true;
    this.bomService.getTradePackages(jobId).subscribe({
      next: (packages) => {
        this.tradePackages = packages.map(pkg => ({
          ...pkg,
          trade: pkg.trade.replace(/\*\*/g, '')
        }));
        this.loadBids(jobId);
      },
      error: (err) => {
        console.error('Failed to load trade packages', err);
        this.isLoading = false;
      },
    });
  }

  loadBids(jobId: string) {
    this.biddingService.getBidsForJob(Number(jobId)).subscribe({
      next: (bids: any[]) => {
        if (!bids || bids.length === 0) {
          this.isLoading = false;
          return;
        }

        // Enrich bids with user details and ratings
        const bidObservables = bids.map((b) => {
          const userId = b.userId;
          if (!userId) {
            return of({
              ...b,
              companyName: 'Unknown Contractor',
              rating: 0,
              location: 'Unknown',
            });
          }

          const user$ = this.userService.getUserById(userId).pipe(
            catchError(() => of(null))
          );
          const rating$ = this.ratingService.getRatingsForUser(userId).pipe(
            catchError(() => of([]))
          );

          return forkJoin([user$, rating$]).pipe(
            map(([user, ratings]) => {
              const avgRating =
                ratings && ratings.length > 0
                  ? ratings.reduce((acc: number, r: any) => acc + r.rating, 0) /
                    ratings.length
                  : 0;

              const location = user?.city && user?.state
                  ? `${user.city}, ${user.state}`
                  : (user?.city || 'Unknown Location');

              return {
                ...b,
                companyName: user
                  ? `${user.firstName} ${user.lastName}`
                  : 'Unknown Contractor',
                rating: avgRating,
                location: location,
              };
            })
          );
        });

        forkJoin(bidObservables).subscribe((enrichedBids: any[]) => {
          this.tradePackages.forEach((pkg) => {
            const relevantBids = enrichedBids.filter(
              (b) => b.task === pkg.trade || b.task === pkg.id
            );

            pkg.bids = relevantBids.map((b: any) => ({
              id: b.id,
              companyName: b.companyName,
              rating: b.rating,
              location: b.location,
              price: b.amount,
              leadTime: b.duration ? b.duration + ' days' : 'N/A',
              verified: false, // Could be derived from user verification status
              status: b.status,
            }));
          });
          this.isLoading = false;
        });
      },
      error: (err) => {
        console.error('Failed to load bids', err);
        this.isLoading = false;
      },
    });
  }

  get filteredPackages() {
      // Mapping categories: 'trades' -> 'trade', 'vendors' -> 'vendor'/'equipment', 'suppliers' -> 'supplier'
      if (this.activeTab === 'trades') return this.tradePackages.filter(p => p.category === 'trade');
      if (this.activeTab === 'vendors') return this.tradePackages.filter(p => p.category === 'vendor' || p.category === 'equipment');
      if (this.activeTab === 'suppliers') return this.tradePackages.filter(p => p.category === 'supplier');
      return [];
  }

  get tradesCount() {
    return this.tradePackages.filter(p => p.category === 'trade').length;
  }

  get vendorsCount() {
    return this.tradePackages.filter(p => p.category === 'vendor' || p.category === 'equipment').length;
  }

  get suppliersCount() {
    return this.tradePackages.filter(p => p.category === 'supplier').length;
  }

  get packagesReadyCount() {
      return this.tradePackages.filter(p => p.postedToMarketplace || p.hasInternalQuote).length;
  }

  onEstimatedManHoursChanged(pkg: TradePackage, rawValue: string): void {
    const manHours = Number(rawValue);
    const safeManHours = Number.isFinite(manHours) && manHours >= 0 ? manHours : 0;

    pkg.estimatedManHours = safeManHours;
    const derivedDays = this.calculateDurationDaysFromHours(safeManHours);
    pkg.durationDays = derivedDays;
    pkg.estimatedDuration = derivedDays ? `${derivedDays} days` : '';
  }

  onDurationDaysChanged(pkg: TradePackage, rawValue: string): void {
    const days = Number(rawValue);
    const safeDays = Number.isFinite(days) && days > 0 ? Math.ceil(days) : null;

    pkg.durationDays = safeDays;
    pkg.estimatedDuration = safeDays ? `${safeDays} days` : '';
    pkg.estimatedManHours = safeDays ? safeDays * 8 : 0;
  }

  onStartDateChanged(pkg: TradePackage, rawValue: string): void {
    pkg.startDate = rawValue || null;
  }

  onLaborTypeChanged(pkg: TradePackage, laborType: 'Labor and Materials' | 'Labor'): void {
    pkg.laborType = laborType;
    pkg.bidType = laborType === 'Labor' ? 'labor-only' : 'labor-material';
  }

  handlePostToMarketplace(pkg: TradePackage): void {
      const updatePayload = this.buildTradePackageUpdatePayload(pkg);

      this.bomService.updateTradePackage(Number(pkg.id), updatePayload).subscribe({
        next: () => {
          this.bomService.postTradePackage(pkg.id).subscribe({
            next: () => {
              pkg.postedToMarketplace = true;
              this.snackBar.open(`${pkg.trade} posted to marketplace`, 'Close', { duration: 3000 });
            },
            error: (err) => {
              console.error('Failed to post to marketplace', err);
              this.snackBar.open(`Failed to post ${pkg.trade} to marketplace`, 'Close', { duration: 3000 });
            }
          });
        },
        error: (err) => {
          console.error('Failed to save trade package updates before posting', err);
          this.snackBar.open(`Failed to save updates for ${pkg.trade}`, 'Close', { duration: 3000 });
        }
      });
  }

  private calculateDurationDaysFromHours(hours: number): number | null {
    if (!Number.isFinite(hours) || hours <= 0) {
      return null;
    }
    return Math.max(1, Math.ceil(hours / 8));
  }

  private buildTradePackageUpdatePayload(pkg: TradePackage): any {
    return {
      id: Number(pkg.id),
      jobId: Number(pkg.jobId),
      tradeName: pkg.trade,
      category: pkg.category,
      scopeOfWork: pkg.scopeOfWork,
      budget: Number(pkg.budget || 0),
      status: pkg.status || (pkg.postedToMarketplace ? 'Posted' : 'Draft'),
      estimatedManHours: Number(pkg.estimatedManHours || 0),
      hourlyRate: Number(pkg.hourlyRate || 0),
      estimatedDuration: pkg.estimatedDuration || null,
      startDate: pkg.startDate || null,
      bidDeadline: pkg.bidDeadline || null,
      laborType: pkg.laborType || 'Labor and Materials',
      csiCode: pkg.csiCode,
      postedToMarketplace: !!pkg.postedToMarketplace,
      createdAt: pkg.createdAt || new Date().toISOString(),
    };
  }

  onGoLive() {
      this.goLive.emit();
  }

  refreshPackages() {
    if (!this.projectDetails?.jobId) return;

    this.isLoading = true;
    this.bomService.refreshTradePackages(this.projectDetails.jobId).subscribe({
      next: () => {
        this.snackBar.open('Trade packages refreshed', 'Close', { duration: 3000 });
        this.loadPackages(this.projectDetails.jobId);
      },
      error: (err) => {
        console.error('Failed to refresh packages', err);
        this.snackBar.open('Failed to refresh trade packages', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }
}
