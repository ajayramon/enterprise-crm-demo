import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from './auth.service';
import { CrmService } from './crm.service';
import { Customer } from './models';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-section">
      <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-4">
        <div>
          <p class="eyebrow mb-2">Customer lifecycle management</p>
          <h2 class="page-title mb-2">Accounts & health tracking</h2>
          <p class="text-secondary mb-0">Manage enterprise accounts, segment the portfolio, and document every key customer interaction.</p>
        </div>
        <button class="btn btn-outline-primary" type="button" (click)="startCreate()">New customer</button>
      </div>

      <div class="row g-4">
        <div class="col-xl-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Segment</th>
                      <th>Status</th>
                      <th>Health</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let customer of customers()">
                      <td>
                        <div class="fw-semibold">{{ customer.company_name }}</div>
                        <div class="small text-secondary">{{ customer.primary_contact }} · {{ customer.industry }}</div>
                      </td>
                      <td>{{ customer.segment }}</td>
                      <td>{{ customer.status }}</td>
                      <td>{{ customer.health_score }}/100</td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-secondary" type="button" (click)="editCustomer(customer)">Edit</button>
                          <button class="btn btn-outline-danger" type="button" (click)="removeCustomer(customer.id)">Delete</button>
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
              <h3 class="h5 mb-3">{{ editingId() ? 'Edit customer' : 'Create customer' }}</h3>
              <form class="d-grid gap-3" [formGroup]="form" (ngSubmit)="saveCustomer()">
                <input class="form-control" formControlName="company_name" placeholder="Company name" />
                <input class="form-control" formControlName="primary_contact" placeholder="Primary contact" />
                <input class="form-control" formControlName="email" placeholder="Email" />
                <input class="form-control" formControlName="phone" placeholder="Phone" />
                <input class="form-control" formControlName="address" placeholder="Address" />
                <input class="form-control" formControlName="industry" placeholder="Industry" />
                <div class="row g-2">
                  <div class="col-sm-6">
                    <select class="form-select" formControlName="segment">
                      <option *ngFor="let option of segments" [value]="option">{{ option }}</option>
                    </select>
                  </div>
                  <div class="col-sm-6">
                    <select class="form-select" formControlName="status">
                      <option *ngFor="let option of statuses" [value]="option">{{ option }}</option>
                    </select>
                  </div>
                </div>
                <div class="row g-2">
                  <div class="col-sm-6"><input class="form-control" type="number" formControlName="health_score" placeholder="Health score" /></div>
                  <div class="col-sm-6"><input class="form-control" type="number" formControlName="employee_count" placeholder="Employees" /></div>
                </div>
                <input class="form-control" type="number" formControlName="annual_revenue" placeholder="Annual revenue" />
                <textarea class="form-control" rows="3" formControlName="notes" placeholder="Notes"></textarea>
                <div class="d-flex gap-2">
                  <button class="btn btn-primary flex-fill" type="submit" [disabled]="form.invalid">{{ editingId() ? 'Save changes' : 'Add customer' }}</button>
                  <button class="btn btn-outline-secondary" type="button" (click)="resetForm()">Reset</button>
                </div>
              </form>
              <div class="border rounded-4 p-3 mt-4 bg-light" *ngIf="selectedCustomer() as selected">
                <h4 class="h6">Recent interactions</h4>
                <div class="small text-secondary mb-2">{{ selected.owner_name }} owns this account</div>
                <div class="small" *ngFor="let event of selected.history.slice(0, 3)">
                  <strong>{{ event.channel }}</strong> · {{ event.summary }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class CustomersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly crmService = inject(CrmService);
  private readonly authService = inject(AuthService);

  readonly segments = ['Enterprise', 'Mid-Market', 'SMB'];
  readonly statuses = ['Lead', 'Onboarding', 'Active', 'At Risk', 'Churned'];
  readonly customers = signal<Customer[]>([]);
  readonly selectedCustomer = signal<Customer | null>(null);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    company_name: ['', [Validators.required]],
    primary_contact: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    address: ['', [Validators.required]],
    industry: ['', [Validators.required]],
    segment: ['Enterprise'],
    status: ['Lead'],
    health_score: [80, [Validators.required, Validators.min(0), Validators.max(100)]],
    annual_revenue: [0, [Validators.required, Validators.min(0)]],
    employee_count: [100, [Validators.required, Validators.min(1)]],
    notes: [''],
  });

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.crmService.listCustomers().subscribe((customers) => this.customers.set(customers));
  }

  startCreate(): void {
    this.selectedCustomer.set(null);
    this.editingId.set(null);
    this.resetForm();
  }

  editCustomer(customer: Customer): void {
    this.editingId.set(customer.id);
    this.selectedCustomer.set(customer);
    this.form.patchValue(customer);
  }

  saveCustomer(): void {
    if (this.form.invalid) {
      return;
    }
    const request = this.editingId()
      ? this.crmService.updateCustomer(this.editingId()!, this.form.getRawValue())
      : this.crmService.createCustomer({ ...this.form.getRawValue(), history: [] });

    request.subscribe((customer) => {
      this.selectedCustomer.set(customer);
      this.resetForm();
      this.loadCustomers();
    });
  }

  removeCustomer(id: string): void {
    if (!confirm('Delete this customer profile?')) {
      return;
    }
    this.crmService.deleteCustomer(id).subscribe(() => this.loadCustomers());
  }

  resetForm(): void {
    this.form.reset({
      company_name: '',
      primary_contact: '',
      email: '',
      phone: '',
      address: '',
      industry: '',
      segment: 'Enterprise',
      status: 'Lead',
      health_score: 80,
      annual_revenue: 0,
      employee_count: 100,
      notes: '',
    });
    this.selectedCustomer.set(null);
    this.editingId.set(null);
  }
}
