export const LoadingPage = () => (
  <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
    <span className="loader">
      <span className="ball ball-3"></span>
      <span className="ball ball-4"></span>
    </span>
    
    <style>{`
      .loader {
        animation: rotate 1s infinite;
        height: 50px;
        width: 50px;
        position: relative;
      }
      
      .loader::before,
      .loader::after {
        border-radius: 50%;
        content: "";
        display: block;
        height: 20px;
        width: 20px;
        position: absolute;
      }
      
      .loader::before {
        animation: ball1 1s infinite;
        background-color: #fff;
        left: 0;
        top: 0;
      }
      
      .loader::after {
        animation: ball2 1s infinite;
        background-color: #ff3d00;
        right: 0;
        top: 0;
      }
      
      .ball {
        border-radius: 50%;
        display: block;
        height: 20px;
        width: 20px;
        position: absolute;
      }
      
      .ball-3 {
        animation: ball3 1s infinite;
        background-color: #4CAF50;
        left: 0;
        bottom: 0;
      }
      
      .ball-4 {
        animation: ball4 1s infinite;
        background-color: #2196F3;
        right: 0;
        bottom: 0;
      }
      
      @keyframes rotate {
        0% { transform: rotate(0deg) scale(0.8); }
        50% { transform: rotate(360deg) scale(1.2); }
        100% { transform: rotate(720deg) scale(0.8); }
      }
      
      @keyframes ball1 {
        0% { 
          transform: translate(0, 0); 
        }
        50% { 
          transform: translate(15px, 15px); 
        }
        100% { 
          transform: translate(0, 0); 
        }
      }
      
      @keyframes ball2 {
        0% { 
          transform: translate(0, 0); 
        }
        50% { 
          transform: translate(-15px, 15px); 
        }
        100% { 
          transform: translate(0, 0); 
        }
      }
      
      @keyframes ball3 {
        0% { 
          transform: translate(0, 0); 
        }
        50% { 
          transform: translate(15px, -15px); 
        }
        100% { 
          transform: translate(0, 0); 
        }
      }
      
      @keyframes ball4 {
        0% { 
          transform: translate(0, 0); 
        }
        50% { 
          transform: translate(-15px, -15px); 
        }
        100% { 
          transform: translate(0, 0); 
        }
      }
    `}</style>
  </div>
);