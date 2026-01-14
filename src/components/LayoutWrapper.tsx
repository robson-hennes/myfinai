"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export const LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const isLoginPage = pathname === "/login";

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            <Sidebar />
            <main className="flex-1 ml-64 overflow-y-auto p-8 lg:p-12">
                {children}
            </main>
        </div>
    );
};
