import { useEffect, useState } from "react";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Mail, Phone, Package } from "lucide-react";

const AdminEnquiries = () => {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const typeLabels = {
    general: "General",
    product: "Product",
    wearable_whispers: "Wearable Whispers",
    private_viewing: "Private Viewing",
  };

  useEffect(() => {
    fetchEnquiries();
  }, []);

  const fetchEnquiries = async () => {
    try {
      const res = await axios.get(`${API}/enquiries`);
      setEnquiries(res.data);
    } catch (error) {
      console.error("Error fetching enquiries:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (enquiryId, status) => {
    try {
      await axios.put(`${API}/enquiries/${enquiryId}/status?status=${status}`);
      toast.success("Status updated");
      fetchEnquiries();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const filteredEnquiries = filter === "all"
    ? enquiries
    : enquiries.filter(e => e.status === filter);

  return (
    <AdminLayout>
      <div data-testid="admin-enquiries">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Enquiries</h1>
            <p className="text-[#1B4D3E]/60 mt-1">{enquiries.length} total enquiries</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6 border-b border-[#DACBA0]/30 pb-4">
          {["all", "new", "in_progress", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs uppercase tracking-wider transition-colors ${
                filter === f ? "text-[#1B4D3E]" : "text-[#1B4D3E]/50 hover:text-[#DACBA0]"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
              {f !== "all" && (
                <span className="ml-2 text-[10px] bg-[#DACBA0]/20 px-2 py-0.5 rounded-full">
                  {enquiries.filter(e => e.status === f).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Enquiries List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-[#DACBA0]/10 animate-pulse" />
            ))}
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
            <MessageSquare className="w-12 h-12 text-[#DACBA0] mx-auto mb-4" />
            <p className="text-[#1B4D3E]/60">No enquiries found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEnquiries.map((enquiry) => (
              <div
                key={enquiry.id}
                className="bg-white border border-[#DACBA0]/30 p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-[#1B4D3E]">{enquiry.name}</h3>
                      <span className={`text-xs px-2 py-0.5 ${
                        enquiry.status === "new"
                          ? "bg-[#DACBA0]/20 text-[#1B4D3E]"
                          : enquiry.status === "in_progress"
                          ? "bg-[#FFD700]/20 text-[#1B4D3E]"
                          : "bg-[#1B4D3E]/10 text-[#1B4D3E]/60"
                      }`}>
                        {enquiry.status.replace("_", " ")}
                      </span>
                      <span className="text-xs text-[#1B4D3E]/50">
                        {typeLabels[enquiry.enquiry_type]}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-[#1B4D3E]/70 mb-3">
                      <a href={`mailto:${enquiry.email}`} className="flex items-center gap-1 hover:text-[#DACBA0]">
                        <Mail className="w-4 h-4" />
                        {enquiry.email}
                      </a>
                      {enquiry.phone && (
                        <a href={`tel:${enquiry.phone}`} className="flex items-center gap-1 hover:text-[#DACBA0]">
                          <Phone className="w-4 h-4" />
                          {enquiry.phone}
                        </a>
                      )}
                      {enquiry.product_id && (
                        <span className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          Product enquiry
                        </span>
                      )}
                    </div>

                    <p className="text-[#1B4D3E]/80 whitespace-pre-wrap">{enquiry.message}</p>
                    
                    <p className="text-xs text-[#1B4D3E]/50 mt-3">
                      {new Date(enquiry.created_at).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={enquiry.status}
                      onValueChange={(v) => updateStatus(enquiry.id, v)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminEnquiries;
