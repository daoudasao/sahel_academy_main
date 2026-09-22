"use client";

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const API_URL = process.env.NEXT_PUBLIC_API_URL
  ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("NEXT_PUBLIC_API_URL manquant en production"); })()
    : "http://localhost:3001/api/v1");

export const authClient = createAuthClient({
  // Le backend monte better-auth sous /api/v1/auth
  baseURL: `${API_URL}/auth`,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [adminClient()],
});

export const { signIn, signOut, signUp, useSession } = authClient;
