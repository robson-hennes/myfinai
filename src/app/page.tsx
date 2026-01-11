"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { calculateMRR } from "@/lib/billing";
import Link from "next/link";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    clientsCount: 0,
    monthlyRevenue: 0,
    activeServices: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    // 1. Fetch total clients
    const { count: clientsCount } = await supabase
      .from("clients")
      .select("*", { count: 'exact', head: true });

    // 2. Fetch active services and calculate revenue
    const { data: services } = await supabase
      .from("services")
      .select("amount, recurrence")
      .eq("is_active", true);

    let revenue = 0;
    services?.forEach(s => {
      revenue += calculateMRR(Number(s.amount), s.recurrence as any);
    });

    // 3. Fetch recent transactions (dummy for now as we haven't implemented logic to populate it yet)
    // In a real app, a trigger or cron job would generate transactions
    const { data: transactions } = await supabase
      .from("transactions")
      .select(`
        *,
        services ( name, clients ( name ) )
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    setMetrics({
      clientsCount: clientsCount || 0,
      monthlyRevenue: revenue,
      activeServices: services?.length || 0
    });
    setRecentTransactions(transactions || []);
    setLoading(false);
  }

  const stats = [
    {
      label: "Clientes Ativos",
      value: metrics.clientsCount.toString(),
      change: "+0%", // Needs historical data for real calculation
      trending: "up",
      icon: Users,
    },
    {
      label: "Receita Mensal Est. (MRR)",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.monthlyRevenue),
      change: "+0%",
      trending: "up",
      icon: CreditCard,
    },
    {
      label: "Serviços Ativos",
      value: metrics.activeServices.toString(),
      change: "Stable",
      trending: "up",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Bem-vindo de volta, aqui está o resumo do seu negócio em tempo real.
          </p>
        </div>
        <Link
          href="/clientes"
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus className="w-5 h-5" />
          Novo Registro
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card">
            <div className="flex items-start justify-between">
              <div className="p-2 bg-secondary rounded-lg">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium",
                stat.trending === "up" ? "text-primary" : "text-destructive"
              )}>
                {stat.change}
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <p className="text-2xl font-bold mt-1">
                {loading ? "..." : stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Faturamento Recente</h3>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{tx.services?.clients?.name}</p>
                    <p className="text-xs text-muted-foreground">{tx.services?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">{tx.status}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">Nenhuma transação registrada ainda.</p>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/clientes" className="p-4 bg-secondary/50 rounded-lg hover:bg-secondary border border-border transition-all flex flex-col items-center gap-2 group">
              <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Add Cliente</span>
            </Link>
            <Link href="/servicos" className="p-4 bg-secondary/50 rounded-lg hover:bg-secondary border border-border transition-all flex flex-col items-center gap-2 group">
              <div className="p-2 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-medium">Novo Serviço</span>
            </Link>
          </div>
          <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-2">Dica Pro</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              O MRR (Receita Mensal Recorrente) é calculado proporcionalmente com base na periodicidade de cada serviço ativo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
