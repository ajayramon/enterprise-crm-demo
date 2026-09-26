import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from './auth.service';
import { CrmService } from './crm.service';
import { Activity, Customer, Deal } from './models';

function localDateTimeInputValue(value: Date = new Date()): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

@Component({
  selector: 'app-activities-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-section">
      <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start mb-4">
        <div>
          <p class="eyebrow mb-2">Execution cadence</p>
          <h2 class="page-title mb-2">Activities, tasks & calendar</h2>
          <p class="text-secondary mb-0">Assign tasks, track follow-ups, and keep the customer-facing team aligned around every opportunity.</p>
        </div>
        <button class="btn btn-outline-primary" type="button" (click)="startCreate()">New activity</button>
      </div>
      <div class="row g-4">
        <div class="col-xl-8">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Owner</th>
                      <th>Priority</th>
                      <th>Due</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let activity of activities()">
                      <td>
                        <div class="fw-semibold">{{ activity.title }}</div>
                        <div class="small text-secondary">{{ activity.customer_name }} · {{ activity.activity_type }}</div>
                      </td>
                      <td>{{ activity.assigned_to_name }}</td>
                      <td>{{ activity.priority }}</td>
                      <td>{{ activity.due_date | date:'mediumDate' }}</td>
                      <td class="text-end">
                        <div class="btn-group btn-group-sm">
                          <button class="btn btn-outline-success" type="button" (click)="markComplete(activity)" [disabled]="activity.status === 'Completed'">Complete</button>
                          <button class="btn btn-outline-secondary" type="button" (click)="editActivity(activity)">Edit</button>
                          <button class="btn btn-outline-danger" type="button" (click)="removeActivity(activity.id)">Delete</button>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="row row-cols-1 row-cols-md-2 g-3 mt-2">
                <div class="col" *ngFor="let group of calendarGroups()">
                  <div class="border rounded-4 p-3 bg-light h-100">
                    <div class="fw-semibold mb-2">{{ group.date }}</div>
                    <div class="small" *ngFor="let item of group.items">{{ item.title }} · {{ item.assigned_to_name }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-4">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">{{ editingId() ? 'Update activity' : 'Create activity' }}</h3>
              <form class="d-grid gap-3" [formGroup]="form" (ngSubmit)="saveActivity()">
                <input class="form-control" formControlName="title" placeholder="Activity title" />
                <select class="form-select" formControlName="activity_type">
                  <option *ngFor="let type of activityTypes" [value]="type">{{ type }}</option>
                </select>
                <select class="form-select" formControlName="customer_id" (change)="syncCustomer($event)">
                  <option value="">Select customer</option>
                  <option *ngFor="let customer of customers()" [value]="customer.id">{{ customer.company_name }}</option>
                </select>
                <select class="form-select" formControlName="deal_id">
                  <option value="">No linked deal</option>
                  <option *ngFor="let deal of deals()" [value]="deal.id">{{ deal.title }}</option>
                </select>
                <select class="form-select" formControlName="priority">
                  <option *ngFor="let priority of priorities" [value]="priority">{{ priority }}</option>
                </select>
                <input class="form-control" type="datetime-local" formControlName="due_date" />
                <textarea class="form-control" rows="3" formControlName="notes" placeholder="Notes"></textarea>
                <button class="btn btn-primary" type="submit" [disabled]="form.invalid">{{ editingId() ? 'Save activity' : 'Create activity' }}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class ActivitiesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly crmService = inject(CrmService);
  private readonly authService = inject(AuthService);

  readonly activityTypes = ['Call', 'Email', 'Meeting', 'Note', 'Task'];
  readonly priorities = ['Low', 'Medium', 'High', 'Critical'];
  readonly customers = signal<Customer[]>([]);
  readonly deals = signal<Deal[]>([]);
  readonly activities = signal<Activity[]>([]);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    activity_type: ['Task'],
    customer_id: ['', Validators.required],
    customer_name: [''],
    assigned_to_id: [''],
    assigned_to_name: [''],
    priority: ['Medium'],
    due_date: [localDateTimeInputValue(), Validators.required],
    status: ['Pending'],
    deal_id: [''],
    notes: [''],
    completed_at: [''],
  });

  readonly calendarGroups = computed(() => {
    const grouped = new Map<string, Activity[]>();
    this.activities().forEach((activity) => {
      const date = new Date(activity.due_date).toLocaleDateString();
      grouped.set(date, [...(grouped.get(date) ?? []), activity]);
    });
    return [...grouped.entries()].slice(0, 4).map(([date, items]) => ({ date, items }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.crmService.listCustomers().subscribe((customers) => this.customers.set(customers));
    this.crmService.listDeals().subscribe((deals) => this.deals.set(deals));
    this.crmService.listActivities().subscribe((activities) => this.activities.set(activities));
  }

  syncCustomer(event: Event): void {
    const selected = this.customers().find((customer) => customer.id === (event.target as HTMLSelectElement).value);
    if (selected) {
      this.form.patchValue({ customer_name: selected.company_name });
    }
  }

  startCreate(): void {
    this.editingId.set(null);
    this.resetForm();
  }

  editActivity(activity: Activity): void {
    this.editingId.set(activity.id);
    this.form.patchValue({
      title: activity.title,
      activity_type: activity.activity_type,
      customer_id: activity.customer_id,
      customer_name: activity.customer_name,
      assigned_to_id: activity.assigned_to_id,
      assigned_to_name: activity.assigned_to_name,
      priority: activity.priority,
      due_date: localDateTimeInputValue(new Date(activity.due_date)),
      status: activity.status,
      deal_id: activity.deal_id ?? '',
      notes: activity.notes,
      completed_at: activity.completed_at ?? '',
    });
  }

  saveActivity(): void {
    if (this.form.invalid) {
      return;
    }
    const currentUser = this.authService.currentUser();
    const payload = {
      ...this.form.getRawValue(),
      assigned_to_id: currentUser?.id ?? '',
      assigned_to_name: currentUser?.name ?? '',
      due_date: new Date(this.form.getRawValue().due_date).toISOString(),
      deal_id: this.form.getRawValue().deal_id || null,
      completed_at: this.form.getRawValue().completed_at || null,
    };
    const request = this.editingId()
      ? this.crmService.updateActivity(this.editingId()!, payload)
      : this.crmService.createActivity(payload);
    request.subscribe(() => {
      this.resetForm();
      this.loadData();
    });
  }

  markComplete(activity: Activity): void {
    this.crmService.updateActivity(activity.id, { status: 'Completed' }).subscribe(() => this.loadData());
  }

  removeActivity(id: string): void {
    if (!confirm('Delete this activity?')) {
      return;
    }
    this.crmService.deleteActivity(id).subscribe(() => this.loadData());
  }

  resetForm(): void {
    this.form.reset({
      title: '',
      activity_type: 'Task',
      customer_id: '',
      customer_name: '',
      assigned_to_id: '',
      assigned_to_name: '',
      priority: 'Medium',
      due_date: localDateTimeInputValue(),
      status: 'Pending',
      deal_id: '',
      notes: '',
      completed_at: '',
    });
    this.editingId.set(null);
  }
}
