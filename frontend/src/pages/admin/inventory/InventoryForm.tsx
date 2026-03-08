import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createInventory,
  getInventoryById,
  updateInventory,
} from "../../../services/inventoryService";
import type { Item } from "../../../services/itemsService";
import { fetchItemsData } from "../../../services/itemsService";

const InventoryForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [items, setItems] = useState<Item[]>([]);
  const [formData, setFormData] = useState({
    itemId: "",
    totalStock: 0,
    availableStock: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const itemsData = await fetchItemsData();
        setItems(itemsData);

        if (isEditing) {
          const inv = await getInventoryById(Number(id));
          setFormData({
            itemId: String(inv.item?.id || ""),
            totalStock: inv.totalStock,
            availableStock: inv.availableStock,
          });
        }
      } catch (error) {
        console.error("Failed to load form data", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "itemId" ? value : Number(value) || 0,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) return alert("Select an item!");

    const payload = {
      itemId: Number(formData.itemId),
      totalStock: formData.totalStock,
      availableStock: formData.availableStock,
    };

    try {
      if (isEditing) {
        await updateInventory(Number(id), payload);
      } else {
        await createInventory(payload);
      }
      navigate("/admin/inventory");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    }
  };

  if (loading) return <div>Loading form...</div>;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? "Edit Inventory" : "Add Inventory"}
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow border text-left"
      >
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Item
          </label>
          <select
            name="itemId"
            value={formData.itemId}
            onChange={handleChange}
            className="shadow border rounded w-full py-2 px-3 text-gray-700 focus:outline-none"
            required
            disabled={isEditing}
          >
            <option value="">-- Select an Item --</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title} (SKU: {item.sku})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Total Stock
          </label>
          <input
            type="number"
            name="totalStock"
            value={formData.totalStock}
            onChange={handleChange}
            min="0"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Available Stock
          </label>
          <input
            type="number"
            name="availableStock"
            value={formData.availableStock}
            onChange={handleChange}
            min="0"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/inventory")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;
