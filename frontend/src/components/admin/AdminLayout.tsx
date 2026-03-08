import { Box, Clock, List, Menu, X } from "lucide-react";
import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";

const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: "Master Items", path: "/admin/items", icon: <Box size={20} /> },
    { name: "Inventory", path: "/admin/inventory", icon: <List size={20} /> },
    {
      name: "Flash Sales",
      path: "/admin/flash-sales",
      icon: <Clock size={20} />,
    },
  ];

  const inactiveLinkClasses =
    "flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors rounded-lg";
  const activeLinkClasses =
    "flex items-center gap-3 px-4 py-3 text-white bg-blue-600 shadow-md font-medium rounded-lg";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-gray-900 text-white flex justify-between items-center p-4">
        <span className="font-bold text-xl tracking-wide">
          Flash Sale Admin
        </span>
        <button
          onClick={() => setSidebarOpen(true)}
          className="text-gray-300 hover:text-white"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-6 mb-4">
          <span className="font-bold text-2xl tracking-wide">Admin Panel</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="px-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={isActive ? activeLinkClasses : inactiveLinkClasses}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 w-full min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
