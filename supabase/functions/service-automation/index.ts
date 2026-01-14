import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import nodemailer from "npm:nodemailer@6.9.7";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS Handle
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ---------------------------------------------------------
        // 1. Authorization Check (Manual or Automatic)
        // ---------------------------------------------------------
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }
        const token = authHeader.replace('Bearer ', '')
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Invalid token', details: authError }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // ---------------------------------------------------------
        // 2. Parse Payload
        // ---------------------------------------------------------
        const payload = await req.json().catch(() => ({}))
        const { manual, service_id, type: manualType } = payload
        // manual: boolean (if true, triggered by user button)
        // manualType: 'whatsapp' | 'email'

        // ---------------------------------------------------------
        // 3. Fetch Service(s)
        // ---------------------------------------------------------
        let query = supabaseClient
            .from('services')
            .select(`
                *,
                clients (
                    name,
                    contact_name,
                    email,
                    phone,
                    user_id
                )
            `)
            .eq('is_active', true)

        if (manual && service_id) {
            query = query.eq('id', service_id)
        }

        const { data: services, error: servicesError } = await query
        if (servicesError) throw servicesError

        // ---------------------------------------------------------
        // 4. Processing Loop
        // ---------------------------------------------------------
        const results = []
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        for (const service of services) {
            const billingDate = new Date(service.next_billing_date)
            billingDate.setHours(0, 0, 0, 0)
            const userId = service.clients.user_id

            // A. Fetch Settings (SMTP, Webhooks)
            const { data: settings } = await supabaseClient
                .from('automation_settings')
                .select('*')
                .eq('user_id', userId)
                .single()

            if (!settings) {
                console.error(`Settings not found for user ${userId}`)
                results.push({ service: service.name, status: 'Error: No Settings' })
                continue
            }

            // B. Fetch Templates for this User
            const { data: templates } = await supabaseClient
                .from('notification_templates')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)

            // Helper to find template
            const getTemplate = (type: 'whatsapp' | 'email', trigger: string) => {
                return templates?.find(t => t.type === type && t.trigger === trigger)
            }

            // Helper to format currency
            const formatCurrency = (val: number) => {
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
            }

            // Helper to format date
            const formatDate = (dateStr: string) => {
                return new Date(dateStr).toLocaleDateString('pt-BR')
            }

            // Helper to replace variables
            const parseMessage = (content: string) => {
                const clientName = service.clients.contact_name || service.clients.name;
                return content
                    .replace(/{{cliente}}/g, clientName)
                    .replace(/{{servico}}/g, service.name)
                    .replace(/{{valor}}/g, formatCurrency(service.amount))
                    .replace(/{{vencimento}}/g, formatDate(service.next_billing_date))
                    .replace(/{{link_pagamento}}/g, '#') // Placeholder
            }

            // Determine Status
            const isOverdue = billingDate.getTime() < today.getTime()
            const isDueToday = billingDate.getTime() === today.getTime()
            // Days overdue
            const diffTime = Math.abs(today.getTime() - billingDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Logic Decision
            let actionType = manualType || null
            let triggerType = manual ? (isOverdue ? 'overdue' : 'due') : null

            // If automatic, determine trigger
            if (!manual) {
                // Auto logic (simplified for this update, focusing on structure)
                // In real auto run, we would check dates
            }

            // -----------------------------------------------------
            // SENDING LOGIC
            // -----------------------------------------------------

            // === WHATSAPP ===
            if (actionType === 'whatsapp' && settings.whatsapp_webhook_url) {
                // 1. Find Template
                const template = getTemplate('whatsapp', triggerType || 'reminder')
                    || getTemplate('whatsapp', 'overdue') // fallback

                // 2. Prepare Content
                let messageText = ""
                if (template) {
                    messageText = parseMessage(template.content)
                } else {
                    // Default fallback message
                    messageText = `Olá ${service.clients.name}, referente ao serviço *${service.name}*. Valor: ${formatCurrency(service.amount)}.`
                }

                // 3. Format Phone
                let formattedPhone = service.clients.phone.replace(/\D/g, '');
                if (formattedPhone.length >= 10 && formattedPhone.length <= 11) {
                    formattedPhone = `55${formattedPhone}`;
                }

                // 4. Send
                try {
                    const response = await fetch(settings.whatsapp_webhook_url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            number: formattedPhone,
                            text: messageText
                        })
                    })
                    if (!response.ok) throw new Error(`Webhook Error: ${response.statusText}`)
                    results.push({ service: service.name, method: 'whatsapp', status: 'sent' })
                } catch (e: any) {
                    console.error("WhatsApp Error", e)
                    results.push({ service: service.name, method: 'whatsapp', status: 'error', error: e.message })
                }
            }

            // === EMAIL (SMTP) ===
            if (actionType === 'email' && settings.smtp_host) {
                // 1. Find Template
                const template = getTemplate('email', triggerType || 'reminder')
                    || getTemplate('email', 'overdue') // fallback

                // 2. Prepare Content
                let emailBody = ""
                let emailSubject = "Aviso de Cobrança"

                if (template) {
                    emailBody = parseMessage(template.content)
                    if (template.subject) emailSubject = parseMessage(template.subject)
                } else {
                    emailBody = `Olá ${service.clients.name},<br>Detalhes do serviço: ${service.name}<br>Valor: ${formatCurrency(service.amount)}`
                }

                // 3. Configure Transporter
                const secure = settings.smtp_port === 465; // true for 465 (SSL), false for other ports (STARTTLS)

                const transporter = nodemailer.createTransport({
                    host: settings.smtp_host,
                    port: settings.smtp_port,
                    secure: secure,
                    auth: {
                        user: settings.smtp_host.includes('resend.com') ? 'resend' : settings.smtp_user,
                        pass: settings.smtp_pass,
                    },
                    tls: {
                        rejectUnauthorized: false
                    },
                    connectionTimeout: 10000,
                    greetingTimeout: 10000,
                    socketTimeout: 10000,
                    logger: true,
                    debug: true
                });

                // 4. Send
                try {
                    // Force valid sender for Resend
                    let fromEmail = settings.smtp_user;
                    if (settings.smtp_user.toLowerCase() === 'resend') {
                        fromEmail = 'onboarding@resend.dev';
                    } else if (!settings.smtp_user.includes('@')) {
                        fromEmail = 'no-reply@myfinai.com';
                    }

                    await transporter.sendMail({
                        from: `"${settings.smtp_user}" <${fromEmail}>`,
                        to: service.clients.email,
                        replyTo: settings.smtp_user.includes('@') ? settings.smtp_user : undefined,
                        subject: emailSubject,
                        text: emailBody.replace(/<[^>]*>/g, ''), // Plain text fallback
                        html: emailBody // HTML version
                    });
                    results.push({ service: service.name, method: 'email', status: 'sent' })
                } catch (e: any) {
                    console.error("SMTP Error Details:", JSON.stringify(e, null, 2))
                    console.log(`Attempted to send email to ${service.clients.email} using user ${settings.smtp_user} on ${settings.smtp_host}:${settings.smtp_port}`)

                    // Specific error for UI
                    throw new Error(`Falha no envio de e-mail (SMTP): ${e.message || e.response || 'Erro desconhecido'}. Verifique suas credenciais em Configurações.`)
                }
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
