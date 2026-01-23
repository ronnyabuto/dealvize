import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load env vars
dotenv.config({ path: '.env.local' })

async function verify() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
        console.error('❌ Missing URL or Service Role Key in .env.local')
        process.exit(1)
    }

    console.log('Testing connection to:', url)
    const supabase = createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })

    console.log('Attempting to write to system_logs...')
    const { data, error } = await supabase.from('system_logs').insert({
        level: 'info',
        component: 'verification_script',
        message: 'Manual verification test from local environment',
        metadata: { source: 'cli', timestamp: Date.now() }
    }).select()

    if (error) {
        console.error('❌ FAILED to write log:', error.message)
        console.error('Possible causes:')
        console.error('1. Migration SYSTEM_LOGS.sql was not run')
        console.error('2. Service Role Key is invalid')
        process.exit(1)
    }

    console.log('✅ SUCCESS! Log written successfully.')
    console.log('Inserted:', data)
}

verify()
