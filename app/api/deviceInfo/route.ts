import { NextResponse } from "next/server";
export async function GET(){
    try{
        const response= await fetch(`${process.env.NEXT_PUBLIC_NMS_API_SOURCE}`,{
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
