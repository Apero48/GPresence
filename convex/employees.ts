import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const associateUserIdToEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      const found = await getAuthUserId(ctx);
      if (!found) throw new Error("Not authenticated");
      userId = found;
    }
    await ctx.db.patch(args.employeeId, { userId });
    return null;
  },
});

export const getCurrentEmployee = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Cherche un employé avec ce userId
    let employee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (employee) return employee;

    // Si aucun employé n'est trouvé, cherche un employé avec le même email et userId non défini
    const user = await ctx.db.get(userId);
    if (!user || !user.email) return null;
    // On ne passe user.email à la requête que s'il est défini
    const employeeByEmail = user.email
      ? await ctx.db
          .query("employees")
          .withIndex("by_email", (q) => q.eq("email", user.email!))
          .unique()
      : null;
    if (employeeByEmail && !employeeByEmail.userId) {
      // On retourne l'employé à associer, mais on ne fait plus le patch ici
      return { ...employeeByEmail, needsUserIdAssociation: true };
    }
    return null;
  },
});

export const createEmployee = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
    role: v.union(v.literal("employee"), v.literal("admin")),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if current user is admin
    const currentEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      throw new Error("Only admins can create employees");
    }

    // Check if employee already exists
    const existingEmployee = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingEmployee) {
      throw new Error("Employee with this email already exists");
    }

    // Ne pas associer de userId ici !
    return await ctx.db.insert("employees", {
      ...args,
      userId: undefined, // explicitement undefined
      isActive: true,
    });
  },
});

export const getAllEmployees = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      throw new Error("Only admins can view all employees");
    }

    return await ctx.db.query("employees").collect();
  },
});

export const updateEmployee = mutation({
  args: {
    employeeId: v.id("employees"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!currentEmployee || currentEmployee.role !== "admin") {
      throw new Error("Only admins can update employees");
    }

    const { employeeId, ...updates } = args;
    return await ctx.db.patch(employeeId, updates);
  },
});

export const initializeAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Check if employee already exists
    const existingEmployee = await ctx.db
      .query("employees")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingEmployee) {
      return existingEmployee;
    }

    // Create admin employee record
    return await ctx.db.insert("employees", {
      userId,
      firstName: user.name?.split(" ")[0] || "Admin",
      lastName: user.name?.split(" ").slice(1).join(" ") || "User",
      email: user.email || "",
      role: "admin",
      isActive: true,
    });
  },
});

export const createEmployeeOnSignup = mutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Vérifier si un employé avec cet email existe déjà
    const existingEmployee = await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingEmployee) {
      // Mettre à jour l'ID utilisateur si l'employé existe déjà
      if (!existingEmployee.userId) {
        await ctx.db.patch(existingEmployee._id, { userId: args.userId });
      }
      return existingEmployee._id;
    }

    // Créer un nouvel employé
    const [firstName, ...lastNameParts] = args.name.split(' ');
    const lastName = lastNameParts.join(' ') || 'Nouvel employé';
    
    return await ctx.db.insert("employees", {
      userId: args.userId,
      firstName,
      lastName,
      email: args.email,
      role: 'employee',
      isActive: true
    });
  },
});
