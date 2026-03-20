import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-screen overflow-hidden bg-[#0a0a0a]">
      <div className="absolute right-4 top-4 z-50">
        <UserButton />
      </div>
      {children}
    </div>
  );
}
