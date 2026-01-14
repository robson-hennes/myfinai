"use client";

import { useEffect, useState } from "react";
import { CreditCard, ArrowUpRight, ArrowDownLeft, Wallet, TrendingUp, History, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/billing";

export default function FinanceiroPage() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<any | null>(null);

    const [newTransaction, setNewTransaction] = useState({
        description: "",
        amount: "",
        type: "expense",
        status: "paid", // default
        client_id: "",
        created_at: new Date().toISOString().split('T')[0] // Use Date for input
    });

    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Filter State
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [typeFilter, setTypeFilter] = useState("all");

    // Derived state for filtered transactions
    const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.created_at);
        const tMonth = tDate.toISOString().slice(0, 7);
        const matchMonth = tMonth === selectedMonth;

        const matchType = typeFilter === "all" || t.type === typeFilter;

        return matchMonth && matchType;
    });

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

        // Fetch clients
        const { data: clientsData, error: clientsError } = await supabase
            .from("clients")
            .select("id, name")
            .order("name");

        if (clientsData) setClients(clientsData);

        setLoading(false);
    }

    async function handleAddTransaction(e: React.FormEvent) {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Sessão expirada. Faça login novamente.");
            return;
        }

        const amount = parseFloat(newTransaction.amount);
        if (isNaN(amount)) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        const payload = {
            description: newTransaction.description,
            amount: amount,
            type: newTransaction.type,
            status: newTransaction.status,
            client_id: newTransaction.client_id || null, // Allow null
            created_at: new Date(newTransaction.created_at).toISOString(),
            due_date: newTransaction.created_at, // Missing field causing error
            service_id: null, // Explicitly null for manual transactions
            user_id: user.id
        };

        const { data, error } = await supabase
            .from("transactions")
            .insert([payload])
            .select("*, clients(name)");

        if (error) {
            console.error("Error adding transaction:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            alert(`Erro ao adicionar transação: ${error.message}`);
        } else {
            setTransactions([data[0], ...transactions]);
            setIsAdding(false);
            setNewTransaction({
                description: "",
                amount: "",
                type: "expense",
                status: "paid",
                client_id: "",
                created_at: new Date().toISOString().split('T')[0]
            });
        }
    }

    async function handleUpdateTransaction(e: React.FormEvent) {
        e.preventDefault();
        if (!editingTransaction) return;

        const { data: { user } } = await supabase.auth.getUser();

        const amount = parseFloat(editingTransaction.amount);
        if (isNaN(amount)) {
            alert("Por favor, insira um valor válido.");
            return;
        }

        const payload = {
            description: editingTransaction.description,
            amount: amount,
            type: editingTransaction.type,
            status: editingTransaction.status,
            client_id: editingTransaction.client_id || null,
            created_at: new Date(editingTransaction.created_at).toISOString(),
            due_date: editingTransaction.created_at,
            user_id: user?.id
        };

        const { error } = await supabase
            .from("transactions")
            .update(payload)
            .eq("id", editingTransaction.id);

        if (error) {
            console.error("Error updating transaction:", error);
            alert("Erro ao atualizar transação");
        } else {
            // Optimistic update or refetch - choosing map renewal for speed
            setTransactions(transactions.map(t =>
                t.id === editingTransaction.id
                    ? { ...t, ...payload, clients: clients.find(c => c.id === payload.client_id) || null }
                    : t
            ));
            setEditingTransaction(null);
        }
    }

    async function handleDeleteTransaction(id: string) {
        if (typeof window !== 'undefined' && !window.confirm("Tem certeza que deseja excluir esta transação?")) return;

        const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting transaction:", error);
        } else {
            setTransactions(transactions.filter(t => t.id !== id));
            setEditingTransaction(null);
        }
    }

    async function handleBulkDelete() {
        if (selectedIds.length === 0) {
            alert("Nenhuma transação selecionada.");
            return;
        }

        if (typeof window !== 'undefined' && !window.confirm(`Tem certeza que deseja excluir ${selectedIds.length} transações?`)) {
            return;
        }

        const { data, error } = await supabase
            .from("transactions")
            .delete()
            .in("id", selectedIds)
            .select();

        if (error) {
            console.error("Error bulk deleting transactions:", error);
            alert(`Erro ao excluir transações: ${error.message}`);
        } else {
            alert(`${data?.length || 0} transações excluídas com sucesso!`);
            setTransactions(transactions.filter(t => !selectedIds.includes(t.id)));
            setSelectedIds([]);
        }
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTransactions.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredTransactions.map(t => t.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const totalIncome = filteredTransactions
        .filter(t => t.type === "income")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    const totalExpense = filteredTransactions
        .filter(t => t.type === "expense")
        .reduce((acc, t) => acc + Number(t.amount), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
                    <p className="text-muted-foreground">
                        Controle de entradas, saídas e saúde financeira do seu negócio.
                    </p>

                    {/* Filters Toolbar */}
                    <div className="flex items-center gap-3">
                        <input
                            type="month"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground icon-calendar"
                        />
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="bg-secondary/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        >
                            <option value="all">Todas as Transações</option>
                            <option value="income">Receitas</option>
                            <option value="expense">Despesas</option>
                        </select>
                    </div>
                </div>
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
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold">Histórico de Transações</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <button
                                onClick={handleBulkDelete}
                                className="bg-destructive/10 text-destructive border border-destructive/20 px-4 py-2 rounded-md font-medium hover:bg-destructive/20 transition-colors text-sm"
                            >
                                Excluir ({selectedIds.length})
                            </button>
                        )}
                        <button
                            onClick={() => setIsAdding(true)}
                            className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                        >
                            <Plus className="w-5 h-5" />
                            Nova Transação
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-12 flex flex-col items-center gap-4">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-muted-foreground">Carregando transações...</p>
                    </div>
                ) : filteredTransactions.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border">
                                    <th className="py-3 px-4 font-semibold text-sm w-[40px]">
                                        <input
                                            type="checkbox"
                                            checked={filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length}
                                            onChange={toggleSelectAll}
                                            className="rounded border-border bg-secondary"
                                        />
                                    </th>
                                    <th className="py-3 px-4 font-semibold text-sm">Data</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Cliente / Descrição</th>
                                    <th className="py-3 px-4 font-semibold text-sm">Tipo</th>
                                    <th className="py-3 px-4 font-semibold text-sm text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.map((t) => (
                                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors group">
                                        <td className="py-4 px-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(t.id)}
                                                onChange={() => toggleSelect(t.id)}
                                                className="rounded border-border bg-secondary"
                                            />
                                        </td>
                                        <td className="py-4 px-4 text-sm text-muted-foreground">
                                            {new Date(t.created_at).toLocaleDateString("pt-BR")}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="font-medium text-foreground transaction-description">{t.description}</div>
                                            <div className="text-xs text-muted-foreground">{t.clients?.name || "Geral"}</div>
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
                                        <td className="py-4 px-4 text-right">
                                            <button
                                                onClick={() => setEditingTransaction({
                                                    ...t,
                                                    created_at: new Date(t.created_at).toISOString().split('T')[0] // Format for input
                                                })}
                                                className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <TrendingUp className="w-4 h-4 rotate-90" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
                        <button onClick={() => setIsAdding(true)} className="text-primary mt-2 hover:underline">
                            Adicionar Transação Manual
                        </button>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-bold mb-6">Nova Transação</h3>
                        <form onSubmit={handleAddTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Descrição</label>
                                    <input
                                        type="text"
                                        value={newTransaction.description}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        placeholder="Ex: Aluguel, Venda Avulsa..."
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Valor</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={newTransaction.amount}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Data</label>
                                    <input
                                        required
                                        type="date"
                                        value={newTransaction.created_at}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, created_at: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 icon-calendar"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Tipo</label>
                                    <select
                                        value={newTransaction.type}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="income">Receita</option>
                                        <option value="expense">Despesa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Cliente (Opcional)</label>
                                    <select
                                        value={newTransaction.client_id}
                                        onChange={(e) => setNewTransaction({ ...newTransaction, client_id: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Nenhum</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
                                <button type="button" onClick={() => setIsAdding(false)} className="flex-1 bg-secondary py-2 rounded-md">Cancelar</button>
                                <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingTransaction && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold">Editar Transação</h3>
                            <button type="button" onClick={() => handleDeleteTransaction(editingTransaction.id)} className="text-destructive text-sm font-bold border border-destructive/20 px-3 py-1 rounded hover:bg-destructive/10">Excluir</button>
                        </div>
                        <form onSubmit={handleUpdateTransaction} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Descrição</label>
                                    <input
                                        type="text"
                                        value={editingTransaction.description || ""}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Valor</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={editingTransaction.amount}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Data</label>
                                    <input
                                        required
                                        type="date"
                                        value={editingTransaction.created_at}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, created_at: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 icon-calendar"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Tipo</label>
                                    <select
                                        value={editingTransaction.type}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, type: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="income">Receita</option>
                                        <option value="expense">Despesa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Cliente (Opcional)</label>
                                    <select
                                        value={editingTransaction.client_id || ""}
                                        onChange={(e) => setEditingTransaction({ ...editingTransaction, client_id: e.target.value })}
                                        className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    >
                                        <option value="">Nenhum</option>
                                        {clients.map(client => (
                                            <option key={client.id} value={client.id}>{client.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
                                <button type="button" onClick={() => setEditingTransaction(null)} className="flex-1 bg-secondary py-2 rounded-md">Cancelar</button>
                                <button type="submit" className="flex-1 bg-primary text-primary-foreground py-2 rounded-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Utility function for conditional classes (copy from lib/utils if needed, but imported here)
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(" ");
}
