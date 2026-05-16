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
      className="border border-red-300/20 bg-red-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-red-100 transition hover:bg-red-300 hover:text-black"
    >
      Logout
    </button>
  );
}
