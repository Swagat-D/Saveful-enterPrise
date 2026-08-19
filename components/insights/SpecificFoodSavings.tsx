"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Leaf } from "lucide-react";
import { formatKg, formatNumber, type TopFood } from "@/lib/impactDemo";
import { cn } from "@/lib/utils";

export function SpecificFoodSavings({ foods }: { foods: TopFood[] }) {
  const listed = foods.slice(0, 5);
  const [selectedName, setSelectedName] = useState(listed[0]?.name ?? "");
  const [open, setOpen] = useState(false);

  const selected = listed.find((food) => food.name === selectedName) ?? listed[0] ?? null;
  const foodsTotalKg = listed.reduce((sum, food) => sum + food.totalKg, 0);

  const peoplePercent = selected && selected.totalKg > 0
    ? Math.round((selected.peopleKg / selected.totalKg) * 100)
    : 0;
  const animalPercent = selected && selected.totalKg > 0
    ? Math.round((selected.animalKg / selected.totalKg) * 100)
    : 0;
  const showPeople = Boolean(selected && (selected.peopleKg > 0 || selected.animalKg === 0));
  const showAnimals = Boolean(selected && selected.animalKg > 0);
  const showBoth = showPeople && showAnimals;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-saveful-bold text-lg text-gray-900">Specific food savings</h2>
      <p className="mt-1 font-saveful text-sm text-gray-500">
        Breakdown of food recovered — these amounts add up to the total, they are not extra.
      </p>
      {listed.length ? (
        <p className="mt-2 font-saveful-bold text-sm text-saveful-green">
          Listed foods total {formatKg(foodsTotalKg)}
        </p>
      ) : null}

      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => listed.length && setOpen((value) => !value)}
          className="flex w-full items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-2.5 text-left shadow-sm"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saveful-green text-white">
            <Leaf className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 truncate font-saveful-bold text-sm text-gray-900">
            {selected?.name ?? "No foods yet"}
          </span>
          <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
        </button>

        {open ? (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="font-saveful-bold text-sm text-gray-900">Top foods</p>
              <p className="font-saveful text-xs text-gray-500">
                Parts of your {formatKg(foodsTotalKg)} recovered — not additional kg
              </p>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {listed.map((food) => {
                const active = food.name === selected?.name;
                return (
                  <li key={food.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedName(food.name);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F7F6F2]",
                        active && "bg-[#F4FAF6]",
                      )}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-saveful-green text-white">
                        <Leaf className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-saveful-semibold text-sm text-gray-900">
                          {food.name}
                        </span>
                        <span className="font-saveful text-xs text-gray-500">
                          {food.category} · {formatKg(food.totalKg)}
                        </span>
                      </span>
                      {active ? <Check className="h-4 w-4 text-saveful-green" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <span className="font-saveful-semibold text-sm text-gray-500">Total</span>
              <span className="font-saveful-bold text-sm text-saveful-green">{formatKg(foodsTotalKg)}</span>
            </div>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-4 space-y-3">
          <p className="font-saveful text-xs text-gray-500">
            Stats below are for the selected food only ({selected.name}).
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FoodStat
              icon="/listing/veggie_basket.png"
              value={formatKg(selected.totalKg)}
              label="This food"
            />
            <FoodStat
              icon="/listing/co2_green_icon.png"
              value={formatKg(selected.co2AvoidedKg)}
              label="CO₂ avoided"
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {showPeople ? (
              <FoodSplit
                title="For people"
                icon="/listing/people_icon.png"
                foodIcon="/listing/storage_box_green.png"
                value={formatKg(selected.peopleKg)}
                hint={showBoth ? "Share of this food" : "All of this food"}
                percent={showBoth ? peoplePercent : undefined}
                tone="green"
              />
            ) : null}
            {showAnimals ? (
              <FoodSplit
                title="For animals"
                icon="/listing/cow_front.png"
                foodIcon="/listing/storage_box_orange.png"
                value={formatKg(selected.animalKg)}
                hint={showBoth ? "Share of this food" : "All of this food"}
                percent={showBoth ? animalPercent : undefined}
                tone="orange"
              />
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-6 text-center font-saveful text-sm text-gray-400">No foods yet</p>
      )}
    </section>
  );
}

function FoodStat({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E8F3EC]">
        <Image src={icon} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-saveful-bold text-base tabular-nums text-saveful-green">{value}</p>
        <p className="font-saveful text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function FoodSplit({
  title,
  icon,
  foodIcon,
  value,
  hint,
  percent,
  tone,
}: {
  title: string;
  icon: string;
  foodIcon: string;
  value: string;
  hint: string;
  percent?: number;
  tone: "green" | "orange";
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100">
      <div className={cn("flex items-center gap-2 px-3 py-2", tone === "green" ? "bg-[#F0F8F3]" : "bg-[#FFF6EC]")}>
        <Image src={icon} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
        <p className={cn("font-saveful-semibold text-xs", tone === "green" ? "text-saveful-green" : "text-saveful-orange")}>
          {title}
        </p>
      </div>
      <div className="px-3 py-3">
        <div className="flex items-center gap-2">
          <Image src={foodIcon} alt="" width={16} height={16} className="h-4 w-4 object-contain" />
          <p className={cn("font-saveful-bold text-lg tabular-nums", tone === "green" ? "text-saveful-green" : "text-saveful-orange")}>
            {value}
          </p>
        </div>
        <p className="mt-1 font-saveful text-xs text-gray-500">{hint}</p>
        {percent != null ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className={cn("h-full rounded-full", tone === "green" ? "bg-saveful-green" : "bg-saveful-orange")}
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="font-saveful-semibold text-xs text-gray-500">{formatNumber(percent)}%</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
