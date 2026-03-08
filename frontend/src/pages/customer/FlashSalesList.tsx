import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import type { FlashSale } from "../../services/flashSaleService";
import { apiUrlFlashSales } from "../../services/flashSaleService";
import { placeFlashSaleOrder } from "../../services/orderService";

const FlashSalesList: React.FC = () => {
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(
    localStorage.getItem("user_email") || "",
  );

  const loadData = async () => {
    try {
      // Use the new public list endpoint
      const response = await api.get(`${apiUrlFlashSales}/public/list`);
      setFlashSales(response.data);
    } catch (error) {
      console.error("Failed to fetch flash sales:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const handleOrder = async (flashSale: FlashSale) => {
    if (!userEmail) {
      const email = window.prompt("Please enter your email to continue:");
      if (!email) return;
      setUserEmail(email);
      localStorage.setItem("user_email", email);
    }

    try {
      const result = await placeFlashSaleOrder({
        userEmail: localStorage.getItem("user_email") || userEmail,
        flashSaleId: flashSale.id,
        quantity: 1,
      });
      alert(`Success! Order #${result.orderId} placed.`);
      loadData(); // Refresh stock
    } catch (error: any) {
      alert(error.response?.data?.message || "Ordering failed");
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center text-gray-600">
        Loading amazing deals...
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-12 px-4 shadow-lg mb-8">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight drop-shadow-md">
            Flash Sale Central
          </h1>
          <p className="text-xl text-blue-100 opacity-90 max-w-2xl mx-auto">
            Grab the limited stock items before they're gone! Quick fingers win.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {flashSales.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <p className="text-gray-400 text-lg italic">
              No active flash sales right now. Stay tuned!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
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
                  className="group bg-white rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden transform hover:-translate-y-2"
                >
                  {/* Status Badge */}
                  <div className="relative">
                    <div
                      className={`absolute top-4 right-4 z-10 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm 
                      ${isOngoing ? "bg-red-500 text-white animate-pulse" : "bg-blue-600 text-white"}`}
                    >
                      {isOngoing ? "● Ongoing" : "Upcoming"}
                    </div>
                    {/* Placeholder for Image - if we had one */}
                    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-4xl group-hover:scale-105 transition-transform duration-500">
                      ⚡
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                      {fs.item?.title}
                    </h3>
                    <p className="text-3xl font-black text-blue-700 mb-4">
                      ${Number(fs.item?.price).toFixed(2)}
                    </p>

                    <div className="space-y-4 flex-1">
                      {/* Stock Info */}
                      <div>
                        <div className="flex justify-between text-sm font-bold mb-2">
                          <span className="text-gray-600">Remaining Quota</span>
                          <span
                            className={`${fs.availableStock < 5 ? "text-red-500" : "text-blue-600"}`}
                          >
                            {fs.availableStock} / {fs.allocatedStock} left
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-3.5 border border-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out 
                              ${stockPercentage < 20 ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.3)]"}`}
                            style={{ width: `${stockPercentage}%` }}
                          />
                        </div>
                      </div>

                      {/* Time Info */}
                      <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                        <p className="text-xs text-gray-400 font-bold uppercase mb-1">
                          Schedule
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {isUpcoming
                            ? `Starting: ${start.toLocaleString()}`
                            : `Ends: ${end.toLocaleString()}`}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleOrder(fs)}
                      disabled={!isOngoing || fs.availableStock <= 0}
                      className={`mt-6 w-full py-4 rounded-2xl font-black text-lg uppercase tracking-widest transition-all duration-300 transform active:scale-95 shadow-lg
                        ${
                          isOngoing && fs.availableStock > 0
                            ? "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200 active:bg-blue-800"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                        }`}
                    >
                      {fs.availableStock <= 0
                        ? "Sold Out"
                        : isUpcoming
                          ? "Wait for it"
                          : "Order Now"}
                    </button>
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
