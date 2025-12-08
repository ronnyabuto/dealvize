"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Area, AreaChart, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
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

const DEAL_STAGE_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e']
const REVENUE_COLORS = {
  actual: '#10b981',
  forecast: '#3b82f6',
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
            const revenueData = revenue.labels.map((label: string, index: number) => ({
              month: label,
              revenue: revenue.data[index] || 0,
              forecast: revenue.target ? revenue.target[index] || 0 : (revenue.data[index] || 0) * 1.1
            }))
            setData(revenueData)
          } else {
            setData([])
          }
        } else {
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

  if (loading) return <ChartSkeleton title="Revenue & Forecast Trend" />

  return (
    <Card>
      <CardHeader><CardTitle className="text-base sm:text-lg">Revenue & Forecast Trend</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChartState message="No revenue data available" /> : (
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
              <XAxis dataKey="month" fontSize={11} fontWeight="500" stroke="#6b7280" axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(value) => `$${(value as number / 1000).toFixed(0)}K`} fontSize={11} fontWeight="500" stroke="#6b7280" axisLine={false} tickLine={false} width={55} />
              <Tooltip 
                formatter={(value, name) => [`$${((value as number) / 1000).toFixed(1)}K`, name === 'revenue' ? 'Actual Revenue' : 'Target']}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Area type="monotone" dataKey="forecast" stroke={REVENUE_COLORS.forecast} fill="url(#forecastGradient)" strokeWidth={2} strokeDasharray="8 4" name="Target" dot={false} />
              <Area type="monotone" dataKey="revenue" stroke={REVENUE_COLORS.actual} fill="url(#revenueGradient)" strokeWidth={3} name="Actual Revenue" dot={{ fill: REVENUE_COLORS.actual, strokeWidth: 2, r: 4 }} />
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
            // FIX: Robust data aggregation to prevent duplicate keys
            const aggregatedData: { [key: string]: { stage: string; count: number; value: number } } = {}
            
            pipeline.labels.forEach((label: string, index: number) => {
              // Sanitize input to prevent null key crashes
              if (!label || label === 'null' || label === 'undefined') return;
              
              const cleanLabel = String(label).trim();
              if (!aggregatedData[cleanLabel]) {
                aggregatedData[cleanLabel] = { stage: cleanLabel, count: 0, value: 0 }
              }
              aggregatedData[cleanLabel].count += pipeline.data[index] || 0
              aggregatedData[cleanLabel].value += pipeline.values ? pipeline.values[index] || 0 : 0
            })

            const pipelineData = Object.values(aggregatedData).map(item => ({
              ...item,
              description: `${item.count} deals${item.value ? ` worth $${(item.value / 1000).toFixed(0)}K` : ''}`
            }));
            setData(pipelineData)
          } else {
            setData([])
          }
        } else {
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

  if (loading) return <ChartSkeleton title="Deal Pipeline" />

  return (
    <Card>
      <CardHeader><CardTitle className="text-base sm:text-lg">Deal Pipeline</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChartState message="No pipeline data available" /> : (
          <ResponsiveContainer width="100%" height={280} className="sm:h-[320px] md:h-[300px]">
            <BarChart data={data} layout="horizontal" margin={{ top: 20, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.7} horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={(value) => `$${(value as number / 1000000).toFixed(1)}M`} fontSize={11} fontWeight="500" stroke="#6b7280" axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" width={80} fontSize={11} fontWeight="500" stroke="#6b7280" axisLine={false} tickLine={false} tick={{ textAnchor: 'end' }} />
              <Tooltip 
                 formatter={(value) => [`$${((value as number) / 1000000).toFixed(1)}M`, 'Pipeline Value']}
                 labelStyle={{ color: '#374151', fontWeight: '600' }}
                 contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              {/* FIX: Use explicit Cells to guarantee unique keys and prevent 'rectangle-null' errors */}
              <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                {data.map((entry, index) => (
                  <Cell 
                    key={`bar-cell-${index}-${entry.stage}`} 
                    fill="#10b981" 
                    stroke="#059669" 
                    strokeWidth={1} 
                  />
                ))}
              </Bar>
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
            const totalDeals = pipeline.data.reduce((sum: number, count: number) => sum + count, 0)
            const conversionData = pipeline.labels
              .map((label: string, index: number) => {
                const count = pipeline.data[index] || 0
                return {
                  stage: label || 'Unknown',
                  count,
                  value: count,
                  description: `${count} deals (${totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0}%)`,
                  percentage: totalDeals > 0 ? Math.round((count / totalDeals) * 100) : 0
                }
              })
              .filter((item: any) => item.count > 0 && item.stage !== 'Unknown')
            setData(conversionData)
          } else {
            setData([])
          }
        } else {
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

  if (loading) return <ChartSkeleton title="Deal Stage Distribution" />

  return (
    <Card>
      <CardHeader><CardTitle className="text-base sm:text-lg">Deal Stage Distribution</CardTitle></CardHeader>
      <CardContent>
        {data.length === 0 ? <EmptyChartState message="No deal stage data available" /> : (
          <ResponsiveContainer width="100%" height={300} className="sm:h-[350px] md:h-[320px]">
            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ stage, percentage }) => percentage >= 8 ? `${stage}\n${percentage}%` : ''}
                outerRadius={85}
                innerRadius={35}
                fill="#8884d8"
                dataKey="count"
                stroke="#fff"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={DEAL_STAGE_COLORS[index % DEAL_STAGE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [`${value} deals (${props.payload.percentage}%)`, props.payload.stage]}
                labelStyle={{ color: '#374151', fontWeight: '600' }}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-base sm:text-lg">{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyChartState({ message }: { message: string }) {
  return (
    <div className="h-64 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <p className="text-lg mb-2">{message}</p>
        <p className="text-sm">Start tracking deals to see data</p>
      </div>
    </div>
  )
}