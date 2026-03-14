import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import AdminLayout from "./AdminLayout";
import { API } from "@/App";
import { Plus, Edit, UserX, UserCheck, Key, Search } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_COLORS = {
  active: "text-emerald-700 bg-emerald-50",
  inactive: "text-red-600 bg-red-50",
  suspended: "text-amber-600 bg-amber-50",
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/admin/users`);
      setUsers(res.data);
    } catch (err) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (userId) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/disable`);
      toast.success("User disabled");
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to disable user");
    }
  };

  const handleEnable = async (userId) => {
    try {
      await axios.post(`${API}/admin/users/${userId}/enable`);
      toast.success("User enabled");
      fetchUsers();
    } catch (err) {
      toast.error("Failed to enable user");
    }
  };

  const handleResetPassword = async (userId, userName) => {
    try {
      const res = await axios.post(`${API}/admin/users/${userId}/reset-password`);
      toast.success(`Temporary password for ${userName}: ${res.data.temp_password}`, { duration: 10000 });
    } catch (err) {
      toast.error("Failed to reset password");
    }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role_info?.label?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Users</h1>
            <p className="text-[#1B4D3E]/60 mt-1">{users.length} total users</p>
          </div>
          <Link to="/admin/users/new" className="btn-luxury btn-luxury-primary flex items-center gap-2 w-fit">
            <Plus className="w-4 h-4" /> Add User
          </Link>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1B4D3E]/30" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-[#DACBA0]/10 animate-pulse" />)}</div>
        ) : (
          <div className="bg-white border border-[#DACBA0]/30 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1B4D3E]/5">
                <tr>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">User</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Role</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Status</th>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Last Login</th>
                  <th className="text-right p-4 text-xs uppercase tracking-wider text-[#1B4D3E]/60">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DACBA0]/20">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FFFFF0]">
                    <td className="p-4">
                      <p className="font-medium text-[#1B4D3E]">{u.full_name || u.name}</p>
                      <p className="text-xs text-[#1B4D3E]/50">{u.email}</p>
                      {u.phone && <p className="text-xs text-[#1B4D3E]/40">{u.phone}</p>}
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-[#1B4D3E]">{u.role_info?.label || u.role || "—"}</span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[u.account_status] || STATUS_COLORS.active}`}>
                        {u.account_status || "active"}
                      </span>
                      {u.must_change_password && (
                        <span className="ml-2 text-xs text-amber-600">⚠ Must reset password</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="text-xs text-[#1B4D3E]/50">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Never"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/admin/users/${u.id}`} className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors" title="Edit user">
                          <Edit className="w-4 h-4" />
                        </Link>

                        {/* Reset password */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors" title="Reset password">
                              <Key className="w-4 h-4" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#FFFFF0]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-serif text-[#1B4D3E]">Reset Password</AlertDialogTitle>
                              <AlertDialogDescription>Generate a temporary password for {u.full_name || u.name}? They will need to change it on next login.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleResetPassword(u.id, u.full_name || u.name)} className="bg-[#1B4D3E] text-white">Reset</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        {/* Disable / Enable */}
                        {(u.account_status || "active") === "active" ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="p-2 text-[#C08081]/60 hover:text-[#C08081] transition-colors" title="Disable user">
                                <UserX className="w-4 h-4" />
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#FFFFF0]">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="font-serif text-[#1B4D3E]">Disable User</AlertDialogTitle>
                                <AlertDialogDescription>Disable {u.full_name || u.name}? They will not be able to log in.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDisable(u.id)} className="bg-[#C08081] text-white">Disable</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : (
                          <button onClick={() => handleEnable(u.id)} className="p-2 text-emerald-600/60 hover:text-emerald-600 transition-colors" title="Enable user">
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-12 text-[#1B4D3E]/50">No users found</div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
