"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Modal, LoadingSpinner, ErrorState } from "@/components/ui";
import { useOrg, useOrgMembers, useInviteMember, useUpdateOrg } from "@/lib/hooks";
import { getAccessToken } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";

const mockOrg = {
  name: "Acme Procurement GmbH",
  slug: "acme-procurement",
  createdAt: "2026-01-15T10:00:00Z",
};

const mockMembers = [
  {
    id: "usr_01",
    name: "Maria Schmidt",
    email: "maria@acme-procurement.eu",
    role: "Owner",
    joinedAt: "2026-01-15",
  },
  {
    id: "usr_02",
    name: "Thomas Mueller",
    email: "thomas@acme-procurement.eu",
    role: "Admin",
    joinedAt: "2026-01-20",
  },
  {
    id: "usr_03",
    name: "Sophie Dupont",
    email: "sophie@acme-procurement.eu",
    role: "Member",
    joinedAt: "2026-02-05",
  },
  {
    id: "usr_04",
    name: "Luca Rossi",
    email: "luca@acme-procurement.eu",
    role: "Member",
    joinedAt: "2026-03-01",
  },
];

const roleColors: Record<string, string> = {
  Owner: "text-accent",
  owner: "text-accent",
  Admin: "text-warning",
  admin: "text-warning",
  Member: "text-gray-400",
  member: "text-gray-400",
};

export default function SettingsPage() {
  useEffect(() => {
    const token = getAccessToken();
    if (token) apiClient.setToken(token);
  }, []);

  const { data: org, loading: orgLoading, error: orgError, refetch: refetchOrg } = useOrg();
  const { data: members, loading: membersLoading } = useOrgMembers();
  const { inviteMember, loading: inviting } = useInviteMember();
  const { updateOrg, loading: saving } = useUpdateOrg();

  const [orgName, setOrgName] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");

  // Sync org name from API
  useEffect(() => {
    if (org) setOrgName(org.name);
    else setOrgName(mockOrg.name);
  }, [org]);

  const displaySlug = org?.slug ?? mockOrg.slug;

  async function handleSave() {
    try {
      await updateOrg({ name: orgName });
      refetchOrg();
    } catch {
      // handled by hook
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return;
    try {
      await inviteMember(inviteEmail, inviteRole);
      setInviteOpen(false);
      setInviteEmail("");
    } catch {
      // handled by hook
    }
  }

  // Members display: API data or mock
  const displayMembers = members
    ? members.map((m) => ({
        id: m.id,
        name: m.id.slice(0, 8),
        email: "",
        role: m.role,
        joinedAt: "",
      }))
    : mockMembers;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Manage your organization, members, and preferences
        </p>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-4 border-b border-navy-800 pb-3">
        <span className="text-sm font-medium text-accent border-b-2 border-accent pb-3 -mb-3">
          Organization
        </span>
        <Link
          href="/settings/api-keys"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          API Keys
        </Link>
        <Link
          href="/settings/billing"
          className="text-sm text-gray-400 hover:text-white pb-3 -mb-3 transition-colors"
        >
          Billing
        </Link>
      </div>

      {/* Organization Info */}
      {orgLoading ? (
        <div className="py-8">
          <LoadingSpinner label="Loading organization..." />
        </div>
      ) : orgError && !org ? (
        <ErrorState message={orgError} onRetry={refetchOrg} />
      ) : (
        <div className="rounded-lg border border-navy-800 bg-navy-900 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Organization</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                Slug (read-only)
              </label>
              <input
                type="text"
                value={displaySlug}
                readOnly
                className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-gray-500 outline-none cursor-not-allowed"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="rounded-lg border border-navy-800 bg-navy-900">
        <div className="flex items-center justify-between border-b border-navy-800 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Members</h2>
          <button
            onClick={() => setInviteOpen(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Invite Member
          </button>
        </div>
        {membersLoading ? (
          <div className="py-8">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div className="divide-y divide-navy-800">
            {displayMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{member.name}</p>
                  {member.email && (
                    <p className="mt-0.5 text-xs text-gray-500">{member.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`text-xs font-medium ${roleColors[member.role] || "text-gray-400"}`}
                  >
                    {member.role}
                  </span>
                  {member.joinedAt && (
                    <span className="text-xs text-gray-600">
                      Joined {member.joinedAt}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite Member"
        footer={
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setInviteOpen(false)}
              className="rounded-lg border border-navy-800 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              disabled={!inviteEmail.trim() || inviting}
              onClick={handleInvite}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-40 transition-colors"
            >
              {inviting ? "Sending..." : "Send Invite"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Role
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full rounded-md border border-navy-800 bg-navy-950 px-3 py-2 text-sm text-white outline-none focus:border-accent"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
