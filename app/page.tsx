"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      // Phân luồng chính xác theo tài khoản yêu cầu
      if (username === "admin" && password === "7891011") {
        localStorage.setItem("userSession", JSON.stringify({ 
          username: "Admin", 
          role: "ADMIN" 
        }));
        router.push("/dashboard");
      } else if (username === "hocsinh" && password === "123456") {
        localStorage.setItem("userSession", JSON.stringify({ 
          username: "hocsinh", 
          role: "STUDENT" 
        }));
        router.push("/home");
      } else {
        setError("Tên đăng nhập hoặc mật khẩu không chính xác!");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden z-10 px-4">
      
      {/* Vệt sáng trang trí Background */}
      <div className="hero-deco hero-deco-1"></div>
      <div className="hero-deco hero-deco-2"></div>

      {/* LOGO */}
      <div className="absolute top-10 left-0 right-0 flex justify-center items-center pointer-events-none">
        <div className="font-black text-6xl text-bkhn-red tracking-tighter drop-shadow-sm">
          TSA<span className="text-gray-800">'</span>
        </div>
      </div>

      {/* KHỐI FORM ĐĂNG NHẬP CHÍNH */}
      <div className="bg-white w-full max-w-[420px] p-8 md:p-10 rounded-3xl shadow-bkhn-lg border border-bkhn-pink animate-fade-up relative z-20">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 mb-3">Đăng nhập</h1>
          <p className="text-sm text-gray-500 font-medium">
            Bạn chưa có tài khoản? <a href="#" className="text-bkhn-red hover:underline font-bold transition-all">Đăng ký ngay</a>
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-xl text-center animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Tên đăng nhập <span className="text-bkhn-red">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <User size={18} className="text-gray-400 group-focus-within:text-bkhn-red transition-colors" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-bkhn-red/20 focus:border-bkhn-red focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Mật khẩu <span className="text-bkhn-red">*</span>
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400 group-focus-within:text-bkhn-red transition-colors" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-bkhn-red/20 focus:border-bkhn-red focus:bg-white transition-all tracking-wider placeholder:tracking-normal"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-bkhn-red hover:bg-red-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-bkhn-md hover:shadow-bkhn-glow flex justify-center items-center active:scale-[0.98] mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              "Đăng nhập"
            )}
          </button>

          <div className="mt-4 text-center">
            <a href="#" className="text-sm font-semibold text-bkhn-red hover:underline transition-all">
              Quên mật khẩu?
            </a>
          </div>
          
        </form>
      </div>

      <div className="absolute bottom-6 text-center text-xs font-medium text-gray-400 w-full pointer-events-none">
        &copy; 2026 Hệ thống Thi thử.
      </div>
    </div>
  );
}
