"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export type UserRole = "Admin" | "Médico" | "Recepción" | "Especialista";

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  is_active: boolean;
}

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

// Configurar QueryClient para React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setProfile(null);
        return;
      }

      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        setProfile(existingProfile as UserProfile);
        return;
      }

      // Profile doesn't exist — create it (e.g. user signed up before the migration was applied)
      const { error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email || "unknown@email.com",
          name: (user.user_metadata?.name as string) || user.email?.split("@")[0] || "Usuario",
          role: (user.user_metadata?.role as UserRole) || "Recepción",
          is_active: true,
        });

      if (insertError) {
        console.error("Error creating profile:", insertError);
        setProfile(null);
        return;
      }

      const { data: newProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (newProfile) {
        setProfile(newProfile as UserProfile);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        fetchProfile();
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <UserContext.Provider value={{ profile, isLoading, refreshProfile: fetchProfile }}>
        {children}
      </UserContext.Provider>
    </QueryClientProvider>
  );
}
