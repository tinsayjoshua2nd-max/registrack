import React, { useState, useRef } from 'react';
import { useHelpdesk } from '../../context/HelpdeskContext';
import {
  X,
  Camera,
  Upload,
  Trash2,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  GraduationCap,
  Building,
  Mail,
  Sparkles,
  Phone,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Academic preset avatars
const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    role,
    currentStudent,
    changeCurrentAccountPassword,
    updateCurrentProfilePicture,
  } = useHelpdesk();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active sub-tab: 'profile' | 'security'
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Password form state
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  if (!isOpen) return null;

  const displayName =
    role === 'student'
      ? currentStudent.name
      : currentUser?.name || 'Registrar User';

  const displayEmail =
    role === 'student'
      ? currentStudent.email
      : currentUser?.email || 'user@registrar.edu';

  const displayId =
    role === 'student'
      ? currentStudent.studentId
      : currentUser?.studentId;

  const roleLabel =
    role === 'superadmin'
      ? 'Super Administrator'
      : role === 'admin'
      ? 'Registrar Officer'
      : 'Student';

  // Handle image file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert('Image file size must be under 3 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      updateCurrentProfilePicture(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSelectPreset = (url: string) => {
    updateCurrentProfilePicture(url);
  };

  const handleRemovePhoto = () => {
    updateCurrentProfilePicture('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPasswordInput.length < 8) {
      setPasswordStatus({
        type: 'error',
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordStatus({
        type: 'error',
        message: 'New password and confirmation password do not match.',
      });
      return;
    }

    const res = await changeCurrentAccountPassword(newPasswordInput, currentPasswordInput);
    if (res.success) {
      setPasswordStatus({
        type: 'success',
        message: 'Password updated successfully! You can now use your new password for all subsequent logins.',
      });
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } else {
      setPasswordStatus({
        type: 'error',
        message: res.error || 'Failed to update password.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-emerald-900 flex items-center justify-center font-bold shadow-md">
              {role === 'student' ? (
                <GraduationCap className="w-6 h-6 text-emerald-800" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-800" />
              )}
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-lg text-white">
                My Account Profile & Security
              </h2>
              <p className="text-xs text-emerald-200">
                Manage your avatar photo, account identity, and login credentials
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-5 pt-3 border-t border-emerald-700/60">
            <button
              onClick={() => {
                setActiveTab('profile');
                setPasswordStatus(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Avatar</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('security');
                setPasswordStatus(null);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'security'
                  ? 'bg-white text-emerald-950 shadow-xs'
                  : 'text-emerald-100 hover:bg-emerald-800/80'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Photo Section */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-stone-900 text-sm flex items-center gap-2">
                    <Camera className="w-4 h-4 text-emerald-800" />
                    Profile Picture
                  </h3>
                  <span className="text-[10px] text-stone-500 uppercase tracking-wider font-semibold">
                    Supported: JPG, PNG, WEBP
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Avatar Preview */}
                  <div className="relative group shrink-0">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-emerald-700 shadow-md bg-stone-200 flex items-center justify-center text-stone-600 font-bold text-xl">
                      {currentUser?.profilePicture ? (
                        <img
                          src={currentUser.profilePicture}
                          alt={displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-emerald-900 font-black text-2xl">
                          {displayName
                            .split(' ')
                            .map((w) => w[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>

                      {currentUser?.profilePicture && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-tight">
                      Upload your official academic headshot or choose from the curated university avatar presets below.
                    </p>
                  </div>
                </div>

                {/* Preset Avatars */}
                <div className="pt-3 border-t border-stone-200/80">
                  <p className="text-[11px] font-bold text-stone-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    Or select a university photo preset:
                  </p>
                  <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                    {PRESET_AVATARS.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all hover:scale-105 shrink-0 cursor-pointer ${
                          currentUser?.profilePicture === url
                            ? 'border-emerald-700 ring-2 ring-emerald-400'
                            : 'border-stone-300 hover:border-emerald-600'
                        }`}
                      >
                        <img src={url} alt={`Preset ${i + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Account Identity Card */}
              <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-3">
                <h3 className="font-heading font-bold text-stone-900 text-sm flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-800" />
                  Account Identity Information
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Full Name</span>
                    <strong className="text-stone-900 font-semibold text-sm">{displayName}</strong>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">System Role</span>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-300">
                      {roleLabel}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-stone-50 border border-stone-100 sm:col-span-2">
                    <span className="text-[10px] uppercase font-bold text-stone-500 block">Email Address</span>
                    <strong className="text-stone-900 font-mono">{displayEmail}</strong>
                  </div>

                  {displayId && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 block">Student ID Number</span>
                      <strong className="text-emerald-950 font-mono tracking-widest text-sm">{displayId}</strong>
                    </div>
                  )}

                  {currentUser?.office && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-[10px] uppercase font-bold text-stone-500 block">Office / Assignment</span>
                      <strong className="text-stone-900">{currentUser.office}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-stone-900">Account Password Security</p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Registrar Officers and Super Administrators can freely update their personal account password at any time. Once updated, your new password will be required immediately on your next login session.
                  </p>
                </div>
              </div>

              {passwordStatus && (
                <div
                  className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 ${
                    passwordStatus.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  {passwordStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                  )}
                  <div className="font-medium leading-relaxed">{passwordStatus.message}</div>
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label htmlFor="profile-current-password" className="block font-bold text-stone-700 mb-1">
                    Current Password <span className="text-rose-600">*</span>
                  </label>
                  <input
                    id="profile-current-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Enter your current password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    New Account Password <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      placeholder="Enter new password (min 8 characters)..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-stone-500 mt-1">
                    Must be at least 8 characters long. Choose a secure phrase.
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    Confirm New Password <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Confirm new password..."
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-600 outline-none font-mono text-sm"
                  />
                  {confirmPasswordInput && newPasswordInput !== confirmPasswordInput && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      Passwords do not match.
                    </p>
                  )}
                  {confirmPasswordInput && newPasswordInput === confirmPasswordInput && (
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Passwords match!
                    </p>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Save New Password</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between text-xs">
          <span className="text-stone-500 font-mono text-[11px]">
            Security Audit: Active Session
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
