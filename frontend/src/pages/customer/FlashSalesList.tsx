import {
  Activity,
  AlertCircle,
  ArrowRight,
  Loader2,
  LogIn,
  LogOut,
  User as UserIcon,
  X,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import type { FlashSale } from "../../services/flashSaleService";
import { apiUrlFlashSales } from "../../services/flashSaleService";
import { checkout, fetchPendingOrders } from "../../services/orderService";

const FlashSalesList: React.FC = () => {
  const navigate = useNavigate();
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [acquiring, setAcquiring] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{
    message: string;
    title: string;
  } | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState(
    localStorage.getItem("user_email") || "",
  );
  const [loginEmail, setLoginEmail] = useState("");
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const response = await api.get(`${apiUrlFlashSales}/public/list`);
      setFlashSales(response.data);
    } catch (error) {
      console.error("Failed to fetch flash sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingOrders = async () => {
    if (!currentUserEmail) {
      setPendingOrders([]);
      return;
    }
    try {
      const data = await fetchPendingOrders(currentUserEmail);
      setPendingOrders(data);
    } catch (err) {
      console.error("Failed to fetch pending orders", err);
    }
  };

  useEffect(() => {
    loadData();
    loadPendingOrders();
    const interval = setInterval(() => {
      loadData();
      loadPendingOrders();
    }, 10000);
    return () => clearInterval(interval);
  }, [currentUserEmail]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginEmail.includes("@")) {
      alert("Please enter a valid email address.");
      return;
    }
    localStorage.setItem("user_email", loginEmail);
    setCurrentUserEmail(loginEmail);
    setLoginEmail("");
  };

  const handleLogout = () => {
    localStorage.removeItem("user_email");
    setCurrentUserEmail("");
  };

  const handleOrder = async (flashSale: FlashSale) => {
    if (!currentUserEmail) return;

    setAcquiring(true);
    setErrorInfo(null);

    // Ensure animation is shown for at least 1 second
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1000));

    try {
      const [result] = await Promise.all([
        checkout(flashSale.id, currentUserEmail),
        minDelay,
      ]);

      navigate(
        `/checkout?token=${result.token}&jobId=${result.jobId}&fsId=${flashSale.id}&item=${encodeURIComponent(flashSale.item.title)}&price=${flashSale.item.price}`,
      );
    } catch (error: any) {
      // Ensure we waited at least 1 sec even on error
      await minDelay;

      const message =
        error.response?.data?.message || "Failed to checkout item. Try again!";
      setErrorInfo({
        title: "Flash Sale Alert",
        message: message,
      });
    } finally {
      setAcquiring(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600 font-medium tracking-tight">
        Loading amazing deals...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pb-12 relative overflow-hidden font-sans">
      {/* Login Header Overlay (Fixed) */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50 py-3 px-4 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Zap className="w-6 h-6 text-white fill-white" />
            </div>
            <span className="font-black text-xl tracking-tighter text-gray-900 uppercase">
              FlashBox
            </span>
          </div>

          {currentUserEmail ? (
            <div className="flex items-center gap-4 bg-gray-50 py-2 pl-4 pr-2 rounded-2xl border border-gray-200">
              <div className="flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-bold text-gray-700 truncate max-w-[150px] md:max-w-none">
                  {currentUserEmail}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white text-gray-500 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all border border-gray-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
              >
                <LogOut className="w-4 h-4" /> <span>Logout</span>
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleLogin}
              className="flex items-center gap-2 w-full md:w-auto"
            >
              <input
                type="email"
                placeholder="Enter email to login"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="flex-1 md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-100 focus:border-blue-500 outline-none font-bold text-sm transition-all"
                required
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
              >
                <LogIn className="w-4 h-4" /> <span>Login</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {acquiring && (
        <div className="fixed inset-0 z-[100] bg-blue-600/95 backdrop-blur-lg flex flex-col items-center justify-center text-white animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="relative w-28 h-28 bg-white rounded-full flex items-center justify-center shadow-2xl border-8 border-blue-500/20">
              <Zap className="w-14 h-14 text-blue-600 fill-blue-600 animate-bounce" />
            </div>
          </div>
          <h2 className="text-4xl font-black uppercase tracking-tighter mb-2 drop-shadow-lg">
            Checking out...
          </h2>
          <p className="text-blue-100 font-bold opacity-90 uppercase tracking-widest text-sm animate-pulse">
            Checking stock availability
          </p>
          <Loader2 className="w-8 h-8 animate-spin mt-16 opacity-40" />
        </div>
      )}

      {/* Error Modal */}
      {errorInfo && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setErrorInfo(null)}
          ></div>
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 transform-gpu">
            <div className="p-12 flex flex-col items-center text-center">
              <button
                onClick={() => setErrorInfo(null)}
                className="absolute top-8 right-8 text-gray-400 hover:text-gray-600 transition-colors p-2"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative mb-8">
                <div className="absolute inset-0 bg-red-100 rounded-full blur-2xl animate-pulse"></div>
                <div className="relative w-24 h-24 bg-red-50 rounded-full flex items-center justify-center border-4 border-red-100 shadow-inner">
                  <AlertCircle className="w-12 h-12 text-red-500" />
                </div>
              </div>

              <h2 className="text-4xl font-black uppercase tracking-tighter text-gray-900 mb-4 leading-none">
                {errorInfo.title}
              </h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mb-10 max-w-sm leading-loose">
                {errorInfo.message}
              </p>

              <button
                onClick={() => setErrorInfo(null)}
                className="w-full bg-red-600 text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-sm shadow-xl shadow-red-200 hover:bg-red-700 hover:shadow-red-300 transition-all transform active:scale-95"
              >
                Dismiss Flash Alert
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-700 via-indigo-800 to-indigo-950 text-white py-16 px-4 shadow-2xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter drop-shadow-2xl uppercase">
            Flash Sale{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
              Central
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 opacity-90 max-w-3xl mx-auto font-medium leading-relaxed">
            The clock is ticking! Grab your items now!
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        {pendingOrders.length > 0 && (
          <div className="mb-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border-4 border-blue-500/20">
              <div className="bg-blue-600 px-10 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-white animate-pulse" />
                  <h3 className="text-white font-black uppercase tracking-[0.2em] text-xs">
                    Pending Orders Found
                  </h3>
                </div>
                <span className="bg-white/20 text-white px-3 py-1 rounded-full text-[10px] font-black">
                  {pendingOrders.length} Pending
                </span>
              </div>
              <div className="p-8 space-y-4">
                {pendingOrders.map((order) => {
                  const item = order.orderItems?.[0]?.item;
                  const fsId = order.orderItems?.[0]?.flashSaleId;
                  return (
                    <div
                      key={order.id}
                      className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50/50 rounded-3xl border border-blue-100 hover:border-blue-300 transition-all group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-blue-100 group-hover:scale-110 transition-transform">
                          📦
                        </div>
                        <div>
                          <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest mb-1">
                            Pending Order #{order.id}
                          </p>
                          <h4 className="text-xl font-black text-gray-900 uppercase">
                            {item?.title || "Unknown Item"}
                          </h4>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          navigate(
                            `/checkout?token=ALREADY_SECURED&jobId=RESUME&fsId=${fsId}&item=${encodeURIComponent(item?.title)}&price=${item?.price}`,
                          )
                        }
                        className="bg-blue-600 hover:bg-black text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all flex items-center gap-3 shadow-xl shadow-blue-200"
                      >
                        Resume Checkout <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {flashSales.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-[2rem] shadow-xl border border-gray-100 ring-1 ring-gray-200/50">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl text-gray-300">
              💤
            </div>
            <p className="text-gray-400 text-xl font-medium italic">
              All quiet for now. The next big drop is coming soon!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {flashSales.map((fs) => {
              const now = new Date();
              const start = new Date(fs.startTime);
              const end = new Date(fs.endTime);
              const isOngoing = now >= start && now <= end;
              const isUpcoming = now < start;
              const stockPercentage = Math.round(
                (fs.availableStock / fs.allocatedStock) * 100,
              );

              return (
                <div
                  key={fs.id}
                  className="group bg-white rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all duration-500 border border-gray-100 flex flex-col overflow-hidden transform hover:-translate-y-3"
                >
                  <div className="relative overflow-hidden">
                    <div
                      className={`absolute top-6 right-6 z-20 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl backdrop-blur-md 
                      ${
                        isOngoing
                          ? fs.availableStock > 0
                            ? "bg-red-500/90 text-white animate-pulse"
                            : "bg-gray-500/90 text-white"
                          : "bg-blue-600/90 text-white"
                      }`}
                    >
                      {isOngoing
                        ? fs.availableStock > 0
                          ? "● Live Now"
                          : "Sold Out"
                        : "Upcoming"}
                    </div>
                    <div className="h-56 bg-gradient-to-br from-gray-50 to-gray-150 flex items-center justify-center text-6xl group-hover:scale-110 transition-transform duration-700 ease-out grayscale group-hover:grayscale-0">
                      📦
                    </div>
                  </div>

                  <div className="p-8 flex-1 flex flex-col">
                    <div className="mb-4">
                      <h3 className="text-2xl font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase truncate">
                        {fs.item?.title}
                      </h3>
                    </div>

                    <div className="flex items-baseline gap-2 mb-6">
                      <span className="text-4xl font-black text-gray-900 tracking-tighter">
                        ${Number(fs.item?.price).toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-6 flex-1">
                      <div>
                        <div className="flex justify-between text-[11px] font-black mb-3 uppercase tracking-wider">
                          <span className="text-gray-500">
                            Inventory Status
                          </span>
                          <span
                            className={`${fs.availableStock < 5 ? "text-red-500" : "text-blue-600"}`}
                          >
                            {fs.availableStock} / {fs.allocatedStock} Units
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-4 border border-gray-200 overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-[1.5s] ease-in-out shadow-lg
                              ${stockPercentage < 20 ? "bg-gradient-to-r from-red-500 to-rose-600 animate-pulse" : "bg-gradient-to-r from-blue-600 to-indigo-600"}`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-lg">
                          ⏰
                        </div>
                        <div className="truncate">
                          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-0.5">
                            {isUpcoming ? "Countdown" : "Expiry"}
                          </p>
                          <p className="text-xs font-bold text-gray-700">
                            {isUpcoming
                              ? start.toLocaleString()
                              : end.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOrder(fs)}
                      disabled={
                        !currentUserEmail ||
                        !isOngoing ||
                        fs.availableStock <= 0
                      }
                      className={`mt-8 w-full py-5 rounded-3xl font-black text-sm uppercase tracking-[0.25em] transition-all duration-300 transform active:scale-95 shadow-2xl relative overflow-hidden group/btn
                        ${
                          currentUserEmail && isOngoing && fs.availableStock > 0
                            ? "bg-gray-900 text-white hover:bg-black hover:shadow-blue-500/20 active:bg-gray-800"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        }`}
                    >
                      <span className="relative z-10">
                        {!currentUserEmail
                          ? "Log in to Buy"
                          : fs.availableStock <= 0
                            ? "Sold Out"
                            : isUpcoming
                              ? "Stay Ready"
                              : "Buy Now"}
                      </span>
                      {currentUserEmail &&
                        isOngoing &&
                        fs.availableStock > 0 && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000"></div>
                        )}
                    </button>
                    {!currentUserEmail &&
                      isOngoing &&
                      fs.availableStock > 0 && (
                        <p className="text-[10px] text-red-500 font-bold uppercase mt-2 text-center tracking-widest animate-pulse">
                          Authentication required to secure spot
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSalesList;
