import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/utils'
import { cachedFetch, cacheKeys } from '@/lib/cache/query-cache'

// Helper function for fuzzy search matching
function createFuzzySearchPattern(query: string): string {
  // Normalize the query: lowercase, remove extra spaces, handle common typos
  const normalizedQuery = query.toLowerCase().trim().replace(/\s+/g, ' ')
  
  // Create a flexible pattern that handles:
  // 1. Case insensitivity (already lowercase)
  // 2. Partial matches
  // 3. Word order variations (split and match each word separately)
  const words = normalizedQuery.split(' ').filter(word => word.length > 0)
  
  // For each word, create a flexible pattern that allows for small typos
  return words.map(word => {
    // Allow for 1-character differences in words longer than 3 chars
    if (word.length > 3) {
      return `%${word}%`
    }
    return `%${word}%`
  }).join('|') // Use OR pattern for multiple words
}

// Helper function to create multiple search variations
function getSearchVariations(query: string): string[] {
  const normalizedQuery = query.toLowerCase().trim()
  const words = normalizedQuery.split(' ').filter(word => word.length > 0)
  
  const variations = [
    normalizedQuery, // original
    words.join(' '), // cleaned spaces
  ]
  
  // Add reversed word order for names (e.g., "Johnson Sarah" -> "Sarah Johnson")
  if (words.length === 2) {
    variations.push(words.reverse().join(' '))
  }
  
  // Add common typo corrections
  const typoCorrections: Record<string, string> = {
    'folowup': 'followup',
    'followup': 'follow up',
    'clinet': 'client',
    'dela': 'deal'
  }
  
  words.forEach(word => {
    if (typoCorrections[word]) {
      const corrected = normalizedQuery.replace(word, typoCorrections[word])
      variations.push(corrected)
    }
  })
  
  return [...new Set(variations)]
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const type = searchParams.get('type') || 'all' // all, clients, deals, tasks

    if (!query.trim()) {
      return NextResponse.json({ 
        results: [], 
        query: '',
        total: 0,
        message: 'Please enter a search term'
      })
    }

    if (query.length < 2) {
      return NextResponse.json({ 
        results: [], 
        query,
        total: 0,
        message: 'Search term must be at least 2 characters'
      })
    }

    // Enterprise-grade search caching with performance optimization
    const cacheKey = `search:${user.id}:${encodeURIComponent(query)}:${type}`
    const enableCache = query.length >= 3 // Only cache meaningful searches
    
    if (enableCache) {
      try {
        const cachedResults: { results: any[] } = await cachedFetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${type}`,
          cacheKey,
          1 // 60 seconds for better performance
        )
        if (cachedResults && cachedResults.results && Array.isArray(cachedResults.results)) {
          return NextResponse.json({
            ...cachedResults,
            cached: true,
            timestamp: new Date().toISOString()
          })
        }
      } catch (cacheError) {
        // Continue with fresh search if cache fails
        console.warn('Search cache error:', cacheError)
      }
    }

    const results: any[] = []
    const searchVariations = getSearchVariations(query)

    // Search clients with fuzzy matching
    if (type === 'all' || type === 'clients') {
      // Build multiple OR conditions for better matching
      const searchConditions: string[] = []
      
      // Add exact match conditions first (highest priority)
      searchConditions.push(`first_name.ilike.%${query}%`, `last_name.ilike.%${query}%`) // Fixed: use 'name' field not 'first_name/last_name'
      searchConditions.push(`email.ilike.${query}`)
      
      // Search each variation
      for (const variation of searchVariations) {
        const words = variation.split(' ')
        
        if (words.length >= 2) {
          // Handle full name searches (single name field)
          const fullNameQuery = words.join(' ')
          searchConditions.push(`first_name.ilike.%${words[0]}%`, `last_name.ilike.%${words[1]}%`)
          // Also try reversed order
          const reversedQuery = words.reverse().join(' ')
          searchConditions.push(`first_name.ilike.%${words[1]}%`, `last_name.ilike.%${words[0]}%`)
        }
        
        // Individual field searches for each word
        words.forEach(word => {
          if (word.length >= 2) {
            searchConditions.push(`first_name.ilike.%${word}%`, `last_name.ilike.%${word}%`) // Fixed: use single name field
            searchConditions.push(`email.ilike.%${word}%`)
            if (word.length >= 3) {
              searchConditions.push(`company.ilike.%${word}%`)
              searchConditions.push(`phone.ilike.%${word}%`)
            }
          }
        })
      }
      
      // Remove duplicates and create OR query (limit to prevent performance issues)
      const uniqueConditions = [...new Set(searchConditions)].slice(0, 20)
      const orQuery = uniqueConditions.join(',')
      
      if (uniqueConditions.length === 0) {
        // Fallback to basic search if no conditions generated
        searchConditions.push(`first_name.ilike.%${query}%`, `last_name.ilike.%${query}%`) // Fixed: use single name field
      }

      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone, company, address, status, created_at')
        .eq('user_id', user.id)
        .or(orQuery)
        .limit(10)
        
      if (clientError) {
        console.error('Client search error:', clientError)
        // Continue with empty results rather than failing completely
      }

      if (clients) {
        // Score and sort results by relevance
        const scoredClients = clients.map(client => {
          const fullName = `${client.first_name} ${client.last_name}`.toLowerCase()
          const reverseName = `${client.last_name} ${client.first_name}`.toLowerCase()
          const queryLower = query.toLowerCase()
          
          let score = 0
          
          // Exact full name match (highest score)
          if (fullName.includes(queryLower) || reverseName.includes(queryLower)) {
            score += 100
          }
          
          // Partial name matches
          const queryWords = queryLower.split(' ')
          queryWords.forEach(word => {
            if (client.first_name?.toLowerCase().includes(word)) score += 50
            if (client.last_name?.toLowerCase().includes(word)) score += 50
            if (client.email?.toLowerCase().includes(word)) score += 30
            if (client.company?.toLowerCase().includes(word)) score += 20
          })
          
          // Starts with bonus
          if (fullName.startsWith(queryLower) || reverseName.startsWith(queryLower)) {
            score += 25
          }
          
          return { ...client, score }
        })
        
        // Sort by score and take top results
        const topClients = scoredClients
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
        
        results.push(...topClients.map(client => ({
          id: client.id,
          title: `${client.first_name} ${client.last_name}` || 'Unnamed Client',
          subtitle: `${client.email}${client.company ? ` • ${client.company}` : ''}`,
          type: 'client',
          url: `/clients/edit/${client.id}`,
          status: client.status,
          score: client.score,
          metadata: {
            phone: client.phone,
            address: client.address,
            created_at: client.created_at
          }
        })))
      }
    }

    // Search deals with fuzzy matching
    if (type === 'all' || type === 'deals') {
      const searchConditions: string[] = []
      
      for (const variation of searchVariations) {
        const words = variation.split(' ')
        words.forEach(word => {
          if (word.length >= 2) {
            searchConditions.push(`title.ilike.%${word}%`)
            searchConditions.push(`property_address.ilike.%${word}%`)
            searchConditions.push(`status.ilike.%${word}%`)
          }
        })
      }
      
      const uniqueConditions = [...new Set(searchConditions)]
      const orQuery = uniqueConditions.join(',')

      const { data: deals, error: dealError } = await supabase
        .from('deals')
        .select(`
          id, title, value, status, property_address,
          clients(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .or(orQuery)
        .limit(8)
        
      if (dealError) {
        console.error('Deal search error:', dealError)
        // Continue with empty results rather than failing completely
      }

      if (deals) {
        // Score deals by relevance
        const scoredDeals = deals.map((deal: any) => {
          const queryLower = query.toLowerCase()
          let score = 0
          
          if (deal.title?.toLowerCase().includes(queryLower)) score += 100
          if (deal.property_address?.toLowerCase().includes(queryLower)) score += 80
          if (deal.status?.toLowerCase().includes(queryLower)) score += 60
          
          const queryWords = queryLower.split(' ')
          queryWords.forEach(word => {
            if (deal.title?.toLowerCase().includes(word)) score += 40
            if (deal.property_address?.toLowerCase().includes(word)) score += 30
            if (deal.status?.toLowerCase().includes(word)) score += 20
          })
          
          return { ...deal, score }
        })
        
        const topDeals = scoredDeals
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        results.push(...topDeals.map((deal: any) => ({
          id: deal.id,
          title: deal.title,
          subtitle: `$${deal.value?.toLocaleString() || '0'} • ${deal.status} • ${deal.clients ? `${deal.clients.first_name} ${deal.clients.last_name}` : 'No Client'}`, 
          type: 'deal',
          url: `/deals/edit/${deal.id}`,
          status: deal.status,
          value: deal.value,
          score: deal.score
        })))
      }
    }

    // Search tasks with fuzzy matching
    if (type === 'all' || type === 'tasks') {
      const searchConditions: string[] = []
      
      for (const variation of searchVariations) {
        const words = variation.split(' ')
        words.forEach(word => {
          if (word.length >= 2) {
            searchConditions.push(`title.ilike.%${word}%`)
            searchConditions.push(`description.ilike.%${word}%`)
            if (word.length >= 3) {
              searchConditions.push(`priority.ilike.%${word}%`)
              searchConditions.push(`status.ilike.%${word}%`)
            }
          }
        })
      }
      
      const uniqueConditions = [...new Set(searchConditions)]
      const orQuery = uniqueConditions.join(',')

      const { data: tasks, error: taskError } = await supabase
        .from('tasks')
        .select(`
          id, title, description, due_date, priority, status,
          clients(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .or(orQuery)
        .limit(8)
        
      if (taskError) {
        console.error('Task search error:', taskError)
        // Continue with empty results rather than failing completely
      }

      if (tasks) {
        // Score tasks by relevance
        const scoredTasks = tasks.map((task: any) => {
          const queryLower = query.toLowerCase()
          let score = 0
          
          if (task.title?.toLowerCase().includes(queryLower)) score += 100
          if (task.description?.toLowerCase().includes(queryLower)) score += 80
          if (task.priority?.toLowerCase().includes(queryLower)) score += 60
          
          const queryWords = queryLower.split(' ')
          queryWords.forEach(word => {
            if (task.title?.toLowerCase().includes(word)) score += 40
            if (task.description?.toLowerCase().includes(word)) score += 30
          })
          
          return { ...task, score }
        })
        
        const topTasks = scoredTasks
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)

        results.push(...topTasks.map((task: any) => ({
          id: task.id,
          title: task.title,
          subtitle: `${task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'} • ${task.priority}${task.clients ? ` • ${task.clients.first_name} ${task.clients.last_name}` : ''}`,
          type: 'task',
          url: `/tasks/edit/${task.id}`,
          status: task.status,
          priority: task.priority,
          score: task.score
        })))
      }
    }

    // Search notes
    if (type === 'all' || type === 'notes') {
      const { data: notes, error: noteError } = await supabase
        .from('notes')
        .select(`
          id, content, created_at,
          clients(first_name, last_name)
        `)
        .eq('user_id', user.id)
        .ilike('content', `%${query}%`)
        .limit(5)
        
      if (noteError) {
        console.error('Note search error:', noteError)
        // Continue with empty results rather than failing completely
      }

      if (notes) {
        results.push(...notes.map((note: any) => ({
          id: note.id,
          title: note.content.substring(0, 50) + (note.content.length > 50 ? '...' : ''),
          subtitle: `Note • ${new Date(note.created_at).toLocaleDateString()}${note.clients ? ` • ${note.clients.first_name} ${note.clients.last_name}` : ''}`,
          type: 'note',
          url: `/notes?id=${note.id}`
        })))
      }
    }

    // Sort all results by score (highest first), then by type priority
    const sortedResults = results.sort((a, b) => {
      // First sort by score if available
      if (a.score !== undefined && b.score !== undefined) {
        if (a.score !== b.score) {
          return b.score - a.score
        }
      }
      
      // Then by type priority: clients > deals > tasks > notes
      const typePriority = { client: 4, deal: 3, task: 2, note: 1 }
      const aPriority = typePriority[a.type as keyof typeof typePriority] || 0
      const bPriority = typePriority[b.type as keyof typeof typePriority] || 0
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority
      }
      
      // Finally by title alphabetically
      return a.title.localeCompare(b.title)
    }).slice(0, 12) // Increase limit for better results

    const response = {
      results: sortedResults,
      query,
      total: sortedResults.length,
      message: sortedResults.length === 0 ? 
        `No results found for "${query}". Try searching for clients, deals, tasks, or notes.` : 
        `Found ${sortedResults.length} result${sortedResults.length !== 1 ? 's' : ''}`
    }
    
    return NextResponse.json(response)

  } catch (error) {
    console.error('Search error:', error)
    
    // Return user-friendly error message
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: 'Search temporarily unavailable',
      message: 'Please try again in a moment',
      results: [],
      query: '',
      total: 0,
      debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 })
  }
}