import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import "./App.css";
import AdminLayout from "./components/admin/AdminLayout";
import FlashSaleForm from "./pages/admin/flash-sales/FlashSaleForm";
import FlashSalesPage from "./pages/admin/flash-sales/FlashSalesPage";
import InventoryForm from "./pages/admin/inventory/InventoryForm";
import InventoryPage from "./pages/admin/inventory/InventoryPage";
import ItemForm from "./pages/admin/items/ItemForm";
import ItemsPage from "./pages/admin/items/ItemsPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import FlashSalesList from "./pages/customer/FlashSalesList";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FlashSalesList />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="items" replace />} />

          <Route path="items" element={<ItemsPage />} />
          <Route path="items/new" element={<ItemForm />} />
          <Route path="items/:id/edit" element={<ItemForm />} />

          <Route path="inventory" element={<InventoryPage />} />
          <Route path="inventory/new" element={<InventoryForm />} />
          <Route path="inventory/:id/edit" element={<InventoryForm />} />

          <Route path="flash-sales" element={<FlashSalesPage />} />
          <Route path="flash-sales/new" element={<FlashSaleForm />} />
          <Route path="flash-sales/:id/edit" element={<FlashSaleForm />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
