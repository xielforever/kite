import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export const edgeAuthConfig = {
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize() {
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user && "mustChangePassword" in user) {
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }
      if (user && "systemRole" in user) {
        token.systemRole = user.systemRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.systemRole = token.systemRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const authConfig = {
  ...edgeAuthConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          systemRole: user.systemRole,
          mustChangePassword: user.mustChangePassword,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      if (user && "mustChangePassword" in user) {
        token.mustChangePassword = Boolean(user.mustChangePassword);
      }
      if (user && "systemRole" in user) {
        token.systemRole = user.systemRole;
      }
      if (!user && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { systemRole: true, mustChangePassword: true },
        });
        if (fresh) {
          token.systemRole = fresh.systemRole;
          token.mustChangePassword = fresh.mustChangePassword;
        } else {
          token.systemRole = "USER";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.mustChangePassword = Boolean(token.mustChangePassword);
        session.user.systemRole = token.systemRole === "SUPER_ADMIN" ? "SUPER_ADMIN" : "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
