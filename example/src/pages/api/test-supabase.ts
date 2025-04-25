import { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabase'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Test Supabase connection by getting the current time from the database
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1)
        
        if (error) {
            console.error('Supabase connection error:', error)
            return res.status(500).json({ 
                error: 'Failed to connect to Supabase',
                details: error.message 
            })
        }

        return res.status(200).json({ 
            message: 'Supabase connection successful',
            users: data,
            connectionDetails: {
                url: process.env.NEXT_PUBLIC_SUPABASE_URL,
                hasServiceKey: !!process.env.SUPABASE_SERVICE_KEY
            }
        })
    } catch (error) {
        console.error('Test endpoint error:', error)
        return res.status(500).json({ 
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        })
    }
} 