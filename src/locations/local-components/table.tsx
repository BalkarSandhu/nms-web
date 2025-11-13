import React from 'react';

//--Local components
import LocationsFilters from './filters';

export default function LocationsTable() {
    return (
        <div className="gap-4 w-full h-full bg-(--contrast) py-2">
            <LocationsFilters filters={[]}/>
            
        </div>
    );
}

