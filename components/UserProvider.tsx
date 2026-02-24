"use client";

import React, { createContext, useContext } from "react";
import { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
} | null;

type Credits = {
  user_id: string;
  credit_balance: number;
  is_pro: boolean;
  pro_expires_at: string | null;
  stripe_customer_id: string | null;
} | null;

type UserContextType = {
  user: User | null;
  profile: Profile;
  credits: Credits;
};

const UserContext = createContext<UserContextType>({
  user: null,
  profile: null,
  credits: null,
});

export function UserProvider({
  children,
  user,
  profile,
  credits,
}: {
  children: React.ReactNode;
  user: User | null;
  profile: Profile;
  credits: Credits;
}) {
  return (
    <UserContext.Provider value={{ user, profile, credits }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
