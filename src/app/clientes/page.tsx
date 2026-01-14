"use client";

import { useEffect, useState } from "react";
import {
    Users,
    Plus,
    Search,
    MoreVertical,
    Mail,
    Phone,
    ArrowLeft,
    LayoutGrid,
    List,
    Pencil,
    Trash2,
    X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Client {
    id: string;

    name: string; // Company Name
    contact_name: string | null; // Contact Person
    email: string | null;
    phone: string | null;
}

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [newClient, setNewClient] = useState({ name: "", contact_name: "", email: "", phone: "" });

    useEffect(() => {
        fetchClients();
    }, []);

    async function fetchClients() {
        setLoading(true);
        const { data, error } = await supabase
            .from("clients")
            .select("*")
            .order("name");

        if (error) {
            console.error("Error fetching clients:", error);
        } else {
            setClients(data || []);
        }
        setLoading(false);
    }

    async function handleAddClient(e: React.FormEvent) {
        e.preventDefault();
        if (!newClient.name) return;

        const { data, error } = await supabase
            .from("clients")
            .insert([
                {
                    name: newClient.name,
                    contact_name: newClient.contact_name || newClient.name, // Default to name if empty, though UI should encourage it
                    email: newClient.email || null,
                    phone: newClient.phone || null,
                    user_id: (await supabase.auth.getUser()).data.user?.id || "00000000-0000-0000-0000-000000000000"
                }
            ])
            .select();

        if (error) {
            console.error("Error adding client:", error);
        } else {
            setClients([...clients, data[0]].sort((a, b) => a.name.localeCompare(b.name)));
            setIsAdding(false);
            setNewClient({ name: "", contact_name: "", email: "", phone: "" });
        }
    }

    async function handleUpdateClient(e: React.FormEvent) {
        e.preventDefault();
        if (!editingClient || !editingClient.name) return;

        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from("clients")
            .update({
                name: editingClient.name,
                contact_name: editingClient.contact_name,
                email: editingClient.email,
                phone: editingClient.phone,
                user_id: user?.id
            })
            .eq("id", editingClient.id);

        if (error) {
            console.error("Error updating client:", error);
        } else {
            setClients(clients.map(c => c.id === editingClient.id ? editingClient : c).sort((a, b) => a.name.localeCompare(b.name)));
            setEditingClient(null);
        }
    }

    async function handleDeleteClient(id: string) {
        if (!confirm("Tem certeza que deseja excluir este cliente? Todos os serviços vinculados também serão removidos.")) return;

        const { error } = await supabase
            .from("clients")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Error deleting client:", error);
        } else {
            // Refresh the client list to ensure UI consistency
            await fetchClients();
        }
    }







    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                    <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-muted-foreground mt-1">
                        Gerencie sua base de clientes e seus dados de contato.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                    <Plus className="w-5 h-5" />
                    Novo Cliente
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>
                <div className="flex p-1 bg-secondary rounded-lg self-start">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Visualização em Grade"
                    >
                        <LayoutGrid className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={cn(
                            "p-2 rounded-md transition-all",
                            viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                        title="Visualização em Lista"
                    >
                        <List className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-muted-foreground">Carregando clientes...</p>
                </div>
            ) : filteredClients.length > 0 ? (
                viewMode === "grid" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredClients.map((client) => (
                            <div key={client.id} className="glass-card group hover:border-primary/50 transition-all">
                                <div className="flex items-start justify-between">
                                    <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center text-xl font-bold text-primary">
                                        {client.name.charAt(0)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setEditingClient(client)}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteClient(client.id)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <h3 className="font-bold text-lg truncate" title={client.name}>{client.name}</h3>
                                    {client.contact_name && client.contact_name !== client.name && (
                                        <p className="text-sm text-primary/80 font-medium truncate mb-2">
                                            Contato: {client.contact_name}
                                        </p>
                                    )}
                                    <div className="space-y-2 mt-3">
                                        {client.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Mail className="w-4 h-4" />
                                                <span className="truncate">{client.email}</span>
                                            </div>
                                        )}
                                        {client.phone && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <Phone className="w-4 h-4" />
                                                <span>{client.phone}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 pt-4 border-t border-border flex justify-end">
                                    <Link
                                        href={`/clientes/${client.id}`}
                                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                                    >
                                        Ver Detalhes
                                        <ArrowUpRight className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-secondary/30">
                                        <th className="py-3 px-6 font-semibold text-sm">Empresa / Cliente</th>
                                        <th className="py-3 px-6 font-semibold text-sm">Contato</th>
                                        <th className="py-3 px-6 font-semibold text-sm">E-mail</th>
                                        <th className="py-3 px-6 font-semibold text-sm">Telefone</th>
                                        <th className="py-3 px-6 font-semibold text-sm text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredClients.map((client) => (
                                        <tr key={client.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-xs font-bold text-primary">
                                                        {client.name.charAt(0)}
                                                    </div>
                                                    <span className="font-medium text-sm">{client.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-muted-foreground">
                                                {client.contact_name || "-"}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-muted-foreground">
                                                {client.email || "-"}
                                            </td>
                                            <td className="py-4 px-6 text-sm text-muted-foreground">
                                                {client.phone || "-"}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Link
                                                        href={`/clientes/${client.id}`}
                                                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                                        title="Ver Detalhes"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => setEditingClient(client)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClient(client.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                <div className="glass-card flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-secondary rounded-full mb-4">
                        <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold">Nenhum cliente encontrado</h3>
                    <p className="text-muted-foreground max-w-xs mt-2">
                        Comece adicionando o seu primeiro cliente para gerenciar serviços e faturas.
                    </p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mt-6 text-primary font-semibold hover:underline"
                    >
                        Adicionar Primeiro Cliente
                    </button>
                </div>
            )}

            {/* Modal para Adicionar Cliente */}
            {isAdding && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold">Novo Cliente</h3>
                            <button onClick={() => setIsAdding(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleAddClient} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Nome Completo</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={newClient.name}
                                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">E-mail</label>
                                <input
                                    type="email"
                                    value={newClient.email}
                                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="joao@example.com"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Telefone</label>
                                <input
                                    type="tel"
                                    value={newClient.phone}
                                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-4">
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
                                    Salvar Cliente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal para Editar Cliente */}
            {editingClient && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold">Editar Cliente</h3>
                            <button onClick={() => setEditingClient(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateClient} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Nome da Empresa</label>
                                <input
                                    autoFocus
                                    required
                                    type="text"
                                    value={editingClient.name}
                                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: Empresa LTDA"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Nome do Contato</label>
                                <input
                                    required
                                    type="text"
                                    value={editingClient.contact_name || ""}
                                    onChange={(e) => setEditingClient({ ...editingClient, contact_name: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="Ex: João Silva"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">E-mail</label>
                                <input
                                    type="email"
                                    value={editingClient.email || ""}
                                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="joao@example.com"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1.5 block text-muted-foreground">Telefone</label>
                                <input
                                    type="tel"
                                    value={editingClient.phone || ""}
                                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                                    className="w-full bg-secondary border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="(11) 99999-9999"
                                />
                            </div>
                            <div className="flex items-center gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingClient(null)}
                                    className="flex-1 bg-secondary text-foreground py-2 rounded-md font-medium hover:bg-secondary/80 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-primary text-primary-foreground py-2 rounded-md font-medium hover:opacity-90 transition-opacity"
                                >
                                    Atualizar Dados
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function ArrowUpRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24" height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M7 7h10v10" /><path d="M7 17 17 7" />
        </svg>
    );
}
