"use client";

import { useEffect, useState } from "react";
import {
    Bell,
    Search,
    Mail,
    MessageCircle,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Calendar,
    ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/billing";
import { cn } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";

interface ServiceWithClient {
    id: string;
    name: string;
    amount: number;
    next_billing_date: string;
    is_active: boolean;
    client_id: string;
    clients: {
        name: string;
        email: string;
        phone: string;
    };
    status: 'paid' | 'overdue' | 'pending';
    diffDays: number;
}

export default function CobrançasPage() {
    const [services, setServices] = useState<ServiceWithClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch active services
            const { data: servicesData, error: sError } = await supabase
                .from('services')
                .select(`
                    *,
                    clients (
                        name,
                        email,
                        phone
                    )
                `)
                .eq('is_active', true);

            if (sError) throw sError;

            // 2. Fetch recent transactions to check payment status
            const { data: transactionsData, error: tError } = await supabase
                .from('transactions')
                .select('*')
                .eq('status', 'pago');

            if (tError) throw tError;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            const enrichedServices = (servicesData || []).map(service => {
                const billingDate = new Date(service.next_billing_date);
                billingDate.setHours(0, 0, 0, 0);

                // Check if paid in the same month/year
                const hasPaid = (transactionsData || []).some(t =>
                    t.service_id === service.id &&
                    new Date(t.due_date).getMonth() === billingDate.getMonth() &&
                    new Date(t.due_date).getFullYear() === billingDate.getFullYear()
                );

                const isOverdue = billingDate.getTime() < today.getTime() && !hasPaid;
                const isPaid = hasPaid;

                const diffTime = today.getTime() - billingDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

                return {
                    ...service,
                    status: isPaid ? 'paid' : (isOverdue ? 'overdue' : 'pending'),
                    diffDays: isOverdue ? diffDays : 0
                };
            });

            // Filter to show:
            // 1. Services due in the current month
            // 2. Services due in the past that are NOT paid (Overdue)
            // Hides future services as per user request
            const filteredByDate = enrichedServices.filter(s => {
                const bDate = new Date(s.next_billing_date);
                bDate.setHours(0, 0, 0, 0);

                // If due in the future (next month or later), hide
                if (bDate >= startOfNextMonth) return false;

                // If due in the past (before current month), only show if NOT paid
                if (bDate < startOfCurrentMonth && s.status === 'paid') return false;

                return true;
            });

            setServices(filteredByDate as ServiceWithClient[]);
        } catch (error: any) {
            toast.error("Erro ao carregar dados: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleManualNotification = async (serviceId: string, type: 'whatsapp' | 'email') => {
        setProcessingId(`${serviceId}-${type}`);
        try {
            const { data, error } = await supabase.functions.invoke('service-automation', {
                body: {
                    manual: true,
                    service_id: serviceId,
                    type: type
                }
            });

            if (error) throw error;

            if (data?.success) {
                toast.success(`Notificação de ${type === 'whatsapp' ? 'WhatsApp' : 'E-mail'} enviada!`);
            } else {
                throw new Error(data?.error || "Erro desconhecido");
            }
        } catch (error: any) {
            toast.error("Erro ao enviar: " + error.message);
        } finally {
            setProcessingId(null);
        }
    };

    const filteredServices = services.filter(s =>
        s.clients.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2 group">
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Voltar ao Início
                    </Link>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                        Painel de Cobranças
                    </h1>
                    <p className="text-muted-foreground">Monitore o status de pagamento e envie notificações manuais.</p>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Buscar por cliente ou serviço..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-card/30 border border-white/10 rounded-2xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-xl"
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-muted-foreground font-medium">Analisando faturas e pagamentos...</p>
                </div>
            ) : filteredServices.length > 0 ? (
                <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="py-4 px-6 font-semibold text-sm">Cliente / Serviço</th>
                                    <th className="py-4 px-6 font-semibold text-sm">Próximo Vencimento</th>
                                    <th className="py-4 px-6 font-semibold text-sm">Valor</th>
                                    <th className="py-4 px-6 font-semibold text-sm">Status</th>
                                    <th className="py-4 px-6 font-semibold text-sm text-right">Ações Manuais</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredServices.map((service) => (
                                    <tr key={service.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-6">
                                            <div className="font-bold">{service.clients.name}</div>
                                            <div className="text-xs text-muted-foreground">{service.name}</div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                                {new Date(service.next_billing_date).toLocaleDateString('pt-BR')}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 font-bold text-sm">
                                            {formatCurrency(service.amount)}
                                        </td>
                                        <td className="py-4 px-6">
                                            {service.status === 'paid' ? (
                                                <div className="flex items-center gap-1.5 text-emerald-500 font-bold text-xs uppercase tracking-wider">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Em dia
                                                </div>
                                            ) : service.status === 'overdue' ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs uppercase tracking-wider">
                                                        <AlertCircle className="w-4 h-4" />
                                                        Atrasado
                                                    </div>
                                                    <span className="text-[10px] text-rose-500/80 ml-5">{service.diffDays} dias de atraso</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs uppercase tracking-wider">
                                                    <Calendar className="w-4 h-4" />
                                                    Pendente
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleManualNotification(service.id, 'whatsapp')}
                                                    disabled={processingId !== null}
                                                    title="Enviar WhatsApp"
                                                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 rounded-xl transition-all disabled:opacity-50"
                                                >
                                                    {processingId === `${service.id}-whatsapp` ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <MessageCircle className="w-5 h-5" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleManualNotification(service.id, 'email')}
                                                    disabled={processingId !== null}
                                                    title="Enviar E-mail"
                                                    className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 rounded-xl transition-all disabled:opacity-50"
                                                >
                                                    {processingId === `${service.id}-email` ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Mail className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-card/30 border border-white/10 rounded-3xl flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 bg-white/5 rounded-full mb-4">
                        <Bell className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-muted-foreground/50">Nenhuma cobrança ativa</h3>
                    <p className="text-muted-foreground max-w-xs mt-2">
                        Seus serviços ativos aparecerão aqui para monitoramento de faturas.
                    </p>
                </div>
            )}
        </div>
    );
}
