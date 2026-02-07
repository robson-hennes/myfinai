"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { calculateMRR } from "@/lib/billing";

export default function DebugDBPage() {
    const [status, setStatus] = useState<any>(null);
    const [clients, setClients] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function check() {
            setLoading(true);
            try {
                // Check session
                const { data: { session } } = await supabase.auth.getSession();
                
                // Fetch clients
                const { data: clientsData, error: clientsError, count: clientsCount } = await supabase
                    .from('clients')
                    .select('*', { count: 'exact' });
                
                // Fetch services
                const { data: servicesData, error: servicesError } = await supabase
                    .from('services')
                    .select(`
                        *,
                        clients ( id, name )
                    `)
                    .eq('is_active', true);
                
                // Fetch transactions
                const { data: transData, error: transError } = await supabase
                    .from('transactions')
                    .select(`
                        *,
                        services ( name, clients ( name ) )
                    `)
                    .order('created_at', { ascending: false })
                    .limit(10);

                // Calculate MRR
                let mrr = 0;
                servicesData?.forEach(s => {
                    mrr += calculateMRR(Number(s.amount), s.recurrence as any);
                });

                setStatus({
                    session: session ? 'Active' : 'No Session',
                    uid: session?.user?.id || 'None',
                    email: session?.user?.email || 'None',
                    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                    clientsCount: clientsCount,
                    clientsError: clientsError?.message || null,
                    servicesCount: servicesData?.length || 0,
                    servicesError: servicesError?.message || null,
                    transactionsCount: transData?.length || 0,
                    transactionsError: transError?.message || null,
                    mrr: mrr
                });
                
                setClients(clientsData || []);
                setServices(servicesData || []);
                setTransactions(transData || []);
            } catch (error) {
                console.error('Debug error:', error);
            } finally {
                setLoading(false);
            }
        }
        check();
    }, []);

    if (loading) {
        return (
            <div className="p-10 font-mono">
                <h1 className="text-2xl font-bold mb-4">Debug Database</h1>
                <p>Carregando...</p>
            </div>
        );
    }

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-4">🔍 Debug Database</h1>
            
            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">📊 Status Geral</h2>
                <pre className="bg-secondary p-4 rounded overflow-auto">
                    {JSON.stringify(status, null, 2)}
                </pre>
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">👥 Clientes ({clients.length})</h2>
                {clients.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum cliente encontrado</p>
                ) : (
                    <div className="space-y-2">
                        {clients.slice(0, 5).map(c => (
                            <div key={c.id} className="p-3 border border-border rounded bg-secondary/50">
                                <div className="font-bold">{c.name}</div>
                                <div className="text-xs text-muted-foreground">
                                    Email: {c.email || 'N/A'} | Phone: {c.phone || 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    User ID: {c.user_id}
                                </div>
                            </div>
                        ))}
                        {clients.length > 5 && (
                            <p className="text-muted-foreground">... e mais {clients.length - 5} clientes</p>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">💼 Serviços Ativos ({services.length})</h2>
                {services.length === 0 ? (
                    <p className="text-muted-foreground">Nenhum serviço encontrado</p>
                ) : (
                    <div className="space-y-2">
                        {services.slice(0, 5).map(s => (
                            <div key={s.id} className="p-3 border border-border rounded bg-secondary/50">
                                <div className="font-bold">{s.name}</div>
                                <div className="text-xs">
                                    Cliente: {s.clients?.name || 'N/A'}
                                </div>
                                <div className="text-xs">
                                    Valor: R$ {Number(s.amount).toFixed(2)} | Recorrência: {s.recurrence}
                                </div>
                                <div className="text-xs">
                                    Próximo vencimento: {s.next_billing_date}
                                </div>
                                <div className="text-xs text-primary">
                                    MRR: R$ {calculateMRR(Number(s.amount), s.recurrence).toFixed(2)}
                                </div>
                            </div>
                        ))}
                        {services.length > 5 && (
                            <p className="text-muted-foreground">... e mais {services.length - 5} serviços</p>
                        )}
                    </div>
                )}
            </div>

            <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">💰 Transações Recentes ({transactions.length})</h2>
                {transactions.length === 0 ? (
                    <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                ) : (
                    <div className="space-y-2">
                        {transactions.map(t => (
                            <div key={t.id} className="p-3 border border-border rounded bg-secondary/50">
                                <div className="font-bold">
                                    R$ {Number(t.amount).toFixed(2)} - {t.status}
                                </div>
                                <div className="text-xs">
                                    Cliente: {t.services?.clients?.name || 'N/A'}
                                </div>
                                <div className="text-xs">
                                    Serviço: {t.services?.name || 'N/A'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    Vencimento: {t.due_date} | Criado: {new Date(t.created_at).toLocaleString('pt-BR')}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-8 p-4 bg-primary/10 border border-primary/20 rounded">
                <h3 className="font-bold mb-2">💡 Dicas de Debug:</h3>
                <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Se "session" = "No Session": Você não está logado. Acesse /login</li>
                    <li>Se "clientsCount" = 0: O banco está vazio ou RLS está bloqueando</li>
                    <li>Se há erro de RLS: Verifique se o user_id dos dados corresponde ao seu UID</li>
                    <li>Se há dados aqui mas não no dashboard: Problema na lógica do dashboard</li>
                </ul>
            </div>
        </div>
    );
}
