import { store } from '../store/store';
import { setCredentials } from '../store/authSlice';

type loginResponseType =
 {
      token: string;
      user: {
        id: number;
        username: string;
        role: string;
        is_active: boolean;
        has_api_key: boolean;
        token_expiry: string; // ISO 8601 timestamp
      };
    };


type loginResponse = {
    message?: string;
    success: boolean;
}


// Helper function to set cookie
function setCookie(name: string, value: string, expiryDate: string) {
    const expires = new Date(expiryDate);
    // Only use Secure flag in production (https), not on 192.168.29.77
    const isSecure = window.location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    const cookieString = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict${secureFlag}`;
    document.cookie = cookieString;
    console.log('Cookie set:', cookieString);
}


export async function login({ username, password }: { username: string, password: string }):Promise<loginResponse> {

    const url = `${import.meta.env.VITE_NMS_HOST}/auth/login`;
    console.log('Login URL:', url);
    
    const payload = {
        username: username,
        password: password
    }

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        console.log('Response status:', response.status);

        if (!response.ok){
            console.error("Error Logging In - Status:", response.status);
            return {
                message : "Login Failed",
                success: false
            }
        }

        const data: loginResponseType = await response.json();
        console.log('Login response data:', data);

        if (data.token) {
            // Store token in HTTP cookie
            setCookie('token', data.token, data.user.token_expiry);
            
            // Store user data in Redux
            store.dispatch(setCredentials({ user: data.user }));
            
            console.log('Login successful, token stored');
            return {
                message: "Login Successful",
                success: true
            }
        }

        return {
            message: "Token not received",
            success: false
        }
    } catch (error) {
        console.error('Login error:', error);
        return {
            message: "Network error",
            success: false
        }
    }
}