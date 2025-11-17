import { supabase } from "@/lib/supabase";

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, first_name, last_name, role")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}
