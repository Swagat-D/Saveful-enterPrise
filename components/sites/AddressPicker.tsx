"use client";

import { useState } from "react";
import { LoaderCircle, MapPin, Navigation, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PickedLocation = {
  address: string;
  postcode: string;
  lat: number;
  lon: number;
};

type SearchHit = PickedLocation & { id: string };

const SYDNEY: PickedLocation = {
  address: "14 Circular Quay, Sydney NSW",
  postcode: "2000",
  lat: -33.861,
  lon: 151.211,
};

function formatPhotonFeature(feature: {
  geometry?: { coordinates?: number[] };
  properties?: Record<string, string | number | undefined>;
}): SearchHit | null {
  const coords = feature.geometry?.coordinates;
  const props = feature.properties ?? {};
  if (!coords || coords.length < 2) return null;

  const parts = [
    props.name,
    [props.housenumber, props.street].filter(Boolean).join(" "),
    props.city || props.locality || props.district,
    props.state,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean);

  return {
    id: `${coords[1]},${coords[0]},${props.osm_id ?? parts.join("-")}`,
    address: parts.join(", ") || "Selected location",
    postcode: String(props.postcode || ""),
    lat: coords[1],
    lon: coords[0],
  };
}

export function AddressPicker({
  value,
  onChange,
  error,
  compact,
}: {
  value: PickedLocation;
  onChange: (next: PickedLocation) => void;
  error?: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(value.address);
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState("");

  const searchAddress = async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setSearching(true);
    setSearchError("");
    try {
      const response = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=5&lang=en`,
      );
      const data = (await response.json()) as { features?: unknown[] };
      const nextHits = (data.features || [])
        .map((feature) => formatPhotonFeature(feature as Parameters<typeof formatPhotonFeature>[0]))
        .filter((item): item is SearchHit => Boolean(item));
      setHits(nextHits);
      if (!nextHits.length) setSearchError("No matching places. You can still type the address.");
    } catch {
      setSearchError("Search is unavailable. Enter the address and postcode manually.");
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const applyPlace = (place: PickedLocation) => {
    onChange(place);
    setQuery(place.address);
    setHits([]);
    setSearchError("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setSearchError("Location is not available in this browser.");
      return;
    }
    setLocating(true);
    setSearchError("");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const response = await fetch(
            `https://photon.komoot.io/reverse?lat=${lat}&lon=${lon}`,
          );
          const data = (await response.json()) as { features?: unknown[] };
          const hit = data.features?.[0]
            ? formatPhotonFeature(data.features[0] as Parameters<typeof formatPhotonFeature>[0])
            : null;
          applyPlace(
            hit ?? {
              address: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
              postcode: value.postcode,
              lat,
              lon,
            },
          );
        } catch {
          applyPlace({
            address: `${lat.toFixed(5)}, ${lon.toFixed(5)}`,
            postcode: value.postcode,
            lat,
            lon,
          });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setSearchError("Could not read your location. Search or type the address instead.");
      },
    );
  };

  const bbox = `${value.lon - 0.012},${value.lat - 0.008},${value.lon + 0.012},${value.lat + 0.008}`;
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${value.lat}%2C${value.lon}`;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              onChange({ ...value, address: event.target.value });
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void searchAddress(query);
              }
            }}
            placeholder="Search site address"
            className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-4 font-saveful text-sm outline-none transition focus:border-saveful-green/40 focus:bg-white"
          />
        </div>
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          className="w-full sm:w-auto"
          onClick={() => void searchAddress(query)}
          disabled={searching}
        >
          {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search address
        </Button>
        <Button
          type="button"
          variant="secondary"
          size={compact ? "sm" : "default"}
          className="w-full lg:w-auto"
          onClick={useMyLocation}
          disabled={locating}
        >
          {locating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          Use my location
        </Button>
      </div>

      {hits.length ? (
        <ul className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => applyPlace(hit)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-[#F7F6F2]"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saveful-green" />
                <span className="min-w-0">
                  <span className="block font-saveful text-sm text-gray-800">{hit.address}</span>
                  {hit.postcode ? (
                    <span className="font-saveful text-xs text-gray-500">{hit.postcode}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {searchError ? (
        <p className="font-saveful text-xs text-amber-700">{searchError}</p>
      ) : null}

      {value.address ? (
        <div className="flex items-start gap-2 rounded-xl bg-[#F4FAF6] px-3 py-2.5">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-saveful-green" />
          <p className="min-w-0 flex-1 font-saveful text-sm text-gray-800">{value.address}</p>
          <button
            type="button"
            aria-label="Clear address"
            onClick={() => {
              applyPlace({ ...SYDNEY, address: "", postcode: "" });
              setQuery("");
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-gray-100 bg-[#F5F1E8]",
          error && "ring-2 ring-red-200",
        )}
      >
        <iframe
          title="Pickup map"
          src={mapSrc}
          className={cn("w-full border-0", compact ? "h-48 md:h-56" : "h-56 md:h-72 lg:h-80")}
        />
      </div>
      <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">
        Search or use your location — postcode fills in when the place has one
      </p>
      {error ? <p className="font-saveful text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export const defaultMapLocation = SYDNEY;
