import type { User, UserRole, UserStatus } from '@/features/users/schema'

type SeedRow = [
  firstName: string,
  lastName: string,
  email: string,
  phone: string | null,
  role: UserRole,
  status: UserStatus,
]

// Fixed data so tests can rely on exact values. Row N gets id ...00N and was created on 2026-01-N.
const rows: SeedRow[] = [
  ['Anna', 'Kowalski', 'anna.kowalski@example.com', '+48 22 123 4567', 'admin', 'active'],
  ['Minh', 'Nguyen', 'minh.nguyen@example.com', '+84 90 123 4567', 'editor', 'active'],
  ['Lan', 'Nguyen', 'lan.nguyen@example.com', null, 'viewer', 'inactive'],
  ['James', 'Smith', 'james.smith@example.com', '(555) 010-2000', 'viewer', 'active'],
  ['Joanne', 'Baker', 'joanne.baker@example.com', null, 'editor', 'active'],
  ['Hannah', 'Lee', 'hannah.lee@example.com', '+1 415 555 0101', 'admin', 'active'],
  ['Carlos', 'Garcia', 'carlos.garcia@example.com', null, 'viewer', 'active'],
  ['Fatima', 'Khan', 'fatima.khan@example.com', '+44 20 7946 0958', 'editor', 'inactive'],
  ['Liam', "O'Brien", 'liam.obrien@example.com', null, 'viewer', 'active'],
  ['Sofia', 'Rossi', 'sofia.rossi@example.com', '+39 06 1234 5678', 'editor', 'active'],
  ['Kenji', 'Tanaka', 'kenji.tanaka@example.com', null, 'admin', 'inactive'],
  ['Olivia', 'Brown', 'olivia.brown@example.com', '555-0134', 'viewer', 'active'],
  ['Noah', 'Wilson', 'noah.wilson@example.com', null, 'editor', 'active'],
  ['Emma', 'Johnson', 'emma.johnson@example.com', '+1 212 555 0199', 'viewer', 'active'],
  ['Lucas', 'Martin', 'lucas.martin@example.com', null, 'viewer', 'inactive'],
  ['Aisha', 'Bello', 'aisha.bello@example.com', '+234 1 234 5678', 'editor', 'active'],
  ['Mateo', 'Fernandez', 'mateo.fernandez@example.com', null, 'viewer', 'active'],
  ['Chloe', 'Dubois', 'chloe.dubois@example.com', '+33 1 23 45 67 89', 'admin', 'active'],
  ['Ethan', 'Clark', 'ethan.clark@example.com', null, 'viewer', 'active'],
  ['Mia', 'Schneider', 'mia.schneider@example.com', '+49 30 123456', 'editor', 'inactive'],
  ['David', 'Cohen', 'david.cohen@example.com', null, 'viewer', 'active'],
  ['Priya', 'Sharma', 'priya.sharma@example.com', '+91 98765 43210', 'editor', 'active'],
  ['Oscar', 'Andersson', 'oscar.andersson@example.com', null, 'viewer', 'active'],
  ['Grace', 'Taylor', 'grace.taylor@example.com', '555 0177', 'admin', 'active'],
  ['Ben', 'Wright', 'ben.wright@example.com', null, 'viewer', 'inactive'],
]

/** The 25 users the mock API starts with, and restores on `POST /api/reset`. */
export const seedUsers: readonly User[] = rows.map(
  ([firstName, lastName, email, phone, role, status], index) => {
    const n = String(index + 1).padStart(2, '0')
    const timestamp = `2026-01-${n}T09:00:00.000Z`
    return {
      id: `00000000-0000-4000-8000-0000000000${n}`,
      firstName,
      lastName,
      email,
      phone,
      role,
      status,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
  },
)
