import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Copy } from "lucide-react";

const AdminUserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [tempPassword, setTempPassword] = useState(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role_id: "",
    account_status: "active",
    password: "",
  });

  useEffect(() => {
    fetchRoles();
    if (!isNew) fetchUser();
  }, [id]);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/admin/roles`);
      setRoles(res.data);
    } catch (err) {
      console.error("Failed to load roles", err);
    }
  };

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/admin/users/${id}`);
      const u = res.data;
      setForm({
        full_name: u.full_name || u.name || "",
        email: u.email || "",
        phone: u.phone || "",
        role_id: u.role_id || "",
        account_status: u.account_status || "active",
        password: "",
      });
    } catch {
      toast.error("User not found");
      navigate("/admin/users");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        const res = await axios.post(`${API}/admin/users`, {
          full_name: form.full_name,
          email: form.email,
          phone: form.phone || null,
          role_id: form.role_id,
          account_status: form.account_status,
          password: form.password || null,
        });
        if (res.data.temp_password) {
          setTempPassword(res.data.temp_password);
        } else {
          toast.success("User created");
          navigate("/admin/users");
        }
      } else {
        await axios.put(`${API}/admin/users/${id}`, {
          full_name: form.full_name,
          phone: form.phone || null,
          role_id: form.role_id,
          account_status: form.account_status,
        });
        toast.success("User updated");
        navigate("/admin/users");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-[#DACBA0]/20 w-1/3" /><div className="h-64 bg-[#DACBA0]/20" /></div>;
  }

  // Show temp password screen after creation
  if (tempPassword) {
    return (
      
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-16 h-16 bg-[#1B4D3E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">✅</span>
          </div>
          <h2 className="font-serif text-2xl text-[#1B4D3E] mb-2">User Created</h2>
          <p className="text-[#1B4D3E]/60 mb-8">Share this temporary password with the user. They must change it on first login.</p>
          <div className="bg-[#1B4D3E] text-[#FFFFF0] p-4 font-mono text-xl tracking-widest mb-4 flex items-center justify-between">
            <span>{tempPassword}</span>
            <button onClick={() => { navigator.clipboard.writeText(tempPassword); toast.success("Copied!"); }} className="ml-4 p-1 hover:text-[#DACBA0] transition-colors">
              <Copy className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-[#1B4D3E]/40 mb-8">This password is shown once only.</p>
          <button onClick={() => navigate("/admin/users")} className="btn-luxury btn-luxury-primary">Done — Back to Users</button>
        </div>
      
    );
  }

  return (
    
      <div className="max-w-xl">
        <div className="mb-8">
          <h1 className="font-serif text-3xl text-[#1B4D3E]">{isNew ? "Add User" : "Edit User"}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="bg-white border border-[#DACBA0]/30 p-6 space-y-5">
            <h2 className="font-serif text-lg text-[#1B4D3E]">User Details</h2>

            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-2" required />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Email Address *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-2" required disabled={!isNew} />
              {!isNew && <p className="text-xs text-[#1B4D3E]/40 mt-1">Email cannot be changed after creation.</p>}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-2" placeholder="+91 98765 43210" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Role *</Label>
              <Select value={form.role_id} onValueChange={(v) => setForm({ ...form, role_id: v })}>
                <SelectTrigger className="mt-2"><SelectValue placeholder="Select role..." /></SelectTrigger>
                <SelectContent>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Account Status</Label>
              <Select value={form.account_status} onValueChange={(v) => setForm({ ...form, account_status: v })}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isNew && (
              <div>
                <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Password (optional)</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-2" placeholder="Leave blank to auto-generate" />
                <p className="text-xs text-[#1B4D3E]/40 mt-1">If left blank, a temporary password is generated and shown once after creation.</p>
              </div>
            )}
          </section>

          <div className="flex items-center gap-4">
            <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary disabled:opacity-50">
              {saving ? "Saving..." : isNew ? "Create User" : "Save Changes"}
            </button>
            <button type="button" onClick={() => navigate("/admin/users")} className="btn-luxury btn-luxury-secondary">Cancel</button>
          </div>
        </form>
      </div>
    
  );
};

export default AdminUserEdit;
