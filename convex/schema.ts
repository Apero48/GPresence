import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  employees: defineTable({
    userId: v.optional(v.id("users")), // userId devient optionnel
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: v.union(v.literal("employee"), v.literal("admin")),
    department: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_email", ["email"]),

  attendance: defineTable({
    employeeId: v.id("employees"),
    type: v.union(v.literal("arrival"), v.literal("departure")),
    timestamp: v.number(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
    qrCodeId: v.string(),
  })
    .index("by_employee", ["employeeId"])
    .index("by_date", ["timestamp"])
    .index("by_employee_and_date", ["employeeId", "timestamp"]),

  qrCodes: defineTable({
    code: v.string(),
    isActive: v.boolean(),
    createdBy: v.id("employees"),
    expiresAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"]),

  companySettings: defineTable({
    workingHours: v.object({
      start: v.string(),
      end: v.string(),
    }),
    toleranceMinutes: v.number(),
    requireLocation: v.boolean(),
  }),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
