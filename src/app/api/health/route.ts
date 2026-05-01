import { NextResponse } from 'next/server';
import { getDb } from '@/lib/firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

export async function GET() {
    try {
        // If we are in a build environment or don't have db access, just return OK
        if (process.env.NEXT_PHASE === 'phase-production-build') {
             return NextResponse.json({ status: "ok", mode: "build" });
        }

        const db = getDb();
        if (!db) {
            return NextResponse.json({ status: "ok", note: "db_not_initialized" });
        }

        // Use a Promise.race to ensure health check doesn't hang the server boot
        const connectionTest = getDocFromServer(doc(db, 'test', 'connection'));
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));

        await Promise.race([connectionTest, timeout]);
        
        return NextResponse.json({ 
            status: "ok", 
            database: "connected",
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database connection verify failed:', error);
        // We still return 200 for health check to prevent the load balancer from killing the instance
        // but we report the error in the body
        return NextResponse.json({ 
            status: "warning", 
            database: "disconnected",
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
        });
    }
}
