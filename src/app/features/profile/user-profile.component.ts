import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { User } from '../../models/user';
import { UserService } from '../../services/user.service';
import { Rating } from '../../models/rating';
import { RatingService } from '../../services/rating.service';
import { Portfolio } from '../../models/portfolio';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
})
export class UserProfileComponent implements OnInit {
  user: User | null = null;
  ratings: Rating[] = [];
  portfolio: Portfolio | null = null;
  isLoading = true;
  userId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private ratingService: RatingService,
  ) {}

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.fetchUserProfile();
      this.fetchUserRatings();
    }
  }

  fetchUserProfile(): void {
    if (!this.userId) return;
    this.userService.getUserById(this.userId).subscribe({
      next: (userData) => {
        this.user = userData;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching user profile:', err);
        this.isLoading = false;
      },
    });
  }

  fetchUserRatings(): void {
    if (!this.userId) return;
    this.ratingService.getRatingsForUser(this.userId).subscribe({
      next: (ratingsData) => {
        this.ratings = ratingsData;
      },
      error: (err) => {
        console.error('Error fetching user ratings:', err);
      },
    });
  }

  getStarRating(ratingValue: number): string[] {
    const stars: string[] = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= ratingValue) {
        stars.push('star');
      } else if (i - 0.5 === ratingValue) {
        stars.push('star_half');
      } else {
        stars.push('star_border');
      }
    }
    return stars;
  }
}
