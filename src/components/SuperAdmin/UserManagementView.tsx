import React, { useState } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import { UserAccount, AccountRoleType, AccountStatus } from '../../types';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  ShieldCheck,
  GraduationCap,
  MoreVertical,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  Mail,
  Building,
  Phone,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const {
    users,
    createUser,
    updateUser,
    toggleUserStatus,
    resetUserPassword,
    deleteUser,
    auditLogs,
  } = useHelpdesk();

  const [roleFilter, setRoleFilter] = useState<'all' | AccountRoleType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AccountStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [viewingActivityUser, setViewingActivityUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // New User Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'receiver' as AccountRoleType,
    departmentOrOffice: 'Ground Floor, Window 2 (Receiver / Receiving Desk)',
    studentId: '',
    phoneNumber: '',
    status: 'active' as AccountStatus,
  });
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Remove all students: student accounts belong exclusively in Student Records
  const staffAndAdminUsers = users.filter((u) => u.role !== 'student');

  // Filtered staff and admin users
  const filteredUsers = staffAndAdminUsers.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchDept = u.departmentOrOffice.toLowerCase().includes(q);
      const matchPhone = u.phoneNumber?.toLowerCase().includes(q) || false;
      if (!matchName && !matchEmail && !matchDept && !matchPhone) return false;
    }
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('Please enter user full name.');
      return;
    }

    if (!formData.email.trim()) {
      setFormError('Please enter user email address.');
      return;
    }

    if (!formData.password || formData.password.trim().length < 8) {
      setFormError('Account login password is required and must be at least 8 characters long.');
      return;
    }

    if (formData.role === 'student') {
      if (!formData.studentId || !/^\d{8}$/.test(formData.studentId)) {
        setFormError('Student ID must be exactly 8 numeric digits (e.g. 20231492).');
        return;
      }
    }

    try {
      await createUser({
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password.trim(),
      role: formData.role,
      status: formData.status,
      departmentOrOffice: formData.departmentOrOffice.trim(),
      studentId: formData.role === 'student' ? formData.studentId.trim() : undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Unable to create this account.');
      return;
    }

    setShowCreateModal(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'registrar',
      departmentOrOffice: 'Office of the University Registrar',
      studentId: '',
      phoneNumber: '',
      status: 'active',
    });
    setNotificationMsg(`Successfully created account for ${formData.name}. User identity saved automatically.`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      departmentOrOffice: editingUser.departmentOrOffice,
      phoneNumber: editingUser.phoneNumber,
      });
    } catch (error) {
      setNotificationMsg(error instanceof Error ? error.message : 'Unable to update this account.');
      return;
    }

    setEditingUser(null);
    setNotificationMsg(`Account updated successfully for ${editingUser.name}`);
    setTimeout(() => setNotificationMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 tracking-tight">
              User Account Governance
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              {staffAndAdminUsers.length} Staff & Admin Accounts
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Provision, modify, deactivate, or audit registrar staff, evaluator, and administrator accounts. Student profiles are managed exclusively in Student Records.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl font-heading font-bold text-xs text-white bg-emerald-800 hover:bg-emerald-900 shadow-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision New Account</span>
        </button>
      </div>

      {notificationMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative w-full md:max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search staff by name, email, department, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl text-xs overflow-x-auto">
              <button
                onClick={() => setRoleFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'all' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                All Roles
              </button>
              <button
                onClick={() => setRoleFilter('receiver')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'receiver' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Receiver
              </button>
              <button
                onClick={() => setRoleFilter('records_management')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'records_management' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Records Mgmt
              </button>
              <button
                onClick={() => setRoleFilter('evaluator')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'evaluator' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Evaluator
              </button>
              <button
                onClick={() => setRoleFilter('registrar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'registrar' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Registrars
              </button>
              <button
                onClick={() => setRoleFilter('superadmin')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                  roleFilter === 'superadmin' ? 'bg-white text-emerald-900 shadow-2xs font-bold' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Super Admins
              </button>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 text-xs rounded-xl border border-stone-200 bg-stone-50 text-stone-700 outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive / Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Staff Identity</th>
                <th className="py-3 px-4">Role & Privilege</th>
                <th className="py-3 px-4">Department / Office</th>
                <th className="py-3 px-4">Office Contact / Phone</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500 text-xs">
                    No staff user accounts match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  let roleBadge = 'bg-stone-100 text-stone-800 border-stone-300';
                  if (u.role === 'superadmin') roleBadge = 'bg-stone-900 text-emerald-400 border-stone-800';
                  if (u.role === 'admin') roleBadge = 'bg-emerald-900 text-white border-emerald-900';
                  if (u.role === 'registrar') roleBadge = 'bg-emerald-100 text-emerald-900 border-emerald-300';
                  if (u.role === 'receiver') roleBadge = 'bg-teal-100 text-teal-900 border-teal-300';
                  if (u.role === 'records_management') roleBadge = 'bg-sky-100 text-sky-900 border-sky-300';
                  if (u.role === 'evaluator') roleBadge = 'bg-indigo-100 text-indigo-900 border-indigo-300';
                  if (u.role === 'staff') roleBadge = 'bg-blue-100 text-blue-900 border-blue-300';

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {u.profilePicture ? (
                            <img
                              src={u.profilePicture}
                              alt={u.name}
                              className="w-8 h-8 rounded-full object-cover shrink-0 border border-stone-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-900 font-bold flex items-center justify-center shrink-0">
                              {u.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-stone-900">{u.name}</p>
                            <p className="text-[11px] text-stone-500">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${roleBadge}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4 text-stone-700">
                        {u.departmentOrOffice}
                      </td>

                      {/* Phone / Office Contact */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className="text-stone-700">{u.phoneNumber || 'Window Desk'}</span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'active' ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      {/* Last Active */}
                      <td className="py-3 px-4 text-stone-500 text-[11px] font-mono">
                        {u.lastLogin}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Toggle Active / Deactivate */}
                          <button
                            onClick={async () => {
                              try { await toggleUserStatus(u.id); }
                              catch (error) { setNotificationMsg(error instanceof Error ? error.message : 'Unable to change account status.'); }
                            }}
                            title={u.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              u.status === 'active'
                                ? 'text-amber-700 hover:bg-amber-50 border-stone-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border-stone-200'
                            }`}
                          >
                            {u.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => setEditingUser(u)}
                            title="Edit user details"
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Activity */}
                          <button
                            onClick={() => setViewingActivityUser(u)}
                            title="View audit activity for user"
                            className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 border border-stone-200 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Account */}
                          {u.role !== 'superadmin' && (
                            <button
                              onClick={() => setUserToDelete(u)}
                              title="Permanently delete account (user will be barred from login)"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-800" />
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Provision New Account
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Full Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Atty. Cynthia Morales"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Email Address <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. cmorales@university.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Account Password <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Set login password for this account (min 8 characters)..."
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-3 pr-10 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showFormPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-stone-500 mt-1">
                  This password is used by the account owner to log into the portal.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    System Role <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-semibold text-stone-800"
                  >
                    <option value="receiver">Receiver / Receiving</option>
                    <option value="records_management">Records Management</option>
                    <option value="evaluator">Evaluator</option>
                    <option value="registrar">Registrar Officer</option>
                    <option value="superadmin">University Registrar (Executive)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +63 917 123 4567"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Department / Office Assignment
                </label>
                <input
                  type="text"
                  value={formData.departmentOrOffice}
                  onChange={(e) => setFormData({ ...formData, departmentOrOffice: e.target.value })}
                  placeholder="e.g. Window 3 - TOR Evaluator Section"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-heading font-bold text-base text-stone-900">
                Edit User: {editingUser.name}
              </h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  >
                    <option value="receiver">Receiver / Receiving</option>
                    <option value="records_management">Records Management</option>
                    <option value="evaluator">Evaluator</option>
                    <option value="registrar">Registrar Officer</option>
                    {editingUser.role === 'student' && <option value="student">Student</option>}
                    <option value="superadmin">University Registrar (Executive)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editingUser.phoneNumber || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Department / Office</label>
                <input
                  type="text"
                  value={editingUser.departmentOrOffice}
                  onChange={(e) => setEditingUser({ ...editingUser, departmentOrOffice: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW USER AUDIT ACTIVITY MODAL */}
      {viewingActivityUser && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  User Audit Trail: {viewingActivityUser.name}
                </h3>
                <p className="text-[11px] text-stone-500">{viewingActivityUser.email} • {viewingActivityUser.role}</p>
              </div>
              <button
                onClick={() => setViewingActivityUser(null)}
                className="text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto text-xs">
              {auditLogs.filter((l) => l.actorName?.includes(viewingActivityUser.name) || l.details?.includes(viewingActivityUser.name)).length === 0 ? (
                <p className="text-center py-6 text-stone-500">No specific audit entries recorded for this user yet.</p>
              ) : (
                auditLogs
                  .filter((l) => l.actorName?.includes(viewingActivityUser.name) || l.details?.includes(viewingActivityUser.name))
                  .map((log) => (
                    <div key={log.id} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 font-mono text-[11px]">{log.action}</span>
                        <span className="text-[10px] text-stone-500">{log.timestamp}</span>
                      </div>
                      <p className="text-stone-600 text-[11px]">{log.details}</p>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setViewingActivityUser(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-900 text-white text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-base text-stone-900">
                  Delete Staff Account
                </h3>
                <p className="text-xs text-stone-500">Permanent account removal</p>
              </div>
            </div>

            <p className="text-xs text-stone-700 leading-relaxed">
              Are you sure you want to permanently delete the staff account for{' '}
              <strong className="text-stone-900">{userToDelete.name}</strong> ({userToDelete.email})?
              Once deleted, this staff member will be removed from system assignments and permanently barred from logging into the portal.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await deleteUser(userToDelete.id);
                    setNotificationMsg(`Account for ${userToDelete.name} has been permanently deleted.`);
                    setUserToDelete(null);
                    setTimeout(() => setNotificationMsg(null), 4000);
                  } catch (error) {
                    setNotificationMsg(error instanceof Error ? error.message : 'Unable to delete this account.');
                  }
                }}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
