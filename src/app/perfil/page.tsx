"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { User, Mail, Phone, MapPin, Camera, Loader2, Save, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useRef } from "react";

export default function ProfilePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [userData, setUserData] = useState({
        email: "",
        full_name: "",
        phone: "",
        address: "",
        bio: "",
        avatar_url: "",
    });
    const [automationSettings, setAutomationSettings] = useState({
        smtp_host: "",
        smtp_port: 587,
        smtp_user: "",
        smtp_pass: "",
        whatsapp_webhook_url: "",
    });

    useEffect(() => {
        const getProfile = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserData({
                        email: user.email || "",
                        full_name: user.user_metadata?.full_name || "",
                        phone: user.user_metadata?.phone || "",
                        address: user.user_metadata?.address || "",
                        bio: user.user_metadata?.bio || "",
                        avatar_url: user.user_metadata?.avatar_url || "",
                    });

                    // Fetch automation settings
                    const { data: settings, error: settingsError } = await supabase
                        .from("automation_settings")
                        .select("*")
                        .eq("user_id", user.id)
                        .single();

                    if (settings && !settingsError) {
                        setAutomationSettings({
                            smtp_host: settings.smtp_host || "",
                            smtp_port: settings.smtp_port || 587,
                            smtp_user: settings.smtp_user || "",
                            smtp_pass: settings.smtp_pass || "",
                            whatsapp_webhook_url: settings.whatsapp_webhook_url || "",
                        });
                    }
                }
            } catch (error) {
                console.error("Erro ao carregar perfil:", error);
            } finally {
                setLoading(false);
            }
        };

        getProfile();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não encontrado");

            // Update user metadata
            const { error: profileError } = await supabase.auth.updateUser({
                data: {
                    full_name: userData.full_name,
                    phone: userData.phone,
                    address: userData.address,
                    bio: userData.bio,
                },
            });

            if (profileError) throw profileError;

            // Upsert automation settings
            const { error: settingsError } = await supabase
                .from("automation_settings")
                .upsert({
                    user_id: user.id,
                    ...automationSettings,
                    updated_at: new Date().toISOString(),
                });

            if (settingsError) throw settingsError;

            toast.success("Perfil e configurações atualizados!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao atualizar perfil");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast.error("Erro ao sair.");
        } else {
            toast.success("Até logo!");
            router.push("/login");
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não encontrado");

            const fileExt = file.name.split('.').pop();
            const filePath = `${user.id}/${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (updateError) throw updateError;

            setUserData(prev => ({ ...prev, avatar_url: publicUrl }));
            toast.success("Foto de perfil atualizada!");
        } catch (error: any) {
            toast.error(error.message || "Erro ao fazer upload");
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                    Meu Perfil
                </h1>
                <p className="text-muted-foreground">Gerencie suas informações pessoais e biografia.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Sidebar / Avatar Area */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-3xl p-6 text-center">
                        <div className="relative inline-block group">
                            <div className="w-32 h-32 rounded-full border-2 border-primary/20 bg-white/5 flex items-center justify-center overflow-hidden">
                                {userData.avatar_url ? (
                                    <img src={userData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-12 h-12 text-muted-foreground" />
                                )}
                                {uploading && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                        <h2 className="mt-4 font-bold text-xl">{userData.full_name || "Usuário"}</h2>
                        <p className="text-sm text-muted-foreground mb-6">{userData.email}</p>

                        <button
                            onClick={handleLogout}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-all font-medium border border-destructive/20"
                        >
                            <LogOut className="w-4 h-4" />
                            Sair da Conta
                        </button>
                    </div>
                </div>

                {/* Form Area */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleUpdateProfile} className="bg-card/30 backdrop-blur-xl border border-white/10 rounded-3xl p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground ml-1">Nome Completo</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="text"
                                        value={userData.full_name}
                                        onChange={(e) => setUserData({ ...userData, full_name: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground ml-1">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                    <input
                                        type="email"
                                        disabled
                                        value={userData.email}
                                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-3 pl-12 pr-4 text-muted-foreground/40 cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground ml-1">Telefone</label>
                                <div className="relative group">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="text"
                                        value={userData.phone}
                                        onChange={(e) => setUserData({ ...userData, phone: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-muted-foreground ml-1">Endereço</label>
                                <div className="relative group">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                    <input
                                        type="text"
                                        value={userData.address}
                                        onChange={(e) => setUserData({ ...userData, address: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="Rua, Número, Cidade"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-muted-foreground ml-1">Bio / Descrição Profissional</label>
                            <textarea
                                value={userData.bio}
                                onChange={(e) => setUserData({ ...userData, bio: e.target.value })}
                                rows={4}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
                                placeholder="Conte um pouco sobre sua atuação profissional..."
                            />
                        </div>

                        {/* Automação Section */}
                        <div className="pt-8 border-t border-white/5 space-y-6">
                            <div>
                                <h3 className="text-xl font-bold">Configurações de Automação</h3>
                                <p className="text-sm text-muted-foreground">Configure seu servidor SMTP e Webhook para notificações automáticas.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1">Servidor SMTP</label>
                                    <input
                                        type="text"
                                        value={automationSettings.smtp_host}
                                        onChange={(e) => setAutomationSettings({ ...automationSettings, smtp_host: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="smtp.exemplo.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1">Porta SMTP</label>
                                    <input
                                        type="number"
                                        value={automationSettings.smtp_port}
                                        onChange={(e) => setAutomationSettings({ ...automationSettings, smtp_port: parseInt(e.target.value) })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="587"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1">Usuário SMTP</label>
                                    <input
                                        type="text"
                                        value={automationSettings.smtp_user}
                                        onChange={(e) => setAutomationSettings({ ...automationSettings, smtp_user: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="seu-email@exemplo.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1">Senha SMTP</label>
                                    <input
                                        type="password"
                                        value={automationSettings.smtp_pass}
                                        onChange={(e) => setAutomationSettings({ ...automationSettings, smtp_pass: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-sm font-semibold text-muted-foreground ml-1">WhatsApp Webhook URL (n8n)</label>
                                    <input
                                        type="text"
                                        value={automationSettings.whatsapp_webhook_url}
                                        onChange={(e) => setAutomationSettings({ ...automationSettings, whatsapp_webhook_url: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                                        placeholder="https://seu-n8n.exemplo.com/webhook/..."
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            disabled={saving}
                            className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Salvar Alterações
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
