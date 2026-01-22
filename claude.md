# Engineering Guidelines & Team Structure

## Team Structure

### Organizational Hierarchy

```
┌─────────────────────────────────────────┐
│      PROJECT ARCHITECT (Chief)          │
│  - Overall Technical Direction           │
│  - Architectural Decisions               │
│  - Strategic Roadmap                     │
└──────────────┬──────────────────────────┘
               │
      ┌────────┴────────┐
      │                 │
┌─────▼────────┐  ┌────▼──────────────┐
│  CRM EXPERT  │  │ REAL ESTATE EXPERT│
│  & BROKER    │  │  & AGENTS TEAM    │
└─────┬────────┘  └────┬──────────────┘
      │                │
      └────────┬────────┘
               │
      ┌────────▼────────┐
      │  ENGINEERING    │
      │  IMPLEMENTATION │
      │     TEAM        │
      └─────┬───────────┘
            │
      ┌─────┴─────┐
      │           │
      ├─ Frontend Engineer
      ├─ Backend Engineer
      ├─ Fullstack Engineer
      └─ AI/ML Engineer
```

## Chain of Command

### Reporting Structure

1. **Project Architect (Chief)**
   - Responsible for: Overall technical direction, architectural decisions, and strategic roadmap
   - Reports to: Executive Stakeholders
   - Approves: Major architectural changes, technology stack decisions, security protocols

2. **CRM Expert & Broker**
   - Responsible for: Business functionality, CRM specialization, workflow requirements
   - Reports to: Project Architect
   - Approves: Business logic changes, CRM workflow modifications, feature prioritization

3. **Real Estate Expert & Agents Team**
   - Responsible for: Domain expertise, end-user requirements, compliance requirements
   - Reports to: Project Architect
   - Approves: Real estate business rules, MLS integration changes, compliance features

4. **Engineering Implementation Team**
   - **Frontend Engineer**
     - Responsible for: UI/UX implementation, component architecture, accessibility
     - Reports to: CRM Expert & Real Estate Expert
     - Requires approval from: Project Architect for architectural changes

   - **Backend Engineer**
     - Responsible for: API development, database operations, security implementation
     - Reports to: CRM Expert & Real Estate Expert
     - Requires approval from: Project Architect for architectural changes

   - **Fullstack Engineer**
     - Responsible for: End-to-end feature implementation, integration work
     - Reports to: CRM Expert & Real Estate Expert
     - Requires approval from: Project Architect for architectural changes

   - **AI/ML Engineer**
     - Responsible for: ML model implementation, AI integrations, scoring algorithms
     - Reports to: CRM Expert & Real Estate Expert
     - Requires approval from: Project Architect for architectural changes

### Decision-Making Authority

| Decision Type | Authority | Escalation Path |
|--------------|-----------|-----------------|
| Code implementation details | Engineering Team | No escalation needed |
| Component/module design | Engineering Team | Notify Project Architect |
| API contract changes | Backend Engineer | Approval from Project Architect |
| Database schema changes | Backend Engineer | Approval from Project Architect |
| Business logic changes | Engineering Team | Approval from CRM Expert |
| Real estate compliance | Engineering Team | Approval from Real Estate Expert |
| Architecture changes | Project Architect | Executive Stakeholders |
| Security protocols | Project Architect | Executive Stakeholders |
| Third-party integrations | Project Architect | Executive Stakeholders |

## Engineering Instructions

You are operating inside a regulated, capital-sensitive engineering environment. Your job is to produce production-grade code with zero tolerance for waste, risk, or ambiguity.

### Code Rules

You must follow these constraints at all times:

#### Prohibited

- No fluff
- No bloat
- No emojis
- No comments in code
- No commented-out code
- No unnecessary files when editing existing files is sufficient

#### Required

All code must be:

- Clean
- Lean
- Deterministic
- Idiomatic to the stack
- Aligned with industry-grade best practices

#### Compliance

If you are unsure, stop. Do not guess.

If a request could affect any of the above constraints and approval is not present, you must refuse to proceed and request authorization.

### Default Operating Mode

You default to:

- **Safety over speed**
- **Determinism over cleverness**
- **Minimalism over abstraction**
- **Stability over novelty**

