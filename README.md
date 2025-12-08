# Dealvize

A comprehensive CRM system for real estate professionals, built with Next.js 15, TypeScript, and Supabase.

## Quick Start

1. **Installation**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Configure your environment variables
   ```

3. **Development**
   ```bash
   npm run dev
   ```

4. **Build**
   ```bash
   npm run build
   npm start
   ```

## Core Features

- **Client Management**: Complete client relationship management with detailed profiles
- **Deal Pipeline**: Visual deal tracking with drag-and-drop kanban boards
- **Commission Tracking**: Automated commission calculations and payment scheduling
- **Analytics Dashboard**: Real-time performance metrics and forecasting
- **Task Management**: AI-powered task creation and follow-up automation
- **Authentication**: Secure user authentication with role-based access

## Technology Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **UI Components**: Radix UI + Tailwind CSS
- **Charts**: Recharts
- **Testing**: Jest + React Testing Library
- **Performance**: Built-in monitoring and optimization

## Architecture

### Database Schema
- Users, clients, deals, tasks, commissions
- Row Level Security (RLS) enabled
- Optimized with connection pooling

### API Routes
- RESTful API with proper error handling
- Authentication middleware
- Rate limiting and CSRF protection
- Comprehensive logging

### Security
- Environment variable validation
- Input sanitization and validation
- CSRF protection with Edge Runtime compatibility
- Rate limiting on sensitive endpoints

### Performance
- Code splitting with dynamic imports
- Image optimization
- Bundle analysis and monitoring
- Database query optimization
- Connection pooling

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript compiler
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
```

## Environment Variables

See `.env.example` for complete list. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `NEXTAUTH_SECRET`: Authentication secret
- `DATABASE_URL`: Database connection string

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/       # Dashboard routes
│   ├── (marketing)/       # Marketing pages
│   └── api/              # API routes
├── components/           # React components
├── lib/                 # Utilities and configurations
│   ├── supabase/       # Database client and queries
│   ├── auth/           # Authentication utilities
│   ├── performance/    # Performance monitoring
│   └── security/       # Security utilities
├── __tests__/          # Test files
└── scripts/           # Build and utility scripts
```

## Testing

Comprehensive test coverage including:
- API route testing
- Component testing
- Authentication flow testing
- Database integration testing

Run tests: `npm run test`

## Performance

Optimized for sub-100ms load times:
- Lazy loading with dynamic imports
- Bundle optimization and code splitting
- Database connection pooling
- Image optimization
- Performance monitoring

## Security Features

- Input validation and sanitization
- CSRF protection
- Rate limiting
- Secure session management
- Environment variable validation
- SQL injection prevention

## Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database Migration**: Run database migrations if needed
3. **Build**: `npm run build`
4. **Deploy**: Deploy to your preferred platform

## Contributing

1. Follow TypeScript best practices
2. Maintain test coverage
3. Use conventional commit messages
4. Ensure all lints pass
5. Update documentation as needed

## License

Proprietary - All rights reserved