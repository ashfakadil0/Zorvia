export interface MealOption {
  label: string;
  items: string[];
  proteinFocus?: boolean;
}

export interface MealBlock {
  id: string;
  title: string;
  time: string;
  options: MealOption[];
}

/**
 * Meal library built around affordable, commonly available foods (Bangladesh-friendly).
 * Portions are described in plain language on purpose — no calorie targets are
 * pushed on the user, and nothing here supports crash dieting.
 */
export const MEAL_BLOCKS: MealBlock[] = [
  {
    id: "breakfast",
    title: "Breakfast",
    time: "7:00 – 9:00",
    options: [
      { label: "Eggs & roti", items: ["2 eggs (boiled or lightly fried)", "2 whole-wheat rotis", "A tomato or cucumber"], proteinFocus: true },
      { label: "Oats bowl", items: ["Oats cooked in milk", "1 banana", "A few nuts"], proteinFocus: true },
      { label: "Chira & yogurt", items: ["Flattened rice (chira)", "Plain yogurt (doi)", "Seasonal fruit"] },
    ],
  },
  {
    id: "lunch",
    title: "Lunch",
    time: "13:00 – 14:30",
    options: [
      { label: "Fish plate", items: ["Rice (about a fist-sized portion)", "Fish curry (not fried)", "Dal", "Cooked vegetables"], proteinFocus: true },
      { label: "Chicken plate", items: ["Rice or 2 rotis", "Chicken curry or bhuna", "Mixed vegetable", "Salad"], proteinFocus: true },
      { label: "Veg + egg plate", items: ["Rice", "Dal", "Egg curry", "Shak (leafy greens)"], proteinFocus: true },
    ],
  },
  {
    id: "snack",
    title: "Afternoon snack",
    time: "16:30 – 17:30",
    options: [
      { label: "Protein snack", items: ["Boiled chickpeas (chola)", "or a boiled egg"], proteinFocus: true },
      { label: "Fruit & nuts", items: ["Apple, guava or orange", "A small handful of nuts"] },
      { label: "Dairy", items: ["A glass of milk", "or plain yogurt"], proteinFocus: true },
    ],
  },
  {
    id: "dinner",
    title: "Dinner",
    time: "20:00 – 21:30",
    options: [
      { label: "Light plate", items: ["2 rotis", "Vegetables", "Fish or chicken", "Dal"], proteinFocus: true },
      { label: "Khichuri night", items: ["Dal khichuri", "Egg or fish", "Salad"], proteinFocus: true },
      { label: "Soup & bread", items: ["Vegetable chicken soup", "1–2 rotis", "Salad"], proteinFocus: true },
    ],
  },
];

export const FOOD_GROUPS: { title: string; items: string[]; note: string }[] = [
  {
    title: "Protein",
    note: "Aim for a protein source at every meal.",
    items: ["Eggs", "Fish (rui, ilish, tilapia)", "Chicken", "Dal / lentils", "Chickpeas", "Milk & yogurt", "Paneer / cottage cheese"],
  },
  {
    title: "Carbohydrates",
    note: "Fuel for training — don't cut these out.",
    items: ["Rice", "Roti / whole-wheat", "Oats", "Chira", "Potato", "Sweet potato"],
  },
  {
    title: "Vegetables",
    note: "Fill half the plate whenever you can.",
    items: ["Shak (leafy greens)", "Lau / gourd", "Cabbage", "Carrot", "Tomato", "Cucumber", "Beans"],
  },
  {
    title: "Fruits",
    note: "Whole fruit beats juice.",
    items: ["Banana", "Guava", "Apple", "Papaya", "Orange", "Mango (in season)"],
  },
  {
    title: "Healthy fats",
    note: "Small portions, every day.",
    items: ["Peanuts", "Almonds", "Mustard / soybean oil (in moderation)", "Sesame seeds", "Fatty fish"],
  },
];

export const GENERAL_RULES: string[] = [
  "3 main meals plus 1–2 light snacks per day.",
  "Include a protein source at every meal.",
  "Don't remove rice — adjust the portion instead.",
  "More vegetables: they fill you up with fewer calories.",
  "Cut back on fried food, soft drinks and sweets — not out of guilt, just frequency.",
  "Eat enough on training days. Under-eating kills progress and recovery.",
];

/**
 * Energy estimate using Mifflin-St Jeor. Deliberately conservative:
 * fat-loss goals never subtract more than ~15%, and minors get maintenance
 * or above with a note to involve a parent/guardian and a professional.
 */
export interface EnergyEstimate {
  maintenance: number;
  target: number;
  proteinGrams: number;
  waterMl: number;
  note: string;
  minor: boolean;
}

export function estimateEnergy(input: {
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activityLevel?: "low" | "moderate" | "high";
  goal?: string;
  sexNeutral?: boolean;
}): EnergyEstimate | null {
  const { age, heightCm, weightKg } = input;
  if (!age || !heightCm || !weightKg) return null;

  // Sex-neutral average of the male/female Mifflin-St Jeor constants (+5 / -161).
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 78;
  const factor = input.activityLevel === "high" ? 1.65 : input.activityLevel === "low" ? 1.35 : 1.5;
  const maintenance = Math.round((bmr * factor) / 10) * 10;
  const minor = age < 18;

  let target = maintenance;
  let note =
    "This is a rough estimate to guide portions, not a rule. Adjust based on your energy, training and how you feel.";

  if (minor) {
    target = maintenance;
    note =
      "You're under 18, so Zorvia keeps you at maintenance or above to support growth, recovery and development. For any weight-specific plan, talk to a parent or guardian and a qualified doctor or dietitian.";
  } else if (input.goal === "fat-loss") {
    target = Math.round((maintenance * 0.88) / 10) * 10;
    note =
      "A small, sustainable adjustment (about 12% below maintenance). Never go lower — crash dieting costs you strength, sleep and recovery.";
  } else if (input.goal === "strength" || input.goal === "muscle") {
    target = Math.round((maintenance * 1.08) / 10) * 10;
    note = "A slight surplus to support strength and muscle gains, paired with consistent training and sleep.";
  }

  const proteinGrams = Math.round(weightKg * (minor ? 1.4 : 1.6));
  const waterMl = Math.min(3500, Math.max(1800, Math.round((weightKg * 35) / 100) * 100));

  return { maintenance, target, proteinGrams, waterMl, note, minor };
}
