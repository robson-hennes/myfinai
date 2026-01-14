"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    MessageCircle,
    Mail,
    Loader2
} from "lucide-react";
import toast from "react-hot-toast";

interface Template {
    id: string;
    type: 'whatsapp' | 'email';
    trigger: 'reminder' | 'due' | 'overdue' | 'receipt';
    name: string;
    subject?: string;
    content: string;
    is_active: boolean;
}

const TRIGGER_LABELS = {
    'reminder': 'Lembrete (2 dias antes)',
    'due': 'No Dia do Vencimento',
    'overdue': 'Em Atraso',
    'receipt': 'Recibo de Pagamento'
};

export default function TemplatesPage() {
    const router = useRouter();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterType, setFilterType] = useState<'whatsapp' | 'email'>('whatsapp');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [formData, setFormData] = useState<Partial<Template>>({
        type: 'whatsapp',
        trigger: 'reminder',
        name: '',
        subject: '',
        content: '',
        is_active: true
    });

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notification_templates')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (error) {
            console.error("Error fetching templates:", error);
            toast.error("Erro ao carregar templates.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Usuário não autenticado");
                return;
            }

            const payload = {
                ...formData,
                user_id: user.id
            };

            let error;
            if (editingTemplate) {
                const { error: updateError } = await supabase
                    .from('notification_templates')
                    .update(payload)
                    .eq('id', editingTemplate.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('notification_templates')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success(editingTemplate ? "Template atualizado!" : "Template criado!");
            setIsModalOpen(false);
            setEditingTemplate(null);
            resetForm();
            fetchTemplates();
        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este template?")) return;

        try {
            const { error } = await supabase
                .from('notification_templates')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success("Template excluído.");
            fetchTemplates();
        } catch (error) {
            toast.error("Erro ao excluir template.");
        }
    };

    const openModal = (template?: Template) => {
        if (template) {
            setEditingTemplate(template);
            setFormData(template);
        } else {
            setEditingTemplate(null);
            resetForm();
            setFormData(prev => ({ ...prev, type: filterType }));
        }
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            type: 'whatsapp',
            trigger: 'reminder',
            name: '',
            subject: '',
            content: '',
            is_active: true
        });
    };

    const filteredTemplates = templates.filter(t => t.type === filterType);

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <div className="flex-1 p-8 overflow-y-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Templates de Mensagem</h1>
                        <p className="text-muted-foreground mt-1">Personalize as mensagens enviadas aos seus clientes.</p>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={20} />
                        Novo Template
                    </button>
                </header>

                <div className="flex gap-4 mb-6">
                    <button
                        onClick={() => setFilterType('whatsapp')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${filterType === 'whatsapp'
                            ? 'bg-green-500/10 border-green-500 text-green-500'
                            : 'bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80'
                            }`}
                    >
                        <MessageCircle size={18} />
                        WhatsApp
                    </button>
                    <button
                        onClick={() => setFilterType('email')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-colors ${filterType === 'email'
                            ? 'bg-blue-500/10 border-blue-500 text-blue-500'
                            : 'bg-secondary border-transparent text-muted-foreground hover:bg-secondary/80'
                            }`}
                    >
                        <Mail size={18} />
                        E-mail
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTemplates.map(template => (
                        <div key={template.id} className="bg-card border border-border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <span className="text-xs uppercase font-semibold text-muted-foreground bg-secondary px-2 py-1 rounded">
                                        {TRIGGER_LABELS[template.trigger]}
                                    </span>
                                    <h3 className="text-lg font-bold mt-2">{template.name}</h3>
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openModal(template)} className="p-1.5 hover:bg-secondary rounded text-blue-400">
                                        <Edit size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1.5 hover:bg-secondary rounded text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {template.subject && (
                                <p className="text-sm text-muted-foreground mb-2">
                                    <span className="font-semibold">Assunto:</span> {template.subject}
                                </p>
                            )}

                            <div className="bg-secondary/50 p-3 rounded text-sm text-muted-foreground whitespace-pre-wrap max-h-32 overflow-hidden text-ellipsis">
                                {template.content}
                            </div>
                        </div>
                    ))}

                    {filteredTemplates.length === 0 && (
                        <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border rounded-lg">
                            <p>Nenhum template de {filterType === 'whatsapp' ? 'WhatsApp' : 'E-mail'} encontrado.</p>
                            <button onClick={() => openModal()} className="text-primary hover:underline mt-2">Criar o primeiro</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-bold">
                                {editingTemplate ? 'Editar Template' : 'Novo Template'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo</label>
                                    <select
                                        className="w-full bg-secondary border border-border rounded px-3 py-2"
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                    >
                                        <option value="whatsapp">WhatsApp</option>
                                        <option value="email">E-mail</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gatilho (Quando enviar?)</label>
                                    <select
                                        className="w-full bg-secondary border border-border rounded px-3 py-2"
                                        value={formData.trigger}
                                        onChange={e => setFormData({ ...formData, trigger: e.target.value as any })}
                                    >
                                        <option value="reminder">Lembrete (2 dias antes)</option>
                                        <option value="due">No Vencimento</option>
                                        <option value="overdue">Em Atraso</option>
                                        <option value="receipt">Recibo de Pagamento</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Nome do Template (Interno)</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-secondary border border-border rounded px-3 py-2"
                                    placeholder="Ex: Cobrança Amigável"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {formData.type === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Assunto do E-mail</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-secondary border border-border rounded px-3 py-2"
                                        placeholder="Ex: Lembrete de Fatura"
                                        value={formData.subject}
                                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Mensagem
                                    <span className="float-right text-xs text-muted-foreground font-normal">
                                        Variáveis: {'{{cliente}}'}, {'{{valor}}'}, {'{{vencimento}}'}, {'{{servico}}'}
                                    </span>
                                </label>
                                <textarea
                                    required
                                    rows={8}
                                    className="w-full bg-secondary border border-border rounded px-3 py-2 font-mono text-sm"
                                    placeholder="Olá {{cliente}}, seu serviço {{servico}} vence em {{vencimento}}..."
                                    value={formData.content}
                                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        </form>

                        <div className="p-6 border-t border-border flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-muted-foreground hover:text-foreground"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSave}
                                className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/90 flex items-center gap-2"
                            >
                                <Save size={18} />
                                Salvar Template
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
