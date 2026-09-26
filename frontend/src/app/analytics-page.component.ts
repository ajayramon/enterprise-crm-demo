import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CrmService } from './crm.service';
import { AcquisitionMetric, ActivityReportSummary, PipelineStageSummary, RevenueForecastPoint } from './models';

@Component({
  selector: 'app-analytics-page',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  template: `
    <section class="page-section">
      <div class="mb-4">
        <p class="eyebrow mb-2">Analytics & planning</p>
        <h2 class="page-title mb-2">Forecasts, acquisition, and activity trends</h2>
        <p class="text-secondary mb-0">Combine pipeline health, revenue forecast, and customer acquisition insights in one enterprise-ready reporting experience.</p>
      </div>
      <div class="row g-4">
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Pipeline overview</h3>
              <div class="list-group list-group-flush">
                <div class="list-group-item px-0" *ngFor="let stage of pipeline()">
                  <div class="d-flex justify-content-between fw-semibold">
                    <span>{{ stage.stage }}</span>
                    <span>{{ stage.value | currency:'USD':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="small text-secondary">{{ stage.count }} active opportunities</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Revenue forecast</h3>
              <div class="d-grid gap-3">
                <div *ngFor="let point of forecast()">
                  <div class="d-flex justify-content-between small fw-semibold mb-1">
                    <span>{{ point.month }}</span>
                    <span>{{ point.value | currency:'USD':'symbol':'1.0-0' }}</span>
                  </div>
                  <div class="progress"><div class="progress-bar" [style.width.%]="forecastWidth(point.value)"></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div class="row g-4 mt-1">
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Customer acquisition metrics</h3>
              <div class="row row-cols-1 row-cols-md-2 g-3">
                <div class="col" *ngFor="let metric of acquisition()">
                  <div class="border rounded-4 p-3 bg-light h-100">
                    <div class="small text-secondary">{{ metric.label }}</div>
                    <div class="display-6 fw-semibold">{{ metric.value }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-xl-6">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">Activity performance</h3>
              <div class="table-responsive">
                <table class="table mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Pending</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let report of activityReports()">
                      <td>{{ report.label }}</td>
                      <td>{{ report.pending }}</td>
                      <td>{{ report.completed }}</td>
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
export class AnalyticsPageComponent implements OnInit {
  private readonly crmService = inject(CrmService);

  readonly pipeline = signal<PipelineStageSummary[]>([]);
  readonly forecast = signal<RevenueForecastPoint[]>([]);
  readonly acquisition = signal<AcquisitionMetric[]>([]);
  readonly activityReports = signal<ActivityReportSummary[]>([]);

  ngOnInit(): void {
    forkJoin({
      pipeline: this.crmService.getPipeline(),
      forecast: this.crmService.getForecast(),
      acquisition: this.crmService.getAcquisition(),
      activityReports: this.crmService.getActivityReport(),
    }).subscribe((data) => {
      this.pipeline.set(data.pipeline);
      this.forecast.set(data.forecast);
      this.acquisition.set(data.acquisition);
      this.activityReports.set(data.activityReports);
    });
  }

  forecastWidth(value: number): number {
    const highest = Math.max(...this.forecast().map((point) => point.value || 1), 1);
    return Math.max((value / highest) * 100, 8);
  }
}
