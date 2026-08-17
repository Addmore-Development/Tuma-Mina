import { supabase } from "./supabaseClient";
import type { TownName } from "./types";

export interface CustomerSignupInput {
  name: string;
  surname: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  password: string;
}

export interface RunnerSignupInput {
  name: string;
  surname: string;
  idNumber: string;
  address: string;
  phone: string;
  email: string;
  password: string;
  town: TownName;
  headshot: File;
  idDocument: File;
  bankProof: File;
  addressProof: File;
}

async function uploadKycFile(userId: string, kind: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("runner-kyc").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function signUpCustomer(input: CustomerSignupInput) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Sign-up did not return a user id — check email confirmation settings.");

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "customer",
    name: input.name,
    surname: input.surname,
    phone: input.phone,
    email: input.email,
  });
  if (profileError) throw profileError;

  const { error: customerError } = await supabase.from("customer_profiles").insert({
    id: userId,
    id_number: input.idNumber,
    address: input.address,
  });
  if (customerError) throw customerError;

  const { error: walletError } = await supabase.from("wallets").insert({
    customer_id: userId,
    balance: 0,
  });
  if (walletError) throw walletError;

  return authData;
}

export async function signUpRunner(input: RunnerSignupInput) {
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });
  if (authError) throw authError;
  const userId = authData.user?.id;
  if (!userId) throw new Error("Sign-up did not return a user id — check email confirmation settings.");

  const { error: profileError } = await supabase.from("profiles").insert({
    id: userId,
    role: "runner",
    name: input.name,
    surname: input.surname,
    phone: input.phone,
    email: input.email,
  });
  if (profileError) throw profileError;

  // Upload all four KYC documents in parallel.
  const [headshotPath, idDocPath, bankPath, addressPath] = await Promise.all([
    uploadKycFile(userId, "headshot", input.headshot),
    uploadKycFile(userId, "id-document", input.idDocument),
    uploadKycFile(userId, "bank-proof", input.bankProof),
    uploadKycFile(userId, "address-proof", input.addressProof),
  ]);

  const { error: appError } = await supabase.from("runner_applications").insert({
    user_id: userId,
    town: input.town,
    id_number: input.idNumber,
    address: input.address,
    headshot_path: headshotPath,
    id_document_path: idDocPath,
    bank_proof_path: bankPath,
    address_proof_path: addressPath,
  });
  if (appError) throw appError;

  return authData;
}

export async function logIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Fetches the caller's profile + role, for routing after login. */
export async function getCurrentUserRole(): Promise<
  { role: "customer" | "runner" | "supervisor" | "admin"; userId: string } | null
> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return null;

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error) throw error;
  return { role: data.role, userId };
}