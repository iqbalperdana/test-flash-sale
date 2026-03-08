import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  createFlashSale,
  getFlashSaleById,
  updateFlashSale,
} from "../../../services/flashSaleService";
import type { Item } from "../../../services/itemsService";
import { fetchItemsData } from "../../../services/itemsService";

const FlashSaleForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [items, setItems] = useState<Item[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    startTime: "",
    endTime: "",
    allocatedStock: 0,
    availableStock: 0,
    maxPurchaseQty: 1,
    isActive: true,
    itemId: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const toLocalDateTimeString = (date: Date) => {
      const pad = (num: number) => String(num).padStart(2, "0");
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1);
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const init = async () => {
      try {
        const itemsData = await fetchItemsData();
        setItems(itemsData);

        if (isEditing) {
          const fs = await getFlashSaleById(Number(id));
          setFormData({
            name: fs.name,
            startTime: fs.startTime
              ? toLocalDateTimeString(new Date(fs.startTime))
              : "",
            endTime: fs.endTime
              ? toLocalDateTimeString(new Date(fs.endTime))
              : "",
            allocatedStock: fs.allocatedStock,
            availableStock: fs.availableStock,
            maxPurchaseQty: fs.maxPurchaseQty,
            isActive: fs.isActive,
            itemId: String(fs.item?.id || ""),
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
    const { name, value, type } = e.target;
    let finalValue: any = value;
    if (type === "number") finalValue = Number(value) || 0;
    if (type === "checkbox")
      finalValue = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: finalValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.itemId) return alert("Select an item!");

    const payload = {
      ...formData,
      itemId: Number(formData.itemId),
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
    };

    try {
      if (isEditing) {
        await updateFlashSale(Number(id), payload);
      } else {
        await createFlashSale(payload);
      }
      navigate("/admin/flash-sales");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    }
  };

  if (loading) return <div>Loading form...</div>;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? "Edit Flash Sale" : "New Flash Sale"}
      </h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded shadow border text-left"
      >
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Campaign Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
            required
          />
        </div>

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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Start Time
            </label>
            <input
              type="datetime-local"
              name="startTime"
              value={formData.startTime}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              End Time
            </label>
            <input
              type="datetime-local"
              name="endTime"
              value={formData.endTime}
              onChange={handleChange}
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Allocated Stock
            </label>
            <input
              type="number"
              name="allocatedStock"
              value={formData.allocatedStock}
              onChange={handleChange}
              min="0"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              required
            />
          </div>
          <div>
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
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Max Qty/User
            </label>
            <input
              type="number"
              name="maxPurchaseQty"
              value={formData.maxPurchaseQty}
              onChange={handleChange}
              min="1"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
              required
            />
          </div>
        </div>

        <div className="mb-6 flex items-center">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="mr-2 leading-tight h-5 w-5"
          />
          <label className="text-gray-700 text-sm font-bold">
            Campaign is Active
          </label>
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/flash-sales")}
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

export default FlashSaleForm;
