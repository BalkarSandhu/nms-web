import React from "react";
import "@/index.css";

export const LoadingPage = () => (
    <div  className="w-full h-full z-100 flex items-center justify-center bg-linear-to-b from-(--base) to-(--dark)">
        <span className="loader"></span>

        <span className="animate-spin spin"></span>
        <style>{`
            .loader {
                animation: rotate 1s infinite;
            height: 50px;
            width: 50px;
            position: relative;
                }
            .loader::before,
            .loader::after {
                border - radius: 50%;
            content: "";
            display: block;
            height: 20px;
            width: 20px;
            position: absolute;
            left: 0;
            top: 0;
                }
            .loader::before {
                animation: ball1 1s infinite;
            background-color: #fff;
            box-shadow: 30px 0 0 #ff3d00;
            margin-bottom: 10px;
                }
            .loader::after {
                animation: ball2 1s infinite;
            background-color: #ff3d00;
            box-shadow: 30px 0 0 #fff;
                }
            @keyframes rotate {
                0 % { transform: rotate(0deg) scale(0.8); }
                  50% {transform: rotate(360deg) scale(1.2); }
            100% {transform: rotate(720deg) scale(0.8); }
                }
            @keyframes ball1 {
                0 % { box- shadow: 30px 0 0 #ff3d00; }
            50% {box - shadow: 0 0 0 #ff3d00; margin-bottom: 0; transform: translate(15px, 15px); }
            100% {box - shadow: 30px 0 0 #ff3d00; margin-bottom: 10px; }
                }
            @keyframes ball2 {
                0 % { box- shadow: 30px 0 0 #fff; }
            50% {box - shadow: 0 0 0 #fff; margin-top: -20px; transform: translate(15px, 15px); }
            100% {box - shadow: 30px 0 0 #fff; margin-top: 0; }
                }
              `}</style>
    </div>
);
        