import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      systemRole?: "SUPER_ADMIN" | "USER";
      mustChangePassword?: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    systemRole?: "SUPER_ADMIN" | "USER";
    mustChangePassword?: boolean;
  }
}
