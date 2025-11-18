import "@/index.css";

//---  lucide icons
import { X } from "lucide-react";

//-- ShadCN components
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  // DialogDescription,
  // DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Utility function for conditional classNames
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}


//-- Lucide Icons 
import { Check, ChevronsUpDown } from "lucide-react";




//--- Input Field
export type InputFieldType = {
  label: string;
  placeholder: string;
  type: "input" | "password" | "combobox" | "selectbox";
  comboboxOptions?: string[];
  selectBoxOptions?: {label:string;value:string}[];
  stateValue?: string;
  stateAction?: (value: string) => void;
  openState?: boolean;
  openStateAction?: (value: boolean) => void;
}

export function InputField({ label, placeholder, type, comboboxOptions, stateValue, stateAction, openState, openStateAction }: InputFieldType) {
  // Destructure selectBoxOptions from props
  const { selectBoxOptions } = arguments[0] as { selectBoxOptions?: {label: string; value: string}[] };

  return (
    <div className="flex flex-col w-full h-fit h-max-[60px] gap-2 p-0 bg-none">
      <label className="text-(--contrast) text-[12px] text-left">{label}</label>
      {type === "input" &&
        <input
          type="text"
          placeholder={placeholder}
          value={stateValue}
          onChange={(e) => stateAction ? stateAction(e.target.value) : null}
          className=" px-4 py-1 text-(--base)/90 rounded-[4px] w-full h-min-[20px] bg-(--contrast)/80 hover:bg-(--contrast)"
        />
      }
      {type === "password" &&
        <input
          type="password"
          placeholder={placeholder}
          value={stateValue}
          onChange={(e) => stateAction ? stateAction(e.target.value) : null}
          className="bg-(--contrast)/80 px-4 py-1 text-(--base)/90 rounded-[4px] w-full h-min-[20px]"
        />
      }
      {type === "combobox" &&
        <Popover open={openState} onOpenChange={openStateAction}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openState}
              className={cn(
                "w-full justify-between bg-(--contrast)/80 border-(--dark)  hover:text-(--contrast)",
                stateValue ? "text-(--contrast)" : "text-(--contrast)/50"
              )}
            >
              <span className="truncate text-sm text-(--base)/90">
                {stateValue ? stateValue : label}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-0 border-(--dark)" align="start">
            <Command className="bg-(--dark)/90 border-(--dark)">
              <CommandInput placeholder="Search entry ..." className="text-(--contrast) h-9 text-sm border-b border-(--dark)/50" />
              <CommandList className="max-h-[200px]">
                <CommandEmpty className="px-3 py-4 text-(--contrast)/70 text-sm">No entry found.</CommandEmpty>
                <CommandGroup className="p-1.5">
                  {comboboxOptions?.map((option: string) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={(currentValue) => {
                        stateAction ? stateAction(
                          currentValue === stateValue
                            ? ""
                            : currentValue
                        ) : null;
                        openStateAction ? openStateAction(false) : null
                      }}
                      className="text-(--contrast) text-sm data-[selected=true]:bg-(--dark)/50 data-[selected=true]:text-(--contrast) px-2 py-0.5 h-6 rounded-sm mb-0.5 last:mb-0 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-1.5 size-3.5",
                          stateValue === option
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {option}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      }

      {type === "selectbox" &&
        <Popover open={openState} onOpenChange={openStateAction}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={openState}
              className={cn(
                "w-full justify-between bg-(--contrast)/80 border-(--dark)  hover:text-(--contrast)",
                stateValue ? "text-(--contrast)" : "text-(--contrast)/50"
              )}
            >
              <span className="truncate text-sm text-(--base)/90">
                {selectBoxOptions?.find((opt: {label: string; value: string}) => opt.value === stateValue)?.label || label}
              </span>
              <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-0 border-(--dark)" align="start">
            <Command className="bg-(--dark)/90 border-(--dark)">
              <CommandInput placeholder="Search entry ..." className="text-(--contrast) h-9 text-sm border-b border-(--dark)/50" />
              <CommandList className="max-h-[200px]">
                <CommandEmpty className="px-3 py-4 text-(--contrast)/70 text-sm">No entry found.</CommandEmpty>
                <CommandGroup className="p-1.5">
                  {selectBoxOptions?.map((option: {label: string; value: string}) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={(currentValue) => {
                        stateAction ? stateAction(
                          currentValue === stateValue ? "" : currentValue
                        ) : null;
                        openStateAction ? openStateAction(false) : null
                      }}
                      className="text-(--contrast) text-sm data-[selected=true]:bg-(--dark)/50 data-[selected=true]:text-(--contrast) px-2 py-0.5 h-6 rounded-sm mb-0.5 last:mb-0 cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-1.5 size-3.5",
                          stateValue === option.value
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      }
    </div>

  )
}



//-- Status Message

export type StatusMessageType = {
  message: string;
  type: "error" | "success" | "info";
}

export function StatusMessage({ message, type }: StatusMessageType) {
  return (
    <div className={cn(
      "w-full h-fit h-max-[50px] py-3 px-4 rounded-2 text-[14px] text-(--contrast) flex items-center border-2 border-(--contrast)",
      type === "error" && "bg-(--red)/50 ",
      type === "success" && "bg-(--green)/50",
      type === "info" && "bg-(--azul)/50"
    )}>

      {message}
    </div>
  )
}




//-- Form Component (Modal)

export type FormProps = {
  title: string;
  open: boolean;
  setOpen: (value: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  statusMessage?: { message: string; type: "error" | "success" | "info" };
  children?: React.ReactNode;
  trigger: React.ReactNode; // Configurable trigger button
};


export function Form({
  title,
  open,
  setOpen,
  onSubmit,
  statusMessage,
  children,
  trigger,
}: FormProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="[&>[data-radix-dialog-close]]:hidden max-w-[425px] max-h-[85%] overflow-auto bg-linear-to-b from-(--base) to-(--dark) border-0 drop-shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-(--contrast) text-[20px]">{title}</DialogTitle>
          <DialogClose asChild className="text-(--contrast)">
            <Button data-radix-dialog-close variant="ghost" className="absolute right-4 top-4"><X/></Button>
          </DialogClose>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          {children}
          {statusMessage && (
            <StatusMessage message={statusMessage.message} type={statusMessage.type} />
          )}
          <Button type="submit" className="w-full mt-2 bg-(--base)">Submit</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}