"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Skeleton } from "@/components/ui/skeleton"

interface RevenueData {
  month: string
  revenue: number
  forecast: number
}

interface PipelineData {
  stage: string
  count: number
  value: number
  description: string
  percentage?: number
}

// Professional color palette for business charts
const DEAL_STAGE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'] // Red to Green progression
const REVENUE_COLORS = {
  actual: '#10b981', // Emerald green
  forecast: '#3b82f6', // Blue
  gradient: 'url(#revenueGradient)'
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRevenueData() {
      try {
        const response = await fetch('/api/analytics/revenue')
        
        if (response.ok) {
          const result = await response.json()
          const revenue = result.revenue
          
          if (revenue && revenue.labels && revenue.data) {
            // Transform the API response to match chart format
            const revenueData = revenue.labels.map((label: string, index: number) => ({
              month: label,
              revenue: revenue.data[index] || 0,
              forecast: revenue.target ? revenue.target[index] || 0 : (revenue.data[index] || 0) * 1.1
            }))
            setData(revenueData)
          } else {
            // No data available - show empty chart
            setData([])
          }
        } else {
          console.warn('Revenue API failed:', response.status)
          setData([])
        }
      } catch (error) {
        console.error('Failed to fetch revenue data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Revenue & Forecast Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Revenue & Forecast Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No revenue data available</p>
              <p className="text-sm">Start tracking deals to see your revenue trends</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={250} className="sm:h-[300px] md:h-[280px]">
            <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={REVENUE_COLORS.actual} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={REVENUE_COLORS.actual} stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={REVENUE_COLORS.forecast} stopOpacity={0.6}/>
                  <stop offset="95%" stopColor={REVENUE_COLORS.forecast} stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.7} />
              <XAxis 
                dataKey="month" 
                fontSize={11} 
                fontWeight="500"
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => `$${(value as number / 1000).toFixed(0)}K`} 
                fontSize={11}
                fontWeight="500"
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <Tooltip 
                formatter={(value, name) => [
                  `$${((value as number) / 1000).toFixed(1)}K`, 
                  name === 'revenue' ? 'Actual Revenue' : 'Target'
                ]}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="forecast"
                stroke={REVENUE_COLORS.forecast}
                fill="url(#forecastGradient)"
                strokeWidth={2}
                strokeDasharray="8 4"
                name="Target"
                dot={false}
              />
              <Area 
                type="monotone" 
                dataKey="revenue"
                stroke={REVENUE_COLORS.actual}
                fill="url(#revenueGradient)"
                strokeWidth={3}
                name="Actual Revenue"
                dot={{ fill: REVENUE_COLORS.actual, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: REVENUE_COLORS.actual, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function PipelineChart() {
  const [data, setData] = useState<PipelineData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPipelineData() {
      try {
        const response = await fetch('/api/analytics/pipeline')
        
        if (response.ok) {
          const result = await response.json()
          const pipeline = result.pipeline
          
          if (pipeline && pipeline.labels && pipeline.data) {
            // Transform API response to match chart format
            const pipelineData = pipeline.labels.map((label: string, index: number) => ({
              stage: label,
              count: pipeline.data[index] || 0,
              value: pipeline.values ? pipeline.values[index] || 0 : 0,
              description: `${pipeline.data[index] || 0} deals${pipeline.values ? ` worth $${((pipeline.values[index] || 0) / 1000).toFixed(0)}K` : ''}`
            }))
            setData(pipelineData)
          } else {
            setData([])
          }
        } else {
          console.warn('Pipeline API failed:', response.status)
          setData([])
        }
      } catch (error) {
        console.error('Failed to fetch pipeline data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchPipelineData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Deal Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Deal Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No pipeline data available</p>
              <p className="text-sm">Add deals to see your sales pipeline</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280} className="sm:h-[320px] md:h-[300px]">
            <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="#e5e7eb" 
                strokeOpacity={0.7}
                horizontal={true}
                vertical={false}
              />
              <XAxis 
                type="number" 
                tickFormatter={(value) => `$${(value as number / 1000000).toFixed(1)}M`} 
                fontSize={11}
                fontWeight="500"
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                dataKey="stage" 
                type="category" 
                width={80} 
                fontSize={11}
                fontWeight="500"
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
                tick={{ textAnchor: 'end' }}
              />
              <Tooltip 
                formatter={(value) => [`$${((value as number) / 1000000).toFixed(1)}M`, 'Pipeline Value']}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Bar 
                dataKey="value" 
                fill="#10b981" 
                radius={[0, 6, 6, 0]}
                stroke="#059669"
                strokeWidth={1}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function ConversionChart() {
  const [data, setData] = useState<PipelineData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchConversionData() {
      try {
        const response = await fetch('/api/analytics/pipeline')
        
        if (response.ok) {
          const result = await response.json()
          const pipeline = result.pipeline
          
          if (pipeline && pipeline.labels && pipeline.data) {
            // Transform API response for stage distribution chart
            const totalDeals = pipeline.data.reduce((sum: number, count: number) => sum + count, 0)
            const conversionData = pipeline.labels.map((label: string, index: number) => {
              const count = pipeline.data[index] || 0
              const percentage = totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0
              return {
                stage: label,
                count,
                value: count,
                description: `${count} deals (${percentage}%)`,
                percentage
              }
            }).filter(item => item.count > 0) // Only show stages with deals
            setData(conversionData)
          } else {
            setData([])
          }
        } else {
          console.warn('Pipeline API failed:', response.status)
          setData([])
        }
      } catch (error) {
        console.error('Failed to fetch conversion data:', error)
        setData([])
      } finally {
        setLoading(false)
      }
    }

    fetchConversionData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Deal Stage Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base sm:text-lg">Deal Stage Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-lg mb-2">No deal stage data available</p>
              <p className="text-sm">Add deals to see stage distribution</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300} className="sm:h-[350px] md:h-[320px]">
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ stage, percentage, count }) => {
                  // Only show label if percentage is >= 8% to avoid overlapping
                  if (percentage >= 8) {
                    return `${stage}\n${percentage}%`
                  }
                  return ''
                }}
                outerRadius={85}
                innerRadius={35}
                fill="#8884d8"
                dataKey="count"
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={DEAL_STAGE_COLORS[index % DEAL_STAGE_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [
                  `${value} deals (${props.payload.percentage}%)`, 
                  props.payload.stage
                ]}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                contentStyle={{ 
                  backgroundColor: '#f9fafb', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}