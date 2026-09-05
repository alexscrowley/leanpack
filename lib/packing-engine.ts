import type {
  Activity,
  Climate,
  PackCategory,
  PackItem,
  Trip,
  TripDraft,
  WeatherSummary,
} from "./types";

interface ItemSpec {
  id: string;
  label: string;
  aliases: string[];
  quantity: number;
  category: PackCategory;
  reason: string;
}

function item(spec: ItemSpec): PackItem {
  return { ...spec, packed: false };
}

function halfClothes(nights: number): number {
  return Math.max(2, Math.ceil(nights / 2));
}

function climateLayer(climate: Climate, needsRain: boolean): ItemSpec[] {
  const layers: ItemSpec[] = [];

  if (climate === "cold") {
    layers.push({
      id: "clothes.sweater",
      label: "Warm sweater",
      aliases: ["sweater", "knit", "fleece", "jumper"],
      quantity: 1,
      category: "clothes",
      reason: "Cold days. One warm layer — not three.",
    });
    layers.push({
      id: "clothes.coat",
      label: "Insulated coat",
      aliases: ["coat", "jacket", "parka", "puffer"],
      quantity: 1,
      category: "clothes",
      reason: "Wear it on the plane. Don’t pack a second.",
    });
  } else if (climate === "cool") {
    layers.push({
      id: "clothes.sweater",
      label: "Sweater",
      aliases: ["sweater", "knit", "fleece", "jumper", "hoodie"],
      quantity: 1,
      category: "clothes",
      reason: "Cool evenings. One is enough if weather holds.",
    });
    if (!needsRain) {
      layers.push({
        id: "clothes.jacket",
        label: "Light jacket",
        aliases: ["jacket", "coat", "blazer"],
        quantity: 1,
        category: "clothes",
        reason: "A single outer layer. Leave the extra coat.",
      });
    }
  } else if (climate === "mild") {
    layers.push({
      id: "clothes.layer",
      label: "Light layer",
      aliases: ["layer", "overshirt", "cardigan", "hoodie", "sweater"],
      quantity: 1,
      category: "clothes",
      reason: "Mild and stable — one extra layer, not a wardrobe.",
    });
  } else if (climate === "warm") {
    // Air-conditioned evenings only — skip a sweater unless rain already covers a shell.
  }

  if (needsRain) {
    layers.push({
      id: "clothes.rain",
      label: "Packable rain shell",
      aliases: ["rain", "shell", "raincoat", "rain jacket", "umbrella"],
      quantity: 1,
      category: "clothes",
      reason: "Rain is in the forecast. The shell replaces a second jacket — and the umbrella.",
    });
  }

  return layers;
}

function activityGear(activities: Activity[], climate: Climate): ItemSpec[] {
  const gear: ItemSpec[] = [];
  const set = new Set(activities);

  if (set.has("swimming") || set.has("beach")) {
    gear.push({
      id: "activity.swimsuit",
      label: "Swimsuit",
      aliases: ["suit", "swimsuit", "swim", "trunks", "bikini"],
      quantity: 1,
      category: "activity",
      reason: "One suit. It dries. You don’t need a spare.",
    });
    gear.push({
      id: "activity.towel",
      label: "Microfiber towel",
      aliases: ["towel", "microfiber"],
      quantity: 1,
      category: "activity",
      reason: "Hotel towels stay at the hotel. This one packs flat.",
    });
  }

  if (set.has("hiking") || set.has("camping")) {
    gear.push({
      id: "activity.trail-shoes",
      label: "Trail shoes",
      aliases: ["trail", "hiking shoes", "hiking boots", "boots", "hikers"],
      quantity: 1,
      category: "activity",
      reason: "Wear your dailies in transit. These are for the trail.",
    });
    if (climate === "hot" || climate === "warm") {
      gear.push({
        id: "activity.sun-shirt",
        label: "Sun shirt",
        aliases: ["sun shirt", "hiking shirt"],
        quantity: 1,
        category: "activity",
        reason: "One light shirt for the hike. Not a full outdoor kit.",
      });
    }
  }

  if (set.has("running")) {
    gear.push({
      id: "activity.run-shoes",
      label: "Run shoes",
      aliases: ["run shoes", "running shoes", "trainers", "sneakers"],
      quantity: 1,
      category: "activity",
      reason: "One pair for the run. Don’t bring a third pair of shoes.",
    });
    gear.push({
      id: "activity.run-kit",
      label: "Athletic set",
      aliases: ["athletic", "run kit", "running clothes", "shorts"],
      quantity: 1,
      category: "activity",
      reason: "One set. Wash it if you run more than twice.",
    });
  }

  if (set.has("gym") && !set.has("running")) {
    gear.push({
      id: "activity.gym-kit",
      label: "Gym set",
      aliases: ["gym", "workout", "athletic"],
      quantity: 1,
      category: "activity",
      reason: "One set. Hotels have towels.",
    });
    gear.push({
      id: "activity.trainers",
      label: "Trainers",
      aliases: ["trainers", "gym shoes", "sneakers"],
      quantity: 1,
      category: "activity",
      reason: "Only if you won’t wear them as your daily pair.",
    });
  }

  if (set.has("cycling")) {
    gear.push({
      id: "activity.bike-shorts",
      label: "Bike shorts",
      aliases: ["bike", "cycling", "padded shorts"],
      quantity: 1,
      category: "activity",
      reason: "The one piece you can’t improvise. Rent the bike.",
    });
  }

  if (set.has("skiing")) {
    gear.push({
      id: "activity.ski-base",
      label: "Base layer set",
      aliases: ["base layer", "thermals", "ski"],
      quantity: 1,
      category: "activity",
      reason: "Assume you already have a ski kit. This is the spare next-to-skin set.",
    });
    gear.push({
      id: "activity.gloves",
      label: "Gloves",
      aliases: ["gloves", "mittens"],
      quantity: 1,
      category: "activity",
      reason: "Easy to forget. Everything else should already live in the ski bag.",
    });
  }

  if (set.has("formal")) {
    gear.push({
      id: "activity.nice-outfit",
      label: "One nice outfit",
      aliases: ["outfit", "dress", "shirt", "formal", "blazer"],
      quantity: 1,
      category: "activity",
      reason: "One look. Not a rotation.",
    });
  }

  if (set.has("work") && !set.has("formal")) {
    gear.push({
      id: "activity.work-shirt",
      label: "Presentable shirt",
      aliases: ["work shirt", "button down", "blouse"],
      quantity: 1,
      category: "activity",
      reason: "One shirt that photographs well. Rewear it.",
    });
  }

  return gear;
}

