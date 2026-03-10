import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Layers,
  Loader2,
  MousePointerClick,
  Play,
  Plus,
  Search,
  Terminal as TerminalIcon,
  Trash2,
  Users,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import api from "../../api/axios";
import {
  apiUrlFlashSales,
  createFlashSale,
  type FlashSale,
} from "../../services/flashSaleService";
import { fetchItemsData, type Item } from "../../services/itemsService";
import { checkout } from "../../services/orderService";

interface SimulationLog {
  id: string;
  timestamp: string;
  email: string;
  status: "success" | "error";
  message: string;
}

const ConcurrencyTestPage: React.FC = () => {
  // Data State
  const [flashSales, setFlashSales] = useState<FlashSale[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);
  const [isQuickCreate, setIsQuickCreate] = useState(false);
  const [newItemId, setNewItemId] = useState("");
  const [newStock, setNewStock] = useState(10);

  // Simulation State
  const [simCount, setSimCount] = useState(50);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simMode, setSimMode] = useState<"distributed" | "burst">(
    "distributed",
  );
  const [logs, setLogs] = useState<SimulationLog[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Stats
  const [stats, setStats] = useState({ success: 0, failed: 0 });
  const [rps, setRps] = useState(0);
  const logSize = 500;

  const loadInitialData = async () => {
    try {
      const [salesRes, itemsData] = await Promise.all([
        api.get(`${apiUrlFlashSales}/public/list`),
        fetchItemsData(),
      ]);
      setFlashSales(salesRes.data);
      setItems(itemsData);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCreateQuickSale = async () => {
    if (!newItemId) return alert("Select an item first");
    setLoading(true);
    try {
      const start = new Date();
      const end = new Date(start.getTime() + 30 * 60000); // 30 mins from now

      const payload = {
        name: `Sim Test ${start.toLocaleTimeString()}`,
        itemId: Number(newItemId),
        allocatedStock: newStock,
        availableStock: newStock,
        maxPurchaseQty: 1,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isActive: true,
      };

      const created = await createFlashSale(payload);
      setFlashSales((prev) => [created, ...prev]);
      setSelectedSaleId(created.id);
      setIsQuickCreate(false);
    } catch (err) {
      console.error(err);
      alert("Failed to create quick sale");
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!selectedSaleId) return alert("Select a sale first");

    setIsSimulating(true);
    setLogs([]);
    setStats({ success: 0, failed: 0 });

    const attempts = Array.from({ length: simCount });
    const startTime = Date.now();

    const tasks = attempts.map(async (_, i) => {
      const email =
        simMode === "distributed"
          ? `user_${i}_${startTime}@test.com`
          : `burst_user_${startTime}@test.com`;

      const logId = Math.random().toString(36).substr(2, 9);

      try {
        await checkout(selectedSaleId, email);
        const newLog: SimulationLog = {
          id: logId,
          timestamp: new Date().toLocaleTimeString(),
          email,
          status: "success",
          message: "Spot Secured",
        };
        setLogs((prev) => [...prev.slice(-logSize), newLog]);
        setStats((prev) => ({ ...prev, success: prev.success + 1 }));
      } catch (err: any) {
        const newLog: SimulationLog = {
          id: logId,
          timestamp: new Date().toLocaleTimeString(),
          email,
          status: "error",
          message: err.response?.data?.message || "Failed",
        };
        setLogs((prev) => [...prev.slice(-logSize), newLog]);
        setStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
      }
    });

    await Promise.all(tasks);
    const endTime = Date.now();
    const durationSeconds = (endTime - startTime) / 1000;
    setRps(Math.round(simCount / (durationSeconds || 1)));
    setIsSimulating(false);
    loadInitialData(); // Refresh list to see stock updates
  };

  if (loading)
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-8">
        <Zap className="w-12 h-12 text-blue-500 animate-pulse mb-4" />
        <span className="font-black uppercase tracking-[0.3em] text-xs">
          Initializing Simulation Environment...
        </span>
      </div>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/40">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase tracking-tighter text-white">
                Concurrency <span className="text-blue-500">Lab</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Stress Test Environment v1.0
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Server Status
              </span>
              <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>{" "}
                Operational
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config */}
        <div className="lg:col-span-4 space-y-6">
          {/* Section 1: Sale Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-500" /> Target Selection
              </h2>
              <button
                onClick={() => setIsQuickCreate(!isQuickCreate)}
                className={`p-2 rounded-xl transition-all ${isQuickCreate ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"}`}
              >
                {isQuickCreate ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
              </button>
            </div>

            {isQuickCreate ? (
              <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">
                    Item to Sample
                  </label>
                  <select
                    value={newItemId}
                    onChange={(e) => setNewItemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="">Select Prototype</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">
                    Allocated Units
                  </label>
                  <input
                    type="number"
                    value={newStock}
                    onChange={(e) => setNewStock(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handleCreateQuickSale}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20"
                >
                  Deploy Live Instance
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {flashSales.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4 border-2 border-dashed border-slate-800 rounded-2xl">
                    No active instances found.
                  </p>
                ) : (
                  flashSales.map((fs) => (
                    <button
                      key={fs.id}
                      onClick={() => setSelectedSaleId(fs.id)}
                      className={`w-full p-4 rounded-2xl border transition-all text-left group
                          ${selectedSaleId === fs.id ? "bg-blue-600/10 border-blue-500" : "bg-slate-950/50 border-slate-800 hover:border-slate-700"}`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span
                          className={`text-xs font-black uppercase tracking-tight ${selectedSaleId === fs.id ? "text-blue-400" : "text-slate-300"}`}
                        >
                          {fs.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          #{fs.id}
                        </span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500 truncate mb-2">
                        {fs.item?.title}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <Activity className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] font-black text-slate-400">
                            {fs.availableStock} / {fs.allocatedStock}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Section 2: Simulator Config */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" /> Execution Parameters
            </h2>

            <div>
              <label className="text-[10px] font-black uppercase text-slate-500 mb-4 block">
                Simulation Mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSimMode("distributed")}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2
                        ${simMode === "distributed" ? "bg-indigo-600/10 border-indigo-500" : "bg-slate-950 border-slate-800 opacity-50"}`}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Distributed
                  </span>
                </button>
                <button
                  onClick={() => setSimMode("burst")}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2
                        ${simMode === "burst" ? "bg-orange-600/10 border-orange-500" : "bg-slate-950 border-slate-800 opacity-50"}`}
                >
                  <MousePointerClick className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    Burst Mode
                  </span>
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-end mb-3">
                <label className="text-[10px] font-black uppercase text-slate-500">
                  Concurrency Ceiling
                </label>
                <span className="text-xl font-black text-blue-400 tracking-tighter">
                  {simCount}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10000"
                value={simCount}
                onChange={(e) => setSimCount(Number(e.target.value))}
                className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                <span>Low Load</span>
                <span>High Load</span>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={isSimulating || !selectedSaleId}
              className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-xl
                   ${
                     isSimulating || !selectedSaleId
                       ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                       : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] active:scale-95 shadow-blue-900/30"
                   }`}
            >
              {isSimulating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              <span>Initiate Sequence</span>
            </button>
          </div>
        </div>

        {/* Right Column: Console & Dash */}
        <div className="lg:col-span-8 flex flex-col h-[700px]">
          {/* Section 1: Dashboard Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                Successful Jobs
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-emerald-400 tracking-tighter">
                  {stats.success}
                </span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                Request Failures
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-rose-400 tracking-tighter">
                  {stats.failed}
                </span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">
                Requests per second
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-blue-400 tracking-tighter">
                  {rps}
                </span>
                <span className="text-[10px] font-black text-blue-500 uppercase">
                  req/s
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Terminal Output */}
          <div className="bg-slate-950 border border-slate-800 rounded-[2rem] flex-1 flex flex-col overflow-hidden shadow-2xl relative">
            <div className="bg-slate-900/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TerminalIcon className="w-4 h-4 text-slate-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Live Execution Trace
                </span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 p-6 overflow-y-auto space-y-2 font-mono scrollbar-hide text-[11px]"
            >
              {logs.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                  <Search className="w-12 h-12 mb-4" />
                  <p className="font-bold uppercase tracking-widest text-xs">
                    Waiting for sequence trigger...
                  </p>
                </div>
              )}
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex gap-4 group animate-in slide-in-from-left-2 duration-200"
                >
                  <span className="text-slate-600">[{log.timestamp}]</span>
                  <span className="text-blue-500 font-bold shrink-0">
                    {log.email.split("@")[0]}
                  </span>
                  <span
                    className={`font-black uppercase tracking-tight shrink-0 ${log.status === "success" ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    [{log.status}]
                  </span>
                  <span className="text-slate-400 border-l border-slate-800 pl-4">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>

            {isSimulating && (
              <div className="absolute bottom-4 right-6 bg-blue-600 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] animate-bounce shadow-lg shadow-blue-900">
                Executing Cluster...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConcurrencyTestPage;
