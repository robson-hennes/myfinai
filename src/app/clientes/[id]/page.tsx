"use client";

import { useEffect, useState, use } from "react";
import {
    Users,
    Mail,
    Phone,
    ArrowLeft,
    Calendar,
    CreditCard,
    Plus,
    ExternalLink
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { formatCurrency } from "@/lib/billing";

interface Client {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    created_at: string;
}

interface Service {
    id: string;
    name: string;
    amount: number;
    recurrence: string;
    is_active: boolean;
    next_billing_date: string | null;
}

export default function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const clientId = resolvedParams.id;

    const [client, setClient] = useState<Client | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (clientId) {
            fetchClientData();
        }
    }, [clientId]);

    async function fetchClientData() {
        setLoading(true);

        // Fetch client info
        const { data: clientData, error: clientError } = await supabase
            .from("clients")
            .select("*")
            .eq("id", clientId)
            .single();

        if (clientError) {
            console.error("Error fetching client:", clientError);
        } else {
            setClient(clientData);
        }

        // Fetch client services
        const { data: servicesData, error: servicesError } = await supabase
            .from("services")
            .select("*")
            .eq("client_id", clientId)
            .order("created_at", { ascending: false });

        if (servicesError) {
            console.error("Error fetching services:", servicesError);
        } else {
            setServices(servicesData || []);
        }

        setLoading(false);
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground">Carregando detalhes do cliente...</p>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <h3 className="text-xl font-bold">Cliente não encontrado</h3>
                <Link href="/clientes" className="mt-4 text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar para lista
                </Link>
            </div>
        );
    }

    const mrr = services
        .filter(s => s.is_active && s.recurrence === 'monthly')
        .reduce((acc, s) => acc + Number(s.amount), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group w-fit">
                <Link href="/clientes" className="flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    Voltar para Clientes
                </Link>
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Perfil do Cliente */}
                <div className="glass-card w-full md:w-1/3">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 bg-secondary rounded-full flex items-center justify-center text-4xl font-bold text-primary mb-4">
                            {client.name.charAt(0)}
                        </div>
                        <h2 className="text-2xl font-bold">{client.name}</h2>
                        <span className="text-sm text-muted-foreground">Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <div className="mt-8 space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                            <Mail className="w-5 h-5 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">E-mail</span>
                                <span className="text-sm truncate">{client.email || "Não informado"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg">
                            <Phone className="w-5 h-5 text-primary" />
                            <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Telefone</span>
                                <span className="text-sm">{client.phone || "Não informado"}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Métricas e Serviços */}
                <div className="flex-1 space-y-6 w-full">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="glass-card flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <CreditCard className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Receita Mensal (MRR)</p>
                                <p className="text-2xl font-bold text-primary">{formatCurrency(mrr)}</p>
                            </div>
                        </div>
                        <div className="glass-card flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Serviços Ativos</p>
                                <p className="text-2xl font-bold">{services.filter(s => s.is_active).length}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">Serviços Contratados</h3>
                            <Link
                                href="/servicos"
                                className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:opacity-90 transition-opacity flex items-center gap-2"
                            >
                                <Plus className="w-3 h-3" />
                                Adicionar Serviço
                            </Link>
                        </div>

                        {services.length > 0 ? (
                            <div className="space-y-4">
                                {services.map((service) => (
                                    <div key={service.id} className="flex items-center justify-between p-4 bg-secondary/20 rounded-lg hover:border-primary/30 border border-transparent transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                service.is_active ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground"
                                            )} />
                                            <div>
                                                <p className="font-semibold text-sm">{service.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{service.recurrence} • Próximo: {service.next_billing_date ? new Date(service.next_billing_date).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 text-right">
                                            <div>
                                                <p className="font-bold text-sm">{formatCurrency(Number(service.amount))}</p>
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Valor Atual</p>
                                            </div>
                                            <button className="p-2 text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                                                <ExternalLink className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-muted-foreground text-sm">Nenhum serviço registrado para este cliente.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
