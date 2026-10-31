/** Safe user-management DTOs. This module never accepts or returns password hashes. */
export const TEAMS = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'] as const;
export type TeamId = typeof TEAMS[number];
export type UserRole = 'ADMIN' | 'TEAM_USER';
export interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  team: TeamId | 'ALL';
  isActive: boolean;
  email?: string;
}
export interface CreateUserInput {
  username: string;
  fullName: string;
  role: UserRole;
  team: TeamId | 'ALL';
  email?: string;
}
export function validateCreateUser(input: CreateUserInput): CreateUserInput {
  const username = input.username?.trim().toLowerCase();
  const fullName = input.fullName?.trim();
  if (!username || !/^[a-z0-9._-]{3,64}$/.test(username)) throw new Error('Invalid username');
  if (!fullName || fullName.length > 120) throw new Error('Invalid full name');
  if (input.role !== 'ADMIN' && input.role !== 'TEAM_USER') throw new Error('Invalid role');
  if (input.role === 'ADMIN' ? input.team !== 'ALL' : !TEAMS.includes(input.team as TeamId)) {
    throw new Error('Role/team mismatch');
  }
  const email = input.email?.trim();
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Invalid email');
  return { username, fullName, role: input.role, team: input.team, ...(email ? { email } : {}) };
}
/** UI convenience only. Authorization MUST be repeated on the server. */
export function visibleTo(user: PublicUser, viewer: PublicUser): boolean {
  return viewer.role === 'ADMIN' || (viewer.role === 'TEAM_USER' && user.team === viewer.team && user.id === viewer.id);
}
