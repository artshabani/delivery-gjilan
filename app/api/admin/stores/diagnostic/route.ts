import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase-admin";
import { isStoreOpen, getOpenStores } from "@/lib/store-service";
import type { Store } from "@/types/store";

/**
 * Diagnostic endpoint to check store availability and timezone
 * Helps debug why certain stores aren't being selected
 */
export async function GET() {
  try {
    // Get all stores
    const { data: stores, error } = await adminSupabase
      .from("stores")
      .select("id, name, is_open_override, opens_at, closes_at")
      .order("name");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get current time in Gjilan timezone (CET/CEST - same as Europe/Belgrade)
    const now = new Date();
    let gjilanTimeString: string;
    let currentMinutes: number;
    
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Belgrade',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const parts = formatter.formatToParts(now);
      const gjilanTime = {
        year: parts.find(p => p.type === 'year')!.value,
        month: parts.find(p => p.type === 'month')!.value,
        day: parts.find(p => p.type === 'day')!.value,
        hour: parts.find(p => p.type === 'hour')!.value,
        minute: parts.find(p => p.type === 'minute')!.value,
        second: parts.find(p => p.type === 'second')!.value,
      };
      gjilanTimeString = `${gjilanTime.year}-${gjilanTime.month}-${gjilanTime.day} ${gjilanTime.hour}:${gjilanTime.minute}:${gjilanTime.second}`;
      currentMinutes = parseInt(gjilanTime.hour) * 60 + parseInt(gjilanTime.minute);
    } catch (error) {
      // Fallback to UTC+1 if timezone not supported
      const utcNow = new Date();
      const cetOffset = 1;
      const cetTime = new Date(utcNow.getTime() + (cetOffset * 60 * 60 * 1000));
      const hour = cetTime.getUTCHours().toString().padStart(2, '0');
      const minute = cetTime.getUTCMinutes().toString().padStart(2, '0');
      const second = cetTime.getUTCSeconds().toString().padStart(2, '0');
      gjilanTimeString = `${cetTime.getUTCFullYear()}-${(cetTime.getUTCMonth() + 1).toString().padStart(2, '0')}-${cetTime.getUTCDate().toString().padStart(2, '0')} ${hour}:${minute}:${second}`;
      currentMinutes = parseInt(hour) * 60 + parseInt(minute);
    }

    // Check each store
    const storeStatus = (stores || []).map((store: Store) => {
      const isOpen = isStoreOpen(store);
      
      // Parse store hours
      let openTimeMinutes = null;
      let closeTimeMinutes = null;
      if (store.opens_at && store.closes_at) {
        const parseTime = (timeStr: string): number => {
          const parts = timeStr.split(':');
          return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        };
        openTimeMinutes = parseTime(store.opens_at);
        closeTimeMinutes = parseTime(store.closes_at);
      }

      return {
        id: store.id,
        name: store.name,
        is_open_override: store.is_open_override,
        opens_at: store.opens_at,
        closes_at: store.closes_at,
        is_currently_open: isOpen,
        current_time_minutes: currentMinutes,
        open_time_minutes: openTimeMinutes,
        close_time_minutes: closeTimeMinutes,
        reason: getStoreStatusReason(store, currentMinutes, openTimeMinutes, closeTimeMinutes),
      };
    });

    // Get open stores using the service function
    const openStores = await getOpenStores();

    return NextResponse.json({
      current_time: {
        server_utc: now.toISOString(),
        gjilan_local: gjilanTimeString,
        gjilan_minutes_since_midnight: currentMinutes,
      },
      stores: storeStatus,
      open_stores_count: openStores.length,
      open_store_ids: openStores.map(s => s.id),
      open_store_names: openStores.map(s => s.name),
    });
  } catch (err: any) {
    console.error("Diagnostic error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get diagnostic info" },
      { status: 500 }
    );
  }
}

function getStoreStatusReason(
  store: Store,
  currentMinutes: number,
  openTimeMinutes: number | null,
  closeTimeMinutes: number | null
): string {
  if (store.is_open_override === false) {
    return "Manually closed (is_open_override = false)";
  }
  
  if (!store.opens_at || !store.closes_at) {
    return store.is_open_override === true 
      ? "Manually open (no hours set)" 
      : "Open by default (no hours set)";
  }

  if (openTimeMinutes === null || closeTimeMinutes === null) {
    return "Could not parse hours";
  }

  if (openTimeMinutes < closeTimeMinutes) {
    // Normal hours
    if (currentMinutes >= openTimeMinutes && currentMinutes < closeTimeMinutes) {
      return "Open (within normal hours)";
    } else {
      return `Closed (outside hours: ${store.opens_at} - ${store.closes_at})`;
    }
  } else {
    // Overnight hours
    if (currentMinutes >= openTimeMinutes || currentMinutes < closeTimeMinutes) {
      return "Open (within overnight hours)";
    } else {
      return `Closed (outside overnight hours: ${store.opens_at} - ${store.closes_at})`;
    }
  }
}

