import { Deal } from './types'

export const DEFAULT_COMMISSION_PERCENTAGE = 2.5

export function calculateCommission(
  dealValue: number | string, 
  commissionPercentage?: number
): number {
  const value = typeof dealValue === 'string' ? parseFloat(dealValue.replace(/[$,]/g, '')) : dealValue
  const percentage = commissionPercentage || DEFAULT_COMMISSION_PERCENTAGE
  
  if (isNaN(value) || value <= 0) return 0
  
  return (value * percentage) / 100
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCommissionDisplay(
  dealValue: number | string,
  commissionPercentage?: number
): string {
  const commission = calculateCommission(dealValue, commissionPercentage)
  const percentage = commissionPercentage || DEFAULT_COMMISSION_PERCENTAGE
  
  return `${formatCurrency(commission)} (${percentage}%)`
}

export function calculateTotalCommissionRevenue(deals: Deal[]): {
  expected: number
  closed: number
  pipeline: number
} {
  const expected = deals.reduce((total, deal) => {
    const value = parseFloat(deal.value.replace(/[$,]/g, ''))
    const commission = calculateCommission(value, deal.commissionPercentage)
    return total + (commission * (deal.probability / 100))
  }, 0)
  
  const closed = deals
    .filter(deal => deal.status === 'Closed')
    .reduce((total, deal) => {
      const value = parseFloat(deal.value.replace(/[$,]/g, ''))
      return total + calculateCommission(value, deal.commissionPercentage)
    }, 0)
  
  const pipeline = deals
    .filter(deal => ['Lead', 'In Progress', 'Under Contract'].includes(deal.status))
    .reduce((total, deal) => {
      const value = parseFloat(deal.value.replace(/[$,]/g, ''))
      return total + calculateCommission(value, deal.commissionPercentage)
    }, 0)
  
  return { expected, closed, pipeline }
}

export function getCommissionForecast(deals: Deal[]): {
  thisMonth: number
  nextMonth: number
  thisQuarter: number
} {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const nextQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 1)
  
  const thisMonthDeals = deals.filter(deal => {
    const closeDate = new Date(deal.expectedCloseDate)
    return closeDate >= thisMonth && closeDate < nextMonth
  })
  
  const nextMonthDeals = deals.filter(deal => {
    const closeDate = new Date(deal.expectedCloseDate)
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
    return closeDate >= nextMonth && closeDate < nextMonthEnd
  })
  
  const thisQuarterDeals = deals.filter(deal => {
    const closeDate = new Date(deal.expectedCloseDate)
    return closeDate >= thisQuarter && closeDate < nextQuarter
  })
  
  return {
    thisMonth: calculateTotalCommissionRevenue(thisMonthDeals).expected,
    nextMonth: calculateTotalCommissionRevenue(nextMonthDeals).expected,
    thisQuarter: calculateTotalCommissionRevenue(thisQuarterDeals).expected,
  }
}