import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from './auth.service';
import { CrmService } from './crm.service';
import { Customer, Deal } from './models';

@Component({
  selector: 'app-deals-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  template: `
    <section class="page-section">
      <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-4">
        <div>
          <p class="eyebrow mb-2">Sales pipeline operations</p>
          <h2 class="page-title mb-2">Deals & funnel management</h2>
          <p class="text-secondary mb-0">Create opportunities, track every stage transition, and focus the team on the strongest forecast.</p>
        </div>
        <button class="btn btn-outline-primary" type="button" (click)="startCreate()">New deal</button>
      </div>
      <div class="row g-4">
        <div class="col-xl-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Opportunity</th>
                      <th>Stage</th>
                      <th>Probability</th>
                      <th>Value</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let deal of deals()">
                      <td>
                        <div class="fw-semibold">{{ deal.title }}</div>
                        <div class="small text-secondary">{{ deal.customer_name }} · closes {{ deal.expected_close_date }}</div>
                      </td>
                      <td>{{ deal.stage }}</td>
                      <td>{{ deal.probability }}%</td>
                      <td>{{ deal.value | currency:'USD':'symbol':'1.0-0' }}</td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" type="button" (click)="editDeal(deal)">Edit</button>
                          <button class="btn btn-outline-danger" type="button" (click)="removeDeal(deal.id)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">{{ editingId() ? 'Update opportunity' : 'Create opportunity' }}</h3>
              <form class="d-grid gap-3" [formGroup]="form" (ngSubmit)="saveDeal()">
                <input class="form-control" formControlName="title" placeholder="Deal title" />
                <select class="form-select" formControlName="customer_id" (change)="syncCustomer($event)">
                  <option value="">Select customer</option>
                  <option *ngFor="let customer of customers()" [value]="customer.id">{{ customer.company_name }}</option>
                </select>
                <select class="form-select" formControlName="stage">
                  <option *ngFor="let stage of stages" [value]="stage">{{ stage }}</option>
                </select>
                <div class="row g-2">
                  <div class="col-sm-6"><input class="form-control" type="number" formControlName="value" placeholder="Value" /></div>
                  <div class="col-sm-6"><input class="form-control" type="number" formControlName="probability" placeholder="Probability" /></div>
                </div>
                <input class="form-control" type="date" formControlName="expected_close_date" />
                <textarea class="form-control" rows="3" formControlName="description" placeholder="Description"></textarea>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary flex-fill" type="submit" [disabled]="form.invalid">{{ editingId() ? 'Save deal' : 'Create deal' }}</button>
                  <button class="btn btn-outline-secondary" type="button" (click)="resetForm()">Reset</button>
                </div>
              </form>
              <div class="border rounded-4 p-3 mt-4 bg-light" *ngIf="selectedDeal() as deal">
                <h4 class="h6">Deal activity</h4>
                <div class="small" *ngFor="let event of deal.history.slice(0, 3)">
                  <strong>{{ event.stage }}</strong> · {{ event.note }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DealsPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly crmService = inject(CrmService);
  private readonly authService = inject(AuthService);

  readonly stages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  readonly customers = signal<Customer[]>([]);
  readonly deals = signal<Deal[]>([]);
  readonly selectedDeal = signal<Deal | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    customer_id: ['', Validators.required],
    customer_name: [''],
    owner_id: [''],
    owner_name: [''],
    stage: ['Prospecting'],
    value: [0, [Validators.required, Validators.min(0)]],
    probability: [25, [Validators.required, Validators.min(0), Validators.max(100)]],
    expected_close_date: [new Date().toISOString().slice(0, 10), Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.crmService.listCustomers().subscribe((customers) => this.customers.set(customers));
    this.crmService.listDeals().subscribe((deals) => this.deals.set(deals));
  }

  syncCustomer(event: Event): void {
    const selected = this.customers().find((customer) => customer.id === (event.target as HTMLSelectElement).value);
    if (selected) {
      this.form.patchValue({ customer_name: selected.company_name });
    }
  }

  startCreate(): void {
    this.selectedDeal.set(null);
    this.editingId.set(null);
    this.resetForm();
  }

  editDeal(deal: Deal): void {
    this.selectedDeal.set(deal);
    this.editingId.set(deal.id);
    this.form.patchValue(deal);
  }

  saveDeal(): void {
    if (this.form.invalid) {
      return;
    }
    const currentUser = this.authService.currentUser();
    const payload = {
      ...this.form.getRawValue(),
      owner_id: currentUser?.id ?? '',
      owner_name: currentUser?.name ?? '',
      history: this.selectedDeal()?.history ?? [],
    };
    const request = this.editingId()
      ? this.crmService.updateDeal(this.editingId()!, payload)
      : this.crmService.createDeal(payload);
    request.subscribe((deal) => {
      this.selectedDeal.set(deal);
      this.resetForm();
      this.loadData();
    });
  }

  removeDeal(id: string): void {
    if (!confirm('Delete this deal?')) {
      return;
    }
    this.crmService.deleteDeal(id).subscribe(() => this.loadData());
  }

  resetForm(): void {
    this.form.reset({
      title: '',
      customer_id: '',
      customer_name: '',
      owner_id: '',
      owner_name: '',
      stage: 'Prospecting',
      value: 0,
      probability: 25,
      expected_close_date: new Date().toISOString().slice(0, 10),
      description: '',
    });
    this.editingId.set(null);
  }
}
