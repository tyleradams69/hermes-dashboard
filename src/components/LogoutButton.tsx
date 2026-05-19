"use client";

export default function LogoutButton() {
  async function logout() {
    await fetch("/api/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <button
      onClick={logout}
      className="inline-flex items-center justify-center rounded-full border border-[#d70015]/20 bg-white px-4 py-2 text-xs font-semibold tracking-[-0.01em] text-[#d70015] shadow-sm transition hover:border-[#d70015]/35 hover:bg-[#fff2f4] focus:outline-none focus:ring-2 focus:ring-[#d70015]/20"
    >
      Logout
    </button>
  );
}
