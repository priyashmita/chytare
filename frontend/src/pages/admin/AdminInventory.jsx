import { useEffect, useState } from "react";
import axios from "axios";
import { API } from "@/App";
import { AlertTriangle, Package } from "lucide-react";

const AdminInventory = () => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`);
      setInventory(res.data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
    }
  };

  const lowStockItems = inventory.filter((p) => p.low_stock);

  return (
    <div data-testid="admin-inventory">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#1B4D3E]">Inventory</h1>
        <p className="text-[#1B4D3E]/60 mt-1">Stock overview and alerts</p>
      </div>

      {lowStockItems.length > 0 && (
        <div className="bg-[#C08081]/10 border border-[#C08081]/30 p-4 mb-6 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C08081]" />
          <p className="text-sm text-[#1B4D3E]">
            <strong>{lowStockItems.length}</strong> item(s) have low stock (≤2 units)
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[#DACBA0]/10 animate-pulse" />
          ))}
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
          <Package className="w-12 h-12 text-[#DACBA0] mx-auto mb-4" />
          <p className="text-[#1B4D3E]/60">No products in inventory</p>
        </div>
      ) : (
        <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#1B4D3E]/5">
                <tr>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Product
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Collection
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Status
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Stock
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Price
                  </th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">
                    Sold
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DACBA0]/20">
                {inventory.map((item) => (
                  <tr
                    key={item.id}
                    className={`hover:bg-[#FFFFF0] ${item.low_stock ? "bg-[#C08081]/5" : ""}`}
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {item.low_stock && <AlertTriangle className="w-4 h-4 text-[#C08081]" />}
                        <div>
                          <p className="font-medium text-[#1B4D3E]">{item.name}</p>
                          <p className="text-xs text-[#1B4D3E]/50">{item.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E] capitalize">
                      {item.collection_type}
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-1 ${
                          item.stock_status === "in_stock"
                            ? "bg-[#1B4D3E]/10 text-[#1B4D3E]"
                            : item.stock_status === "made_to_order"
                            ? "bg-[#DACBA0]/20 text-[#1B4D3E]"
                            : "bg-[#C08081]/10 text-[#C08081]"
                        }`}
                      >
                        {item.stock_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-sm ${
                          item.low_stock ? "text-[#C08081] font-medium" : "text-[#1B4D3E]"
                        }`}
                      >
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E]">
                      {item.price_on_request ? (
                        <span className="text-[#DACBA0]">On Request</span>
                      ) : item.price ? (
                        `₹${item.price.toLocaleString("en-IN")}`
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-4 text-sm text-[#1B4D3E]">{item.units_sold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventory;
