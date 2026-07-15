export const PortalRole = {
  STUDENT: "student",
  MENTOR: "mentor",
  ADMIN: "admin",
} as const;

export type PortalRoleType = typeof PortalRole[keyof typeof PortalRole];

export const AccountStatus = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  BLOCKED: "blocked",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type AccountStatusType = typeof AccountStatus[keyof typeof AccountStatus];
