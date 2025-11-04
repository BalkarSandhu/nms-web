


export default function RegisterPage() {
    return (
        <div className="bg-linear-to-br from-(--base) to-(--dark) w-full h-full h-min-[100%] flex items-center justify-center">
            <div className="p-6 bg-(--dark) rounded-[10px]">
                <div className="gap-2 mb-6 flex flex-col">
                    <span className="text-(--contrast) text-[32px]">Register</span>
                    <div className="broder-b-2 border-(--contrast)">
                        <span className="text-(--contrast) text-[12px]">New User? Create Administrator user to begin.</span>
                    </div>
                </div>

                <div className="items-center justify-center">
                    <form className="flex flex-col gap-3 w-80">
                        <div className="w-full h-full flex flex-col gap-1.5">
                            <span className="text-(--contrast) text-[1rem]">Username</span>
                            <input type="text" placeholder="Enter username" required className="bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]"/>
                        </div>
                        <div className="size-full flex flex-col gap-1.5">
                            <span className="text-(--contrast) text-[1rem]">Password</span>
                            <input type="text" placeholder="Enter Password" required className="h-min-[40px] bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]"></input>
                        </div>
                        <button type="submit" className="bg-(--base) mt-6 text-(--contrast) items-center justify-center p-3 rounded-[10px] \
                        shadow h-min-[40px] hover:bg-(--base)/10 disabled:bg-(--dark) transition-colors">Register</button>
                    </form>
                </div>
            </div>
        </div>
    );
}