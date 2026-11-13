"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";

type Props = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
};

type SearchResult = { display_name: string; lat: string; lon: string };

// Dhaka city centre, used when no location has been picked yet
const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125];

const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images/";

const round = (n: number) => Number(n.toFixed(6));

// Free map picker: Leaflet + OpenStreetMap tiles, no API key needed.
export default function LocationPicker({ lat, lng, onChange, height = 300 }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // initial values are only used once, when the map is created
  const initial = useRef({ lat, lng });

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  // Create the map once
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const mod = await import("leaflet");
      const L = ((mod as unknown as { default?: typeof Leaflet }).default ?? mod) as typeof Leaflet;
      if (cancelled || !boxRef.current || mapRef.current) return;
      libRef.current = L;

      const icon = L.icon({
        iconUrl: `${ICON_BASE}marker-icon.png`,
        iconRetinaUrl: `${ICON_BASE}marker-icon-2x.png`,
        shadowUrl: `${ICON_BASE}marker-shadow.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41],
      });

      const start = initial.current;
      const hasStart = start.lat !== null && start.lng !== null;
      const map = L.map(boxRef.current).setView(
        hasStart ? [start.lat as number, start.lng as number] : DEFAULT_CENTER,
        hasStart ? 15 : 12
      );
      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      function place(la: number, ln: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([la, ln]);
        } else {
          const m = L.marker([la, ln], { icon, draggable: true }).addTo(map);
          m.on("dragend", () => {
            const p = m.getLatLng();
            onChangeRef.current(round(p.lat), round(p.lng));
          });
          markerRef.current = m;
        }
      }

      if (hasStart) place(start.lat as number, start.lng as number);

      map.on("click", (e: Leaflet.LeafletMouseEvent) => {
        place(e.latlng.lat, e.latlng.lng);
        onChangeRef.current(round(e.latlng.lat), round(e.latlng.lng));
      });

      // make sure tiles fill the box after layout
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Keep the pin in sync when the value changes from outside (search, GPS button, typed values)
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!L || !map || lat === null || lng === null) return;
    if (markerRef.current) {
      const cur = markerRef.current.getLatLng();
      if (Math.abs(cur.lat - lat) < 1e-7 && Math.abs(cur.lng - lng) < 1e-7) return;
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const icon = L.icon({
        iconUrl: `${ICON_BASE}marker-icon.png`,
        iconRetinaUrl: `${ICON_BASE}marker-icon-2x.png`,
        shadowUrl: `${ICON_BASE}marker-shadow.png`,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41],
      });
      const m = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        onChangeRef.current(round(p.lat), round(p.lng));
      });
      markerRef.current = m;
    }
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng]);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setBusy(true);
    setNote("");
    setResults([]);
    try {
      // OpenStreetMap Nominatim: free, light use only (one search per click)
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=bd&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = (await res.json()) as SearchResult[];
      if (!data.length) setNote("No place found. Try another name or click on the map.");
      setResults(data);
    } catch {
      setNote("Search is not available right now. Click on the map instead.");
    } finally {
      setBusy(false);
    }
  }

  function pick(r: SearchResult) {
    onChangeRef.current(round(Number(r.lat)), round(Number(r.lon)));
    setResults([]);
    setQuery(r.display_name.split(",")[0]);
  }

  function useMyLocation() {
    setNote("");
    if (!navigator.geolocation) {
      setNote("This browser cannot give your location. Click on the map instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => onChangeRef.current(round(pos.coords.latitude), round(pos.coords.longitude)),
      () => setNote("Could not get your location. Allow location permission or click on the map.")
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") search();
          }}
          placeholder="Search a place (e.g. Mirpur 10, Dhaka)"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => search()}
          disabled={busy}
          className="rounded border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {busy ? "..." : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="max-h-40 overflow-auto rounded border bg-white text-sm shadow">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => pick(r)} className="w-full px-3 py-2 text-left hover:bg-gray-50">
                {r.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={boxRef}
        style={{ height }}
        className="relative z-0 w-full overflow-hidden rounded border border-gray-300"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
        <span>
          {lat !== null && lng !== null
            ? `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`
            : "Click on the map to drop a pin, or drag the pin to adjust."}
        </span>
        <button type="button" onClick={useMyLocation} className="text-red-600 underline">
          Use my current location
        </button>
      </div>
      {note && <p className="text-xs text-red-600">{note}</p>}
    </div>
  );
}