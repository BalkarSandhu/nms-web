import React, {useState} from 'react';

//-- Local Components
import { AddLocationForm } from './local-components/AddLocationForm';




export default function LocationsPage() {

    return (
        <div className="p-4">
            <AddLocationForm />
        </div>
    )
      
}