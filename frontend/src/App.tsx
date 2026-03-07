import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import ItemsPage from './pages/items/ItemsPage';
import ItemForm from './pages/items/ItemForm';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
        <nav className="bg-white shadow">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex space-x-8">
                <div className="flex items-center">
                  <span className="font-bold text-xl text-blue-600">Flash Sale Admin</span>
                </div>
                <div className="hidden sm:flex sm:space-x-8 text-sm font-medium items-center text-gray-600">
                  <Link to="/items" className="hover:text-blue-600 px-3 py-2 rounded-md">Master Items</Link>
                  <Link to="/inventory" className="hover:text-blue-600 px-3 py-2 rounded-md">Inventory</Link>
                  <Link to="/flash-sales" className="hover:text-blue-600 px-3 py-2 rounded-md">Flash Sales</Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="py-6">
          <Routes>
            <Route path="/" element={<Navigate to="/items" replace />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/new" element={<ItemForm />} />
            <Route path="/items/:id/edit" element={<ItemForm />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
