import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { query, mutation } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
  hooks: {
    onSignup: async (ctx, user) => {
      // Créer automatiquement un enregistrement employé pour le nouvel utilisateur
      const name = user.name || user.email?.split('@')[0] || 'Nouvel employé';
      const [firstName, ...lastNameParts] = name.split(' ');
      const lastName = lastNameParts.join(' ') || 'Nom';
      
      await ctx.db.insert("employees", {
        userId: user._id,
        firstName,
        lastName,
        email: user.email || '',
        role: 'employee', // Par défaut, on met le rôle 'employee'
        isActive: true
      });
    }
  }
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
