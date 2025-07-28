import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const generateQRCode = mutation({
  args: {
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee || employee.role !== "admin") {
      throw new Error("Only admins can generate QR codes");
    }

    // Deactivate existing QR codes
    const existingCodes = await ctx.db
      .query("qrCodes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    for (const code of existingCodes) {
      await ctx.db.patch(code._id, { isActive: false });
    }

    // Generate new QR code
    const code = `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const expiresAt = args.expiresInHours 
      ? Date.now() + (args.expiresInHours * 60 * 60 * 1000)
      : undefined;

    return await ctx.db.insert("qrCodes", {
      code,
      isActive: true,
      createdBy: employee._id,
      expiresAt,
    });
  },
});

export const getActiveQRCode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee || employee.role !== "admin") {
      throw new Error("Only admins can view QR codes");
    }

    const activeCode = await ctx.db
      .query("qrCodes")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .unique();

    return activeCode;
  },
});

export const validateQRCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const qrCode = await ctx.db
      .query("qrCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .unique();

    if (!qrCode || !qrCode.isActive) {
      return { valid: false, message: "Invalid QR code" };
    }

    if (qrCode.expiresAt && qrCode.expiresAt < Date.now()) {
      return { valid: false, message: "QR code has expired" };
    }

    return { valid: true, message: "QR code is valid" };
  },
});
