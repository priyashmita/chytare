import { useEffect, useState } from "react";
import axios from "axios";
 "./AdminLayout";
import { API } from "@/App";
import { Plus, Edit, Trash2, Copy, Save, X, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MODULES = [
  { key: "dashboard",     label: "Dashboard",       actions: ["view"] },
  { key: "products",      label: "Products",         actions: ["view", "create", "edit", "delete"] },
  { key: "inventory",     label: "Inventory",        actions: ["view", "create", "edit", "export"] },
  { key: "enquiries",     label: "Enquiries",        actions: ["view", "create", "edit"] },
  { key: "orders",        label: "Orders",           actions: ["view", "create", "edit"] },
  { key: "raw_materials", label: "Raw Materials",    actions: ["view", "create", "edit"] },
  { key: "suppliers",     label: "Suppliers",        actions: ["view", "create", "edit"] },
  { key: "purchases",     label: "Purchases",        actions: ["view", "create", "edit"] },
  { key: "production",    label: "Production Jobs",  actions: ["view", "create", "edit"] },
  { key: "costing",       label: "Costing",          actions: ["view"] },
  { key: "users",         label: "Users",            actions: ["view", "create", "edit", "delete"] },
  { key: "roles",         label: "Roles",            actions: ["view", "create", "edit", "delete"] },
  { key: "settings",      label: "Settings",         actions: ["view", "edit"] },
];

const ACTION_LABELS = { view: "View", create: "Create", edit: "Edit", delete: "Delete", export: "Export" };

const emptyPermissions = () =>
  Object.fromEntries(MODULES.map(m => [m.key, Object.fromEntries(m.actions.map(a => [a, false]))]));

const PermissionMatrix = ({ permissions, onChange, readOnly = false }) => {
  const perms = permissions || emptyPermissions();

  const toggle = (module, action) => {
    if (readOnly) return;
    const updated = {
      ...perms,
      [module]: { ...perms[module], [action]: !perms[module]?.[action] }
    };
    onChange(updated);
  };

  const toggleModule = (module, actions) => {
    if (readOnly) return;
    const allOn = actions.every(a => perms[module]?.[a]);
    const updated = {
      ...perms,
      [module]: Object.fromEntries(actions.map(a => [a, !allOn]))
    };
    onChange(updated);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#DACBA0]/30">
            <th className="text-left py-3 pr-4 text-xs uppercase tracking-wider text-[#1B4D3E]/50 w-48">Module</th>
            {["view", "create", "edit", "delete", "export"].map(a => (
              <th key={a} className="text-center py-3 px-3 text-xs uppercase tracking-wider text-[#1B4D3E]/50 w-20">{ACTION_LABELS[a]}</th>
            ))}
            <th className="text-center py-3 px-3 text-xs uppercase tracking-wider text-[#1B4D3E]/50 w-20">All</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#DACBA0]/10">
          {MODULES.map(({ key, label, actions }) => (
            <tr key={key} className="hover:bg-[#FFFFF0]">
              <td className="py-3 pr-4 font-medium text-[#1B4D3E]">{label}</td>
              {["view", "create", "edit", "delete", "export"].map(action => (
                <td key={action} className="py-3 px-3 text-center">
                  {actions.includes(action) ? (
                    <button
                      type="button"
                      onClick={() => toggle(key, action)}
                      disabled={readOnly}
                      className={`w-5 h-5 rounded border-2 transition-colors mx-auto flex items-center justify-center ${
                        perms[key]?.[action]
                          ? "bg-[#1B4D3E] border-[#1B4D3E] text-white"
                          : "border-[#DACBA0] bg-white"
                      } ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#1B4D3E]"}`}
                    >
                      {perms[key]?.[action] && <span className="text-xs leading-none">✓</span>}
                    </button>
                  ) : (
                    <span className="text-[#DACBA0]/40 text-xs">—</span>
                  )}
                </td>
              ))}
              {/* All toggle */}
              <td className="py-3 px-3 text-center">
                <button
                  type="button"
                  onClick={() => toggleModule(key, actions)}
                  disabled={readOnly}
                  className={`text-xs px-2 py-1 border transition-colors ${
                    actions.every(a => perms[key]?.[a])
                      ? "border-[#1B4D3E] bg-[#1B4D3E] text-[#FFFFF0]"
                      : "border-[#DACBA0]/50 text-[#1B4D3E]/50 hover:border-[#1B4D3E]"
                  } ${readOnly ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                >
                  All
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const RoleCard = ({ role, onEdit, onDuplicate, onDelete, defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-white border border-[#DACBA0]/30">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setExpanded(!expanded)} className="text-[#1B4D3E]/40 hover:text-[#1B4D3E] transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div>
            <p className="font-medium text-[#1B4D3E]">{role.label}</p>
            <p className="text-xs text-[#1B4D3E]/40">{role.name}{role.is_system_role ? " · System Role" : ""}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(role)} className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors" title="Edit role">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDuplicate(role.id)} className="p-2 text-[#1B4D3E]/60 hover:text-[#1B4D3E] transition-colors" title="Duplicate role">
            <Copy className="w-4 h-4" />
          </button>
          {!role.is_system_role && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="p-2 text-[#C08081]/60 hover:text-[#C08081] transition-colors" title="Delete role">
                  <Trash2 className="w-4 h-4" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#FFFFF0]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-serif text-[#1B4D3E]">Delete Role</AlertDialogTitle>
                  <AlertDialogDescription>Delete "{role.label}"? This cannot be undone. Users assigned this role must be reassigned first.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(role.id)} className="bg-[#C08081] text-white">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-[#DACBA0]/20 p-4">
          <PermissionMatrix permissions={role.permissions} onChange={() => {}} readOnly={true} />
          <p className="text-xs text-[#1B4D3E]/40 mt-3">Click Edit ✏️ to modify permissions.</p>
        </div>
      )}
    </div>
  );
};

const RoleEditor = ({ role, onSave, onCancel }) => {
  const [form, setForm] = useState({
    name: role?.name || "",
    label: role?.label || "",
    permissions: role?.permissions || emptyPermissions(),
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (role?.id) {
        await axios.put(`${API}/admin/roles/${role.id}`, form);
        toast.success("Role updated");
      } else {
        await axios.post(`${API}/admin/roles`, form);
        toast.success("Role created");
      }
      onSave();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-[#1B4D3E] p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-serif text-xl text-[#1B4D3E]">{role?.id ? "Edit Role" : "New Role"}</h3>
        <button onClick={onCancel} className="p-1 text-[#1B4D3E]/40 hover:text-[#1B4D3E]"><X className="w-5 h-5" /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Role Label (shown to users) *</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} className="mt-2" placeholder="e.g. Inventory Manager" required />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60">Role Key (system identifier) *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
              className="mt-2 font-mono"
              placeholder="e.g. inventory_manager"
              required
              disabled={role?.is_system_role}
            />
            {role?.is_system_role && <p className="text-xs text-[#1B4D3E]/40 mt-1">System role keys cannot be changed.</p>}
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase tracking-wider text-[#1B4D3E]/60 mb-4 block">Permissions</Label>
          <PermissionMatrix
            permissions={form.permissions}
            onChange={(perms) => setForm({ ...form, permissions: perms })}
            readOnly={false}
          />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-luxury btn-luxury-primary flex items-center gap-2 disabled:opacity-50">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Role"}
          </button>
          <button type="button" onClick={onCancel} className="btn-luxury btn-luxury-secondary">Cancel</button>
        </div>
      </form>
    </div>
  );
};

const AdminRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState(null); // null = not editing, {} = new, role = edit
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => { fetchRoles(); }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/admin/roles`);
      setRoles(res.data);
    } catch {
      toast.error("Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (roleId) => {
    try {
      await axios.post(`${API}/admin/roles/${roleId}/duplicate`);
      toast.success("Role duplicated");
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to duplicate");
    }
  };

  const handleDelete = async (roleId) => {
    try {
      await axios.delete(`${API}/admin/roles/${roleId}`);
      toast.success("Role deleted");
      fetchRoles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete role");
    }
  };

  const handleInitRoles = async () => {
    try {
      const res = await axios.post(`${API}/admin/init-roles`);
      toast.success(res.data.message);
      fetchRoles();
    } catch {
      toast.error("Failed to initialise roles");
    }
  };

  return (
    
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl text-[#1B4D3E]">Roles & Permissions</h1>
            <p className="text-[#1B4D3E]/60 mt-1">{roles.length} roles configured</p>
          </div>
          <div className="flex items-center gap-3">
            {roles.length === 0 && (
              <button onClick={handleInitRoles} className="btn-luxury btn-luxury-secondary text-sm">
                Initialise Default Roles
              </button>
            )}
            <button
              onClick={() => { setEditingRole({}); setShowEditor(true); }}
              className="btn-luxury btn-luxury-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> New Role
            </button>
          </div>
        </div>

        {/* Editor */}
        {showEditor && (
          <div className="mb-6">
            <RoleEditor
              role={editingRole}
              onSave={() => { setShowEditor(false); setEditingRole(null); fetchRoles(); }}
              onCancel={() => { setShowEditor(false); setEditingRole(null); }}
            />
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-[#DACBA0]/10 animate-pulse" />)}</div>
        ) : roles.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#DACBA0]/30">
            <p className="text-[#1B4D3E]/60 mb-4">No roles yet. Click "Initialise Default Roles" to create the standard set.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roles.map(role => (
              <RoleCard
                key={role.id}
                role={role}
                onEdit={(r) => { setEditingRole(r); setShowEditor(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    
  );
};

export default AdminRoles;
