import {createContext, useContext, useState, useEffect} from  "react";
import type { ReactNode } from "react";

//-- importing types

import { readDeviceResponseSchema, readLocationSchema, readServiceSchema, readWorkerResponseSchema } from "./read-Types";
import type { readDeviceType, readLocationType, readServiceType, readWorkerType } from "./read-Types";

export type ApiContextType = {
    devices: readDeviceType[];
    locations: readLocationType[];
    services: readServiceType[];
    workers: readWorkerType[];
    loading: boolean;
    refresh: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | null>(null);

// Helper function to get cookie value by name
const getCookie = (name: string): string | null => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
    }
    return null;
};

export const APIProvider = ({children}: {children: ReactNode}) => {

    //-- Data States
    const [devices, setDevices] = useState<readDeviceType[]>([]);
    const [locations, setLocations] = useState<readLocationType[]>([]);
    const [services, setServices] = useState<readServiceType[]>([]);
    const [workers, setWorkers] = useState<readWorkerType[]>([]);

    //-- Loading States
    // Start with false to render UI immediately - data will populate as it arrives
    const [loading, setLoading] = useState(false);





const fetchData = async() => {
    // Set loading to true when explicitly refreshing
    setLoading(true);
    
    // Get token from cookie
    const token = getCookie('token');
    
    const headers: HeadersInit = {
        "Content-Type": "application/json"
    };
    
    // Add Authorization header if token exists
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    // Set a timeout for all fetch operations
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, { 
                signal: controller.signal,
                headers: headers
            });
            clearTimeout(id);
            return await response.json();
        } catch (error) {
            clearTimeout(id);
            throw error;
        }
    };

    const apiHost = import.meta.env.VITE_NMS_HOST;

    // Fetch all resources in parallel using Promise.allSettled
    // This allows each fetch to complete independently without blocking others
    await Promise.allSettled([
        //-- Fetch Devices
        fetchWithTimeout(`${apiHost}/devices`)
            .then(response => readDeviceResponseSchema.parse(response))
            .then(validatedResponse => setDevices(validatedResponse.devices))
            .catch(error => {
                console.error("Error fetching devices:", error);
                setDevices([]);
            }),
        
        //-- Fetch Locations
        fetchWithTimeout(`${apiHost}/locations`)
            .then(response => readLocationSchema.array().parse(response))
            .then(validatedLocations => setLocations(validatedLocations))
            .catch(error => {
                console.error("Error fetching locations:", error);
                setLocations([]);
            }),
        
        //-- Fetch Services
        fetchWithTimeout(`${apiHost}/services`)
            .then(response => readServiceSchema.array().parse(response))
            .then(validatedServices => setServices(validatedServices))
            .catch(error => {
                console.error("Error fetching services:", error);
                setServices([]);
            }),
        
        //-- Fetch Workers
        fetchWithTimeout(`${apiHost}/workers`)
            .then(response => readWorkerResponseSchema.parse(response))
            .then(validatedResponse => setWorkers(validatedResponse.workers))
            .catch(error => {
                console.error("Error fetching workers:", error);
                setWorkers([]);
            })
    ]);

    // Set loading to false after all requests complete (regardless of success/failure)
    setLoading(false);
}


useEffect(()=> {
    fetchData();
}, []);

const refresh = () => fetchData();
    return (
        <ApiContext.Provider value={{
            devices,
            locations,
            services,
            workers,
            loading,
            refresh
        }}>
            {children}
        </ApiContext.Provider>  
    )
}

export const useAPIs = () => useContext(ApiContext);