import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../environments/environment';
import {
  AcquisitionMetric,
  Activity,
  ActivityReportSummary,
  Customer,
  DashboardMetrics,
  Deal,
  PipelineStageSummary,
  RevenueForecastPoint,
  User,
} from './models';

@Injectable({ providedIn: 'root' })
export class CrmService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  getDashboard(): Observable<DashboardMetrics> {
    return this.http.get<DashboardMetrics>(`${this.baseUrl}/analytics/dashboard`);
  }

  getPipeline(): Observable<PipelineStageSummary[]> {
    return this.http.get<PipelineStageSummary[]>(`${this.baseUrl}/analytics/pipeline`);
  }

  getForecast(): Observable<RevenueForecastPoint[]> {
    return this.http.get<RevenueForecastPoint[]>(`${this.baseUrl}/analytics/forecast`);
  }

  getAcquisition(): Observable<AcquisitionMetric[]> {
    return this.http.get<AcquisitionMetric[]>(`${this.baseUrl}/analytics/acquisition`);
  }

  getActivityReport(): Observable<ActivityReportSummary[]> {
    return this.http.get<ActivityReportSummary[]>(`${this.baseUrl}/analytics/activity-report`);
  }

  listCustomers(): Observable<Customer[]> {
    return this.http.get<Customer[]>(`${this.baseUrl}/customers`);
  }

  createCustomer(payload: unknown): Observable<Customer> {
    return this.http.post<Customer>(`${this.baseUrl}/customers`, payload);
  }

  updateCustomer(id: string, payload: unknown): Observable<Customer> {
    return this.http.put<Customer>(`${this.baseUrl}/customers/${id}`, payload);
  }

  deleteCustomer(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/customers/${id}`);
  }

  listDeals(): Observable<Deal[]> {
    return this.http.get<Deal[]>(`${this.baseUrl}/deals`);
  }

  createDeal(payload: unknown): Observable<Deal> {
    return this.http.post<Deal>(`${this.baseUrl}/deals`, payload);
  }

  updateDeal(id: string, payload: unknown): Observable<Deal> {
    return this.http.put<Deal>(`${this.baseUrl}/deals/${id}`, payload);
  }

  deleteDeal(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/deals/${id}`);
  }

  listActivities(): Observable<Activity[]> {
    return this.http.get<Activity[]>(`${this.baseUrl}/activities`);
  }

  createActivity(payload: unknown): Observable<Activity> {
    return this.http.post<Activity>(`${this.baseUrl}/activities`, payload);
  }

  updateActivity(id: string, payload: unknown): Observable<Activity> {
    return this.http.put<Activity>(`${this.baseUrl}/activities/${id}`, payload);
  }

  deleteActivity(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/activities/${id}`);
  }

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  updateProfile(payload: Partial<User> & { password?: string | null }): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/me`, payload);
  }
}
