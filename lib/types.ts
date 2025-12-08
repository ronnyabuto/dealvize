import React from 'react'

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  status: 'Buyer' | 'Seller' | 'In Contract';
  statusColor: string;
  lastContact: string;
  dealValue: string;
  initials: string;
}

export interface Deal {
  id: string;
  clientId: string;
  title: string;
  value: string;
  status: 'Lead' | 'In Progress' | 'Under Contract' | 'Closed' | 'Lost';
  statusColor: string;
  probability: number;
  expectedCloseDate: string;
  commission: string;
  commissionPercentage?: number;
  commissionAmount?: number;
  property: {
    address: string;
    type: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
  };
}

export interface CommissionSettings {
  id: string;
  userId: string;
  defaultPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface Note {
  id: string;
  clientId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  type: 'note' | 'call' | 'meeting' | 'email';
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  priorityColor?: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  assignedTo?: string;
  clientId?: string;
  dealId?: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Document' | 'Follow-up' | 'Other';
  client?: {
    name: string;
    initials: string;
  };
  deal?: {
    title: string;
  };
  completed?: boolean;
}

// Icon type definition for Lucide React icons
export type IconComponent = React.ComponentType<{
  className?: string
  size?: number
  strokeWidth?: number
}>

// Error handling types
export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

export interface FormError {
  field?: string
  message: string
}

// Generic API response types
export interface ApiResponse<T> {
  data?: T
  error?: ApiError
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
  error?: ApiError
}

export interface Metric {
  title: string;
  value: string;
  icon: IconComponent;
  trend: string;
  trendUp: boolean;
}

export interface MenuItem {
  title: string;
  url: string;
  icon: IconComponent;
  isActive?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'Agent' | 'Broker' | 'Admin';
  phone?: string;
  licenseNumber?: string;
  isSuperAdmin?: boolean;
}

export interface UserPreferences {
  id: string;
  userId: string;
  timezone: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    taskReminders: boolean;
    dealUpdates: boolean;
    clientActivity: boolean;
  };
  currency: string;
  theme: 'light' | 'dark' | 'system';
  createdAt: string;
  updatedAt: string;
}