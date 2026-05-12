import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Network, Lock, User, ArrowRight, ShieldCheck, Activity, Globe2 } from 'lucide-react';
import { login } from './login';
import { Toast } from '../components/ui/toast';

export default function LoginPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);

        const result = await login({ username, password });
        setSubmitting(false);

        if (result.success) {
            navigate('/');
        } else {
            setErrorMsg(result.message || 'Login failed');
        }
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden"
            style={{
                background:
                    'radial-gradient(800px 500px at 80% 10%, rgba(34,211,238,0.10), transparent 60%), ' +
                    'radial-gradient(700px 400px at 10% 90%, rgba(139,92,246,0.10), transparent 60%), ' +
                    'var(--bg-app)',
            }}
        >
            {/* Decorative grid */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden"
                 style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)' }}>

                {/* Left branded panel */}
                <div
                    className="relative hidden lg:flex flex-col justify-between p-10 text-white"
                    style={{
                        background:
                            'linear-gradient(160deg, #0F172A 0%, #0B1220 70%), ' +
                            'radial-gradient(400px 200px at 0% 0%, rgba(34,211,238,0.2), transparent 60%)',
                        borderTopLeftRadius: 16,
                        borderBottomLeftRadius: 16,
                    }}
                >
                    <div>
                        <div className="inline-flex items-center gap-2">
                            <span
                                className="size-9 inline-flex items-center justify-center rounded-lg"
                                style={{
                                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
                                    color: 'var(--bg-app)',
                                    boxShadow: '0 0 18px rgba(34,211,238,0.45)',
                                }}
                            >
                                <Network className="size-5" />
                            </span>
                            <div className="flex flex-col leading-tight">
                                <span className="text-lg font-bold tracking-wide">DWINMS</span>
                                <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-lo)' }}>
                                    Network Operations Center
                                </span>
                            </div>
                        </div>

                        <h1 className="mt-10 text-3xl font-bold leading-tight" style={{ color: 'var(--text-hi)' }}>
                            Real-time visibility into every<br />
                            <span style={{
                                background: 'linear-gradient(90deg, var(--brand) 0%, var(--status-online) 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}>
                                device, location, and worker.
                            </span>
                        </h1>
                        <p className="mt-3 text-sm max-w-md" style={{ color: 'var(--text-mid)' }}>
                            Sign in to monitor uptime, investigate incidents, and orchestrate
                            field response from a single operations dashboard.
                        </p>
                    </div>

                    <div className="mt-8 grid grid-cols-3 gap-3 max-w-md">
                        <Feature icon={<Activity className="size-4" />}     label="Live telemetry" />
                        <Feature icon={<ShieldCheck className="size-4" />}  label="Secure SSO"     />
                        <Feature icon={<Globe2 className="size-4" />}       label="Geo topology"   />
                    </div>

                    <div className="absolute bottom-6 left-10 text-[11px]" style={{ color: 'var(--text-dim)' }}>
                        © {new Date().getFullYear()} DWINMS · v6.0
                    </div>
                </div>

                {/* Right form card (light) */}
                <div className="nms-form-card p-8 sm:p-10">
                    <div className="mb-7">
                        <div className="lg:hidden inline-flex items-center gap-2 mb-4">
                            <span
                                className="size-8 inline-flex items-center justify-center rounded-lg"
                                style={{
                                    background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
                                    color: '#fff',
                                }}
                            >
                                <Network className="size-4" />
                            </span>
                            <span className="text-base font-bold" style={{ color: 'var(--form-text)' }}>DWINMS</span>
                        </div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--form-text)' }}>Welcome back</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--form-text-mid)' }}>
                            New user? Contact your administrator to create an account.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="username" className="nms-form-label">Username</label>
                            <div className="relative">
                                <User
                                    className="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--form-text-lo)' }}
                                />
                                <input
                                    id="username"
                                    type="text"
                                    placeholder="your.username"
                                    required
                                    autoComplete="username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="nms-form-input pl-10"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="nms-form-label">Password</label>
                            <div className="relative">
                                <Lock
                                    className="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                    style={{ color: 'var(--form-text-lo)' }}
                                />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="nms-form-input pl-10"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="nms-btn-primary mt-2"
                        >
                            {submitting ? (
                                <span className="inline-flex items-center gap-2">
                                    <span className="spinner size-4 rounded-full border-2 border-white/40 border-t-white" />
                                    Signing in…
                                </span>
                            ) : (
                                <>
                                    Sign in
                                    <ArrowRight className="size-4" />
                                </>
                            )}
                        </button>

                        <div className="text-center text-[12px]" style={{ color: 'var(--form-text-lo)' }}>
                            First time setting up DWINMS?{' '}
                            <Link to="/register" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--brand-strong)' }}>
                                Initialise as administrator
                            </Link>
                        </div>
                    </form>
                    <Toast message={errorMsg} type="error" />
                </div>
            </div>
        </div>
    );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <div
            className="flex flex-col items-start gap-2 rounded-lg p-3"
            style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-soft)',
            }}
        >
            <span style={{ color: 'var(--brand)' }}>{icon}</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-mid)' }}>{label}</span>
        </div>
    );
}
