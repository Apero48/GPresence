import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const recordAttendance = mutation({
  args: {
    qrCodeId: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee) throw new Error("Employee not found");
    if (!employee.isActive) throw new Error("Employee account is inactive");

    // Verify QR code is valid
    const qrCode = await ctx.db
      .query("qrCodes")
      .withIndex("by_code", (q) => q.eq("code", args.qrCodeId))
      .unique();

    if (!qrCode || !qrCode.isActive) {
      throw new Error("Invalid or expired QR code");
    }

    if (qrCode.expiresAt && qrCode.expiresAt < Date.now()) {
      throw new Error("QR code has expired");
    }

    // Get today's attendance records
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_employee_and_date", (q) => 
        q.eq("employeeId", employee._id)
         .gte("timestamp", today.getTime())
         .lt("timestamp", tomorrow.getTime())
      )
      .collect();

    // Determine if this is arrival or departure
    const lastRecord = todayAttendance
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    const type = !lastRecord || lastRecord.type === "departure" ? "arrival" : "departure";

    const attendanceId = await ctx.db.insert("attendance", {
      employeeId: employee._id,
      type,
      timestamp: Date.now(),
      location: args.location,
      qrCodeId: args.qrCodeId,
    });

    return {
      _id: attendanceId,
      employeeId: employee._id,
      type,
      timestamp: Date.now(),
      location: args.location,
      qrCodeId: args.qrCodeId,
      _creationTime: Date.now(),
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
    };
  },
});

export const getMyAttendance = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee) return [];

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_employee", (q) => q.eq("employeeId", employee._id))
      .order("desc")
      .take(args.limit || 50);

    return attendance.map(record => ({
      ...record,
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
    }));
  },
});

export const getTodayAttendance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      throw new Error("Only admins can view attendance data");
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_date", (q) => 
        q.gte("timestamp", today.getTime())
         .lt("timestamp", tomorrow.getTime())
      )
      .collect();

    // Get employee details for each attendance record
    const attendanceWithEmployees = await Promise.all(
      attendance.map(async (record) => {
        const employee = await ctx.db.get(record.employeeId);
        return {
          ...record,
          employee,
        };
      })
    );

    return attendanceWithEmployees.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const getAttendanceHistory = query({
  args: {
    employeeId: v.optional(v.id("employees")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      throw new Error("Only admins can view attendance history");
    }

    let attendance;

    if (args.employeeId) {
      attendance = await ctx.db
        .query("attendance")
        .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId!))
        .collect();
    } else {
      attendance = await ctx.db.query("attendance").collect();
    }

    // Filter by date range if provided
    if (args.startDate && args.endDate) {
      attendance = attendance.filter(record => 
        record.timestamp >= args.startDate! && record.timestamp <= args.endDate!
      );
    }

    const attendanceWithEmployees = await Promise.all(
      attendance.map(async (record) => {
        const employee = await ctx.db.get(record.employeeId);
        return {
          ...record,
          employee,
        };
      })
    );

    return attendanceWithEmployees.sort((a, b) => b.timestamp - a.timestamp);
  },
});
