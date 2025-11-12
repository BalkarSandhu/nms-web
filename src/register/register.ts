type registerResponseType =
    {

        "error": string;
        "message": string;

    };


type registerResponse = {
    message?: string;
    success: boolean;
}

export async function register({ username, password }: { username: string, password: string }): Promise<registerResponse> {

    const url = `${import.meta.env.VITE_NMS_HOST}/auth/initialize`;
    console.log('Register URL:', url);

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

        if (!response.ok) {
            console.error("Error Logging In - Status:", response.status);
            return {
                message: "Register Failed",
                success: false
            }
        }

        const data: registerResponseType = await response.json();
        console.log('Register response data:', data);

        if (data.error==="system already initialized"){
            return {
                message:"Already Registered",
                success: true
            }
        }
        return {
            message: "Registerd Successfully",
            success: true
        }
    } catch (error) {
        console.error('Register error:', error);
        return {
            message: "Network error",
            success: false
        }
    }
}