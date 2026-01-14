
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRLS() {
    console.log('Verifying RLS for public.clients (Anon Access)...');

    const { data, error } = await supabase.from('clients').select('*');

    if (error) {
        console.log('✅ Received expected error (or successful empty restricted result):', error.message);
    } else if (data.length === 0) {
        console.log('✅ Success: No data returned for anonymous user.');
    } else {
        console.error('❌ FAILURE: Anonymous user accessed data:', data.length, 'rows retrieved.');
        process.exit(1);
    }

    console.log('RLS Verification Passed for Anon access.');
}

verifyRLS();
