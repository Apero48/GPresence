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
    midType: v.optional(
      v.union(v.literal("pause"), v.literal("intervention"), v.literal("commission"))
    ),
    departure: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Load company settings for rules (lateness cutoff, break duration/tolerance)
    const settings =
      (await ctx.db.query("companySettings").first()) ?? {
        workingHours: { start: "08:00", end: "19:00" },
        toleranceMinutes: 16,
        break: { start: "12:00", durationMinutes: 60, toleranceMinutes: 15 },
        requireLocation: false,
      };

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee) throw new Error("Employee not found");
    if (!employee.isActive) throw new Error("Employee account is inactive");

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

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_employee_and_date", (q) =>
        q
          .eq("employeeId", employee._id)
          .gte("timestamp", today.getTime())
          .lt("timestamp", tomorrow.getTime())
      )
      .collect();

    const sorted = todayAttendance.sort((a, b) => a.timestamp - b.timestamp);
    const count = sorted.length;

    const insertAndReturn = async (doc: any, extra?: any) => {
      const _id = await ctx.db.insert("attendance", doc);
      return {
        _id,
        ...doc,
        _creationTime: Date.now(),
        employee: {
          firstName: employee.firstName,
          lastName: employee.lastName,
        },
        ...extra,
      };
    };

    // 1) First scan of the day => arrival with lateness
    if (count === 0) {
      // Arrivée à l'heure si <= 08:15 (par défaut) ; en retard à partir de 08:16
      // Utilise toleranceMinutes provenant des settings
      const [hStr, mStr] = settings.workingHours.start.split(":");
      const startHour = parseInt(hStr || "8", 10);
      const startMinute = parseInt(mStr || "0", 10);
      const tol = Math.max(0, (settings.toleranceMinutes ?? 16) - 1); // ex: 16 -> autorise jusqu'à 08:15:59
      const cutoff = new Date(now);
      cutoff.setHours(startHour, startMinute + tol, 59, 999);
      const isLate = now.getTime() > cutoff.getTime();

      return await insertAndReturn({
        employeeId: employee._id,
        type: "arrival",
        timestamp: Date.now(),
        location: args.location,
        qrCodeId: args.qrCodeId,
        isLate,
      });
    }

    // 2) After arrival: either a mid action or an explicit departure
    // If user explicitly asked for departure
    if (args.departure) {
      return await insertAndReturn({
        employeeId: employee._id,
        type: "departure",
        timestamp: Date.now(),
        location: args.location,
        qrCodeId: args.qrCodeId,
      });
    }

    // If midType provided => auto-toggle start/end for that type
    if (args.midType) {
      // Find last mid event of this type today
      const midsOfType = sorted.filter((r) => r.type === "mid" && r.midType === args.midType);
      const lastMid = midsOfType[midsOfType.length - 1];
      // If last was a start (or none exists), next is end if start exists without end, else start
      let direction: "start" | "end" = "start";
      if (lastMid && lastMid.midDirection === "start") {
        direction = "end";
      }

      // If closing a pause, compute duration and flag exceed
      if (args.midType === "pause" && direction === "end" && lastMid) {
        const durationMs = now.getTime() - lastMid.timestamp;
        const minutes = Math.round(durationMs / 60000);
        const planned = settings.break?.durationMinutes ?? 60;
        const tol = settings.break?.toleranceMinutes ?? 0;
        const exceeded = minutes > planned + tol;
        return await insertAndReturn(
          {
            employeeId: employee._id,
            type: "mid",
            midType: args.midType,
            midDirection: direction,
            timestamp: Date.now(),
            location: args.location,
            qrCodeId: args.qrCodeId,
          },
          exceeded
            ? { pauseExceeded: true, pauseDurationMinutes: minutes }
            : { pauseExceeded: false, pauseDurationMinutes: minutes }
        );
      }

      // Generic mid event (start or end)
      return await insertAndReturn({
        employeeId: employee._id,
        type: "mid",
        midType: args.midType,
        midDirection: direction,
        timestamp: Date.now(),
        location: args.location,
        qrCodeId: args.qrCodeId,
      });
    }

    // No midType and no explicit departure => ask frontend to choose
    return {
      requiresChoice: true as const,
      employee: { firstName: employee.firstName, lastName: employee.lastName },
      options: ["pause", "intervention", "commission", "departure"] as const,
    } as any;
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

    return attendance.map((record) => ({
      ...record,
      employee: {
        firstName: employee.firstName,
        lastName: employee.lastName,
      },
    }));
  },
});

