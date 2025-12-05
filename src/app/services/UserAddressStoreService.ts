import { BehaviorSubject } from 'rxjs';
import {
  Profile,
  TeamMember,
  Document,
  UserAddress,
} from '../authentication/profile/profile.model';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class UserAddressStoreService {
  private addressSubject = new BehaviorSubject<UserAddress[]>([]);
  addresses$ = this.addressSubject.asObservable();

  setAddresses(addresses: UserAddress[]) {
    this.addressSubject.next(addresses);
  }

  getAddresses(): UserAddress[] {
    return this.addressSubject.getValue();
  }
  clear() {
    this.addressSubject.next([]);
  }
}
