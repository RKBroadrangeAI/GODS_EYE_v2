"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/providers";
import { UserAvatar } from "@/components/user-avatar";
import { Save, Eye, EyeOff } from "lucide-react";

type Profile = {
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  initials: string | null;
};

export default function ProfilePage() {
  const router = useRouter();
  const { error, success } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email ?? "");
        setAvatarUrl(data.avatar_url ?? "");
      })
      .catch(() => error("Failed to load profile"))
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    if (newPassword && newPassword !== confirmPassword) {
      error("New passwords do not match");
      return;
    }

    setSaving(true);
    const body: Record<string, string | null> = {};
    if (name !== profile?.name) body.name = name;
    if (email !== (profile?.email ?? "")) body.email = email;
    if (avatarUrl !== (profile?.avatar_url ?? "")) body.avatarUrl = avatarUrl || null;
    if (newPassword) {
      body.currentPassword = currentPassword;
      body.newPassword = newPassword;
    }

    if (Object.keys(body).length === 0) {
      error("No changes to save");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!res.ok) {
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      error(json.error ?? "Save failed");
      return;
    }

    success("Profile updated");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-zinc-500">Loading profile...</p>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <section className="mx-auto max-w-lg space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-800">Edit Profile</h1>
        <p className="text-sm text-zinc-500">Update your name, email, avatar, or password.</p>
      </div>

      {/* Avatar preview */}
      <div className="flex items-center gap-4">
        <UserAvatar name={name} avatarUrl={avatarUrl || null} size={64} />
        <div>
          <p className="text-sm font-semibold text-zinc-800">{name}</p>
          <p className="text-xs uppercase tracking-wider text-zinc-400">{profile.role.replace("_", " ")}</p>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {/* Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Email */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Avatar URL */}
        <div className="space-y-1">
          <label className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Avatar URL</label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        <hr className="border-zinc-100" />

        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Change Password</p>

        {/* Current Password */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Current Password</label>
          <div className="relative">
            <input
              type={showCurrentPw ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPw(!showCurrentPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">New Password</label>
          <div className="relative">
            <input
              type={showNewPw ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
            <button
              type="button"
              onClick={() => setShowNewPw(!showNewPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
            >
              {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <label className="text-xs text-zinc-500">Confirm New Password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
        </div>

        {/* Save */}
        <button
          onClick={onSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </section>
  );
}
