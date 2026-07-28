import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="relative min-h-svh w-full flex items-center justify-center p-6 md:p-10 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950" />
      {/* Decorative blobs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-72 h-72 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="relative w-full max-w-md z-10">
        <SignUpForm />
      </div>
    </div>
  );
}
