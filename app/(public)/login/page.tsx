import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/session";
import LoginForm from "./LoginForm";

export const metadata = { title: "Investor login" };

export default async function LoginPage() {
  const auth = await getAuth();
  if (auth) redirect(auth.user.role === "admin" ? "/admin" : "/portal");
  return (
    <div className="auth-wrap">
      <LoginForm />
    </div>
  );
}
