import { NextResponse } from "next/server";
export async function GET(){
    try{
        const response= await fetch("http://192.168.29.35:8000/api/v1/devices/:id",{
        headers:{
            'Content-Type' :' application/json'
        },
    })
 const data=response.json()
 return NextResponse.json(data)

}
catch(error){
    console.error('Error Fetching device Information')
    return NextResponse.json(
     {error:'Failed to fetch Device information'},
     {status:500}
    )

}
}
