import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import api from '../../lib/api';
import Navbar from '../../components/common/Navbar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Shield,
  Users,
  Briefcase,
  FileText,
  Activity,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [dashRes, usersRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
      ]);
      setStats(dashRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentActive) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, {
        is_active: !currentActive,
      });
      toast.success('User status updated!');
      fetchAdminData();
    } catch (err) {
      toast.error('Failed to update user status.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">System Administration & Health Console</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Platform telemetry, user role moderation, and aggregate recruitment analytics.
          </p>
        </motion.div>

        {/* System Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="p-6 rounded-2xl border border-border bg-card">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Total Users</span>
            <div className="text-3xl font-black font-mono mt-1 text-foreground">{stats?.total_users ?? 0}</div>
            <span className="text-xs text-muted-foreground mt-2 block">
              {stats?.total_students ?? 0} Students • {stats?.total_recruiters ?? 0} Recruiters
            </span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Resumes Evaluated</span>
            <div className="text-3xl font-black font-mono mt-1 text-primary">{stats?.total_ats_evaluations ?? 0}</div>
            <span className="text-xs text-muted-foreground mt-2 block">5-Pillar ATS scans performed</span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Published Jobs</span>
            <div className="text-3xl font-black font-mono mt-1 text-blue-500">{stats?.total_jobs_posted ?? 0}</div>
            <span className="text-xs text-muted-foreground mt-2 block">Active employer postings</span>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card">
            <span className="text-xs uppercase font-semibold text-muted-foreground">Total Applications</span>
            <div className="text-3xl font-black font-mono mt-1 text-emerald-500">{stats?.total_applications ?? 0}</div>
            <span className="text-xs text-muted-foreground mt-2 block">Submitted to pipelines</span>
          </div>
        </div>

        {/* Users Management Table */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight">Platform Users Directory</h2>
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 border-b border-border text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-4 font-semibold">User Name</th>
                      <th className="p-4 font-semibold">Email</th>
                      <th className="p-4 font-semibold">Role</th>
                      <th className="p-4 font-semibold">Organization</th>
                      <th className="p-4 font-semibold">Date Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4 font-bold text-foreground">{u.full_name}</td>
                        <td className="p-4 text-xs text-muted-foreground">{u.email}</td>
                        <td className="p-4">
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${
                              u.role === 'recruiter'
                                ? 'bg-blue-500/10 text-blue-500'
                                : u.role === 'admin'
                                ? 'bg-purple-500/10 text-purple-500'
                                : 'bg-muted text-foreground'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 text-xs text-muted-foreground">{u.company_name || '—'}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
