


export default function RegisterPage() {
    return (
        <div className="bg-linear-to-br from-(--dark) to-(--base) w-full h-full h-min-[100%] flex items-center justify-center">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-10 bg-linear-to-br from-(--base) to-(--dark) rounded-2xl">

                <div className="w-full h-full p-6 hidden  md:flex md:flex-col md:items-center md:gap-5 md:m-auto ">

                    <span className = "text-[24px] text-(--contrast)">Welcome Back</span>

                    <span className = "text-[16px] text-(--contrast)">Get started by registering workers, <br/>locations and devices</span>

                </div>
                <div className="p-6 bg-(--dark) rounded-[10px]">

                    <div className="gap-2 mb-6 flex flex-col">
                        <span className="text-(--contrast) text-[24px]">Login</span>
                        <div className="broder-b-2 border-(--contrast)">
                            <span className="text-(--contrast) text-[12px]">New User? Contact Administrator to create a new user</span>
                        </div>
                    </div>

                    <div className="items-center justify-center">
                        <form className="flex flex-col gap-3 w-full">
                            <div className="w-full h-full flex flex-col gap-1.5">
                                <span className="text-(--contrast) text-[12px]">Username</span>
                                <input type="text" placeholder="Enter username" required className="bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]" />
                            </div>
                            <div className="size-full flex flex-col gap-1.5">
                                <span className="text-(--contrast) text-[12px]">Password</span>
                                <input type="text" placeholder="Enter Password" required className="h-min-[40px] bg-(--base) px-4 py-3 text-(--contrast)/50 rounded-[10px]"></input>
                            </div>
                            <button type="submit" className="bg-(--base) mt-6 text-(--contrast) items-center justify-center p-3 rounded-[10px] \
                        shadow h-min-[40px] hover:bg-(--base)/10 disabled:bg-(--dark) transition-colors">Register</button>
                        </form>
                    </div>
                </div>

            </div>


        </div>
    );
}