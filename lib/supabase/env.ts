// Supabase connection settings.
// The URL and publishable key are public by design (they are sent to every browser), so they are safe to keep here.
// Vercel environment variables, if set, take priority.
const DEFAULT_URL = "https://agnueptkkcensaaduxfg.supabase.co";
const DEFAULT_KEY = "sb_publishable_yUI28xW7Kp6nL51KToVmAA_yTb9XnXn";

export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_URL).trim();
export const SUPABASE_KEY = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  DEFAULT_KEY
).trim();
