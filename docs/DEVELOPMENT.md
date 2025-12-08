# Development Guide

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL (or Supabase account)
- Git

### Initial Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd dealvize
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # If using Supabase, create project and get credentials
   # If using local PostgreSQL:
   createdb dealvize_dev
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## Project Structure

```
dealvize/
├── app/                    # Next.js App Router
│   ├── (dashboard)/       # Dashboard pages (route group)
│   │   ├── client/        # Client management
│   │   ├── deal/          # Deal management
│   │   ├── reports/       # Analytics and reports
│   │   └── settings/      # User settings
│   ├── (marketing)/       # Marketing pages (route group)
│   ├── api/              # API routes
│   ├── auth/             # Authentication pages
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # React components
│   ├── ui/              # Base UI components (Radix UI)
│   ├── forms/           # Form components
│   └── charts/          # Chart components
├── lib/                 # Utility libraries
│   ├── supabase/       # Database client and queries
│   ├── auth/           # Authentication utilities
│   ├── validations/    # Zod schemas
│   ├── utils.ts        # General utilities
│   └── constants.ts    # Application constants
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── __tests__/          # Test files
├── docs/               # Documentation
└── scripts/            # Build and utility scripts
```

## Development Workflow

### Code Standards

1. **TypeScript**: Strict mode enabled, no `any` types
2. **ESLint**: Configured for Next.js and TypeScript
3. **Prettier**: Code formatting (integrated with ESLint)
4. **Conventional Commits**: Use conventional commit messages

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch
- `feature/*`: Feature development
- `hotfix/*`: Critical fixes

### Commit Messages

```bash
feat: add client search functionality
fix: resolve authentication redirect loop
docs: update API documentation
refactor: optimize database queries
test: add unit tests for client management
```

## Development Commands

```bash
# Development
npm run dev              # Start development server
npm run dev:debug        # Start with debugging

# Building
npm run build            # Production build
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix ESLint issues
npm run typecheck        # TypeScript type checking
npm run format           # Format code with Prettier

# Testing
npm run test             # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report
npm run test:ui          # Run UI tests

# Database
npm run db:reset         # Reset database
npm run db:seed          # Seed database
npm run db:migrate       # Run migrations

# Performance
npm run analyze          # Analyze bundle size
npm run benchmark        # Run performance benchmarks
```

## Component Development

### Component Structure

```typescript
// components/example-component.tsx
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface ExampleComponentProps {
  title: string
  description?: string
  className?: string
  onAction?: () => void
}

export function ExampleComponent({
  title,
  description,
  className,
  onAction
}: ExampleComponentProps) {
  const [loading, setLoading] = useState(false)

  return (
    <div className={cn("space-y-4", className)}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  )
}
```

### Component Guidelines

1. **Props Interface**: Always define TypeScript interfaces
2. **Default Props**: Use destructuring with defaults
3. **Styling**: Use Tailwind with `cn()` utility for conditional classes
4. **Error Boundaries**: Wrap components that might fail
5. **Loading States**: Handle loading and error states
6. **Accessibility**: Include ARIA labels and keyboard navigation

### Form Components

```typescript
// Use react-hook-form with zod validation
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email')
})

type FormData = z.infer<typeof schema>

export function ExampleForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    // Handle form submission
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  )
}
```

## API Development

### Route Structure

```typescript
// app/api/clients/route.ts
import { NextRequest } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Query logic here
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', user.id)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ clients: data })
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### API Guidelines

1. **Authentication**: Always verify user authentication
2. **Validation**: Validate input data with Zod
3. **Error Handling**: Return consistent error responses
4. **Rate Limiting**: Implement rate limiting for sensitive endpoints
5. **Logging**: Log errors and important operations
6. **CORS**: Configure CORS headers appropriately

## Database Development

### Schema Design

```sql
-- Example table with RLS
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can only access their own clients" 
  ON clients FOR ALL 
  USING (auth.uid() = user_id);
```

### Query Optimization

1. **Indexes**: Create indexes for frequently queried columns
2. **Pagination**: Use cursor-based pagination for large datasets
3. **Joins**: Optimize joins with proper indexes
4. **Connection Pooling**: Use connection pooling for performance

### Supabase Client Usage

```typescript
// lib/supabase/queries.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export async function getClients(searchTerm?: string) {
  const supabase = createClientComponentClient<Database>()
  
  let query = supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}
```

## Testing Strategy

### Unit Tests

```typescript
// __tests__/components/client-form.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientForm } from '@/components/client-form'

describe('ClientForm', () => {
  it('renders form fields', () => {
    render(<ClientForm />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<ClientForm />)
    fireEvent.click(screen.getByRole('button', { name: /submit/i }))
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument()
  })
})
```

### Integration Tests

```typescript
// __tests__/api/clients.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/clients/route'

describe('/api/clients', () => {
  it('returns clients for authenticated user', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    })

    await handler(req, res)
    expect(res._getStatusCode()).toBe(200)
  })
})
```

### Test Guidelines

1. **Coverage**: Aim for >80% code coverage
2. **Unit Tests**: Test individual functions and components
3. **Integration Tests**: Test API routes and database operations
4. **E2E Tests**: Test critical user flows
5. **Mocking**: Mock external dependencies

## Performance Optimization

### Code Splitting

```typescript
// Use dynamic imports for heavy components
import dynamic from 'next/dynamic'

const HeavyChart = dynamic(() => import('@/components/heavy-chart'), {
  loading: () => <ChartSkeleton />,
  ssr: false
})
```

### Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/client-photo.jpg"
  alt="Client photo"
  width={200}
  height={200}
  className="rounded-full"
/>
```

### Bundle Analysis

```bash
# Analyze bundle size
ANALYZE=true npm run build
```

### Performance Monitoring

```typescript
// lib/performance.ts
export function measurePerformance(name: string) {
  const start = performance.now()
  
  return () => {
    const duration = performance.now() - start
    console.log(`${name}: ${duration.toFixed(2)}ms`)
  }
}
```

## Debugging

### Development Tools

1. **React Developer Tools**: Browser extension
2. **Redux DevTools**: If using Redux
3. **Network Tab**: Monitor API calls
4. **Console Logs**: Strategic logging

### Common Issues

1. **Hydration Errors**: Server/client mismatch
2. **Authentication Issues**: Check cookies and headers
3. **Database Errors**: Verify RLS policies
4. **Build Errors**: Check TypeScript types

### Debugging Techniques

```typescript
// Add debugging middleware
export function debugMiddleware(req: NextRequest) {
  console.log(`${req.method} ${req.url}`)
  console.log('Headers:', Object.fromEntries(req.headers))
  
  if (req.method === 'POST') {
    const body = await req.text()
    console.log('Body:', body)
  }
}
```

## Security Considerations

### Input Validation

```typescript
// Always validate input data
import { z } from 'zod'

const ClientSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional()
})

export function validateClientData(data: unknown) {
  return ClientSchema.parse(data)
}
```

### Authentication

```typescript
// Verify authentication in API routes
export async function requireAuth(request: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Unauthorized')
  }
  
  return user
}
```

### Environment Variables

- Never commit secrets to version control
- Use `.env.local` for development secrets
- Validate environment variables at startup

## Deployment

### Pre-deployment Checklist

- [ ] All tests passing
- [ ] TypeScript builds without errors
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Environment variables configured

### Build Process

```bash
# Production build
npm run build

# Verify build
npm run start

# Run production tests
npm run test:prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.