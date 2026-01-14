"use client";

import { useEffect, useState } from "react";
import {
    Briefcase,
    Plus,
    Search,
    Settings,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Service {
    id: string;
    name: string;
    amount: number;
    recurrence: string;
    client_id: string;
    is_active: boolean;
    next_billing_date: string | null;
    clients: { name: string }; // Joined client name
}

interface Client {
    id: string;
    name: string;
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    const [newService, setNewService] = useState({
        name: "",
        client_id: "",
        amount: "",
        recurrence: "monthly",
        is_active: true,
        installments: "1",
        next_billing_date: new Date().toISOString().split('T')[0]
    });

    const [editingService, setEditingService] = useState<Service | null>(null);

    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [recurrenceFilter, setRecurrenceFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const filteredServices = services.filter(service => {
        const matchesSearch =
            service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRecurrence = recurrenceFilter === "all" || service.recurrence === recurrenceFilter;

        const matchesStatus = statusFilter === "all"
            ? true
            : statusFilter === "active"
                ? service.is_active
                : !service.is_active;

        return matchesSearch && matchesRecurrence && matchesStatus;
    });

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);

        // Fetch active services with client names
        const { data: servicesData, error: servicesError } = await supabase
            .from("services")
            .select(`
        *,
        clients ( name )
      `)
            .order("created_at", { ascending: false });

        // Fetch clients for the dropdown
        const { data: clientsData, error: clientsError } = await supabase
            .from("clients")
            .select("id, name")
            .order("name");

        if (servicesError) console.error("Error fetching services:", servicesError);
        if (clientsError) console.error("Error fetching clients:", clientsError);

        setServices((servicesData as any) || []);
        setClients(clientsData || []);
        setLoading(false);
    }

    async function handleAddService(e: React.FormEvent) {
        e.preventDefault();
        if (!newService.name || !newService.client_id || !newService.amount) return;

        const { data, error } = await supabase
            .from("services")
            .insert([
                {
                    name: newService.name,
                    client_id: newService.client_id,
                    amount: parseFloat(newService.amount),
                    recurrence: newService.recurrence,
                    is_active: newService.is_active,
                    installments: newService.recurrence === 'installment' ? parseInt(newService.installments) : null,
                    next_billing_date: newService.next_billing_date
                }
            ])
            .select(`
        *,
        clients ( name )
      `);

        if (error) {
            console.error("Error adding service:", error);
        } else {
            setServices([data[0] as any, ...services]);
            setIsAdding(false);

            // Generate transactions if installment
            if (newService.recurrence === 'installment') {
                const serviceId = data[0].id;
                const amount = parseFloat(newService.amount);
                const count = parseInt(newService.installments);
                const startDate = new Date(newService.next_billing_date);

                const transactions = [];
                for (let i = 0; i < count; i++) {
                    const dueDate = new Date(startDate);
                    dueDate.setMonth(dueDate.getMonth() + i);

                    transactions.push({
                        service_id: serviceId,
                        client_id: newService.client_id,
                        amount: amount,
                        due_date: dueDate.toISOString().split('T')[0],
                        status: 'pending'
                    });
                }

                const { error: txError } = await supabase.from('transactions').insert(transactions);
                if (txError) console.error("Error generating transactions:", txError);
            }

            setNewService({
                name: "",
                client_id: "",
                amount: "",
                recurrence: "monthly",
                is_active: true,
                installments: "1",
                next_billing_date: new Date().toISOString().split('T')[0]
            });
        }
    }

    async function handleUpdateService(e: React.FormEvent) {
        e.preventDefault();
        if (!editingService || !editingService.name || !editingService.amount) return;

        const { error } = await supabase
            .from("services")
            .update({
                name: editingService.name,
                amount: editingService.amount,
                recurrence: editingService.recurrence,
                is_active: editingService.is_active,
                next_billing_date: editingService.next_billing_date
            })
            .eq("id", editingService.id);

        if (error) {
            console.error("Error updating service:", error);
        } else {
            setServices(services.map(s => s.id === editingService.id ? editingService : s));
            setEditingService(null);
        }
    }

    async function handleDeleteService(id: string) {
        if (!confirm("Tem certeza que deseja excluir este serviço?")) return;

        const { error } = await supabase
            .from("services")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting service:", error);
        } else {
            setServices(services.filter(s => s.id !== id));
            setEditingService(null); // Close modal if open
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer group">
                        <Link href="/" className="flex items-center gap-2">
                            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                            Voltar ao Início
                        </Link>
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight">Serviços</h2>
                    <p className="text-muted-foreground mt-1">
                        Controle suas assinaturas, recorrências e faturamento recorrente.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-5 h-5" />
                    Novo Serviço
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-secondary/50 p-4 rounded-xl border border-border/50">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por serviço ou cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background border border-border rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
                    />
                </div>
                <div className="w-[180px]">
                    <select
                        value={recurrenceFilter}
                        onChange={(e) => setRecurrenceFilter(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="all">Todas as Recorrências</option>
                        <option value="monthly">Mensal</option>
                        <option value="quarterly">Trimestral</option>
                        <option value="semiannual">Semestral</option>
                        <option value="annual">Anual</option>
                        <option value="one_time">Único</option>
                    </select>
                </div>
                <div className="w-[150px]">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="all">Todos Status</option>
                        <option value="active">Ativos</option>
                        <option value="inactive">Pausados</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Carregando serviços...</p>
                </div>
            ) : services.length > 0 ? (
                <div className="overflow-x-auto glass-card p-0 border-none bg-transparent shadow-none">
                    <table className="w-full text-left border-separate border-spacing-y-4">
                        <thead>
                            <tr className="text-muted-foreground text-sm">
                                <th className="pb-2 pl-6 font-medium text-xs">Serviço/Cliente</th>
                                <th className="pb-2 font-medium text-xs">Valor</th>
                                <th className="pb-2 font-medium text-xs">Recorrência</th>
                                <th className="pb-2 font-medium text-xs">Próximo Vencimento</th>
                                <th className="pb-2 font-medium text-xs">Situação</th>
                                <th className="pb-2 pr-6 text-right font-medium text-xs">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredServices.map((service) => (
                                <tr key={service.id} className="bg-card hover:bg-secondary/50 transition-colors group">
                                    <td className="py-4 pl-6 rounded-l-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                                                <Briefcase className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{service.name}</p>
                                                <p className="text-xs text-muted-foreground">{service.clients?.name}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 text-sm font-semibold text-primary">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.amount)}
                                    </td>
                                    <td className="py-4 text-xs font-medium text-muted-foreground">
                                        <span className="flex items-center gap-1.5 uppercase">
                                            <Clock className="w-3.5 h-3.5" />
                                            {service.recurrence === 'monthly' ? 'Mensal' :
                                                service.recurrence === 'quarterly' ? 'Trimestral' :
                                                    service.recurrence === 'semiannual' ? 'Semestral' :
                                                        service.recurrence === 'annual' ? 'Anual' : 'Único'}
                                        </span>
                                    </td>
                                    <td className="py-4 text-xs font-medium text-muted-foreground whitespace-nowrap">
                                        <span className="flex items-center gap-1.5 ">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {service.next_billing_date ? new Date(service.next_billing_date).toLocaleDateString('pt-BR') : '-'}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <span className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase",
                                            service.is_active ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
                                        )}>
                                            {service.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                            {service.is_active ? 'Ativo' : 'Pausado'}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-6 rounded-r-xl text-right">
                                        <button
                                            onClick={() => setEditingService(service)}
                                            className="p-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Settings className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-secondary rounded-full mb-4">
                        <Briefcase className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">Nenhum serviço cadastrado</h3>
                    <p className="text-muted-foreground max-w-xs mt-2">
                        Cadastre seus serviços recorrentes ou parcelados para automatizar seu fluxo financeiro.
                    </p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mt-6 text-primary font-semibold hover:underline"
                    >
                        Configurar Primeiro Serviço
                    </button>
                </div>
            )
            }

            {/* Modal para Adicionar Serviço */}
            {
                isAdding && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                            <h3 className="text-2xl font-bold mb-6">Novo Serviço</h3>
                            <form onSubmit={handleAddService} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Nome do Serviço</label>
                                        <input
                                            required
                                            type="text"
                                            value={newService.name}
                                            onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="Ex: Hospedagem Hosting Pro"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Cliente</label>
                                        <select
                                            required
                                            value={newService.client_id}
                                            onChange={(e) => setNewService({ ...newService, client_id: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="">Selecione um cliente...</option>
                                            {clients.map(client => (
                                                <option key={client.id} value={client.id}>{client.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Valor (R$)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={newService.amount}
                                            onChange={(e) => setNewService({ ...newService, amount: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            placeholder="299,00"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Recorrência</label>
                                        <select
                                            value={newService.recurrence}
                                            onChange={(e) => setNewService({ ...newService, recurrence: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="monthly">Mensal</option>
                                            <option value="quarterly">Trimestral</option>
                                            <option value="semiannual">Semestral</option>
                                            <option value="annual">Anual</option>
                                            <option value="installment">Parcelado</option>
                                            <option value="one_time">Pagamento Único</option>
                                        </select>
                                    </div>

                                    {newService.recurrence === 'installment' && (
                                        <div>
                                            <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Parcelas</label>
                                            <input
                                                required
                                                type="number"
                                                min="2"
                                                max="60"
                                                value={newService.installments}
                                                onChange={(e) => setNewService({ ...newService, installments: e.target.value })}
                                                className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    )}
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Data de Vencimento</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                required
                                                type="date"
                                                value={newService.next_billing_date}
                                                onChange={(e) => setNewService({ ...newService, next_billing_date: e.target.value })}
                                                className="w-full bg-secondary border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 bg-secondary text-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Criar Serviço
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Modal para Editar Serviço */}
            {
                editingService && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold">Editar Serviço</h3>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteService(editingService.id)}
                                    className="text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                                >
                                    Excluir Serviço
                                </button>
                            </div>
                            <form onSubmit={handleUpdateService} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Nome do Serviço</label>
                                        <input
                                            required
                                            type="text"
                                            value={editingService.name}
                                            onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Valor (R$)</label>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={editingService.amount}
                                            onChange={(e) => setEditingService({ ...editingService, amount: parseFloat(e.target.value) })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Recorrência</label>
                                        <select
                                            value={editingService.recurrence}
                                            onChange={(e) => setEditingService({ ...editingService, recurrence: e.target.value })}
                                            className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        >
                                            <option value="monthly">Mensal</option>
                                            <option value="quarterly">Trimestral</option>
                                            <option value="semiannual">Semestral</option>
                                            <option value="annual">Anual</option>
                                            <option value="one_time">Pagamento Único</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Data de Próximo Vencimento</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                required
                                                type="date"
                                                value={editingService.next_billing_date || ""}
                                                onChange={(e) => setEditingService({ ...editingService, next_billing_date: e.target.value })}
                                                className="w-full bg-secondary border border-border rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={editingService.is_active}
                                                onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-sm font-medium text-foreground">Serviço Ativo</span>
                                        </label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 pt-6 border-t border-border mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setEditingService(null)}
                                        className="flex-1 bg-secondary text-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                                    >
                                        Salvar Alterações
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
