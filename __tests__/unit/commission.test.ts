import {
    calculateCommission,
    formatCurrency,
    formatCommissionDisplay,
    calculateTotalCommissionRevenue,
    getCommissionForecast,
    DEFAULT_COMMISSION_PERCENTAGE,
} from '@/lib/commission'
import { Deal } from '@/lib/types'

describe('Commission Module', () => {
    describe('calculateCommission', () => {
        it('calculates commission with default percentage', () => {
            expect(calculateCommission(100000)).toBe(2500)
        })

        it('calculates commission with custom percentage', () => {
            expect(calculateCommission(100000, 3)).toBe(3000)
        })

        it('handles string input with currency formatting', () => {
            expect(calculateCommission('$500,000')).toBe(12500)
        })

        it('handles string input with various formats', () => {
            expect(calculateCommission('1,000,000', 2.5)).toBe(25000)
        })

        it('returns 0 for zero value', () => {
            expect(calculateCommission(0)).toBe(0)
        })

        it('returns 0 for negative value', () => {
            expect(calculateCommission(-50000)).toBe(0)
        })

        it('returns 0 for NaN input', () => {
            expect(calculateCommission('invalid')).toBe(0)
        })

        it('returns 0 for empty string', () => {
            expect(calculateCommission('')).toBe(0)
        })

        it('uses default percentage when undefined', () => {
            expect(calculateCommission(200000, undefined)).toBe(5000)
        })
    })

    describe('formatCurrency', () => {
        it('formats whole numbers correctly', () => {
            expect(formatCurrency(1000)).toBe('$1,000')
        })

        it('formats large numbers with commas', () => {
            expect(formatCurrency(1500000)).toBe('$1,500,000')
        })

        it('rounds decimals to whole numbers', () => {
            expect(formatCurrency(1234.56)).toBe('$1,235')
        })

        it('formats zero correctly', () => {
            expect(formatCurrency(0)).toBe('$0')
        })

        it('formats small amounts correctly', () => {
            expect(formatCurrency(99)).toBe('$99')
        })
    })

    describe('formatCommissionDisplay', () => {
        it('returns formatted commission with default percentage', () => {
            const result = formatCommissionDisplay(100000)
            expect(result).toBe('$2,500 (2.5%)')
        })

        it('returns formatted commission with custom percentage', () => {
            const result = formatCommissionDisplay(100000, 3)
            expect(result).toBe('$3,000 (3%)')
        })

        it('handles string input', () => {
            const result = formatCommissionDisplay('$500,000', 2)
            expect(result).toBe('$10,000 (2%)')
        })
    })

    describe('calculateTotalCommissionRevenue', () => {
        const mockDeals: Deal[] = [
            {
                id: '1',
                clientId: 'c1',
                title: 'Deal 1',
                value: '$500,000',
                status: 'Closed',
                statusColor: 'green',
                probability: 100,
                expectedCloseDate: '2026-02-01',
                commission: '$12,500',
                commissionPercentage: 2.5,
                property: { address: '123 Main St', type: 'House' },
            },
            {
                id: '2',
                clientId: 'c2',
                title: 'Deal 2',
                value: '$300,000',
                status: 'In Progress',
                statusColor: 'yellow',
                probability: 50,
                expectedCloseDate: '2026-03-01',
                commission: '$7,500',
                commissionPercentage: 2.5,
                property: { address: '456 Oak Ave', type: 'Condo' },
            },
        ]

        it('calculates closed commission correctly', () => {
            const result = calculateTotalCommissionRevenue(mockDeals)
            expect(result.closed).toBe(12500)
        })

        it('calculates pipeline commission correctly', () => {
            const result = calculateTotalCommissionRevenue(mockDeals)
            expect(result.pipeline).toBe(7500)
        })

        it('calculates expected commission with probability weighting', () => {
            const result = calculateTotalCommissionRevenue(mockDeals)
            expect(result.expected).toBe(12500 + 3750)
        })

        it('handles empty array', () => {
            const result = calculateTotalCommissionRevenue([])
            expect(result).toEqual({ expected: 0, closed: 0, pipeline: 0 })
        })

        it('handles deals with Lost status', () => {
            const lostDeal: Deal[] = [
                {
                    id: '3',
                    clientId: 'c3',
                    title: 'Lost Deal',
                    value: '$400,000',
                    status: 'Lost',
                    statusColor: 'red',
                    probability: 0,
                    expectedCloseDate: '2026-01-15',
                    commission: '$10,000',
                    commissionPercentage: 2.5,
                    property: { address: '789 Elm St', type: 'House' },
                },
            ]
            const result = calculateTotalCommissionRevenue(lostDeal)
            expect(result.closed).toBe(0)
            expect(result.pipeline).toBe(0)
        })
    })

    describe('getCommissionForecast', () => {
        const now = new Date()
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 15)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 15)

        const mockDeals: Deal[] = [
            {
                id: '1',
                clientId: 'c1',
                title: 'This Month Deal',
                value: '$200,000',
                status: 'Under Contract',
                statusColor: 'blue',
                probability: 80,
                expectedCloseDate: thisMonth.toISOString().split('T')[0],
                commission: '$5,000',
                commissionPercentage: 2.5,
                property: { address: '123 Main St', type: 'House' },
            },
            {
                id: '2',
                clientId: 'c2',
                title: 'Next Month Deal',
                value: '$300,000',
                status: 'In Progress',
                statusColor: 'yellow',
                probability: 60,
                expectedCloseDate: nextMonth.toISOString().split('T')[0],
                commission: '$7,500',
                commissionPercentage: 2.5,
                property: { address: '456 Oak Ave', type: 'Condo' },
            },
        ]

        it('returns forecast object with required keys', () => {
            const result = getCommissionForecast(mockDeals)
            expect(result).toHaveProperty('thisMonth')
            expect(result).toHaveProperty('nextMonth')
            expect(result).toHaveProperty('thisQuarter')
        })

        it('handles empty deals array', () => {
            const result = getCommissionForecast([])
            expect(result).toEqual({ thisMonth: 0, nextMonth: 0, thisQuarter: 0 })
        })
    })

    describe('DEFAULT_COMMISSION_PERCENTAGE', () => {
        it('is set to 2.5', () => {
            expect(DEFAULT_COMMISSION_PERCENTAGE).toBe(2.5)
        })
    })
})
