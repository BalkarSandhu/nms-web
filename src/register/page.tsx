import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Network, Lock, User, ArrowRight, Server } from 'lucide-react';
import { register } from './register';
import { Toast } from '../components/ui/toast';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSubmitting(true);
        const result = await register({ username, password });
        setSubmitting(false);

        if (result.success) {
            navigate('/login');
        } else {
            setErrorMsg(result.message || 'Registration failed');
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
            <svg className="absolute inset-0 w-full h-full opacity-[0.06]" aria-hidden>
                <defs>
                    <pattern id="grid2" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid2)" />
            </svg>

            <div className="relative w-full max-w-md nms-form-card p-8 sm:p-10">
                <div className="mb-6 flex items-center gap-2">
                    <span
                        className="size-9 inline-flex items-center justify-center rounded-lg"
                        style={{
                            background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-strong) 100%)',
                            color: '#fff',
                            boxShadow: '0 0 14px rgba(34,211,238,0.45)',
                        }}
                    >
                        <Network className="size-5" />
                    </span>
                    <div className="leading-tight">
                        <div className="text-base font-bold" style={{ color: 'var(--form-text)' }}>DWINMS</div>
                        <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--form-text-lo)' }}>
                            First-time setup
                        </div>
                    </div>
                </div>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--form-text)' }}>
                        <Server className="size-5" style={{ color: 'var(--brand-strong)' }} />
                        Create administrator
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--form-text-mid)' }}>
                        This account will have full access to the network management system.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label htmlFor="r-username" className="nms-form-label">Username</label>
                        <div className="relative">
                            <User
                                className="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: 'var(--form-text-lo)' }}
                            />
                            <input
                                id="r-username"
                                type="text"
                                placeholder="admin"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="nms-form-input pl-10"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="r-password" className="nms-form-label">Password</label>
                        <div className="relative">
                            <Lock
                                className="size-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: 'var(--form-text-lo)' }}
                            />
                            <input
                                id="r-password"
                                type="password"
                                placeholder="Choose a strong password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="nms-form-input pl-10"
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={submitting} className="nms-btn-primary mt-2">
                        {submitting ? (
                            <span className="inline-flex items-center gap-2">
                                <span className="spinner size-4 rounded-full border-2 border-white/40 border-t-white" />
                                Creating account…
                            </span>
                        ) : (
                            <>
                                Create administrator
                                <ArrowRight className="size-4" />
                            </>
                        )}
                    </button>

                    <div className="text-center text-[12px]" style={{ color: 'var(--form-text-lo)' }}>
                        Already initialised?{' '}
                        <Link to="/login" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--brand-strong)' }}>
                            Sign in
                        </Link>
                    </div>
                </form>
                <Toast message={errorMsg} type="error" />
            </div>
        </div>
    );
}
