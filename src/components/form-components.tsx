import "@/index.css";


//-- ShadCN components
import {}


export type InputFieldType = {
    label : string;
    placeholder : string;
    type : "input" | "password" | "combobox";
    comboboxOptions? : string[];
    stateValue ?: string;
    stateAction ?: (value: string) => void;
}

export function InputField ({props} : {props : InputFieldType}) {
    return (
        <div className = "flex flex-col w-full h-fit h-max-[70px] gap-2 p-0 bg-none">
            <span className = "text-(--contrast) text-[14px] text-left">{props.label}</span>

        </div>

    )
}