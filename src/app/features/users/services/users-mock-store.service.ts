import { Injectable, signal } from '@angular/core';
import { MOCK_USERS, User, UserRole } from '../models/user.model';

export interface CreateUserDraft {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  locations: string[];
  password?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersMockStore {
  private readonly usersState = signal<User[]>(MOCK_USERS.map((user) => ({ ...user })));

  readonly users = this.usersState.asReadonly();

  createUser(draft: CreateUserDraft): User {
    const fullName = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    const user: User = {
      id: this.getNextId(),
      name: fullName,
      email: draft.email.trim().toLowerCase(),
      initials: this.getInitials(draft.firstName, draft.lastName),
      avatarColor: this.getAvatarColor(draft.role),
      role: draft.role,
      locations: draft.locations.length > 0 ? draft.locations.join(', ') : null,
      status: 'Activo',
      lastAccess: 'Nunca',
    };

    this.usersState.update((users) => [...users, user]);
    return user;
  }

  private getNextId(): number {
    return Math.max(0, ...this.usersState().map((user) => user.id)) + 1;
  }

  private getInitials(firstName: string, lastName: string): string {
    return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase();
  }

  private getAvatarColor(role: UserRole): string {
    const map: Record<UserRole, string> = {
      Administrador: 'bg-primary',
      Encargado: 'bg-info',
      Director: 'bg-neutral',
    };

    return map[role];
  }
}