// Compute today's pause total and excess
export const getMyDaySummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee) throw new Error("Employee not found");

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_employee_and_date", (q) =>
        q.eq("employeeId", employee._id).gte("timestamp", start.getTime()).lt("timestamp", end.getTime())
      )
      .collect();

    const sorted = records.sort((a, b) => a.timestamp - b.timestamp);

    // Sum pause durations by pairing start/end
    let pauseMinutes = 0;
    let lastPauseStart: number | null = null;
    for (const r of sorted) {
      if (r.type === "mid" && r.midType === "pause") {
        if (r.midDirection === "start") lastPauseStart = r.timestamp;
        else if (r.midDirection === "end" && lastPauseStart != null) {
          pauseMinutes += Math.round((r.timestamp - lastPauseStart) / 60000);
          lastPauseStart = null;
        }
      }
    }

    const exceeded = pauseMinutes > 60;
    return { pauseMinutes, exceeded };
  },
});

// Admin: list employees exceeding 60 min pause today
export const getTodayOverages = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const admin = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Only admins can view overages");
    }

    // Fetch all employees
    const employees = await ctx.db.query("employees").collect();

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const overages: Array<{ employee: any; pauseMinutes: number }> = [];

    for (const emp of employees) {
      const records = await ctx.db
        .query("attendance")
        .withIndex("by_employee_and_date", (q) =>
          q.eq("employeeId", emp._id).gte("timestamp", start.getTime()).lt("timestamp", end.getTime())
        )
        .collect();

      const sorted = records.sort((a, b) => a.timestamp - b.timestamp);
      let pauseMinutes = 0;
      let lastPauseStart: number | null = null;
      for (const r of sorted) {
        if (r.type === "mid" && r.midType === "pause") {
          if (r.midDirection === "start") lastPauseStart = r.timestamp;
          else if (r.midDirection === "end" && lastPauseStart != null) {
            pauseMinutes += Math.round((r.timestamp - lastPauseStart) / 60000);
            lastPauseStart = null;
          }
        }
      }
      if (pauseMinutes > 60) {
        overages.push({ employee: { _id: emp._id, firstName: emp.firstName, lastName: emp.lastName }, pauseMinutes });
      }
    }

    return overages.sort((a, b) => b.pauseMinutes - a.pauseMinutes);
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
      .withIndex("by_date", (q) => q.gte("timestamp", today.getTime()).lt("timestamp", tomorrow.getTime()))
      .collect();

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

    if (args.startDate && args.endDate) {
      attendance = attendance.filter(
        (record) => record.timestamp >= args.startDate! && record.timestamp <= args.endDate!
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

export const adminCorrectAttendance = mutation({
  args: {
    action: v.union(v.literal("insert"), v.literal("patch"), v.literal("delete")),
    recordId: v.optional(v.id("attendance")),
    employeeId: v.optional(v.id("employees")),
    type: v.optional(v.union(v.literal("arrival"), v.literal("mid"), v.literal("departure"))),
    timestamp: v.optional(v.number()),
    qrCodeId: v.optional(v.string()),
    midType: v.optional(v.union(v.literal("pause"), v.literal("intervention"), v.literal("commission"))),
    midDirection: v.optional(v.union(v.literal("start"), v.literal("end"))),
    isLate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const admin = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!admin || admin.role !== "admin") {
      throw new Error("Only admins can correct attendance");
    }

    if (args.action === "insert") {
      if (!args.employeeId || !args.type || !args.timestamp || !args.qrCodeId) {
        throw new Error("Missing fields for insert");
      }
      const newId = await ctx.db.insert("attendance", {
        employeeId: args.employeeId,
        type: args.type,
        timestamp: args.timestamp,
        qrCodeId: args.qrCodeId,
        midType: args.midType,
        midDirection: args.midDirection,
        isLate: args.isLate,
      });
      return newId;
    }

    if (!args.recordId) throw new Error("recordId required for patch/delete");

    if (args.action === "patch") {
      await ctx.db.patch(args.recordId, {
        employeeId: args.employeeId ?? undefined,
        type: args.type ?? undefined,
        timestamp: args.timestamp ?? undefined,
        qrCodeId: args.qrCodeId ?? undefined,
        midType: args.midType ?? undefined,
        midDirection: args.midDirection ?? undefined,
        isLate: args.isLate ?? undefined,
      });
      return args.recordId;
    }

    // delete
    await ctx.db.delete(args.recordId);
    return args.recordId;
  },
});

export const getMyWeekStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!employee) throw new Error("Employee not found");

    // Load company settings for rules (lateness cutoff, break duration/tolerance)
    const settings =
      (await ctx.db.query("companySettings").first()) ?? {
        workingHours: { start: "08:00", end: "19:00" },
        toleranceMinutes: 16,
        break: { start: "12:00", durationMinutes: 60, toleranceMinutes: 15 },
        requireLocation: false,
      };

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setDate(start.getDate() - 6); // last 7 days inclusive
    start.setHours(0, 0, 0, 0);

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_employee_and_date", (q) =>
        q
          .eq("employeeId", employee._id)
          .gte("timestamp", start.getTime())
          .lt("timestamp", end.getTime() + 1)
      )
      .collect();

    // Group by day
    const byDay = new Map<string, any[]>();
    for (const r of records) {
      const d = new Date(r.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key)!.push(r);
    }

    let totalPause = 0;
    let totalPresence = 0;
    let lateCount = 0;

    for (const [, recs] of byDay) {
      const sorted = recs.sort((a, b) => a.timestamp - b.timestamp);
      const firstArrival = sorted.find((r) => r.type === "arrival");
      const lastDeparture = [...sorted].reverse().find((r) => r.type === "departure");

      // pauses
      let pauseMinutes = 0;
      let lastPauseStart: number | null = null;
      for (const r of sorted) {
        if (r.type === "mid" && r.midType === "pause") {
          if (r.midDirection === "start") lastPauseStart = r.timestamp;
          else if (r.midDirection === "end" && lastPauseStart != null) {
            pauseMinutes += Math.round((r.timestamp - lastPauseStart) / 60000);
            lastPauseStart = null;
          }
        }
      }

      // presence
      if (firstArrival) {
        const endTs = lastDeparture?.timestamp ?? firstArrival.timestamp; // if no departure, presence 0 for that day
        const gross = Math.max(0, Math.round((endTs - firstArrival.timestamp) / 60000));
        const effective = Math.max(0, gross - pauseMinutes);
        totalPresence += effective;
      }
      totalPause += pauseMinutes;

      // late
      if (firstArrival) {
        const d = new Date(firstArrival.timestamp);
        const threshold = new Date(d);
        const [hStr, mStr] = settings.workingHours.start.split(":");
        const startHour = parseInt(hStr || "8", 10);
        const startMinute = parseInt(mStr || "0", 10);
        const tol = Math.max(0, (settings.toleranceMinutes ?? 16) - 1);
        threshold.setHours(startHour, startMinute + tol, 59, 999);
        if (firstArrival.timestamp > threshold.getTime()) lateCount += 1;
      }
    }

    return { totalPauseMinutes: totalPause, totalPresenceMinutes: totalPresence, lateDays: lateCount };
  },
});

export const getEmployeeActivity = query({
  args: {
    employeeId: v.id("employees"),
    start: v.number(), // inclusive ms timestamp
    end: v.number(),   // exclusive ms timestamp
  },
  handler: async (ctx, args) => {
    // authorize: current user must be admin to view arbitrary employee activity
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const me = await ctx.db.query("employees").withIndex("by_user", q => q.eq("userId", userId)).unique();
    if (!me || me.role !== "admin") throw new Error("Forbidden");

    const records = await ctx.db
      .query("attendance")
      .withIndex("by_employee_and_date", (q) =>
        q
          .eq("employeeId", args.employeeId)
          .gte("timestamp", args.start)
          .lt("timestamp", args.end)
      )
      .collect();

    return records.sort((a, b) => a.timestamp - b.timestamp);
  },
});
