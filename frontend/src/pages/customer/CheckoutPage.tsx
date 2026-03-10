import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CreditCard,
  Loader2,
  User,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getOrderStatus,
  updatePaymentStatus,
} from "../../services/orderService";

const CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const jobId = searchParams.get("jobId");
  const flashSaleId = Number(searchParams.get("fsId"));
  const itemTitle = searchParams.get("item") || "Item";
  const price = searchParams.get("price") || "0";

  const [step, setStep] = useState(1);
  const [email] = useState<string>(localStorage.getItem("user_email") ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !jobId || !flashSaleId) {
      alert("Invalid checkout session");
      navigate("/");
    }
  }, [token, jobId, flashSaleId, navigate]);

  const handleNextStep = () => {
    if (step === 1) {
      if (!email || !email.includes("@")) {
        alert("Please enter a valid email");
        return;
      }
      setStep(2);
    }
  };

  const handlePayment = async () => {
    setIsSubmitting(true);
    if (!orderId) return;
    try {
      // Step 1: Simulate Payment Processor Delay
      await updatePaymentStatus(orderId, "PAID");
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Step 2: Transition to processing state
      setStep(3);

      // Step 3: Start Polling for Order Status
      pollOrderStatus();
    } catch (error: any) {
      alert("Payment simulation failed");
      setIsSubmitting(false);
    }
  };

  const pollOrderStatus = async () => {
    if (!jobId) return;

    let attempts = 0;
    const maxAttempts = 15; // 15 seconds polling

    const interval = setInterval(async () => {
      attempts++;
      try {
        const { status, result } = await getOrderStatus(jobId);

        if (status === "completed" && result?.success) {
          setOrderId(result.orderId);
          clearInterval(interval);
          setIsSubmitting(false);
        } else if (status === "failed") {
          setPollError("Priority processing failed. Please contact support.");
          clearInterval(interval);
          setIsSubmitting(false);
        }
      } catch (e) {
        console.error("Polling error", e);
      }

      if (attempts >= maxAttempts) {
        setPollError(
          "Request timed out. Please check your email for confirmation.",
        );
        clearInterval(interval);
        setIsSubmitting(false);
      }
    }, 1000);
  };

  const steps = [
    { title: "Identity", icon: <User className="w-5 h-5" /> },
    { title: "Payment", icon: <CreditCard className="w-5 h-5" /> },
    { title: "Complete", icon: <CheckCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Stepper Header */}
        <div className="mb-12">
          <div className="flex items-center justify-between relative">
            <div
              className="absolute top-1/3 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0"
              style={{ width: `95%`, left: "10px" }}
            ></div>
            <div
              className="absolute top-1/3 left-0 h-1 bg-blue-600 -translate-y-1/2 z-0 transition-all duration-500"
              style={{
                width: `${((step - 1) / (steps.length - 1)) * 95}%`,
                left: "10px",
              }}
            ></div>

            {steps.map((s, i) => {
              const currentStep = i + 1;
              const isActive = step >= currentStep;
              const isCurrent = step === currentStep;

              return (
                <div
                  key={i}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-4 
                            ${
                              isCurrent
                                ? "bg-white border-blue-600 text-blue-600 scale-110 shadow-lg"
                                : isActive
                                  ? "bg-blue-600 border-blue-600 text-white"
                                  : "bg-white border-gray-200 text-gray-400"
                            }`}
                  >
                    {isActive && !isCurrent && i < steps.length - 1 ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      s.icon
                    )}
                  </div>
                  <span
                    className={`mt-3 text-[10px] font-black uppercase tracking-widest ${isActive ? "text-blue-700" : "text-gray-400"}`}
                  >
                    {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Card Content */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100 transition-all duration-500 transform">
          <div className="p-10 md:p-14">
            {step === 1 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
                <div className="text-center">
                  <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">
                    Checkout Details
                  </h2>
                  <p className="text-gray-400 font-medium">
                    Your spot is secured! Confirm your details to finalize.
                  </p>
                </div>

                <div className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100 flex justify-between items-center shadow-inner">
                  <div>
                    <p className="text-[10px] text-blue-600 font-black uppercase tracking-[0.2em] mb-1">
                      Item Reservation
                    </p>
                    <h3 className="text-2xl font-black text-gray-900 uppercase truncate">
                      {itemTitle}
                    </h3>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-blue-700 tracking-tighter">
                      ${Number(price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em]">
                    Validated Identity
                  </label>
                  <div className="w-full px-8 py-5 rounded-3xl bg-gray-50 border-2 border-gray-100 text-gray-600 font-bold text-lg">
                    {email}
                  </div>
                  <p className="mt-3 text-xs text-gray-400 italic text-center">
                    Identity locked to reservation.
                  </p>
                </div>

                <button
                  onClick={handleNextStep}
                  className="w-full py-5 px-8 rounded-3xl font-black bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 uppercase tracking-widest"
                >
                  Continue to Payment <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500">
                <div className="text-center">
                  <h2 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter">
                    Secure Payment
                  </h2>
                  <p className="text-gray-400 font-medium">
                    Atomic token will be consumed upon confirmation.
                  </p>
                </div>

                <div className="col-span-full bg-gray-50 p-10 rounded-[2rem] border-4 border-dashed border-gray-200 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <CreditCard className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-xs">
                    Standard Mock Provider
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    disabled={isSubmitting}
                    className="flex-1 py-5 px-8 rounded-3xl font-black text-gray-400 bg-gray-100 hover:bg-gray-200 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                    <ArrowLeft className="w-5 h-5" /> Back
                  </button>
                  <button
                    onClick={handlePayment}
                    disabled={isSubmitting}
                    className="flex-[2] py-5 px-8 rounded-3xl font-black bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-200 uppercase tracking-widest"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />{" "}
                        Finalizing...
                      </>
                    ) : (
                      <>
                        Authorize & Buy <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="text-center space-y-10 animate-in zoom-in duration-500">
                {isSubmitting ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="relative mb-8">
                      <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl animate-pulse"></div>
                      <Loader2 className="w-20 h-20 text-blue-600 animate-spin relative" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                      Finalizing Order
                    </h2>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">
                      Syncing with distributed queue...
                    </p>
                  </div>
                ) : pollError ? (
                  <div className="flex flex-col items-center py-10">
                    <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                      Processing Delayed
                    </h2>
                    <p className="text-red-500 font-bold">{pollError}</p>
                    <button
                      onClick={() => navigate("/")}
                      className="mt-8 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest"
                    >
                      Return Home
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center">
                      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-8 shadow-sm border-8 border-white ring-4 ring-green-50 animate-bounce">
                        <CheckCircle className="w-12 h-12" />
                      </div>
                      <h2 className="text-5xl font-black text-gray-900 mb-2 uppercase tracking-tighter">
                        Payment Success!
                      </h2>
                      <p className="text-gray-400 text-lg font-medium">
                        Your order{" "}
                        <span className="font-black text-blue-700">
                          #{orderId}
                        </span>{" "}
                        is confirmed.
                      </p>
                    </div>

                    <div className="py-6 border-t-2 border-dashed border-gray-100">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.3em] mb-2">
                        Reserved Item
                      </p>
                      <h4 className="text-2xl font-black text-gray-800 uppercase">
                        {itemTitle}
                      </h4>
                    </div>

                    <button
                      onClick={() => navigate("/")}
                      className="w-full py-5 px-8 rounded-3xl font-black bg-gray-900 text-white hover:bg-black transition-all shadow-2xl uppercase tracking-[0.2em]"
                    >
                      Continue Shopping
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
