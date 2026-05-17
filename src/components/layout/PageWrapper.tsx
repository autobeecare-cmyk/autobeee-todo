"use client";
import { useUIStore } from "@/store/useUIStore";

export function PageWrapper({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  return (
    <div 
      className="transition-[margin] duration-300 page-wrapper" 
      id="page-wrapper"
    >
      <style>{`
        @media (min-width: 768px) {
          .page-wrapper {
            margin-left: ${sidebarOpen ? '220px' : '64px'};
          }
        }
      `}</style>
      {children}
    </div>
  );
}
