const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// Load env vars
dotenv.config({ path: '.env.local' })

async function checkIntegration() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const targetEmail = 'ronnyabuto@gmail.com'

    if (!url || !key) {
        console.error('❌ Missing URL or Service Role Key in .env.local')
        process.exit(1)
    }

    const supabase = createClient(url, key, {
        auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log(`🔍 Checking integration status for ${targetEmail}...`)

    // Query for the specific email in metadata
    const { data: integrations, error } = await supabase
        .from('user_integrations')
        .select('id, provider, created_at, updated_at, metadata')
        .eq('provider', 'google')
        .filter('metadata->>email', 'eq', targetEmail)

    if (error) {
        console.error('❌ Database Scan Failed:', error.message)
        return
    }

    if (integrations.length === 0) {
        console.log('⚠️  NO INTEGRATION FOUND.')
        console.log('   This means the "Connect Google" step hasn\'t happened')
        console.log('   or the email in the verified token was different.')

        // Let's try to list ANY integrations to see if there's a mismatch
        console.log('   Checking if ANY Google integrations exist...')
        const { data: anyData } = await supabase
            .from('user_integrations')
            .select('metadata')
            .eq('provider', 'google')
            .limit(5)

        if (anyData && anyData.length > 0) {
            console.log('   Found these emails instead:', anyData.map(d => d.metadata.email))
        } else {
            console.log('   No Google integrations found at all.')
        }
    } else {
        const int = integrations[0]
        console.log('✅ INTEGRATION CONFIRMED')
        console.log('   ---------------------')
        console.log(`   ID:        ${int.id}`)
        console.log(`   Provider:  ${int.provider}`)
        console.log(`   Email:     ${int.metadata.email}`)
        console.log(`   Connected: ${new Date(int.created_at).toLocaleString()}`)
        console.log(`   Last Sync: ${new Date(int.updated_at).toLocaleString()}`)
        console.log('   ---------------------')
        console.log('   Status: READY TO RECEIVE WEBHOOKS 🟢')
    }
}

checkIntegration()
