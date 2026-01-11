"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Users,
    Settings,
    LogOut,
    CreditCard,
    Briefcase
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Users, label: "Clientes", href: "/clientes" },
    { icon: Briefcase, label: "Serviços", href: "/servicos" },
    { icon: CreditCard, label: "Financeiro", href: "/financeiro" },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 h-screen bg-card border-r border-border flex flex-col fixed left-0 top-0">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
                    <span className="text-primary-foreground font-bold font-mono">M</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">MyFinAI</h1>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-1">
                {menuItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group text-sm font-medium",
                            pathname === item.href
                                ? "bg-primary/10 text-primary shadow-sm"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                    >
                        <item.icon className={cn(
                            "w-5 h-5",
                            pathname === item.href ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="p-4 border-t border-border mt-auto">
                <div className="px-3 py-2 flex items-center gap-3 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer rounded-md text-sm">
                    <Settings className="w-5 h-5" />
                    Configurações
                </div>
                <div className="px-3 py-2 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-all cursor-pointer rounded-md mt-1 text-sm">
                    <LogOut className="w-5 h-5" />
                    Sair
                </div>
            </div>
        </aside>
    );
}
