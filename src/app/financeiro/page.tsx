"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/billing";

export default function FinanceiroPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTransactions();
    }, []);

    async function fetchTransactions() {
        setLoading(true);
        const { data, error } = await supabase
            .from("transactions")
            .select("*, clients(name)")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Error fetching transactions:", error);
        } else {
            setTransactions(data || []);
        }
        setLoading(false);
    }

    const totalIncome = transactions
        .filter(t => t.type === "income")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalExpense = transactions
        .filter(t => t.type === "expense")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <p className="text-muted-foreground mt-1">
                    Controle de entradas, saídas e saúde financeira do seu negócio.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Saldo Total</p>
                        <h3 className="text-2xl font-bold mt-1">{formatCurrency(totalIncome - totalExpense)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Wallet className="w-6 h-6" />
                    </div>
                </div>
                <div className="glass-card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Entradas</p>
                        <h3 className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(totalIncome)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                        <ArrowUpRight className="w-6 h-6" />
                    </div>
                </div>
                <div className="glass-card flex items-center justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground">Saídas</p>
                        <h3 className="text-2xl font-bold mt-1 text-rose-500">{formatCurrency(totalExpense)}</h3>
                    </div>
                    <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
                        <ArrowDownLeft className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="flex items-center gap-2 mb-6">
                    <History className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-bold">Histórico de Transações</h3>
                </div>

                {loading ? (
                    <div className="py-12 flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground">Carregando transações...</p>
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-3 px-4 font-semibold text-sm">Data</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Cliente / Descrição</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Tipo</th>
                                    <th className="py-3 px-4 font-semibold text-sm text-right">Valor</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((t) => (
                                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                                        <td className="py-4 px-4 text-sm text-muted-foreground">
                                            {new Date(t.created_at).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="py-4 px-4">
                                            <p className="font-medium">{t.clients?.name || t.description || "Transação"}</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={cn(
                                                "text-[10px] uppercase font-bold px-2 py-1 rounded-full",
                                                t.type === "income" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                            )}>
                                                {t.type === "income" ? "Receita" : "Despesa"}
                                            </span>
                                        </td>
                                        <td className={cn(
                                            "py-4 px-4 text-right font-bold",
                                            t.type === "income" ? "text-emerald-500" : "text-rose-500"
                                        )}>
                                            {t.type === "income" ? "+" : "-"} {formatCurrency(t.amount)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-muted-foreground">Nenhuma transação registrada ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Utility function for conditional classes (copy from lib/utils if needed, but imported here)
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
