// OpenAPI/Swagger specification for the Dealvize CRM API
import { OpenAPIV3 } from 'openapi-types'

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: {
    title: 'Dealvize CRM API',
    version: '1.0.0',
    description: `
# Dealvize CRM API Documentation

A comprehensive real estate CRM API for managing clients, deals, tasks, and more.

## Features
- Client management with full CRUD operations
- Deal tracking and pipeline management  
- Task management with priorities and due dates
- Notes and communication history
- Real-time health monitoring
- Authentication and authorization

## Authentication
All API endpoints require authentication via Bearer token in the Authorization header.
    `,
    contact: {
      name: 'Dealvize Support',
      email: 'support@dealvize.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: '/api',
      description: 'API Base URL'
    }
  ],
  paths: {
    '/clients': {
      get: {
        tags: ['Clients'],
        summary: 'Get all clients',
        description: 'Retrieve a paginated list of clients with optional filtering',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            schema: {
              type: 'integer',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          },
          {
            name: 'search',
            in: 'query',
            description: 'Search clients by name, email, or company',
            required: false,
            schema: {
              type: 'string'
            }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by client status',
            required: false,
            schema: {
              type: 'string',
              enum: ['active', 'inactive', 'prospect', 'closed']
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of clients retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Client' }
                    },
                    pagination: { $ref: '#/components/schemas/PaginationInfo' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        tags: ['Clients'],
        summary: 'Create a new client',
        description: 'Create a new client record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateClientRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Client created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Client' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '409': { $ref: '#/components/responses/Conflict' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/clients/{id}': {
      get: {
        tags: ['Clients'],
        summary: 'Get client by ID',
        description: 'Retrieve a specific client by their ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Client ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Client retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Client' }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      put: {
        tags: ['Clients'],
        summary: 'Update client',
        description: 'Update an existing client record',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Client ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateClientRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Client updated successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Client' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      delete: {
        tags: ['Clients'],
        summary: 'Delete client',
        description: 'Delete a client record (soft delete)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Client ID',
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Client deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Client deleted successfully' }
                  }
                }
              }
            }
          },
          '404': { $ref: '#/components/responses/NotFound' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/deals': {
      get: {
        tags: ['Deals'],
        summary: 'Get all deals',
        description: 'Retrieve a paginated list of deals with optional filtering',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            schema: {
              type: 'integer',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by deal status',
            required: false,
            schema: {
              type: 'string',
              enum: ['prospecting', 'negotiation', 'closed_won', 'closed_lost']
            }
          },
          {
            name: 'client_id',
            in: 'query',
            description: 'Filter by client ID',
            required: false,
            schema: {
              type: 'string',
              format: 'uuid'
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of deals retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Deal' }
                    },
                    pagination: { $ref: '#/components/schemas/PaginationInfo' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        tags: ['Deals'],
        summary: 'Create a new deal',
        description: 'Create a new deal record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateDealRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Deal created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Deal' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/tasks': {
      get: {
        tags: ['Tasks'],
        summary: 'Get all tasks',
        description: 'Retrieve a paginated list of tasks with optional filtering',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            schema: {
              type: 'integer',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by task status',
            required: false,
            schema: {
              type: 'string',
              enum: ['pending', 'in_progress', 'completed', 'cancelled']
            }
          },
          {
            name: 'priority',
            in: 'query',
            description: 'Filter by task priority',
            required: false,
            schema: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent']
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of tasks retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Task' }
                    },
                    pagination: { $ref: '#/components/schemas/PaginationInfo' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        tags: ['Tasks'],
        summary: 'Create a new task',
        description: 'Create a new task record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateTaskRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Task created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Task' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/notes': {
      get: {
        tags: ['Notes'],
        summary: 'Get all notes',
        description: 'Retrieve a paginated list of notes with optional filtering',
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              default: 1,
              minimum: 1
            }
          },
          {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            schema: {
              type: 'integer',
              default: 10,
              minimum: 1,
              maximum: 100
            }
          },
          {
            name: 'client_id',
            in: 'query',
            description: 'Filter by client ID',
            required: false,
            schema: {
              type: 'string',
              format: 'uuid'
            }
          },
          {
            name: 'type',
            in: 'query',
            description: 'Filter by note type',
            required: false,
            schema: {
              type: 'string',
              enum: ['call', 'meeting', 'email', 'general']
            }
          }
        ],
        responses: {
          '200': {
            description: 'List of notes retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Note' }
                    },
                    pagination: { $ref: '#/components/schemas/PaginationInfo' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      },
      post: {
        tags: ['Notes'],
        summary: 'Create a new note',
        description: 'Create a new note record',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateNoteRequest' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Note created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Note' }
                  }
                }
              }
            }
          },
          '400': { $ref: '#/components/responses/BadRequest' },
          '401': { $ref: '#/components/responses/Unauthorized' },
          '500': { $ref: '#/components/responses/InternalError' }
        }
      }
    },
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check system health status',
        responses: {
          '200': {
            description: 'System is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheck' }
              }
            }
          },
          '503': {
            description: 'System is unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthCheck' }
              }
            }
          }
        }
      },
      post: {
        tags: ['System'],
        summary: 'Detailed health check',
        description: 'Get detailed system health information',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  includeDetails: {
                    type: 'boolean',
                    default: false,
                    description: 'Include detailed health information'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Detailed health information',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DetailedHealthCheck' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Client: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique client identifier' },
          name: { type: 'string', description: 'Client full name' },
          email: { type: 'string', format: 'email', description: 'Client email address' },
          phone: { type: 'string', description: 'Client phone number' },
          address: { type: 'string', description: 'Client address' },
          company: { type: 'string', description: 'Client company name' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'prospect', 'closed'],
            description: 'Client status'
          },
          created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          last_contact: { type: 'string', format: 'date-time', description: 'Last contact timestamp' },
          deal_value: { type: 'number', description: 'Total deal value associated with client' }
        },
        required: ['id', 'name', 'email', 'status', 'created_at']
      },
      CreateClientRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, description: 'Client full name' },
          email: { type: 'string', format: 'email', description: 'Client email address' },
          phone: { type: 'string', description: 'Client phone number' },
          address: { type: 'string', description: 'Client address' },
          company: { type: 'string', description: 'Client company name' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'prospect', 'closed'],
            default: 'prospect',
            description: 'Client status'
          }
        },
        required: ['name', 'email']
      },
      UpdateClientRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, description: 'Client full name' },
          email: { type: 'string', format: 'email', description: 'Client email address' },
          phone: { type: 'string', description: 'Client phone number' },
          address: { type: 'string', description: 'Client address' },
          company: { type: 'string', description: 'Client company name' },
          status: {
            type: 'string',
            enum: ['active', 'inactive', 'prospect', 'closed'],
            description: 'Client status'
          }
        }
      },
      Deal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique deal identifier' },
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          title: { type: 'string', description: 'Deal title' },
          value: { type: 'number', description: 'Deal value' },
          commission: { type: 'number', description: 'Commission amount' },
          status: {
            type: 'string',
            enum: ['prospecting', 'negotiation', 'closed_won', 'closed_lost'],
            description: 'Deal status'
          },
          probability: { type: 'integer', minimum: 0, maximum: 100, description: 'Close probability percentage' },
          expected_close_date: { type: 'string', format: 'date', description: 'Expected close date' },
          property_address: { type: 'string', description: 'Property address' },
          property_type: { type: 'string', description: 'Property type' },
          property_bedrooms: { type: 'integer', description: 'Number of bedrooms' },
          property_bathrooms: { type: 'number', description: 'Number of bathrooms' },
          property_sqft: { type: 'integer', description: 'Property square footage' },
          created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        },
        required: ['id', 'client_id', 'title', 'value', 'status', 'created_at']
      },
      CreateDealRequest: {
        type: 'object',
        properties: {
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          title: { type: 'string', minLength: 1, description: 'Deal title' },
          value: { type: 'number', minimum: 0, description: 'Deal value' },
          commission: { type: 'number', minimum: 0, description: 'Commission amount' },
          status: {
            type: 'string',
            enum: ['prospecting', 'negotiation', 'closed_won', 'closed_lost'],
            default: 'prospecting',
            description: 'Deal status'
          },
          probability: { type: 'integer', minimum: 0, maximum: 100, default: 50, description: 'Close probability percentage' },
          expected_close_date: { type: 'string', format: 'date', description: 'Expected close date' },
          property_address: { type: 'string', description: 'Property address' },
          property_type: { type: 'string', description: 'Property type' },
          property_bedrooms: { type: 'integer', minimum: 0, description: 'Number of bedrooms' },
          property_bathrooms: { type: 'number', minimum: 0, description: 'Number of bathrooms' },
          property_sqft: { type: 'integer', minimum: 0, description: 'Property square footage' }
        },
        required: ['client_id', 'title', 'value']
      },
      Task: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique task identifier' },
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          deal_id: { type: 'string', format: 'uuid', description: 'Associated deal ID' },
          title: { type: 'string', description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            description: 'Task status'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            description: 'Task priority'
          },
          due_date: { type: 'string', format: 'date-time', description: 'Task due date' },
          created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
          completed_at: { type: 'string', format: 'date-time', description: 'Completion timestamp' }
        },
        required: ['id', 'title', 'status', 'priority', 'created_at']
      },
      CreateTaskRequest: {
        type: 'object',
        properties: {
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          deal_id: { type: 'string', format: 'uuid', description: 'Associated deal ID' },
          title: { type: 'string', minLength: 1, description: 'Task title' },
          description: { type: 'string', description: 'Task description' },
          status: {
            type: 'string',
            enum: ['pending', 'in_progress', 'completed', 'cancelled'],
            default: 'pending',
            description: 'Task status'
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'urgent'],
            default: 'medium',
            description: 'Task priority'
          },
          due_date: { type: 'string', format: 'date-time', description: 'Task due date' }
        },
        required: ['title']
      },
      Note: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Unique note identifier' },
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          deal_id: { type: 'string', format: 'uuid', description: 'Associated deal ID' },
          type: {
            type: 'string',
            enum: ['call', 'meeting', 'email', 'general'],
            description: 'Note type'
          },
          title: { type: 'string', description: 'Note title' },
          content: { type: 'string', description: 'Note content' },
          created_at: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updated_at: { type: 'string', format: 'date-time', description: 'Last update timestamp' }
        },
        required: ['id', 'type', 'title', 'content', 'created_at']
      },
      CreateNoteRequest: {
        type: 'object',
        properties: {
          client_id: { type: 'string', format: 'uuid', description: 'Associated client ID' },
          deal_id: { type: 'string', format: 'uuid', description: 'Associated deal ID' },
          type: {
            type: 'string',
            enum: ['call', 'meeting', 'email', 'general'],
            default: 'general',
            description: 'Note type'
          },
          title: { type: 'string', minLength: 1, description: 'Note title' },
          content: { type: 'string', minLength: 1, description: 'Note content' }
        },
        required: ['title', 'content']
      },
      PaginationInfo: {
        type: 'object',
        properties: {
          page: { type: 'integer', description: 'Current page number' },
          limit: { type: 'integer', description: 'Items per page' },
          total: { type: 'integer', description: 'Total number of items' },
          totalPages: { type: 'integer', description: 'Total number of pages' },
          hasNext: { type: 'boolean', description: 'Whether there is a next page' },
          hasPrev: { type: 'boolean', description: 'Whether there is a previous page' }
        },
        required: ['page', 'limit', 'total', 'totalPages', 'hasNext', 'hasPrev']
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'unhealthy'],
            description: 'Overall system health status'
          },
          timestamp: { type: 'string', format: 'date-time', description: 'Health check timestamp' },
          version: { type: 'string', description: 'Application version' },
          environment: { type: 'string', description: 'Runtime environment' },
          responseTime: { type: 'string', description: 'Health check response time' },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Check name' },
                status: {
                  type: 'string',
                  enum: ['healthy', 'unhealthy', 'warning'],
                  description: 'Individual check status'
                },
                responseTime: { type: 'string', description: 'Check response time' },
                details: { type: 'object', description: 'Additional check details' }
              }
            }
          },
          summary: {
            type: 'object',
            properties: {
              total: { type: 'integer', description: 'Total number of checks' },
              healthy: { type: 'integer', description: 'Number of healthy checks' },
              unhealthy: { type: 'integer', description: 'Number of unhealthy checks' },
              warnings: { type: 'integer', description: 'Number of warning checks' }
            }
          }
        },
        required: ['status', 'timestamp', 'checks', 'summary']
      },
      DetailedHealthCheck: {
        allOf: [
          { $ref: '#/components/schemas/HealthCheck' },
          {
            type: 'object',
            properties: {
              checks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    status: { type: 'string', enum: ['healthy', 'unhealthy', 'warning'] },
                    responseTime: { type: 'string' },
                    details: {
                      type: 'object',
                      properties: {
                        recordCount: { type: 'integer' },
                        error: { type: 'string' },
                        connectionTime: { type: 'string' },
                        queryTime: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        ]
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', description: 'Error message' },
          code: { type: 'string', description: 'Error code' },
          timestamp: { type: 'string', format: 'date-time', description: 'Error timestamp' }
        },
        required: ['success', 'error']
      }
    },
    responses: {
      BadRequest: {
        description: 'Bad request - invalid input parameters',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - authentication required',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Conflict: {
        description: 'Conflict - resource already exists',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      InternalError: {
        description: 'Internal server error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  tags: [
    {
      name: 'Clients',
      description: 'Client management operations'
    },
    {
      name: 'Deals',
      description: 'Deal management and pipeline operations'
    },
    {
      name: 'Tasks',
      description: 'Task management and tracking'
    },
    {
      name: 'Notes',
      description: 'Note and communication history'
    },
    {
      name: 'System',
      description: 'System health and monitoring'
    }
  ]
}