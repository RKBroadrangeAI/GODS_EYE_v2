import { LoginForm } from "@/components/login-form";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import Image from "next/image";

export default async function LoginPage() {
  const session = await getSession();

  if (session) {
    redirect("/app/sales-performance");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-white p-4 overflow-hidden">
      <Image
        src="/God's Eye Login Page Background 2.png"
        alt=""
        fill
        className="object-cover pointer-events-none"
        unoptimized
        priority
      />
      <div className="relative z-10">
        <LoginForm />
      </div>
    </main>
  );
}
