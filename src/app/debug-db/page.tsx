"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function DebugDBPage() {
    const [status, setStatus] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    useEffect(() => {
        async function check() {
            const { data: { session } } = await supabase.auth.getSession();
            const { data: trans } = await supabase.from('transactions').select('*, clients(name)').limit(10);
            setStatus({
                session: session ? 'Active' : 'No Session',
                uid: session?.user?.id || 'None',
                url: process.env.NEXT_PUBLIC_SUPABASE_URL
            });
            setTransactions(trans || []);
        }
        check();
    }, []);

    return (
        <div className="p-10 font-mono">
            <h1 className="text-2xl font-bold mb-4">Debug Database</h1>
            <pre className="bg-secondary p-4 rounded mb-4">
                {JSON.stringify(status, null, 2)}
            </pre>
            <h2 className="text-xl font-bold mb-2">Recent Transactions ({transactions.length})</h2>
            <div className="space-y-2">
                {transactions.map(t => (
                    <div key={t.id} className="p-2 border border-border rounded">
                        {t.description} - {t.amount} - {t.clients?.name || 'No Client'}
                    </div>
                ))}
            </div>
        </div>
    );
}
