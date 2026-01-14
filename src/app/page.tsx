"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { calculateMRR } from "@/lib/billing";
import Link from "next/link";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    clientsCount: 0,
    monthlyRevenue: 0,
    activeServices: 0,
    totalReceived: 0,
    totalPending: 0,
    overdueCount: 0,
    onTimeCount: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // 1. Fetch total clients
      const { count: clientsCount } = await supabase
        .from("clients")
        .select("*", { count: 'exact', head: true });

      // 2. Fetch active services
      const { data: services } = await supabase
        .from("services")
        .select(`
          *,
          clients ( id, name )
        `)
        .eq("is_active", true);

      let mrr = 0;
      services?.forEach(s => {
        mrr += calculateMRR(Number(s.amount), s.recurrence as any);
      });

      // 3. Fetch transactions for the current month
      const { data: monthTransactions } = await supabase
        .from("transactions")
        .select("*")
        .gte("due_date", firstDayOfMonth.toISOString().split('T')[0])
        .lte("due_date", lastDayOfMonth.toISOString().split('T')[0]);

      let received = 0;
      let pending = 0;
      monthTransactions?.forEach(t => {
        if (t.status === 'pago') {
          received += Number(t.amount);
        } else {
          pending += Number(t.amount);
        }
      });

      // 4. Calculate Overdue vs On-time clients
      // A client is overdue if they have at least one service overdue
      const clientStatusMap = new Map<string, 'on-time' | 'overdue'>();
      const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      services?.forEach(service => {
        const billingDate = new Date(service.next_billing_date);
        billingDate.setHours(0, 0, 0, 0);

        // Ignore future services for current status counts
        if (billingDate >= startOfNextMonth) return;

        if (!clientStatusMap.has(service.clients.id)) {
          clientStatusMap.set(service.clients.id, 'on-time');
        }

        const hasPaid = (monthTransactions || []).some(t =>
          t.service_id === service.id && t.status === 'pago'
          // Also check if paid with the cycle's month/year matching
          // (matching logic from cobrancas page)
          && new Date(t.due_date).getMonth() === billingDate.getMonth()
          && new Date(t.due_date).getFullYear() === billingDate.getFullYear()
        );

        if (billingDate.getTime() < today.getTime() && !hasPaid) {
          clientStatusMap.set(service.clients.id, 'overdue');
        }
      });

      let overdue = 0;
      let onTime = 0;
      clientStatusMap.forEach(status => {
        if (status === 'overdue') overdue++;
        else onTime++;
      });

      // 5. Fetch recent transactions
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
        monthlyRevenue: mrr,
        activeServices: services?.length || 0,
        totalReceived: received,
        totalPending: pending,
        overdueCount: overdue,
        onTimeCount: onTime
      });
      setRecentTransactions(transactions || []);
    } catch (error) {
      console.error("Dashboard error:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = [
    {
      label: "Receita Realizada (Mês)",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalReceived),
      change: "Real",
      trending: "up",
      icon: TrendingUp,
    },
    {
      label: "A Receber (Mês)",
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalPending),
      change: "Pendente",
      trending: "down",
      icon: CreditCard,
    },
    {
      label: "Clientes em Dia",
      value: metrics.onTimeCount.toString(),
      change: "OK",
      trending: "up",
      icon: Users,
    },
    {
      label: "Clientes em Atraso",
      value: metrics.overdueCount.toString(),
      change: "Atenção",
      trending: metrics.overdueCount > 0 ? "down" : "up",
      icon: AlertCircle,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card">
            <div className="flex items-start justify-between">
              <div className="p-2 bg-secondary rounded-lg">
                <stat.icon className={cn(
                  "w-6 h-6",
                  stat.label === "Clientes em Atraso" && metrics.overdueCount > 0 ? "text-rose-500" : "text-primary"
                )} />
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider",
                stat.trending === "up" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              )}>
                {stat.change}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-primary/80 uppercase tracking-widest">Receita Mensal Est. (MRR)</p>
              <p className="text-3xl font-bold mt-1">
                {loading ? "..." : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.monthlyRevenue)}
              </p>
            </div>
            <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20">
              <TrendingUp className="w-8 h-8" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            Baseado em {metrics.activeServices} serviços ativos. O MRR reflete sua receita recorrente previsível.
          </p>
        </div>

        <div className="glass-card flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total de Clientes</p>
            <p className="text-3xl font-bold mt-1">{loading ? "..." : metrics.clientsCount}</p>
          </div>
          <Link href="/clientes" className="p-4 bg-secondary rounded-2xl hover:bg-secondary/80 transition-all group">
            <Users className="w-8 h-8 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        </div>
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
