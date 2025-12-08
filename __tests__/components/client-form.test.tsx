import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { ClientForm } from '@/components/client-form'

// Mock the hooks
jest.mock('@/hooks/use-clients', () => ({
  useClients: () => ({
    createClient: jest.fn(),
    updateClient: jest.fn(),
  })
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  })
}))

// Mock validation schemas
jest.mock('@/lib/validations', () => ({
  clientSchema: {
    parse: jest.fn(),
    safeParse: jest.fn()
  }
}))

describe('ClientForm', () => {
  const mockCreateClient = jest.fn()
  const mockUpdateClient = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    const { useClients } = require('@/hooks/use-clients')
    useClients.mockReturnValue({
      createClient: mockCreateClient,
      updateClient: mockUpdateClient,
    })
  })

  describe('Create Mode', () => {
    it('should render create form with empty fields', () => {
      render(<ClientForm mode="create" />)
      
      expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /phone/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /address/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /company/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument()
      
      expect(screen.getByRole('button', { name: /create client/i })).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
    })

    it('should validate email format', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument()
      })
    })

    it('should validate phone format', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const phoneInput = screen.getByRole('textbox', { name: /phone/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(phoneInput, 'invalid-phone-123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/invalid phone format/i)).toBeInTheDocument()
      })
    })

    it('should accept valid phone formats', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const phoneInput = screen.getByRole('textbox', { name: /phone/i })
      
      await user.type(nameInput, 'John Doe')
      
      // Test various valid phone formats
      const validPhones = [
        '+1234567890',
        '123-456-7890',
        '(123) 456-7890',
        '123.456.7890',
        '123 456 7890'
      ]
      
      for (const phone of validPhones) {
        await user.clear(phoneInput)
        await user.type(phoneInput, phone)
        // Should not show validation error
        expect(screen.queryByText(/invalid phone format/i)).not.toBeInTheDocument()
      }
    })

    it('should validate string length limits', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const companyInput = screen.getByRole('textbox', { name: /company/i })
      const addressInput = screen.getByRole('textbox', { name: /address/i })
      
      // Test name too long (over 100 characters)
      const longName = 'a'.repeat(101)
      await user.type(nameInput, longName)
      
      // Test company too long (over 100 characters)
      const longCompany = 'b'.repeat(101)
      await user.type(companyInput, longCompany)
      
      // Test address too long (over 500 characters)
      const longAddress = 'c'.repeat(501)
      await user.type(addressInput, longAddress)
      
      const submitButton = screen.getByRole('button', { name: /create client/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/name too long/i)).toBeInTheDocument()
        expect(screen.getByText(/company name too long/i)).toBeInTheDocument()
        expect(screen.getByText(/address too long/i)).toBeInTheDocument()
      })
    })

    it('should validate status enum', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const statusSelect = screen.getByRole('combobox', { name: /status/i })
      
      await user.type(nameInput, 'John Doe')
      
      // Open dropdown and verify valid options
      await user.click(statusSelect)
      
      await waitFor(() => {
        expect(screen.getByText('Buyer')).toBeInTheDocument()
        expect(screen.getByText('Seller')).toBeInTheDocument()
        expect(screen.getByText('In Contract')).toBeInTheDocument()
      })
    })

    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      mockCreateClient.mockResolvedValueOnce({
        id: '123',
        name: 'John Doe',
        email: 'john@example.com'
      })
      
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      const phoneInput = screen.getByRole('textbox', { name: /phone/i })
      const addressInput = screen.getByRole('textbox', { name: /address/i })
      const companyInput = screen.getByRole('textbox', { name: /company/i })
      const statusSelect = screen.getByRole('combobox', { name: /status/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.type(nameInput, 'John Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(phoneInput, '+1234567890')
      await user.type(addressInput, '123 Main St, City, State 12345')
      await user.type(companyInput, 'Doe Industries')
      
      await user.click(statusSelect)
      await user.click(screen.getByText('Buyer'))
      
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateClient).toHaveBeenCalledWith({
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St, City, State 12345',
          company: 'Doe Industries',
          status: 'Buyer'
        })
      })
    })

    it('should handle submission error', async () => {
      const user = userEvent.setup()
      mockCreateClient.mockRejectedValueOnce(new Error('Failed to create client'))
      
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.type(nameInput, 'John Doe')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText(/failed to create client/i)).toBeInTheDocument()
      })
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolveCreate: (value: any) => void
      const createPromise = new Promise(resolve => {
        resolveCreate = resolve
      })
      mockCreateClient.mockReturnValueOnce(createPromise)
      
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.type(nameInput, 'John Doe')
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText(/creating/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      
      // Resolve the promise
      resolveCreate!({ id: '123', name: 'John Doe' })
      
      await waitFor(() => {
        expect(screen.queryByText(/creating/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit Mode', () => {
    const mockClient = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      company: 'Doe Corp',
      status: 'Buyer' as const,
      initials: 'JD'
    }

    it('should render edit form with pre-filled data', () => {
      render(<ClientForm mode="edit" client={mockClient} />)
      
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('+1234567890')).toBeInTheDocument()
      expect(screen.getByDisplayValue('123 Main St')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Doe Corp')).toBeInTheDocument()
      
      expect(screen.getByRole('button', { name: /update client/i })).toBeInTheDocument()
    })

    it('should submit updated data', async () => {
      const user = userEvent.setup()
      mockUpdateClient.mockResolvedValueOnce({
        ...mockClient,
        name: 'Jane Doe'
      })
      
      render(<ClientForm mode="edit" client={mockClient} />)
      
      const nameInput = screen.getByDisplayValue('John Doe')
      const submitButton = screen.getByRole('button', { name: /update client/i })
      
      await user.clear(nameInput)
      await user.type(nameInput, 'Jane Doe')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateClient).toHaveBeenCalledWith('123', {
          name: 'Jane Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          company: 'Doe Corp',
          status: 'Buyer'
        })
      })
    })

    it('should handle partial updates', async () => {
      const user = userEvent.setup()
      mockUpdateClient.mockResolvedValueOnce({
        ...mockClient,
        email: 'newemail@example.com'
      })
      
      render(<ClientForm mode="edit" client={mockClient} />)
      
      const emailInput = screen.getByDisplayValue('john@example.com')
      const submitButton = screen.getByRole('button', { name: /update client/i })
      
      await user.clear(emailInput)
      await user.type(emailInput, 'newemail@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockUpdateClient).toHaveBeenCalledWith('123', expect.objectContaining({
          email: 'newemail@example.com'
        }))
      })
    })
  })

  describe('Form Interaction', () => {
    it('should clear validation errors when user starts typing', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      // Trigger validation error
      await user.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      })
      
      // Start typing to clear error
      await user.type(nameInput, 'J')
      await waitFor(() => {
        expect(screen.queryByText(/name is required/i)).not.toBeInTheDocument()
      })
    })

    it('should format deal value with currency', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const dealValueInput = screen.getByRole('textbox', { name: /deal value/i })
      
      await user.type(dealValueInput, '500000')
      
      // Should format as currency
      await waitFor(() => {
        expect(dealValueInput).toHaveValue('500,000')
      })
    })

    it('should handle currency formatting edge cases', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const dealValueInput = screen.getByRole('textbox', { name: /deal value/i })
      
      // Test with decimals
      await user.type(dealValueInput, '500000.50')
      await waitFor(() => {
        expect(dealValueInput).toHaveValue('500,000.50')
      })
      
      // Clear and test with already formatted value
      await user.clear(dealValueInput)
      await user.type(dealValueInput, '1,000,000')
      await waitFor(() => {
        expect(dealValueInput).toHaveValue('1,000,000')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ClientForm mode="create" />)
      
      expect(screen.getByRole('textbox', { name: /name/i })).toHaveAttribute('aria-label', 'Client Name')
      expect(screen.getByRole('textbox', { name: /email/i })).toHaveAttribute('aria-label', 'Email Address')
      expect(screen.getByRole('textbox', { name: /phone/i })).toHaveAttribute('aria-label', 'Phone Number')
    })

    it('should associate error messages with form fields', async () => {
      const user = userEvent.setup()
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const submitButton = screen.getByRole('button', { name: /create client/i })
      
      await user.click(submitButton)
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/name is required/i)
        expect(nameInput).toHaveAttribute('aria-describedby', expect.stringContaining(errorMessage.id))
      })
    })

    it('should support keyboard navigation', async () => {
      render(<ClientForm mode="create" />)
      
      const nameInput = screen.getByRole('textbox', { name: /name/i })
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      
      nameInput.focus()
      expect(nameInput).toHaveFocus()
      
      // Tab to next field
      fireEvent.keyDown(nameInput, { key: 'Tab' })
      expect(emailInput).toHaveFocus()
    })
  })
})