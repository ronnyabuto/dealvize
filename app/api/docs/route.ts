import { NextRequest, NextResponse } from 'next/server'
import { swaggerSpec } from '@/lib/api/swagger'

// GET endpoint to serve the OpenAPI specification
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const format = url.searchParams.get('format')
  
  try {
    // Return JSON format by default
    if (format === 'yaml') {
      // Convert to YAML if requested
      const yaml = await import('yaml')
      const yamlSpec = yaml.stringify(swaggerSpec)
      
      return new NextResponse(yamlSpec, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-yaml',
          'Cache-Control': 'public, max-age=3600'
        }
      })
    }
    
    return NextResponse.json(swaggerSpec, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to generate API documentation',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}