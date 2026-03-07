import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Package, BookOpen, MessageSquare, Users, TrendingUp, AlertTriangle } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    stories: 0,
    enquiries: 0,
    subscribers: 0,
    lowStock: 0,
  });
  const [recentEnquiries, setRecentEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [productsRes, storiesRes, enquiriesRes, subscribersRes, inventoryRes] = await Promise.all([
        axios.get(`${API}/products?include_hidden=true`),
        axios.get(`${API}/stories?published_only=false`),
        axios.get(`${API}/enquiries`),
        axios.get(`${API}/newsletter/subscribers`),
        axios.get(`${API}/inventory`),
      ]);

      setStats({
        products: productsRes.data.length,
        stories: storiesRes.data.length,
        enquiries: enquiriesRes.data.length,
        subscribers: subscribersRes.data.filter(s => s.is_active).length,
        lowStock: inventoryRes.data.filter(p => p.low_stock).length,
      });

      setRecentEnquiries(enquiriesRes.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: "Products", value: stats.products, icon: Package, link: "/admin/products", color: "bg-[#1B4D3E]" },
    { label: "Stories", value: stats.stories, icon: BookOpen, link: "/admin/stories", color: "bg-[#DACBA0]" },
    { label: "Enquiries", value: stats.enquiries, icon: MessageSquare, link: "/admin/enquiries", color: "bg-[#C08081]" },
    { label: "Subscribers", value: stats.subscribers, icon: Users, link: "/admin/settings", color: "bg-[#1B4D3E]" },
  ];

  return (
    <AdminLayout>
      <div data-testid="admin-dashboard">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">Dashboard</h1>
          <p className="text-[#1B4D3E]/60 mt-1">Welcome to Chytare Admin</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => (
            <Link
              key={stat.label}
              to={stat.link}
              className="block p-6 bg-white border border-[#DACBA0]/30 hover:border-[#DACBA0] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${stat.color} flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                {stat.label === "Products" && stats.lowStock > 0 && (
                  <span className="flex items-center gap-1 text-xs text-[#C08081]">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.lowStock} low stock
                  </span>
                )}
              </div>
              <p className="text-3xl font-serif text-[#1B4D3E]">{stat.value}</p>
              <p className="text-sm text-[#1B4D3E]/60">{stat.label}</p>
            </Link>
          ))}
        </div>

        {/* Recent Enquiries */}
        <div className="bg-white border border-[#DACBA0]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-xl text-[#1B4D3E]">Recent Enquiries</h2>
            <Link
              to="/admin/enquiries"
              className="text-xs uppercase tracking-wider text-[#1B4D3E] hover:text-[#DACBA0] transition-colors"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-[#DACBA0]/10 animate-pulse" />
              ))}
            </div>
          ) : recentEnquiries.length === 0 ? (
            <p className="text-[#1B4D3E]/60 text-center py-8">No enquiries yet</p>
          ) : (
            <div className="space-y-4">
              {recentEnquiries.map((enquiry) => (
                <div
                  key={enquiry.id}
                  className="flex items-start justify-between p-4 bg-[#FFFFF0] border border-[#DACBA0]/20"
                >
                  <div>
                    <p className="font-medium text-[#1B4D3E]">{enquiry.name}</p>
                    <p className="text-sm text-[#1B4D3E]/60">{enquiry.email}</p>
                    <p className="text-sm text-[#1B4D3E]/80 mt-1 line-clamp-1">
                      {enquiry.message}
                    </p>
                  </div>
                  <span className={`text-xs uppercase px-2 py-1 ${
                    enquiry.status === "new"
                      ? "bg-[#DACBA0]/20 text-[#1B4D3E]"
                      : "bg-[#1B4D3E]/10 text-[#1B4D3E]/60"
                  }`}>
                    {enquiry.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/admin/products/new"
            data-testid="quick-add-product"
            className="p-4 text-center border border-[#1B4D3E] text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors"
          >
            + Add New Product
          </Link>
          <Link
            to="/admin/stories/new"
            data-testid="quick-add-story"
            className="p-4 text-center border border-[#1B4D3E] text-[#1B4D3E] hover:bg-[#1B4D3E] hover:text-[#FFFFF0] transition-colors"
          >
            + Add New Story
          </Link>
          <Link
            to="/"
            target="_blank"
            className="p-4 text-center border border-[#DACBA0] text-[#1B4D3E] hover:bg-[#DACBA0] transition-colors"
          >
            View Live Site →
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
