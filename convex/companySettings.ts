import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("companySettings").first();
    // Provide sensible defaults if not set yet
    return (
      settings ?? {
        workingHours: { start: "08:00", end: "19:00" },
        toleranceMinutes: 16, // late from 08:16
        break: { start: "12:00", durationMinutes: 60, toleranceMinutes: 15 },
        requireLocation: false,
        _id: undefined,
      }
    );
  },
});

export const updateSettings = mutation({
  args: {
    workingHours: v.object({ start: v.string(), end: v.string() }),
    toleranceMinutes: v.number(),
    break: v.object({
      start: v.string(),
      durationMinutes: v.number(),
      toleranceMinutes: v.number(),
    }),
    requireLocation: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const admin = await ctx.db
      .query("employees")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Only admins can update settings");
    }

    const existing = await ctx.db.query("companySettings").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        workingHours: args.workingHours,
        toleranceMinutes: args.toleranceMinutes,
        break: args.break,
        requireLocation: args.requireLocation,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("companySettings", {
        workingHours: args.workingHours,
        toleranceMinutes: args.toleranceMinutes,
        break: args.break,
        requireLocation: args.requireLocation,
      });
    }
  },
});
