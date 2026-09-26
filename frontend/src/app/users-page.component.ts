import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { switchMap } from 'rxjs';

import { AuthService } from './auth.service';
import { CrmService } from './crm.service';
import { User } from './models';

@Component({
  selector: 'app-users-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-section">
      <div class="mb-4">
        <p class="eyebrow mb-2">User access & preferences</p>
        <h2 class="page-title mb-2">Team management and profile settings</h2>
        <p class="text-secondary mb-0">Support role-based access across admins, managers, and enterprise sales representatives.</p>
      </div>
      <div class="row g-4">
        <div class="col-xl-5">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <h3 class="h5 mb-3">My profile</h3>
              <form class="d-grid gap-3" [formGroup]="profileForm" (ngSubmit)="saveProfile()">
                <input class="form-control" formControlName="name" placeholder="Full name" />
                <input class="form-control" formControlName="title" placeholder="Role title" />
                <input class="form-control" formControlName="region" placeholder="Region" />
                <input class="form-control" formControlName="password" type="password" placeholder="New password (optional)" />
                <button class="btn btn-primary" type="submit">Save settings</button>
              </form>
            </div>
          </div>
        </div>
        <div class="col-xl-7">
          <div class="card border-0 shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center mb-3">
                <h3 class="h5 mb-0">Team directory</h3>
                <span class="badge text-bg-light">{{ currentUser()?.role }}</span>
              </div>
              <div *ngIf="canViewTeam(); else limitedAccess" class="table-responsive">
                <table class="table align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Region</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of users()">
                      <td>
                        <div class="fw-semibold">{{ user.name }}</div>
                        <div class="small text-secondary">{{ user.email }}</div>
                      </td>
                      <td>{{ user.role }}</td>
                      <td>{{ user.region }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ng-template #limitedAccess>
                <div class="alert alert-secondary mb-0">Sales representatives can manage their own profile, while managers and admins can view the team directory.</div>
              </ng-template>
            </div>
          </div>
        </div>
      </div>
    </section>
  `,
})
export class UsersPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly crmService = inject(CrmService);
  private readonly authService = inject(AuthService);

  readonly users = signal<User[]>([]);
  readonly currentUser = computed(() => this.authService.currentUser());

  readonly profileForm = this.fb.nonNullable.group({
    name: [''],
    title: [''],
    region: [''],
    password: [''],
  });

  ngOnInit(): void {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({ name: user.name, title: user.title, region: user.region, password: '' });
    }
    if (this.canViewTeam()) {
      this.crmService.listUsers().subscribe((users) => this.users.set(users));
    }
  }

  canViewTeam(): boolean {
    const role = this.currentUser()?.role;
    return role === 'admin' || role === 'manager';
  }

  saveProfile(): void {
    const formValue = this.profileForm.getRawValue();
    const payload = {
      name: formValue.name,
      title: formValue.title,
      region: formValue.region,
      password: formValue.password || null,
    };
    this.crmService
      .updateProfile(payload)
      .pipe(switchMap(() => this.authService.refreshProfile()))
      .subscribe((user) => {
        this.profileForm.patchValue({ name: user.name, title: user.title, region: user.region, password: '' });
      });
  }
}
