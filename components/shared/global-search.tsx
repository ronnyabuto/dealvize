"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Users, DollarSign, CheckSquare, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useRouter } from "next/navigation"
import { Client, Deal, Task } from "@/lib/types"

interface SearchResult {
  id: string
  title: string
  subtitle: string
  type: 'client' | 'deal' | 'task'
  url: string
}

export function GlobalSearch() {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  const searchData = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setSuggestions([])
      setSearchError(null)
      return
    }

    setIsLoading(true)
    setSearchError(null)
    
    try {
      // Generate smart suggestions based on query
      const smartSuggestions = generateSearchSuggestions(searchQuery)
      setSuggestions(smartSuggestions)

      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=all`)
      
      const data = await response.json()
      
      if (!response.ok) {
        // Handle server errors gracefully
        const errorMsg = data.message || data.error || 'Search failed'
        setSearchError(errorMsg)
        setResults([])
        return
      }

      const searchResults = data.results || []
      
      // Use server-provided message or generate fallback
      if (searchResults.length === 0) {
        const errorSuggestion = data.message || generateErrorSuggestion(searchQuery)
        setSearchError(errorSuggestion)
      } else {
        setSearchError(null) // Clear any previous errors
      }
      
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        setSearchError('Connection error. Please check your internet connection and try again.')
      } else {
        setSearchError('Search temporarily unavailable. Please try again in a moment.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const generateSearchSuggestions = (query: string): string[] => {
    const suggestions: string[] = []
    const lowerQuery = query.toLowerCase()
    
    // Common search patterns and suggestions
    const patterns = [
      { keywords: ['client', 'contact', 'person'], suggestions: ['active clients', 'new leads'] },
      { keywords: ['deal', 'property', 'house'], suggestions: ['pending deals', 'closed deals', 'high value deals'] },
      { keywords: ['task', 'todo', 'follow'], suggestions: ['follow up calls', 'pending tasks', 'overdue tasks', 'today\'s tasks'] },
      { keywords: ['note', 'comment'], suggestions: ['client notes', 'deal notes', 'recent notes'] },
      { keywords: ['email', 'phone', '@'], suggestions: [] }
    ]
    
    patterns.forEach(pattern => {
      if (pattern.keywords.some(keyword => lowerQuery.includes(keyword))) {
        suggestions.push(...pattern.suggestions.filter(s => 
          s.toLowerCase().includes(lowerQuery) || lowerQuery.length < 3
        ))
      }
    })
    
    // Add partial match suggestions
    if (lowerQuery.length >= 2) {
      const partialSuggestions = [
        'Follow up call', 'Send contract', 'Schedule showing'
      ].filter(suggestion => 
        suggestion.toLowerCase().includes(lowerQuery) && 
        suggestion.toLowerCase() !== lowerQuery
      )
      suggestions.push(...partialSuggestions)
    }
    
    return [...new Set(suggestions)].slice(0, 5)
  }

  const generateErrorSuggestion = (query: string): string => {
    const lowerQuery = query.toLowerCase()
    
    // Detect common typos and provide corrections
    const corrections = [
      { typo: 'jerry', correction: 'Jerry' },
      { typo: 'sarah', correction: 'Sarah Johnson' },
      { typo: 'johnsn', correction: 'Johnson' },
      { typo: 'oak st', correction: 'Oak Street' },
      { typo: 'followup', correction: 'follow up' },
      { typo: 'clent', correction: 'client' },
      { typo: 'dela', correction: 'deal' },
      { typo: 'taks', correction: 'task' },
      { typo: 'emial', correction: 'email' }
    ]
    
    for (const { typo, correction } of corrections) {
      if (lowerQuery.includes(typo)) {
        return `Did you mean "${correction}"? No results found for "${query}".`
      }
    }
    
    // Provide context-based suggestions
    if (lowerQuery.includes('@') && !lowerQuery.includes('.')) {
      return 'Try searching with a complete email address (e.g., john@email.com)'
    }
    
    if (/^\d+$/.test(lowerQuery) && lowerQuery.length < 10) {
      return 'Try searching with a complete phone number or add more context'
    }
    
    if (lowerQuery.length < 3) {
      return 'Try typing at least 3 characters for better results'
    }
    
    return `No results found for "${query}". Try searching for clients, deals, tasks, or notes.`
  }

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (query) {
        searchData(query)
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [query, searchData])

  const handleSelect = (result: SearchResult) => {
    router.push(result.url)
    setOpen(false)
    setQuery("")
    setResults([])
    setSuggestions([])
    setSearchError(null)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion)
    searchData(suggestion)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'client':
        return <Users className="h-4 w-4" />
      case 'deal':
        return <DollarSign className="h-4 w-4" />
      case 'task':
        return <CheckSquare className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'client':
        return 'bg-blue-100 text-blue-800'
      case 'deal':
        return 'bg-green-100 text-green-800'
      case 'task':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!mounted) {
    // Return a static version for SSR to prevent hydration mismatch
    return (
      <Button
        variant="outline"
        disabled
        className="w-full max-w-md justify-start text-muted-foreground text-sm font-medium"
      >
        <Search className="mr-2 h-4 w-4" />
        Search clients, deals, tasks...
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full max-w-md justify-start text-muted-foreground text-sm font-medium"
        >
          <Search className="mr-2 h-4 w-4" />
          Search clients, deals, tasks...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] sm:w-[400px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search clients, deals, tasks..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query && isLoading && (
              <CommandEmpty>
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2">Searching...</span>
                </div>
              </CommandEmpty>
            )}
            
            {query && !isLoading && searchError && (
              <CommandEmpty>
                <div className="text-center py-6 px-4">
                  <div className="text-yellow-600 mb-3 text-2xl">🔍</div>
                  <p className="text-sm text-muted-foreground mb-2">{searchError}</p>
                  <p className="text-xs text-gray-400">Try searching for:
                    <br />• Client names (e.g., "John Smith")
                    <br />• Email addresses
                    <br />• Property addresses
                    <br />• Deal titles or task descriptions
                  </p>
                </div>
              </CommandEmpty>
            )}
            
            {query && !isLoading && !searchError && results.length === 0 && suggestions.length === 0 && (
              <CommandEmpty>
                <div className="text-center py-6 px-4">
                  <div className="text-gray-400 mb-3 text-2xl">🔍</div>
                  <p className="text-sm font-medium mb-2">No results found for "{query}"</p>
                  <p className="text-xs text-gray-400">
                    Try checking for typos or using different keywords
                  </p>
                </div>
              </CommandEmpty>
            )}

            {/* Show search suggestions when typing */}
            {query && suggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={`suggestion-${index}`}
                    onSelect={() => handleSuggestionSelect(suggestion)}
                    className="flex items-center gap-3 p-2 text-sm text-blue-600"
                  >
                    <Search className="h-4 w-4" />
                    <span>{suggestion}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Show actual search results */}
            {results.length > 0 && (
              <CommandGroup heading="🔍 Results">
                {results.map((result) => (
                  <CommandItem
                    key={`${result.type}-${result.id}`}
                    onSelect={() => handleSelect(result)}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                      {getIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{result.title}</p>
                        <Badge variant="secondary" className={getTypeColor(result.type)}>
                          {result.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </p>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}