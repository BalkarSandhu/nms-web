import {createContext, useContext, useState, useEffect} from  "react";
import type { ReactNode } from "react";

//-- importing types

import { readDeviceResponseSchema, readLocationSchema, readServiceSchema, readWorkerSchema } from "./read-Types";
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

export const APIProvider = ({children}: {children: ReactNode}) => {

    //-- Data States
    const [devices, setDevices] = useState<readDeviceType[]>([]);
    const [locations, setLocations] = useState<readLocationType[]>([]);
    const [services, setServices] = useState<readServiceType[]>([]);
    const [workers, setWorkers] = useState<readWorkerType[]>([]);

    //-- Loading States
    const [loading, setLoading] = useState(true);




const fetchData = async() => {
    try{
        // Set a timeout for all fetch operations
        const fetchWithTimeout = async (url: string, timeout = 5000) => {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(id);
                return await response.json();
            } catch (error) {
                clearTimeout(id);
                throw error;
            }
        };

        const apiHost = import.meta.env.VITE_NMS_HOST;

        //-- Fetch Devices
        try{
            const devicesResponse = await fetchWithTimeout(`${apiHost}/devices`);
            const validatedResponse = readDeviceResponseSchema.parse(devicesResponse);
            setDevices(validatedResponse.devices);
        }catch (error){
            console.error("Error fetching devices:", error);
            setDevices([]); // Set empty array on error
        }

        //-- Fetch Locations
        try{
            const locationsResponse = await fetchWithTimeout(`${apiHost}/locations`);
            const validatedLocations = readLocationSchema.array().parse(locationsResponse);
            setLocations(validatedLocations);
        }catch (error){
            console.error("Error fetching locations:", error);
            setLocations([]); // Set empty array on error
        }

        //-- Fetch Services
        try{
            const servicesResponse = await fetchWithTimeout(`${apiHost}/services`);
            const validatedServices = readServiceSchema.array().parse(servicesResponse);
            setServices(validatedServices);
        }catch (error){
            console.error("Error fetching services:", error);
            setServices([]); // Set empty array on error
        }

        //-- Fetch Workers
        try{
            const workersResponse = await fetchWithTimeout(`${apiHost}/workers`);
            const validatedWorkers = readWorkerSchema.array().parse(workersResponse);
            setWorkers(validatedWorkers);
        }catch (error){
            console.error("Error fetching workers:", error);
            setWorkers([]); // Set empty array on error
        }
    }catch (error) {
        console.error("Error fetching API data:", error);
    } finally {
        // Always set loading to false, even if all requests fail
        setLoading(false);
    }
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