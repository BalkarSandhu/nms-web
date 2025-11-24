import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {register} from './register';
import { Toast } from '../components/ui/toast';


export default function RegisterPage() {



    const navigate = useNavigate();
        const [username, setUsername] = useState('');
        const [password, setPassword] = useState('');
    
        const [errorMsg, setErrorMsg] = useState('');
    
        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setErrorMsg('');
            console.log('Form submitted with username:', username);
            
            const result = await register({ username, password });
            console.log('Register result:', result);
            
            if (result.success) {
                console.log('Navigating to /');
                navigate('/login');
            } else {
                console.error('Registration failed:', result.message);
                setErrorMsg(result.message || 'Regsitration failed');
            }
        };

        
    return (
        <div className="bg-linear-to-br from-(--base) to-(--dark) w-full h-full h-min-[100%] flex items-center justify-center">
            <div className="p-6 bg-(--dark) rounded-[10px]">
                <div className="gap-2 mb-6 flex flex-col">
                    <span className="text-(--contrast) text-[24px]">Register</span>
                    <div className="broder-b-2 border-(--contrast)">
                        <span className="text-(--contrast) text-[12px]">New Installation? Create Administrator user to begin.</span>
                    </div>
                </div>

                <div className="items-center justify-center">
                    <form className="flex flex-col gap-3 w-80" onSubmit={handleSubmit}>
                        <div className="w-full h-full flex flex-col gap-1.5">
                            <span className="text-(--contrast) text-[12px]">Username</span>
                            <input type="text" placeholder="Enter username" required value={username} 
                            className="bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]"
                            onChange={e => setUsername(e.target.value)}
                            />
                        </div>
                        <div className="size-full flex flex-col gap-1.5">
                            <span className="text-(--contrast) text-[12px]">Password</span>
                            <input type="password" placeholder="Enter Password" required value={password} 
                            className="h-min-[40px] bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]"
                            onChange={e => setPassword(e.target.value)}></input>
                        </div>
                        <button type="submit" className="bg-(--base) mt-6 text-(--contrast) items-center justify-center p-3 rounded-[10px] \
                        shadow h-min-[40px] hover:bg-(--base)/60 disabled:bg-(--dark) transition-colors">Register</button>
                    </form>
                    <Toast message={errorMsg} type="error" />
                </div>
            </div>
            
        </div>
    );
}