export function generatePackList(input: {
  nights: number;
  laundry: boolean;
  climate: Climate;
  needsRain: boolean;
  activities: Activity[];
  mentionedMeds: boolean;
}): PackItem[] {
  const { nights, laundry, climate, needsRain, activities, mentionedMeds } = input;
  const items: ItemSpec[] = [];

  const underwear = laundry ? Math.min(nights + 1, Math.max(3, halfClothes(nights) + 1)) : nights + 1;
  const shirts = laundry
    ? halfClothes(nights) + (climate === "hot" ? 1 : 0)
    : Math.min(nights, Math.max(2, nights - (nights >= 5 ? 1 : 0) + (climate === "hot" ? 1 : 0)));

  let bottoms = nights >= 8 && !laundry ? 3 : nights >= 4 ? 2 : 1;
  if ((activities.includes("hiking") || activities.includes("camping")) && bottoms < 2) bottoms = 2;
  if (climate === "hot") bottoms = Math.min(bottoms, 2);

  const shirtNoun = climate === "hot" || climate === "warm" ? "Tees" : "Shirts";
  items.push({
    id: "clothes.shirts",
    label: shirtNoun,
    aliases: ["shirt", "shirts", "tee", "tees", "t-shirt", "tshirts", "tops"],
    quantity: shirts,
    category: "clothes",
    reason: laundry
      ? `${nights} nights, laundry mid-trip — pack about half.`
      : `${nights} nights, no laundry. Rewear one. That’s the point.`,
  });

  items.push({
    id: "clothes.underwear",
    label: "Underwear",
    aliases: ["underwear", "briefs", "boxers", "panties"],
    quantity: underwear,
    category: "clothes",
    reason: laundry ? "Enough to reach a wash day, plus one." : "Nights plus one. Then you’re done.",
  });

  items.push({
    id: "clothes.socks",
    label: "Socks",
    aliases: ["socks", "sock"],
    quantity: underwear,
    category: "clothes",
    reason: "Same count as underwear. No ‘just in case’ pairs.",
  });

  items.push({
    id: "clothes.bottoms",
    label: climate === "hot" || climate === "warm" ? "Shorts / trousers" : "Trousers",
    aliases: ["pants", "trousers", "jeans", "shorts", "bottoms", "chinos"],
    quantity: bottoms,
    category: "clothes",
    reason:
      bottoms === 1
        ? "One pair. Denim is heavy — don’t bring a second ‘in case’."
        : "Two is a rotation. A third pair is almost never worth the weight.",
  });

  items.push(...climateLayer(climate, needsRain));

  if (nights >= 3) {
    items.push({
      id: "clothes.sleep",
      label: "Sleepwear",
      aliases: ["sleepwear", "pajamas", "pyjamas", "sleep", "pjs"],
      quantity: 1,
      category: "clothes",
      reason: "One set. Or the oldest tee you already packed.",
    });
  }

  items.push({
    id: "toiletries.brush",
    label: "Toothbrush + paste",
    aliases: ["toothbrush", "toothpaste", "brush"],
    quantity: 1,
    category: "toiletries",
    reason: "Travel sizes. Leave the full bottles.",
  });
  items.push({
    id: "toiletries.deodorant",
    label: "Deodorant",
    aliases: ["deodorant", "deo"],
    quantity: 1,
    category: "toiletries",
    reason: "One solid. That’s the toiletry bag.",
  });

  if (climate === "hot" || climate === "warm" || activities.includes("beach") || activities.includes("hiking")) {
    items.push({
      id: "toiletries.sunscreen",
      label: "Sunscreen",
      aliases: ["sunscreen", "spf", "sunblock"],
      quantity: 1,
      category: "toiletries",
      reason: "A travel tube. Buy more there if you burn through it.",
    });
  }

  if (mentionedMeds) {
    items.push({
      id: "toiletries.meds",
      label: "Medication",
      aliases: ["meds", "medication", "pills", "prescription", "medicine"],
      quantity: 1,
      category: "toiletries",
      reason: "You mentioned it — this is the one thing you don’t improvise.",
    });
  }

  items.push({
    id: "tech.charger",
    label: "Phone charger",
    aliases: ["charger", "cable", "cord", "phone charger"],
    quantity: 1,
    category: "tech",
    reason: "One cable. The hotel clock is not your backup plan.",
  });

  if (activities.includes("work") || nights >= 6) {
    items.push({
      id: "tech.brick",
      label: "Power brick",
      aliases: ["brick", "adapter", "plug", "power adapter"],
      quantity: 1,
      category: "tech",
      reason: activities.includes("work")
        ? "Meetings drain a phone. One brick, not a drawer of cables."
        : "A long trip. Still just one.",
    });
  }

  if (activities.includes("work")) {
    items.push({
      id: "tech.laptop-charger",
      label: "Laptop charger",
      aliases: ["laptop charger", "mac charger", "computer charger"],
      quantity: 1,
      category: "tech",
      reason: "The laptop goes in the bag you carry. This is the piece people forget.",
    });
  }

  items.push({
    id: "docs.id",
    label: "Passport / ID",
    aliases: ["passport", "id", "license", "driver's license", "wallet"],
    quantity: 1,
    category: "docs",
    reason: "Check it the night before. Then stop opening the drawer.",
  });

  items.push(...activityGear(activities, climate));

  return items.map(item);
}

