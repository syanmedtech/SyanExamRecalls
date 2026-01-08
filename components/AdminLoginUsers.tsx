import React, { useState, useEffect, useMemo } from 'react';
import { 
  subscribeToLoginUsers, 
  setLoginUserBanState, 
  softDeleteLoginUser, 
  bulkUpdateLoginUsers 
} from '../services/firebaseService';
import { AppUser } from '../types';

const AdminLoginUsers: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "banned">("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [viewUser, setViewUser] = useState<AppUser | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToLoginUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchSearch = 
        u.fullName?.toLowerCase().includes(search.toLowerCase()) || 
        u.email?.toLowerCase().includes(search.toLowerCase()) || 
        u.whatsapp?.toLowerCase().includes(search.toLowerCase());
      
      const matchStatus = 
        statusFilter === "all" || 
        (statusFilter === "active" && !u.isBanned) || 
        (statusFilter === "banned" && u.isBanned);

      let matchDate = true;
      if (dateFilter !== "all" && u.createdAt) {
        const now = Date.now();
        const userTime = u.createdAt.toMillis ? u.createdAt.toMillis() : u.createdAt;
        const diff = now - userTime;
        if (dateFilter === "today") matchDate = diff < 24 * 60 * 60 * 1000;
        if (dateFilter === "week") matchDate = diff < 7 * 24 * 60 * 60 * 1000;
        if (dateFilter === "month") matchDate = diff < 30 * 24 * 60 * 60 * 1000;
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [users, search, statusFilter, dateFilter]);

  const toggleSelectAll = () => {
    if (selectedUids.size === filteredUsers.length) {
      setSelectedUids(new Set());
    } else {
      setSelectedUids(new Set(filteredUsers.map(u => u.uid)));
    }
  };

  const toggleSelect = (uid: string) => {
    const next = new Set(selectedUids);
    if (next.has(uid)) next.delete(uid);
    else next.add(uid);
    setSelectedUids(next);
  };

  const handleBulkAction = async (action: "ban" | "unban" | "delete") => {
    if (selectedUids.size === 0) return;
    // senior-engineer: Cast to string[] to resolve "Argument of type 'unknown[]' is not assignable to parameter of type 'string[]'"
    const uids = Array.from(selectedUids) as string[];
    if (!window.confirm(`Perform ${action} on ${uids.length} users?`)) return;

    setLoading(true);
    try {
      if (action === "ban") {
        await bulkUpdateLoginUsers(uids, { isBanned: true, bannedAt: new Date() as any });
      } else if (action === "unban") {
        await bulkUpdateLoginUsers(uids, { isBanned: false, bannedAt: null, bannedReason: null });
      } else if (action === "delete") {
        for (const uid of uids) await softDeleteLoginUser(uid);
      }
      setSelectedUids(new Set());
      alert("Bulk operation complete.");
    } catch (e) {
      alert("Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ["SR#", "Full Name", "Email", "WhatsApp", "Created At", "Status"];
    const rows = filteredUsers.map((u, i) => [
      i + 1,
      u.fullName || u.displayName,
      u.email,
      u.whatsapp || "N/A",
      u.createdAt?.toMillis ? new Date(u.createdAt.toMillis()).toLocaleString() : "N/A",
      u.isBanned ? "Banned" : "Active"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `login_users_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h3 className="text-xl font-black text-slate-800 tracking-tight">Login Users</h3>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input 
            type="text" 
            placeholder="Search name, email..." 
            className="px-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="banned">Banned Only</option>
          </select>
          <select 
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="bg-slate-50 border-none rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
          </select>
          {filteredUsers.length > 0 && (
            <button onClick={exportCSV} className="px-5 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-green-700 transition-colors">Export CSV</button>
          )}
        </div>
      </div>

      {selectedUids.size > 0 && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between animate-slide-down">
          <div className="text-sm font-bold text-blue-700">{selectedUids.size} Users Selected</div>
          <div className="flex gap-2">
            <button onClick={() => handleBulkAction("ban")} className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-200">Bulk Ban</button>
            <button onClick={() => handleBulkAction("unban")} className="px-4 py-2 bg-green-100 text-green-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-200">Bulk Unban</button>
            <button onClick={() => handleBulkAction("delete")} className="px-4 py-2 bg-red-100 text-red-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-200">Bulk Delete</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest">
            <tr>
              <th className="p-4 w-10">
                <input type="checkbox" checked={selectedUids.size === filteredUsers.length && filteredUsers.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded" />
              </th>
              <th className="p-4">Sr.</th>
              <th className="p-4">Full Name</th>
              <th className="p-4">Email</th>
              <th className="p-4">WhatsApp</th>
              <th className="p-4">Created</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="p-10 text-center animate-pulse text-slate-400">Loading Users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={8} className="p-10 text-center text-slate-400">No registered users found.</td></tr>
            ) : filteredUsers.map((u, i) => (
              <tr key={u.uid} className={`hover:bg-slate-50 transition-colors ${u.isBanned ? 'opacity-60 bg-slate-50' : ''}`}>
                <td className="p-4">
                  <input type="checkbox" checked={selectedUids.has(u.uid)} onChange={() => toggleSelect(u.uid)} className="w-4 h-4 rounded" />
                </td>
                <td className="p-4 text-slate-400 font-bold">#{i+1}</td>
                <td className="p-4 font-bold text-slate-800">{u.fullName || u.displayName}</td>
                <td className="p-4 font-medium text-slate-600">{u.email}</td>
                <td className="p-4 font-medium text-slate-600">{u.whatsapp || "N/A"}</td>
                <td className="p-4 text-[10px] font-bold text-slate-400 uppercase">
                  {u.createdAt?.toMillis ? new Date(u.createdAt.toMillis()).toLocaleString() : 'N/A'}
                </td>
                <td className="p-4">
                   <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase ${u.isBanned ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                     {u.isBanned ? 'Banned' : 'Active'}
                   </span>
                </td>
                <td className="p-4 text-right space-x-3">
                  <button onClick={() => setViewUser(u)} className="text-blue-600 hover:text-blue-800 font-bold text-[10px] uppercase tracking-widest">View</button>
                  <button 
                    onClick={() => {
                      if (u.isBanned) setLoginUserBanState(u.uid, false);
                      else {
                        const reason = window.prompt("Reason for ban (optional):");
                        setLoginUserBanState(u.uid, true, reason);
                      }
                    }} 
                    className={`${u.isBanned ? 'text-green-600 hover:text-green-800' : 'text-orange-600 hover:text-orange-800'} font-bold text-[10px] uppercase tracking-widest`}
                  >
                    {u.isBanned ? 'Unban' : 'Ban'}
                  </button>
                  <button onClick={() => { if(window.confirm("Soft delete this user? They will be banned and hidden.")) softDeleteLoginUser(u.uid); }} className="text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-widest">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* USER DETAIL MODAL */}
      {viewUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative animate-scale-up">
            <button onClick={() => setViewUser(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">✕</button>
            <div className="mb-8">
               <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-3xl font-bold mb-4">{viewUser.fullName?.charAt(0)}</div>
               <h3 className="text-2xl font-black text-slate-800 tracking-tight">{viewUser.fullName || viewUser.displayName}</h3>
               <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${viewUser.isBanned ? 'text-red-500' : 'text-green-500'}`}>{viewUser.isBanned ? 'Account Banned' : 'Account Active'}</p>
            </div>
            <div className="space-y-4 mb-8">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                  <p className="font-bold text-slate-700">{viewUser.email}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">WhatsApp Number</p>
                  <p className="font-bold text-slate-700">{viewUser.whatsapp || "Not provided"}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered On</p>
                  <p className="font-bold text-slate-700">{viewUser.createdAt?.toMillis ? new Date(viewUser.createdAt.toMillis()).toLocaleString() : 'N/A'}</p>
               </div>
               {viewUser.isBanned && (
                 <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                    <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Ban Info</p>
                    <p className="font-bold text-red-700">Banned on {viewUser.bannedAt?.toMillis ? new Date(viewUser.bannedAt.toMillis()).toLocaleString() : 'N/A'}</p>
                    {viewUser.bannedReason && <p className="text-xs text-red-600 mt-1 italic">Reason: {viewUser.bannedReason}</p>}
                 </div>
               )}
            </div>
            <div className="flex gap-2">
               <button onClick={() => { setLoginUserBanState(viewUser.uid, !viewUser.isBanned); setViewUser(null); }} className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${viewUser.isBanned ? 'bg-green-600 text-white shadow-green-100 shadow-xl' : 'bg-orange-600 text-white shadow-orange-100 shadow-xl'}`}>
                 {viewUser.isBanned ? 'Unban Account' : 'Ban Account'}
               </button>
               <button onClick={() => { if(window.confirm("Delete account?")) { softDeleteLoginUser(viewUser.uid); setViewUser(null); } }} className="px-6 py-4 bg-red-50 text-red-600 font-black text-xs uppercase tracking-widest rounded-2xl">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLoginUsers;