
import "@/index.css"
import { Search } from "lucide-react";




export default function SearchBar(){


    return (

        <button className="w-0 md:w-[200px] bg-(--contrast)/90 border-0 \
        flex flex-row items-center justify-left rounded-[10px] gap-2 px-2 hover:bg-(--contrast)/50 \
        transition-colors ease-in-out">

            <Search className="size-4 text-(--base)"/>
            <span className="text-(--base)">Search</span>

        </button>
    )
}