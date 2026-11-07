import Link from "next/link";

export const metadata = {
  title: "Page not found | StealthVault",
};

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0b0c10] text-center flex flex-col items-center justify-center px-6">
      <p className="text-[11px] font-mono text-emerald-400 tracking-[0.15em] font-semibold">404</p>
      <h1 className="mt-4 font-serif text-4xl md:text-5xl text-[#E6EAF0]">This page stayed invisible.</h1>
      <p className="mt-4 text-gray-400">There's nothing at this address.</p>
      <Link href="/" className="mt-8 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
        Back to StealthVault
      </Link>
    </main>
  );
}
