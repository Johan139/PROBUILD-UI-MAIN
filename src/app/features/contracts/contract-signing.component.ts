import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

interface Contract {
  id: string;
  jobId: string;
  gcId: string;
  scVendorId: string;
  contractText: string;
  gcSignature: string | null;
  scVendorSignature: string | null;
  status: string;
  createdAt: Date;
}

@Component({
  selector: 'app-contract-signing',
  templateUrl: './contract-signing.component.html',
  styleUrls: ['./contract-signing.component.scss'],
  standalone: false,
})
export class ContractSigningComponent implements OnInit {
  contract: Contract | null = null;
  signature: string = '';
  contractId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.contractId = this.route.snapshot.paramMap.get('contractId');
    if (this.contractId) {
      this.getContract(this.contractId).subscribe((data) => {
        this.contract = data;
      });
    }
  }

  getContract(contractId: string): Observable<Contract> {
    return this.http.get<Contract>(`/api/contracts/${contractId}`);
  }

  submitSignature(): void {
    if (this.contractId && this.signature) {
      this.signContract(this.contractId, this.signature).subscribe(() => {
        // Handle successful signature
        if (this.contract) {
          this.contract.status = 'SIGNED';
        }
      });
    }
  }

  signContract(contractId: string, signature: string): Observable<any> {
    return this.http.post(`/api/contracts/${contractId}/sign`, { signature });
  }
}
