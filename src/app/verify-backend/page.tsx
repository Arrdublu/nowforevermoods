'use client';

import { useState, useEffect } from 'react';
import { getDb, testConnection } from '@/lib/firebase';
import { CheckCircle, XCircle, Loader2, Globe, Database, ShieldCheck } from 'lucide-react';

export default function VerifyBackendPage() {
    const [clientStatus, setClientStatus] = useState<'loading' | 'ok' | 'error'>('loading');
    const [apiStatus, setApiStatus] = useState<any>(null);
    const [apiLoading, setApiLoading] = useState(true);
    const [clientError, setClientError] = useState<string | null>(null);

    useEffect(() => {
        // Test Client Connection
        async function runClientTest() {
            try {
                await testConnection();
                setClientStatus('ok');
            } catch (err) {
                setClientStatus('error');
                setClientError(err instanceof Error ? err.message : String(err));
            }
        }

        // Test API Connection
        async function runApiTest() {
            try {
                const res = await fetch('/api/health');
                const data = await res.json();
                setApiStatus(data);
            } catch (err) {
                setApiStatus({ status: 'error', error: 'Failed to reach health API' });
            } finally {
                setApiLoading(false);
            }
        }

        runClientTest();
        runApiTest();
    }, []);

    return (
        <div className="min-h-screen bg-brand-bg text-brand-text p-8 md:p-24 font-sans">
            <div className="max-w-3xl mx-auto">
                <header className="mb-12">
                    <span className="text-[10px] uppercase tracking-[0.4em] text-brand-accent font-bold mb-2 block">System Diagnostics</span>
                    <h1 className="text-4xl md:text-6xl font-serif text-white tracking-tighter italic">Backend Verification</h1>
                </header>

                <div className="grid gap-6">
                    {/* Environment Info */}
                    <div className="bg-brand-surface border border-brand-line p-6 rounded-2xl flex items-start gap-4">
                        <Globe className="text-brand-accent mt-1" size={20} />
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-widest text-brand-muted mb-2">Environment</h3>
                            <p className="text-xs text-brand-black font-mono">Domain: {typeof window !== 'undefined' ? window.location.hostname : 'Server'}</p>
                            <p className="text-xs text-brand-muted mt-1 uppercase tracking-tighter">Verified targets: nowforevermoods.com, run.app</p>
                        </div>
                    </div>

                    {/* Client-Side Check */}
                    <div className="bg-brand-surface border border-brand-line p-6 rounded-2xl flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <ShieldCheck className="text-brand-accent mt-1" size={20} />
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-muted mb-2">Client Connection</h3>
                                <p className="text-xs text-brand-black">Direct communication from browser to Firestore.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {clientStatus === 'loading' && <Loader2 className="animate-spin text-brand-muted" size={20} />}
                            {clientStatus === 'ok' && <CheckCircle className="text-green-500" size={20} />}
                            {clientStatus === 'error' && <XCircle className="text-red-500" size={20} />}
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${clientStatus === 'ok' ? 'text-green-500' : clientStatus === 'error' ? 'text-red-500' : 'text-brand-muted'}`}>
                                {clientStatus === 'ok' ? 'Connected' : clientStatus === 'error' ? 'Failed' : 'Testing...'}
                            </span>
                        </div>
                    </div>
                    {clientError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-red-500 text-[10px] font-mono whitespace-pre-wrap">
                            {clientError}
                        </div>
                    )}

                    {/* Server-Side API Check */}
                    <div className="bg-brand-surface border border-brand-line p-6 rounded-2xl flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                            <Database className="text-brand-accent mt-1" size={20} />
                            <div>
                                <h3 className="text-sm font-bold uppercase tracking-widest text-brand-muted mb-2">API Health Status</h3>
                                <p className="text-xs text-brand-black">Internal application router and server-to-DB connectivity.</p>
                                {apiStatus && (
                                    <p className="text-[10px] text-brand-muted font-mono mt-2 uppercase tracking-tighter">
                                        Server Time: {apiStatus.timestamp || 'N/A'}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {apiLoading && <Loader2 className="animate-spin text-brand-muted" size={20} />}
                            {!apiLoading && apiStatus?.status === 'ok' && <CheckCircle className="text-green-500" size={20} />}
                            {!apiLoading && apiStatus?.status !== 'ok' && <XCircle className="text-red-500" size={20} />}
                            <span className={`text-[10px] uppercase font-bold tracking-widest ${apiStatus?.status === 'ok' ? 'text-green-500' : apiStatus?.status === 'error' ? 'text-red-500' : 'text-brand-muted'}`}>
                                {apiStatus?.status === 'ok' ? 'Healthy' : apiStatus?.status === 'error' ? 'Error' : 'Checking...'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 space-y-4">
                    <div className="bg-brand-surface border border-brand-line p-8 rounded-2xl">
                        <h3 className="text-xl font-serif text-white italic mb-4">Troubleshooting "[Backend Not Found]"</h3>
                        <div className="space-y-4 text-xs text-brand-black leading-relaxed">
                            <p>If you encounter <span className="font-mono text-red-500 bg-red-500/10 px-1">Backend Not Found</span> on your <span className="font-mono">run.app</span> URL, it usually indicates a configuration issue with your Cloud Run service.</p>
                            
                            <ul className="list-disc pl-5 space-y-2 text-brand-muted uppercase tracking-tighter">
                                <li>Verify the <span className="text-brand-accent font-bold">Backend ID</span> in the Cloud Console matches "<span className="font-mono lowercase">nowforevermoods</span>".</li>
                                <li>Check the <span className="text-brand-accent font-bold">Region</span>: Your URL specifies <span className="font-mono italic">us-west1</span>. Ensure your backend was created in this region.</li>
                                <li>Inspect the <span className="text-brand-accent font-bold">GitHub Workflow</span>: Ensure your first deployment succeeded. A failed initial build can leave the Load Balancer with no "Backend" to route to.</li>
                                <li>Domain Mapping: If using "<span className="font-mono lowercase text-brand-accent font-bold">nowforevermoods.com</span>", ensure it is correctly associated with the backend in the App Hosting settings tab.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <footer className="mt-20">
                    <p className="text-[10px] text-brand-muted uppercase tracking-[0.2em] italic max-w-sm">
                        Verification active for current session. Ensure Firebase Authorized Domains include both custom and hosted hostnames.
                    </p>
                </footer>
            </div>
        </div>
    );
}
