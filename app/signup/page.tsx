import { redirect } from "next/navigation";

// Accounts are Discord-only — signup and login are the same thing.
export default function SignupPage() {
  redirect("/login");
}
