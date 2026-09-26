import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from './auth.service';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-shell">
      <div class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-10">
            <div class="card border-0 shadow-lg overflow-hidden">
              <div class="row g-0">
                <div class="col-lg-6 hero-panel p-5 text-white">
                  <div class="hero-tag">Bissa Esse Enterprises</div>
                  <h1 class="display-6 fw-bold mb-3">Enterprise CRM built for complex client relationships.</h1>
                  <p class="lead text-white-50 mb-4">
                    Track customers, accelerate deals, coordinate activity plans, and guide the revenue team with live analytics.
                  </p>
                  <div class="small text-white-50">
                    Demo access email: {{ demoEmail }} · password available in the setup guide
                  </div>
                </div>
                <div class="col-lg-6 p-5 bg-white">
                  <h2 class="h3 mb-2">Welcome back</h2>
                  <p class="text-secondary mb-4">Sign in to the Bissa Esse CRM workspace.</p>
                  <form class="d-grid gap-3" [formGroup]="form" (ngSubmit)="submit()">
                    <div>
                      <label class="form-label">Email</label>
                      <input class="form-control form-control-lg" formControlName="email" type="email" />
                    </div>
                    <div>
                      <label class="form-label">Password</label>
                      <input class="form-control form-control-lg" formControlName="password" type="password" />
                    </div>
                    <div *ngIf="error()" class="alert alert-danger py-2 mb-0">{{ error() }}</div>
                    <button class="btn btn-primary btn-lg" type="submit" [disabled]="form.invalid || loading()">
                      {{ loading() ? 'Signing in…' : 'Sign in' }}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: `
    .login-shell {
      min-height: 100vh;
      background: linear-gradient(135deg, #09162b, #0d3d72 50%, #ffd87b);
    }
    .hero-panel {
      background: radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 40%), #0d3d72;
    }
    .hero-tag {
      color: #ffd87b;
      text-transform: uppercase;
      letter-spacing: 0.18rem;
      font-size: 0.75rem;
      margin-bottom: 1rem;
    }
  `,
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly demoEmail = environment.demoEmail;
  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    email: [this.demoEmail, [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.detail ?? 'Unable to sign in right now.');
      },
    });
  }
}
