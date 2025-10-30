import {createContext, useContext, useState, useEffect} from  "react";
import type { ReactNode } from "react";

//-- importing types

import { readDeviceSchema,readLocationSchema, readServiceSchema, readWorkerSchema } from "./read-Types";
import type { readDeviceType, readLocationType, readServiceType, readWorkerType } from "./read-Types";

interface ApiContextType {
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

        //-- Fetch Devices
        try{
            const devicesResponse = await fetch(`${import.meta.env.VITE_NMS_HOST}/devices`).then(r=>r.json());
            const validatedDevices = readDeviceSchema.array().parse(devicesResponse);
            setDevices(validatedDevices);
        }catch (error){
            console.error("Error fetching devices:", error);
        }

        //-- Fetch Locations
        try{
            const locationsResponse = await fetch(`${import.meta.env.VITE_NMS_HOST}/locations`).then(r=>r.json());
            const validatedLocations = readLocationSchema.array().parse(locationsResponse);
            setLocations(validatedLocations);
        }catch (error){
            console.error("Error fetching locations:", error);
        }

        //-- Fetch Services
        try{
            const servicesResponse = await fetch(`${import.meta.env.VITE_NMS_HOST}/services`).then(r=>r.json());
            const validatedServices = readServiceSchema.array().parse(servicesResponse);
            setServices(validatedServices);
        }catch (error){
            console.error("Error fetching services:", error);
        }

        //-- Fetch Workers
        try{
            const workersResponse = await fetch(`${import.meta.env.VITE_NMS_HOST}/workers`).then(r=>r.json());
            const validatedWorkers = readWorkerSchema.array().parse(workersResponse);
            setWorkers(validatedWorkers);
        }catch (error){
            console.error("Error fetching workers:", error);
        }
    }catch (error) {
        console.error("Error fetching API data:", error);
    }

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