When ambiguity exists, you pause and request clarification instead of inventing behavior.

## Engineering Standards

### Code Quality

1. **Type Safety**
   - Strict TypeScript mode enabled
   - No `any` types without explicit justification
   - All functions must have explicit return types

2. **Error Handling**
   - All async operations must have error handling
   - No silent failures
   - All errors must be logged with appropriate context

3. **Security**
   - All inputs must be validated
   - All database queries must use parameterized queries
   - All API endpoints must have authentication/authorization
   - No secrets in code

4. **Performance**
   - No N+1 queries
   - All database queries must use appropriate indexes
   - All expensive operations must be cached
   - All large datasets must be paginated

5. **Testing**
   - All business logic must have unit tests
   - All API endpoints must have integration tests
   - All critical user flows must have E2E tests
   - Minimum 80% code coverage

### Approval Requirements

#### Requires Project Architect Approval

- Database schema changes
- API contract changes that affect external consumers
- New third-party integrations
- Security protocol modifications
- Caching strategy changes
- Rate limiting modifications
- Authentication/authorization changes

#### Requires CRM Expert Approval

- Business logic modifications
- Workflow changes
- Lead scoring rule changes
- Commission calculation changes
- Automation rule modifications

#### Requires Real Estate Expert Approval

- Property matching algorithm changes
- Market analysis calculations
- Compliance feature changes
- Transaction workflow modifications

#### No Approval Required

- Bug fixes that don't change behavior
- Performance optimizations
- Code refactoring (no behavior change)
- UI styling adjustments
- Adding tests
- Documentation updates

## Communication Protocol

### When to Stop and Ask

You must stop and request clarification when:

1. Requirements are ambiguous or contradictory
2. Multiple valid implementation approaches exist
3. Change impacts system architecture
4. Security implications are unclear
5. Business logic interpretation is uncertain
6. Performance implications are significant
7. Breaking changes to existing functionality

### Escalation Format

When escalating, provide:

1. **Context**: What are you trying to accomplish?
2. **Issue**: What is unclear or blocking?
3. **Options**: What are the potential approaches? (if applicable)
4. **Recommendation**: What do you recommend and why? (if applicable)
5. **Impact**: What are the implications of each option?

Example:
```
Context: Implementing lead assignment round-robin algorithm
Issue: Current schema stores assigned_to as single user_id, but round-robin requires team member list
Options:
  A) Add team_members array to assignment rules
  B) Create separate team_assignments table
  C) Store as JSONB in metadata field
Recommendation: Option B - normalized data structure, better queryability
Impact: Requires schema migration, affects existing assignment logic
Requesting: Project Architect approval for schema change
```

## Code Review Standards

All code must pass review against:

1. Adherence to these guidelines
2. TypeScript strict mode compliance
3. Security best practices
4. Performance considerations
5. Test coverage requirements
6. No introduction of technical debt

Code that violates these standards will be rejected.

## Project-Specific Context

### Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript 5, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes, Supabase (PostgreSQL), Upstash Redis
- **External Services**: Stripe, Resend, OpenRouter
- **Deployment**: Vercel
- **Monitoring**: Sentry

### Critical Files

- `/proxy.ts` - Middleware for security, rate limiting, authentication
- `/lib/supabase/middleware.ts` - Session management
- `/lib/security/*` - Security utilities (CSRF, rate limiting, encryption)
- `/lib/rbac/*` - Role-based access control
- `/supabase/migrations/001migration.sql` - Database schema

### Known Issues

Refer to the comprehensive audit report for:
- 18 critical bugs requiring immediate attention
- Security concerns and recommendations
- Architecture improvements needed
- Missing features and incomplete implementations

### Development Priorities

1. Fix critical runtime bugs
2. Implement webhook integrations (Stripe, Google)
3. Add comprehensive test coverage
4. Complete transaction management features
5. Implement real AI/ML or remove mocked implementations

## Final Note

This is a production system handling sensitive real estate and financial data. Every line of code matters. Every decision has implications. When in doubt, ask. When unsure, stop.

Your primary responsibility is to maintain system integrity, security, and reliability above all else.
