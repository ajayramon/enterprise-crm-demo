import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CrmService } from './crm.service';
import { Activity, Customer, DashboardMetrics, Deal, PipelineStageSummary } from './models';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <section class="page-section d-grid gap-4">
      <div class="d-flex flex-wrap justify-content-between gap-3 align-items-start">
        <div>
          <p class="eyebrow mb-2">Revenue command center</p>
          <h2 class="page-title mb-2">Executive dashboard</h2>
          <p class="text-secondary mb-0">Monitor customer health, pipeline conversion, and service workload across the Bissa Esse revenue engine.</p>
        </div>
      </div>

      <div class="row g-3" *ngIf="metrics() as m">
        <div class="col-sm-6 col-xl-3" *ngFor="let item of summaryCards(m)">
          <div class="card metric-card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="text-secondary small">{{ item.label }}</div>
              <div class="display-6 fw-semibold mt-2">{{ item.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 mb-0">Pipeline stages</h3>
                <span class="badge text-bg-light">Live forecast</span>
              </div>
              <div class="d-grid gap-3" *ngIf="pipeline().length; else pipelineEmpty">
                <div *ngFor="let stage of pipeline()">
                  <div class="d-flex justify-content-between small fw-semibold mb-1">
                    <span>{{ stage.stage }}</span>
                    <span>{{ stage.count }} deals · {{ stage.value | currency:'USD':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="progress" role="progressbar" [attr.aria-label]="stage.stage">
                    <div class="progress-bar" [style.width.%]="progress(stage)"></div>
                  </div>
                </div>
              </div>
              <ng-template #pipelineEmpty>
                <p class="text-secondary mb-0">No pipeline data is available.</p>
              </ng-template>
            </div>
          </div>
        </div>
        <div class="col-xl-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Priority activity queue</h3>
              <div class="list-group list-group-flush" *ngIf="priorityActivities().length; else noActivities">
                <div class="list-group-item px-0" *ngFor="let activity of priorityActivities()">
                  <div class="d-flex justify-content-between gap-3">
                    <div>
                      <div class="fw-semibold">{{ activity.title }}</div>
                      <div class="small text-secondary">{{ activity.customer_name }} · {{ activity.activity_type }}</div>
                    </div>
                    <span class="badge rounded-pill" [class]="activity.status === 'Completed' ? 'text-bg-success' : 'text-bg-warning'">
                      {{ activity.status }}
                    </span>
                  </div>
                </div>
              </div>
              <ng-template #noActivities>
                <p class="text-secondary mb-0">No activities are scheduled.</p>
              </ng-template>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Customer spotlight</h3>
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Account</th>
                      <th>Status</th>
                      <th>Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let customer of customers().slice(0, 5)">
                      <td>
                        <div class="fw-semibold">{{ customer.company_name }}</div>
                        <div class="small text-secondary">{{ customer.industry }}</div>
                      </td>
                      <td>{{ customer.status }}</td>
                      <td>{{ customer.health_score }}/100</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Recent deals</h3>
              <div class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Deal</th>
                      <th>Stage</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let deal of deals().slice(0, 5)">
                      <td>
                        <div class="fw-semibold">{{ deal.title }}</div>
                        <div class="small text-secondary">{{ deal.customer_name }}</div>
                      </td>
                      <td>{{ deal.stage }}</td>
                      <td>{{ deal.value | currency:'USD':'symbol':'1.0-0' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly crmService = inject(CrmService);

  readonly metrics = signal<DashboardMetrics | null>(null);
  readonly pipeline = signal<PipelineStageSummary[]>([]);
  readonly customers = signal<Customer[]>([]);
  readonly deals = signal<Deal[]>([]);
  readonly activities = signal<Activity[]>([]);

  ngOnInit(): void {
    forkJoin({
      metrics: this.crmService.getDashboard(),
      pipeline: this.crmService.getPipeline(),
      customers: this.crmService.listCustomers(),
      deals: this.crmService.listDeals(),
      activities: this.crmService.listActivities(),
    }).subscribe(({ metrics, pipeline, customers, deals, activities }) => {
      this.metrics.set(metrics);
      this.pipeline.set(pipeline);
      this.customers.set(customers);
      this.deals.set(deals);
      this.activities.set(activities);
    });
  }

  summaryCards(metrics: DashboardMetrics) {
    return [
      { label: 'Customers', value: metrics.total_customers },
      { label: 'Open deals', value: metrics.open_deals },
      { label: 'Weighted pipeline', value: `$${Math.round(metrics.weighted_pipeline_value).toLocaleString()}` },
      { label: 'Monthly forecast', value: `$${Math.round(metrics.monthly_forecast).toLocaleString()}` },
    ];
  }

  progress(stage: PipelineStageSummary): number {
    const highest = Math.max(...this.pipeline().map((item) => item.value || 1), 1);
    return Math.max((stage.value / highest) * 100, stage.count > 0 ? 10 : 0);
  }

  priorityActivities(): Activity[] {
    return this.activities()
      .filter((activity) => activity.priority === 'Critical' || activity.priority === 'High')
      .slice(0, 5);
  }
}
