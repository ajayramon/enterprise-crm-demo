import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="crm-shell">
      <header class="brand-header shadow-sm">
        <div class="container-fluid d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div class="brand-tag">Bissa Esse Enterprises</div>
            <h1 class="h4 mb-0 text-white">Enterprise CRM Command Center</h1>
          </div>
          <div class="d-flex align-items-center gap-3 text-white">
            <div class="text-end small">
              <div class="fw-semibold">{{ currentUser()?.name }}</div>
              <div class="opacity-75">{{ currentUser()?.title }} · {{ currentUser()?.role }}</div>
            </div>
            <button class="btn btn-outline-light btn-sm" type="button" (click)="logout()">Sign out</button>
          </div>
        </div>
      </header>

      <div class="container-fluid">
        <div class="row g-0">
          <aside class="col-12 col-lg-2 sidebar py-4 px-3">
            <nav class="nav flex-lg-column gap-2">
              <a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
              <a class="nav-link" routerLink="/customers" routerLinkActive="active">Customers</a>
              <a class="nav-link" routerLink="/deals" routerLinkActive="active">Deals</a>
              <a class="nav-link" routerLink="/activities" routerLinkActive="active">Activities</a>
              <a class="nav-link" routerLink="/analytics" routerLinkActive="active">Reports</a>
              <a class="nav-link" routerLink="/users" routerLinkActive="active">Team & Settings</a>
            </nav>
          </aside>
          <main class="col-12 col-lg-10 content-panel py-4 px-3 px-lg-4">
            <router-outlet />
          </main>
        </div>
      </div>
    </div>
  `,
  styles: `
    .brand-header {
      background: linear-gradient(120deg, #0d3d72, #1d5fa8);
      border-bottom: 1px solid rgba(255,255,255,0.15);
      padding: 1rem 0;
    }
    .brand-tag {
      color: #ffd87b;
      font-size: 0.75rem;
      letter-spacing: 0.12rem;
      text-transform: uppercase;
    }
    .sidebar {
      background: #0b1730;
      min-height: calc(100vh - 88px);
    }
    .nav-link {
      border-radius: 0.9rem;
      color: #d4def7;
      font-weight: 600;
      padding: 0.8rem 1rem;
    }
    .nav-link.active,
    .nav-link:hover {
      background: rgba(255, 216, 123, 0.15);
      color: #fff;
    }
    .content-panel {
      background: #f5f7fb;
      min-height: calc(100vh - 88px);
    }
    @media (max-width: 991px) {
      .sidebar {
        min-height: auto;
      }
    }
  `,
})
export class ShellComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.currentUser());

  logout(): void {
    this.authService.logout();
    void this.router.navigate(['/login']);
  }
}