export const OVERPACK_PUSHBACK: { pattern: RegExp; reply: string }[] = [
  { pattern: /\bhair ?dryers?\b/i, reply: "Leave the hair dryer. Almost every place has one." },
  { pattern: /\bextra jeans\b|\banother pair of jeans\b|\bsecond jeans\b/i, reply: "One pair of jeans. Denim is heavy and slow to dry." },
  { pattern: /\bumbrella\b/i, reply: "If rain is coming, the shell is enough. Umbrellas fight you in wind." },
  { pattern: /\bextra shoes\b|\banother pair of shoes\b|\bthird pair\b/i, reply: "Two pairs is already generous. A third pair is a packing failure." },
  { pattern: /\bmakeup\b|\btoiletry bag\b/i, reply: "Travel sizes. If it doesn’t earn a daily use, it stays home." },
  { pattern: /\bextra jacket\b|\bsecond (?:coat|jacket)\b/i, reply: "One outer layer, plus a shell only if it rains. That’s the rule." },
  { pattern: /\bbooks?\b|\bkindle\b/i, reply: "Phone or one thin book. Paper is a luxury, not a need." },
  { pattern: /\biron\b|\bsteamer\b/i, reply: "Hang it in the bathroom while you shower. Skip the iron." },
];

export function commentaryForTrip(trip: Pick<Trip, "nights" | "laundry" | "weather" | "items" | "activities">): string {
  const count = trip.items.length;
  const bits = [trip.weather.summary];

  if (trip.weather.isProxy) {
    bits.push("That’s a near-term read — treat it as climate, not a promise.");
  }

  bits.push(`${count} things. That’s the lean set.`);

  if (trip.laundry) {
    bits.push("Laundry mid-trip, so I halved the clothes.");
  } else if (trip.nights >= 5) {
    bits.push("No laundry — enough underwear, not extra outfits.");
  }

  if (!trip.weather.needsRain && (trip.weather.climate === "mild" || trip.weather.climate === "warm")) {
    bits.push("Weather is steady. Leave the second jacket.");
  }

  return bits.join(" ");
}

export function tripFromDraft(draft: TripDraft, weather: WeatherSummary): Trip {
  const nights = draft.nights ?? 3;
  const laundry = draft.laundry === "yes";
  const items = generatePackList({
    nights,
    laundry,
    climate: weather.climate,
    needsRain: weather.needsRain,
    activities: draft.activities,
    mentionedMeds: draft.mentionedMeds,
  });

  return {
    destination: draft.destination ?? weather.placeName,
    placeLabel: weather.country ? `${weather.placeName}, ${weather.country}` : weather.placeName,
    startDate: draft.startDate,
    endDate: draft.endDate,
    nights,
    activities: draft.activities,
    laundry,
    mentionedMeds: draft.mentionedMeds,
    weather,
    items,
    createdAt: new Date().toISOString(),
  };
}

export function preservePacked(previous: PackItem[] | undefined, next: PackItem[]): PackItem[] {
  if (!previous?.length) return next;
  const packed = new Set(previous.filter((item) => item.packed).map((item) => item.id));
  return next.map((item) => (packed.has(item.id) ? { ...item, packed: true } : item));
}
