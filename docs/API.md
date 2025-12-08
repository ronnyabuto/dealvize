# API Documentation

## Authentication

All API routes require authentication except public endpoints. Include credentials in requests:

```javascript
fetch('/api/endpoint', {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json'
  }
})
```

## Client Management

### GET /api/clients
Retrieve clients for the authenticated user.

**Query Parameters:**
- `search` (string): Filter by client name or email
- `limit` (number): Maximum results (default: 50)
- `offset` (number): Pagination offset

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "name": "Client Name",
      "email": "client@example.com",
      "phone": "+1234567890",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 25,
  "hasMore": true
}
```

### POST /api/clients
Create a new client.

**Request Body:**
```json
{
  "name": "Client Name",
  "email": "client@example.com",
  "phone": "+1234567890",
  "address": "123 Main St",
  "notes": "Initial notes"
}
```

### PUT /api/clients/[id]
Update an existing client.

### DELETE /api/clients/[id]
Delete a client (soft delete).

## Deal Management

### GET /api/deals
Retrieve deals for the authenticated user.

**Query Parameters:**
- `status` (string): Filter by deal status
- `stage` (string): Filter by pipeline stage
- `client_id` (uuid): Filter by client

**Response:**
```json
{
  "deals": [
    {
      "id": "uuid",
      "title": "Deal Title",
      "client_id": "uuid",
      "client_name": "Client Name",
      "value": 500000,
      "stage": "negotiation",
      "status": "active",
      "close_date": "2024-06-01",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### POST /api/deals
Create a new deal.

### PUT /api/deals/[id]
Update deal details.

### PATCH /api/deals/[id]/stage
Update deal stage in pipeline.

## Task Management

### GET /api/tasks
Retrieve tasks with optional filters.

**Query Parameters:**
- `due_soon` (boolean): Show tasks due within 7 days
- `completed` (boolean): Filter by completion status
- `limit` (number): Result limit

### POST /api/tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Task Title",
  "description": "Task description",
  "due_date": "2024-06-01",
  "priority": "high",
  "deal_id": "uuid"
}
```

### PATCH /api/tasks/[id]
Update task (commonly for marking complete).

## Analytics

### GET /api/analytics
Retrieve analytics data.

**Query Parameters:**
- `metric` (string): revenue, deals, conversion, pipeline
- `period` (string): week, month, quarter, year
- `start_date` (string): ISO date string
- `end_date` (string): ISO date string

**Response varies by metric:**

**Revenue Analytics:**
```json
{
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 45000,
      "deals_closed": 3
    }
  ],
  "total_revenue": 450000,
  "average_deal_size": 150000
}
```

**Pipeline Analytics:**
```json
{
  "stages": [
    {
      "stage": "lead",
      "count": 15,
      "total_value": 2250000
    }
  ]
}
```

## Commission Tracking

### GET /api/commissions
Retrieve commission records.

### POST /api/commissions
Create commission record.

**Request Body:**
```json
{
  "deal_id": "uuid",
  "amount": 15000,
  "percentage": 3.0,
  "status": "pending",
  "due_date": "2024-06-15"
}
```

## System Endpoints

### GET /api/health
System health check.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "database": "connected",
  "version": "1.0.0"
}
```

### GET /api/user/profile
Get current user profile.

### PUT /api/user/profile
Update user profile.

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    }
  }
}
```

**Common HTTP Status Codes:**
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

## Rate Limiting

API endpoints are rate limited:
- General endpoints: 100 requests per minute
- Authentication endpoints: 5 requests per minute
- Search endpoints: 30 requests per minute

Rate limit headers included in responses:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`