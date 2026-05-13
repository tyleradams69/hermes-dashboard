"use client";

import { useEffect, useState } from "react";

interface ActivityEvent {
  id: string;
  type: string;
  company: string;
  message: string;
  timestamp: string;
}

export default function ActivityFeed() {

  const [activity, setActivity] =
    useState<ActivityEvent[]>([]);

  async function loadActivity() {

    try {

      const response =
        await fetch(
          "http://localhost:3002/api/activity"
        );

      const data =
        await response.json();

      setActivity(data.activity || []);

    } catch (error) {

      console.error(
        "Failed to load activity",
        error
      );
    }
  }

  useEffect(() => {

    loadActivity();

    const interval =
      setInterval(loadActivity, 5000);

    return () =>
      clearInterval(interval);

  }, []);

  return (

    <div className="bg-zinc-950 border border-cyan-500/20 rounded-2xl p-6">

      <div className="flex items-center justify-between mb-6">

        <h2 className="text-2xl font-black tracking-tight text-white">
          LIVE ACTIVITY
        </h2>

        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />

      </div>

      <div className="space-y-4 max-h-[500px] overflow-y-auto">

        {activity.map((event) => (

          <div
            key={event.id}
            className="border border-white/10 rounded-xl p-4 bg-black/40"
          >

            <div className="text-xs text-cyan-400 font-bold uppercase mb-2">
              {event.type.replaceAll("_", " ")}
            </div>

            <div className="text-lg font-bold text-white">
              {event.company}
            </div>

            <div className="text-sm text-zinc-400 mt-1">
              {event.message}
            </div>

            <div className="text-xs text-zinc-600 mt-3">
              {new Date(event.timestamp)
                .toLocaleString()}
            </div>

          </div>
        ))}

      </div>

    </div>
  );
}
