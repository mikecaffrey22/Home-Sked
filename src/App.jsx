import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

const STORAGE_KEY = "upkeep-data-v1";
const ONBOARDED_KEY = "upkeep-onboarded";
const OLD_STORAGE_KEY = "homesked-data-v3";
const OLD_ONBOARDED_KEY = "homesked-onboarded";

// ── System templates ────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  { name: "Central Air / Furnace", icon: "🔥", category: "HVAC", notes: "", tasks: [
    { name: "Replace air filter", intervalMonths: 3, notes: "Use MERV 8–11 rated filters; check monthly", parts: [{ name: "HVAC air filter", cost: 18, status: "order", brand: "", model: "", size: "" }] },
    { name: "Annual professional service", intervalMonths: 12, notes: "Full tune-up: combustion test, heat exchanger inspection", parts: [{ name: "Professional HVAC service", cost: 250, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect ductwork & vents", intervalMonths: 12, notes: "Check for dust buildup, disconnected joints", parts: [] },
  ]},
  { name: "Fuel Furnace System", icon: "🔥", category: "HVAC", notes: "Includes fuel filter, fuel pump, and burner assembly", tasks: [
    { name: "Replace fuel filter", intervalMonths: 12, notes: "Replace at start of heating season", parts: [{ name: "Fuel oil filter cartridge", cost: 12, status: "order", brand: "", model: "", size: "" }, { name: "Filter wrench", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Annual professional service", intervalMonths: 12, notes: "Full tune-up: nozzle, electrodes, combustion test", parts: [{ name: "Professional HVAC service call", cost: 250, status: "order", brand: "", model: "", size: "" }] },
    { name: "Bleed fuel line / check pump", intervalMonths: 12, notes: "Ensure pump pressure is within spec", parts: [{ name: "Pressure gauge", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Check fuel tank level", intervalMonths: 3, notes: "Inspect for rust, leaks, water contamination", parts: [] },
  ]},
  { name: "Air Purifier", icon: "🌬️", category: "Air Quality", notes: "", tasks: [
    { name: "Replace HEPA filter", intervalMonths: 12, notes: "Use genuine replacement filters", parts: [{ name: "HEPA filter cartridge", cost: 45, status: "order", brand: "", model: "", size: "" }] },
    { name: "Clean pre-filter", intervalMonths: 1, notes: "Rinse under water and air dry", parts: [] },
    { name: "Wipe exterior & sensor", intervalMonths: 3, notes: "Damp cloth; clean air quality sensor", parts: [{ name: "Microfiber cloth", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
  ]},
  { name: "Septic Tank", icon: "🪠", category: "Plumbing", notes: "Document tank size, type, and condition during first inspection", tasks: [
    { name: "Professional pump-out", intervalMonths: 36, notes: "Every 3–5 years depending on size & usage", parts: [{ name: "Professional pump service", cost: 400, status: "order", brand: "", model: "", size: "" }] },
    { name: "Visual inspection", intervalMonths: 12, notes: "Check risers & lids for cracks, odors, standing water", parts: [] },
    { name: "Full professional inspection", intervalMonths: 36, notes: "Document baffles, drain field condition", parts: [{ name: "Professional inspection", cost: 250, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Peat Moss System", icon: "🌿", category: "Septic / Wastewater", notes: "Peat moss wastewater treatment system", tasks: [
    { name: "Inspect bed condition", intervalMonths: 6, notes: "Check for ponding, odors, uneven distribution", parts: [] },
    { name: "Professional inspection", intervalMonths: 12, notes: "Check distribution pipes, dosing pump, peat integrity", parts: [{ name: "Professional inspection", cost: 200, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check dosing pump & floats", intervalMonths: 6, notes: "Verify pump cycles; clean floats", parts: [{ name: "Multimeter", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Replace peat moss media", intervalMonths: 96, notes: "Lifespan ~8–10 years", parts: [{ name: "Peat moss media", cost: 800, status: "order", brand: "", model: "", size: "" }, { name: "Professional labor", cost: 1500, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Electric Water Heater", icon: "🚿", category: "Plumbing", notes: "", tasks: [
    { name: "Flush tank", intervalMonths: 12, notes: "Drain sediment to maintain efficiency", parts: [{ name: "Garden hose", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Inspect anode rod", intervalMonths: 24, notes: "Replace if >50% corroded", parts: [{ name: "Anode rod (magnesium)", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Test T&P relief valve", intervalMonths: 12, notes: "Lift lever — water should flow and stop", parts: [] },
  ]},
  { name: "Water Softener", icon: "💧", category: "Plumbing", notes: "", tasks: [
    { name: "Refill salt", intervalMonths: 2, notes: "Keep salt above water line in brine tank", parts: [{ name: "Water softener salt (40 lb)", cost: 7, status: "order", brand: "", model: "", size: "40 lb bag" }] },
    { name: "Clean brine tank", intervalMonths: 12, notes: "Remove salt bridges; rinse tank", parts: [] },
  ]},
  { name: "EV / Tesla", icon: "⚡", category: "Vehicle", notes: "", tasks: [
    { name: "Rotate tires", intervalMonths: 6, notes: "Every 6,250 miles or 6 months", parts: [{ name: "Tire rotation service", cost: 50, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace cabin air filter", intervalMonths: 24, notes: "Every 2 years; DIY from glove box", parts: [{ name: "Cabin air filter", cost: 28, status: "order", brand: "", model: "", size: "" }] },
    { name: "Test brake fluid", intervalMonths: 48, notes: "Check contamination every 4 years", parts: [{ name: "Brake fluid test strips", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Lubricate brake calipers", intervalMonths: 12, notes: "Clean and lubricate annually", parts: [{ name: "Brake caliper grease", cost: 9, status: "order", brand: "", model: "", size: "" }] },
    { name: "Top off washer fluid", intervalMonths: 3, notes: "", parts: [{ name: "Washer fluid", cost: 4, status: "order", brand: "", model: "", size: "1 gal" }] },
  ]},
  { name: "Gas / ICE Vehicle", icon: "🚗", category: "Vehicle", notes: "", tasks: [
    { name: "Oil change", intervalMonths: 4, notes: "Every 5,000–7,500 miles", parts: [{ name: "Oil change service/supplies", cost: 45, status: "order", brand: "", model: "", size: "" }] },
    { name: "Rotate tires", intervalMonths: 6, notes: "Every 5,000–7,500 miles", parts: [{ name: "Tire rotation service", cost: 30, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace engine air filter", intervalMonths: 12, notes: "Check every oil change", parts: [{ name: "Engine air filter", cost: 15, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace cabin air filter", intervalMonths: 12, notes: "", parts: [{ name: "Cabin air filter", cost: 18, status: "order", brand: "", model: "", size: "" }] },
    { name: "Brake inspection", intervalMonths: 12, notes: "Check pads, rotors, fluid", parts: [] },
    { name: "Coolant flush", intervalMonths: 36, notes: "Per vehicle manual", parts: [{ name: "Coolant flush service", cost: 120, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Washer & Dryer", icon: "👕", category: "Appliances", notes: "", tasks: [
    { name: "Clean dryer vent / duct", intervalMonths: 12, notes: "Fire hazard prevention", parts: [{ name: "Dryer vent brush kit", cost: 15, status: "order", brand: "", model: "", size: "" }] },
    { name: "Clean washer drum & gasket", intervalMonths: 3, notes: "Run cleaning cycle; wipe door gasket", parts: [{ name: "Washing machine cleaner tabs", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check hoses for wear", intervalMonths: 12, notes: "Replace rubber hoses every 5 years", parts: [] },
  ]},
  { name: "Roof & Gutters", icon: "🏠", category: "Exterior", notes: "", tasks: [
    { name: "Clean gutters", intervalMonths: 6, notes: "Spring and fall; check downspouts", parts: [{ name: "Ladder", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Inspect roof", intervalMonths: 12, notes: "Missing shingles, flashing issues", parts: [] },
    { name: "Professional roof inspection", intervalMonths: 36, notes: "Every 3–5 years or after storms", parts: [{ name: "Professional inspection", cost: 200, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Lawn & Yard", icon: "🌱", category: "Exterior", notes: "", tasks: [
    { name: "Fertilize lawn", intervalMonths: 3, notes: "4× per year", parts: [{ name: "Lawn fertilizer bag", cost: 30, status: "order", brand: "", model: "", size: "" }] },
    { name: "Aerate lawn", intervalMonths: 12, notes: "Fall is ideal", parts: [{ name: "Aerator rental", cost: 60, status: "order", brand: "", model: "", size: "" }] },
    { name: "Sharpen mower blades", intervalMonths: 12, notes: "Start of mowing season", parts: [{ name: "Blade sharpener or service", cost: 15, status: "order", brand: "", model: "", size: "" }] },
    { name: "Winterize sprinkler system", intervalMonths: 12, notes: "Before first freeze", parts: [] },
  ]},
  { name: "Swimming Pool", icon: "🏊", category: "Exterior", notes: "Includes pool shell, liner, and water chemistry", tasks: [
    { name: "Test & balance water chemistry", intervalMonths: 0.25, notes: "Test pH, chlorine, alkalinity weekly. Adjust as needed.", parts: [{ name: "Pool test kit / strips", cost: 15, status: "order", brand: "", model: "", size: "" }, { name: "pH increaser/decreaser", cost: 12, status: "order", brand: "", model: "", size: "" }, { name: "Chlorine tablets or liquid", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Skim & vacuum pool", intervalMonths: 0.25, notes: "Skim surface debris; vacuum floor weekly", parts: [{ name: "Skimmer net", cost: 0, status: "on-hand", brand: "", model: "", size: "" }, { name: "Pool vacuum / auto cleaner", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
    { name: "Clean skimmer & pump baskets", intervalMonths: 0.5, notes: "Every 1–2 weeks during swim season", parts: [] },
    { name: "Backwash or clean filter", intervalMonths: 1, notes: "When pressure gauge reads 8–10 PSI above clean baseline", parts: [{ name: "Filter cleaner solution", cost: 12, status: "order", brand: "", model: "", size: "" }] },
    { name: "Shock treatment", intervalMonths: 1, notes: "Monthly or after heavy use / rainstorms", parts: [{ name: "Pool shock (calcium hypochlorite)", cost: 18, status: "order", brand: "", model: "", size: "1 lb bag" }] },
    { name: "Inspect pool equipment", intervalMonths: 6, notes: "Check pump, filter, heater, salt cell (if applicable)", parts: [] },
    { name: "Open pool (spring)", intervalMonths: 12, notes: "Remove cover, reconnect equipment, balance water, run pump", parts: [{ name: "Start-up chemical kit", cost: 40, status: "order", brand: "", model: "", size: "" }] },
    { name: "Close / winterize pool", intervalMonths: 12, notes: "Lower water level, blow out lines, add winterizing chemicals, cover", parts: [{ name: "Pool winterizing chemical kit", cost: 30, status: "order", brand: "", model: "", size: "" }, { name: "Winter pool cover", cost: 0, status: "on-hand", brand: "", model: "", size: "" }] },
  ]},
  { name: "Pool Pump & Filter", icon: "⚙️", category: "Exterior", notes: "Pump, filter, and circulation system", tasks: [
    { name: "Check pump pressure & flow", intervalMonths: 1, notes: "Normal operating pressure varies by system — note your baseline", parts: [{ name: "Pressure gauge (if replacing)", cost: 10, status: "order", brand: "", model: "", size: "" }] },
    { name: "Lubricate pump o-rings", intervalMonths: 6, notes: "Use silicone-based lubricant on pump lid and valve o-rings", parts: [{ name: "Silicone lubricant", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace filter cartridge or sand", intervalMonths: 12, notes: "Cartridge: replace annually. Sand: every 5–7 years. DE: recharge after backwash.", parts: [{ name: "Filter cartridge", cost: 35, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect pump motor & seals", intervalMonths: 12, notes: "Listen for noise, check for leaks at shaft seal", parts: [{ name: "Pump shaft seal kit", cost: 15, status: "order", brand: "", model: "", size: "" }] },
    { name: "Professional pump service", intervalMonths: 24, notes: "Full inspection; motor, impeller, seals", parts: [{ name: "Professional pool service", cost: 150, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Pest Control", icon: "🐜", category: "Exterior", notes: "Preventative pest management for home perimeter and interior", tasks: [
    { name: "Professional perimeter treatment", intervalMonths: 3, notes: "Quarterly exterior spray — foundation, entry points, eaves", parts: [{ name: "Quarterly pest service", cost: 100, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect for termites", intervalMonths: 12, notes: "Annual visual check; look for mud tubes, wood damage, swarmers", parts: [] },
    { name: "Professional termite inspection", intervalMonths: 12, notes: "Annual pro inspection — some states require for real estate", parts: [{ name: "Termite inspection service", cost: 75, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check & refresh bait stations", intervalMonths: 3, notes: "Inspect rodent and ant bait stations around property", parts: [{ name: "Bait station refills", cost: 12, status: "order", brand: "", model: "", size: "" }] },
    { name: "Seal entry points", intervalMonths: 12, notes: "Caulk gaps around pipes, vents, windows, doors; steel wool for mouse holes", parts: [{ name: "Exterior caulk", cost: 6, status: "order", brand: "", model: "", size: "" }, { name: "Steel wool pads", cost: 4, status: "order", brand: "", model: "", size: "" }] },
    { name: "Clean gutters & remove debris", intervalMonths: 6, notes: "Standing water and leaf piles attract pests — mosquitoes, carpenter ants", parts: [] },
  ]},
  { name: "Boat / Watercraft", icon: "🚤", category: "Marine", notes: "Inboard or outboard boat — engine, hull, trailer, and systems", tasks: [
    { name: "Engine oil & filter change", intervalMonths: 12, notes: "Change at end of season or every 100 hours — use marine-grade oil", parts: [{ name: "Marine engine oil (5 qt)", cost: 35, status: "order", brand: "", model: "", size: "" }, { name: "Oil filter", cost: 12, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace fuel filter / water separator", intervalMonths: 12, notes: "Replace annually; check for water in fuel bowl regularly", parts: [{ name: "Fuel filter / water separator", cost: 18, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect & replace impeller", intervalMonths: 12, notes: "Raw water pump impeller — replace annually or every 200 hours to prevent overheating", parts: [{ name: "Impeller kit", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check belts & hoses", intervalMonths: 12, notes: "Inspect for cracking, swelling, soft spots; replace every 3–4 years", parts: [] },
    { name: "Replace spark plugs / check ignition", intervalMonths: 12, notes: "Outboard: replace plugs annually. Inboard: check distributor, wires.", parts: [{ name: "Spark plug set", cost: 20, status: "order", brand: "", model: "", size: "" }] },
    { name: "Grease fittings & steering", intervalMonths: 3, notes: "Grease prop shaft, steering cable, tilt/trim, and trailer wheel bearings", parts: [{ name: "Marine grease cartridge", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect anodes (zincs)", intervalMonths: 6, notes: "Replace when 50%+ eroded — protects against galvanic corrosion", parts: [{ name: "Zinc anode set", cost: 30, status: "order", brand: "", model: "", size: "" }] },
    { name: "Bottom paint / hull cleaning", intervalMonths: 12, notes: "Haul out and repaint bottom annually if kept in water; clean hull growth", parts: [{ name: "Antifouling bottom paint (1 gal)", cost: 75, status: "order", brand: "", model: "", size: "" }] },
    { name: "Battery check & maintenance", intervalMonths: 3, notes: "Check voltage, terminals, electrolyte level; charge if stored", parts: [{ name: "Battery terminal cleaner / protectant", cost: 6, status: "order", brand: "", model: "", size: "" }] },
    { name: "Safety equipment inspection", intervalMonths: 12, notes: "Check fire extinguisher, flares (expiration), PFDs, horn, throwable device, first aid kit", parts: [{ name: "Flare kit (replacement)", cost: 30, status: "order", brand: "", model: "", size: "" }] },
    { name: "Winterize engine & systems", intervalMonths: 12, notes: "Fog engine, drain water, add antifreeze to raw water system, stabilize fuel, remove drain plugs", parts: [{ name: "Fuel stabilizer", cost: 10, status: "order", brand: "", model: "", size: "" }, { name: "Engine fogging oil", cost: 12, status: "order", brand: "", model: "", size: "" }, { name: "RV antifreeze (2 gal)", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Spring commissioning", intervalMonths: 12, notes: "Reinstall drain plugs, charge batteries, check all systems, test run engine before launch", parts: [] },
    { name: "Trailer inspection", intervalMonths: 12, notes: "Repack wheel bearings, check tires & pressure, inspect lights, winch strap, bunks/rollers", parts: [{ name: "Trailer bearing kit", cost: 20, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Generator", icon: "🔌", category: "Exterior", notes: "Whole-house or portable standby generator", tasks: [
    { name: "Run & load test", intervalMonths: 1, notes: "Run under load for 15–30 min monthly to keep engine and transfer switch exercised", parts: [] },
    { name: "Oil & filter change", intervalMonths: 12, notes: "Change annually or every 100–200 hours", parts: [{ name: "Generator oil + filter kit", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace spark plug", intervalMonths: 12, notes: "Annually or per manufacturer schedule", parts: [{ name: "Spark plug", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace air filter", intervalMonths: 12, notes: "More often in dusty environments", parts: [{ name: "Air filter", cost: 12, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check fuel system", intervalMonths: 6, notes: "Inspect fuel lines, add stabilizer if stored. For propane/NG: check connections.", parts: [{ name: "Fuel stabilizer", cost: 10, status: "order", brand: "", model: "", size: "" }] },
    { name: "Battery check", intervalMonths: 6, notes: "Check voltage, clean terminals, replace every 3 years", parts: [] },
    { name: "Professional service", intervalMonths: 24, notes: "Full inspection: transfer switch, coolant, belts, hoses", parts: [{ name: "Generator service call", cost: 300, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Fireplace & Chimney", icon: "🪵", category: "HVAC", notes: "Wood-burning, gas, or pellet fireplace and chimney system", tasks: [
    { name: "Professional chimney sweep", intervalMonths: 12, notes: "Before heating season — removes creosote buildup, inspects flue", parts: [{ name: "Chimney sweep service", cost: 250, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect chimney cap & crown", intervalMonths: 12, notes: "Check for cracks, missing cap, animal nests", parts: [] },
    { name: "Check damper operation", intervalMonths: 12, notes: "Should open/close freely with good seal", parts: [] },
    { name: "Inspect firebox & mortar", intervalMonths: 12, notes: "Look for cracked mortar, damaged firebrick", parts: [] },
    { name: "Clean glass doors", intervalMonths: 3, notes: "Soot buildup on glass — use fireplace glass cleaner", parts: [{ name: "Fireplace glass cleaner", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace gasket / seal", intervalMonths: 24, notes: "Door gasket wears over time — check for air leaks", parts: [{ name: "Fireplace door gasket kit", cost: 15, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Garage Door", icon: "🚗", category: "Exterior", notes: "Garage door opener, springs, tracks, and hardware", tasks: [
    { name: "Lubricate moving parts", intervalMonths: 6, notes: "Spray hinges, rollers, springs, and tracks with silicone or lithium grease", parts: [{ name: "Garage door lubricant", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Test auto-reverse safety", intervalMonths: 3, notes: "Place 2x4 on floor under door — must reverse on contact", parts: [] },
    { name: "Inspect springs & cables", intervalMonths: 6, notes: "Look for fraying cables, rust on springs. DO NOT attempt spring replacement — call a pro.", parts: [] },
    { name: "Tighten hardware", intervalMonths: 12, notes: "Check and tighten all bolts, brackets, roller hinges", parts: [] },
    { name: "Replace weather stripping", intervalMonths: 24, notes: "Bottom seal and side seals — keeps out water, pests, drafts", parts: [{ name: "Garage door seal kit", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace opener battery", intervalMonths: 12, notes: "Backup battery in opener unit", parts: [{ name: "Opener backup battery", cost: 30, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Sump Pump", icon: "💧", category: "Plumbing", notes: "Primary and backup sump pump system", tasks: [
    { name: "Test pump operation", intervalMonths: 3, notes: "Pour water into pit until float triggers — verify pump runs and discharges", parts: [] },
    { name: "Clean pit & inlet screen", intervalMonths: 6, notes: "Remove debris, gravel, sediment from pit. Clean check valve.", parts: [] },
    { name: "Test backup pump / battery", intervalMonths: 3, notes: "Disconnect primary power and verify backup engages", parts: [] },
    { name: "Replace backup battery", intervalMonths: 36, notes: "Battery backup pumps need new battery every 3 years", parts: [{ name: "Sump pump backup battery", cost: 100, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect discharge line", intervalMonths: 12, notes: "Check for clogs, proper slope, frozen sections in winter", parts: [] },
    { name: "Replace sump pump", intervalMonths: 84, notes: "Average lifespan 7–10 years — replace proactively", parts: [{ name: "Sump pump", cost: 150, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Well & Well Pump", icon: "🪣", category: "Plumbing", notes: "Private well water system — pump, pressure tank, and treatment", tasks: [
    { name: "Water quality test", intervalMonths: 12, notes: "Test for bacteria, nitrates, pH, hardness annually. More often if issues.", parts: [{ name: "Water test kit or lab fee", cost: 50, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check pressure tank", intervalMonths: 6, notes: "Verify air charge with tire gauge — should match cut-in pressure. Check for waterlogging.", parts: [] },
    { name: "Inspect pressure switch", intervalMonths: 12, notes: "Clean contacts, check cut-in/cut-out pressure settings", parts: [] },
    { name: "Sanitize well (shock chlorination)", intervalMonths: 12, notes: "Pour bleach solution into well casing, run through system, flush", parts: [{ name: "Unscented bleach", cost: 5, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace sediment filter", intervalMonths: 6, notes: "Whole-house sediment filter at well head or pressure tank", parts: [{ name: "Sediment filter cartridge", cost: 12, status: "order", brand: "", model: "", size: "" }] },
    { name: "Professional well inspection", intervalMonths: 36, notes: "Flow rate test, pump performance, casing inspection", parts: [{ name: "Well inspection service", cost: 300, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Mini-Split / Heat Pump", icon: "❄️", category: "HVAC", notes: "Ductless mini-split or heat pump system — indoor and outdoor units", tasks: [
    { name: "Clean indoor unit filters", intervalMonths: 1, notes: "Remove, wash with mild soap, air dry. Critical for efficiency.", parts: [] },
    { name: "Clean indoor unit coil & drain", intervalMonths: 6, notes: "Spray coil cleaner, flush condensate drain line with vinegar", parts: [{ name: "Coil cleaner spray", cost: 10, status: "order", brand: "", model: "", size: "" }] },
    { name: "Clean outdoor unit", intervalMonths: 6, notes: "Rinse coil fins with hose, remove debris, trim vegetation 2ft clearance", parts: [] },
    { name: "Professional deep clean", intervalMonths: 12, notes: "Full teardown clean of indoor head — blower wheel, barrel fan, drain pan", parts: [{ name: "Mini-split deep clean service", cost: 150, status: "order", brand: "", model: "", size: "" }] },
    { name: "Check refrigerant & electrical", intervalMonths: 24, notes: "Pro check: refrigerant charge, electrical connections, capacitor", parts: [{ name: "HVAC service call", cost: 200, status: "order", brand: "", model: "", size: "" }] },
  ]},
];

const CATEGORIES = ["All", "Air Quality", "HVAC", "Plumbing", "Septic / Wastewater", "Vehicle", "Appliances", "Exterior", "Marine"];

// ── Affiliate config ────────────────────────────────────────────────
// Set your affiliate tags here once approved. Leave blank until then.
const AFFILIATE = {
  amazon: "upkeep20-20",       // Amazon Associates tag
  homeDepot: "",    // e.g., your Impact Radius affiliate ID
  lowes: "",        // e.g., your affiliate ID
};
const tagUrl = (url, part) => {
  if (url) {
    try { const u = new URL(url); if (AFFILIATE.amazon && (u.hostname.includes("amazon.com") || u.hostname.includes("amzn.to"))) { u.searchParams.set("tag", AFFILIATE.amazon); return u.toString(); } } catch (e) {}
    return url;
  }
  // Auto-generate Amazon search link from part details
  if (part) {
    const q = [part.name, part.brand, part.model, part.size].filter(Boolean).join(" ").trim();
    const base = `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;
    return AFFILIATE.amazon ? `${base}&tag=${AFFILIATE.amazon}` : base;
  }
  return "";
};

// ── Helpers ─────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);
const isAsReq = (t) => t.taskType === "as-required";
const getNextDue = (t) => { if (isAsReq(t)) return null; if (!t.lastCompleted) return null; const d = new Date(t.lastCompleted); d.setMonth(d.getMonth() + t.intervalMonths); return d; };
const daysUntil = (d) => d ? Math.ceil((d - new Date()) / 864e5) : null;
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
const formatInterval = (m) => { if (m < 1) return "Weekly"; if (m === 1) return "Monthly"; if (m < 12) return `Every ${m} mo`; if (m === 12) return "Annually"; return m % 12 === 0 ? `Every ${m/12} yr` : `Every ${m} mo`; };
const fmtCost = (n) => n === 0 ? "—" : `$${Number(n).toFixed(2)}`;
const getStatusColor = (t) => { if (isAsReq(t)) return "#6B7D8A"; const n = getNextDue(t); if (!n) return "#8B7355"; const d = daysUntil(n); return d < 0 ? "#C0392B" : d <= 30 ? "#D4A017" : "#2E7D32"; };
const getStatusLabel = (t) => { if (isAsReq(t)) { const wl = t.workLog || []; return wl.length > 0 ? `${wl.length} log entr${wl.length===1?"y":"ies"}` : "As needed"; } const n = getNextDue(t); if (!n) return "Not yet tracked"; const d = daysUntil(n); if (d < 0) return `Overdue ${Math.abs(d)}d`; if (d === 0) return "Due today"; if (d <= 14) return `Due in ${d}d`; if (d <= 60) return `Due in ${Math.ceil(d/7)}w`; return `Due ${n.toLocaleDateString("en-US",{month:"short",year:"numeric"})}`; };

// ── Storage ─────────────────────────────────────────────────────────
const migrate = (raw) => {
  const migTask = (t) => ({ taskType: "scheduled", workLog: [], ...t, parts: (t.parts||[]).map(p => ({ brand:"", model:"", size:"", purchaseUrl:"", ...p })) });
  if (Array.isArray(raw)) return [{ id: genId(), name: "My Home", icon: "🏡", systems: raw.map(s => ({ ...s, tasks: s.tasks.map(migTask) })) }];
  if (raw.homes) return raw.homes.map(h => ({ ...h, systems: h.systems.map(s => ({ ...s, tasks: s.tasks.map(migTask) })) }));
  return [];
};
const loadData = () => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return migrate(JSON.parse(r)); const old3 = localStorage.getItem(OLD_STORAGE_KEY); if (old3) return migrate(JSON.parse(old3)); const old2 = localStorage.getItem("homesked-data-v2"); if (old2) return migrate(JSON.parse(old2)); } catch(e) { console.error(e); } return []; };
const saveData = (homes) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ homes })); } catch(e) { console.error(e); } };

// ── Parts editor ────────────────────────────────────────────────────
const PartsEditor = ({ parts, onChange }) => {
  const [nn, setNn] = useState(""); const [nc, setNc] = useState(""); const [ns, setNs] = useState("order");
  const [nb, setNb] = useState(""); const [nm, setNm] = useState(""); const [nz, setNz] = useState("");
  const [expanded, setExpanded] = useState(null);
  const add = () => { if (!nn.trim()) return; onChange([...parts, { id: genId(), name: nn.trim(), cost: Number(nc)||0, status: ns, brand: nb.trim(), model: nm.trim(), size: nz.trim(), purchaseUrl:"" }]); setNn(""); setNc(""); setNs("order"); setNb(""); setNm(""); setNz(""); };
  return (
    <div style={S.partsEditor}>
      {parts.length > 0 && <div style={S.partsListEdit}>
        {parts.map((p) => (
          <div key={p.id}>
            <div style={S.partRowEdit}>
              <button style={p.status === "on-hand" ? S.partToggleOn : S.partToggleOff} onClick={() => onChange(parts.map(x => x.id===p.id ? {...x, status: x.status==="on-hand"?"order":"on-hand"} : x))}>{p.status==="on-hand"?"✓":"🛒"}</button>
              <span style={{...S.partEditName, cursor:"pointer"}} onClick={() => setExpanded(expanded===p.id?null:p.id)}>{p.name} {(p.brand||p.model||p.size) && <span style={{color:K.textMuted, fontSize:11}}>({[p.brand,p.model,p.size].filter(Boolean).join(" · ")})</span>}</span>
              <span style={S.partEditCost}>{fmtCost(p.cost)}</span>
              <button style={S.partRemoveBtn} onClick={() => onChange(parts.filter(x=>x.id!==p.id))}>×</button>
            </div>
            {expanded===p.id && (
              <div style={S.partDetailEdit}>
                <div style={S.partDetailRow}>
                  <input style={{...S.partInput, flex:1}} value={p.brand||""} onChange={e => onChange(parts.map(x=>x.id===p.id?{...x,brand:e.target.value}:x))} placeholder="Brand" />
                  <input style={{...S.partInput, flex:1}} value={p.model||""} onChange={e => onChange(parts.map(x=>x.id===p.id?{...x,model:e.target.value}:x))} placeholder="Model #" />
                  <input style={{...S.partInput, flex:1}} value={p.size||""} onChange={e => onChange(parts.map(x=>x.id===p.id?{...x,size:e.target.value}:x))} placeholder="Size / specs" />
                </div>
                <div style={{marginTop:6}}>
                  <input style={{...S.partInput, width:"100%", boxSizing:"border-box"}} value={p.purchaseUrl||""} onChange={e => onChange(parts.map(x=>x.id===p.id?{...x,purchaseUrl:e.target.value}:x))} placeholder="🔗 Purchase link (Amazon, Home Depot, etc.)" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>}
      <div style={S.partAddRow}>
        <input style={{...S.partInput, flex:2}} value={nn} onChange={e=>setNn(e.target.value)} placeholder="Item name" onKeyDown={e=>e.key==="Enter"&&add()} />
        <input style={{...S.partInput, flex:0.6}} type="number" min="0" step="0.01" value={nc} onChange={e=>setNc(e.target.value)} placeholder="$" onKeyDown={e=>e.key==="Enter"&&add()} />
        <select style={{...S.partInput, flex:0.7}} value={ns} onChange={e=>setNs(e.target.value)}><option value="order">🛒</option><option value="on-hand">✓</option></select>
        <button style={S.partAddBtn} onClick={add} disabled={!nn.trim()}>+</button>
      </div>
      <p style={{fontSize:11, color:K.textMuted, margin:"6px 0 0", fontFamily:sf}}>Tap an item to add brand, model, and size details.</p>
    </div>
  );
};

// ── Parts display ───────────────────────────────────────────────────
const PartsDisplay = ({ parts }) => {
  if (!parts || parts.length === 0) return null;
  const orderP = parts.filter(p=>p.status==="order"), onHandP = parts.filter(p=>p.status==="on-hand");
  const orderCost = orderP.reduce((s,p)=>s+(p.cost||0),0);
  const PartLine = ({p, muted}) => {
    const isService = /service|professional|contractor|inspection|rental|labor/i.test(p.name);
    const buyUrl = tagUrl(p.purchaseUrl, p);
    return (
    <div style={S.partRow}>
      <div style={{flex:1}}>
        <span style={{...S.partName, ...(muted?{color:K.textMuted}:{})}}>{p.name}</span>
        {(p.brand||p.model||p.size) && <div style={{fontSize:10, color:K.textMuted, fontFamily:sf, marginTop:1}}>{[p.brand,p.model,p.size].filter(Boolean).join(" · ")}</div>}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={S.partCost}>{fmtCost(p.cost)}</span>
        {!isService && p.cost>0 && buyUrl && <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={S.buyLink} onClick={e=>e.stopPropagation()}>Buy</a>}
      </div>
    </div>
  );};
  return (
    <div style={S.partsSection}>
      <div style={S.partsSectionHead}><span style={S.partsSectionTitle}>🧰 Parts, Tools & Materials</span>{orderCost>0&&<span style={S.partsCostBadge}>${orderCost.toFixed(2)} to order</span>}</div>
      {orderP.length>0 && <div style={S.partsGroup}><div style={S.partsGroupLabel}><span style={S.orderDot}/>Needs Ordering</div>{orderP.map(p=><PartLine key={p.id} p={p}/>)}</div>}
      {onHandP.length>0 && <div style={S.partsGroup}><div style={S.partsGroupLabel}><span style={S.onHandDot}/>On Hand</div>{onHandP.map(p=><PartLine key={p.id} p={p} muted/>)}</div>}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [homes, setHomes] = useState([]);
  const [activeHomeId, setActiveHomeId] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [view, setView] = useState("dashboard");
  const [listView, setListView] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState("login"); // login, signup, forgot
  const [authEmail, setAuthEmail] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [formSystem, setFormSystem] = useState({ name:"", icon:"🔧", category:"HVAC", notes:"" });
  const [formTask, setFormTask] = useState({ name:"", intervalMonths:12, notes:"", parts:[], taskType:"scheduled", season:"" });
  const [formHome, setFormHome] = useState({ name:"", icon:"🏡" });
  const [showHomePicker, setShowHomePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogModal, setShowLogModal] = useState(null);

  // ── Cloud sync helpers ──
  const loadFromCloud = async (uid) => {
    try {
      const { data, error } = await supabase.from("user_data").select("homes").eq("user_id", uid).single();
      if (data && data.homes) return migrate({ homes: data.homes });
    } catch (e) { console.error("Cloud load error:", e); }
    return null;
  };
  const saveToCloud = async (uid, homesData) => {
    try {
      await supabase.from("user_data").upsert({ user_id: uid, homes: homesData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    } catch (e) { console.error("Cloud save error:", e); }
  };

  // ── Auth handlers ──
  const handleSignup = async () => {
    setAuthError(""); setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    if (data?.user?.identities?.length === 0) { setAuthError("An account with this email already exists."); return; }
    showToast("Check your email to confirm your account!");
  };
  const handleLogin = async () => {
    setAuthError(""); setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    setAuthLoading(false);
    if (error) setAuthError(error.message);
  };
  const handleForgot = async () => {
    setAuthError(""); setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    showToast("Password reset email sent!");
    setAuthView("login");
  };
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowAccount(false);
  };

  // ── Init: check auth + load data ──
  useEffect(() => {
    // Load local data first (always available offline)
    const localData = loadData();
    setHomes(localData);
    if (localData.length > 0) setActiveHomeId(localData[0].id);
    const isReturning = localStorage.getItem(ONBOARDED_KEY)==="true" || localStorage.getItem(OLD_ONBOARDED_KEY)==="true" || localData.length > 0;
    setOnboarded(isReturning);
    setShowLanding(!isReturning);
    setLoaded(true);

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        // Load cloud data and merge if newer
        loadFromCloud(session.user.id).then(cloudData => {
          if (cloudData && cloudData.length > 0) {
            setHomes(cloudData);
            setActiveHomeId(cloudData[0]?.id);
            setOnboarded(true);
            setShowLanding(false);
          }
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const cloudData = await loadFromCloud(session.user.id);
        if (cloudData && cloudData.length > 0) {
          setHomes(cloudData);
          setActiveHomeId(cloudData[0]?.id);
          setOnboarded(true);
          setShowLanding(false);
        } else {
          // First login — push local data to cloud
          const local = loadData();
          if (local.length > 0) await saveToCloud(session.user.id, local);
        }
      } else {
        setUser(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Save to localStorage AND cloud when data changes
  useEffect(() => {
    if (!loaded) return;
    saveData(homes);
    if (user) saveToCloud(user.id, homes);
  }, [homes, loaded]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(()=>setToast(null), 2500); }, []);

  const home = homes.find(h=>h.id===activeHomeId);
  const systems = home?.systems || [];
  const setSystems = (fn) => setHomes(prev => prev.map(h => h.id===activeHomeId ? { ...h, systems: typeof fn==="function" ? fn(h.systems) : fn } : h));

  // ── Home actions ──
  const addHome = () => {
    const h = { id: genId(), name: formHome.name||"New Home", icon: formHome.icon||"🏡", systems: [] };
    setHomes(prev => [...prev, h]); setActiveHomeId(h.id); setFormHome({name:"",icon:"🏡"}); setView("dashboard"); showToast(`Added ${h.name}`);
  };
  const deleteHome = (id) => {
    if (homes.length <= 1) return showToast("Need at least one home");
    setHomes(prev => prev.filter(h=>h.id!==id));
    if (activeHomeId===id) setActiveHomeId(homes.find(h=>h.id!==id)?.id||null);
    showToast("Home removed");
  };
  const renameHome = (id, name) => setHomes(prev => prev.map(h => h.id===id ? {...h, name} : h));

  // ── System/task actions ──
  const markComplete = (sId, tId, date) => { setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:s.tasks.map(t=>t.id===tId?{...t,lastCompleted:date,workLog:[...(t.workLog||[]),{id:genId(),date,notes:"Completed"}]}:t)}:s)); setShowCompleteModal(null); showToast("Marked complete ✓"); };
  const logWorkEntry = (sId, tId, entry) => { setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:s.tasks.map(t=>t.id===tId?{...t,lastCompleted:entry.date,workLog:[...(t.workLog||[]),entry]}:t)}:s)); setShowLogModal(null); showToast("Logged ✓"); };
  const addSystemFromTemplate = (tpl) => {
    const sys = { id:genId(), name:tpl.name, icon:tpl.icon, category:tpl.category, notes:tpl.notes, tasks: tpl.tasks.map(t=>({...t, id:genId(), lastCompleted:null, parts:(t.parts||[]).map(p=>({...p, id:genId()}))})) };
    setSystems(prev=>[...prev, sys]); showToast(`Added ${tpl.name}`);
  };
  const addSystem = () => { setSystems(prev=>[...prev, {...formSystem, id:genId(), tasks:[]}]); setFormSystem({name:"",icon:"🔧",category:"HVAC",notes:""}); setView("dashboard"); showToast("System added"); };
  const deleteSystem = (id) => { setSystems(prev=>prev.filter(s=>s.id!==id)); setView("dashboard"); setSelectedSystem(null); showToast("System removed"); };
  const editSystem = (id) => { const sys=systems.find(s=>s.id===id); if(sys){setFormSystem({name:sys.name,icon:sys.icon,category:sys.category,notes:sys.notes||""});setView("edit-system");} }; 
  const saveEditSystem = (id) => { setSystems(prev=>prev.map(s=>s.id===id?{...s,...formSystem}:s)); setView("system"); showToast("System updated ✓"); };
  const addTask = (sId) => { const t={...formTask,id:genId(),lastCompleted:null,intervalMonths:Number(formTask.intervalMonths),workLog:[]}; setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:[...s.tasks,t]}:s)); setFormTask({name:"",intervalMonths:12,notes:"",parts:[],taskType:"scheduled",season:""}); setView("system"); showToast("Task added"); };
  const updateTask = (sId, tId) => { setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:s.tasks.map(t=>t.id===tId?{...t,...formTask,intervalMonths:Number(formTask.intervalMonths)}:t)}:s)); setFormTask({name:"",intervalMonths:12,notes:"",parts:[],taskType:"scheduled",season:""}); setEditingTask(null); setView("system"); showToast("Task updated"); };
  const deleteTask = (sId, tId) => { setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:s.tasks.filter(t=>t.id!==tId)}:s)); showToast("Task removed"); };
  const finishOnboarding = () => {
    if (homes.length === 0) { const h = { id: genId(), name: "My Home", icon: "🏡", systems: [] }; setHomes([h]); setActiveHomeId(h.id); }
    setOnboarded(true); localStorage.setItem(ONBOARDED_KEY,"true"); setView("dashboard");
  };

  // ── Computed ──
  const allTasks = systems.flatMap(s=>s.tasks.map(t=>({...t, systemId:s.id, systemName:s.name, systemIcon:s.icon})));
  const urgentTasks = allTasks.map(t=>({...t,next:getNextDue(t),days:daysUntil(getNextDue(t))})).filter(t=>t.days!==null&&t.days<=30).sort((a,b)=>a.days-b.days);
  const untrackedTasks = allTasks.filter(t=>!t.lastCompleted);
  const filteredSystems = (categoryFilter==="All" ? systems : systems.filter(s=>s.category===categoryFilter)).filter(s=>!seasonFilter||s.tasks.some(t=>t.season===seasonFilter));
  const annualCost = systems.reduce((total,s)=>total+s.tasks.filter(t=>!isAsReq(t)).reduce((st,t)=>{const timesPerYear=t.intervalMonths>0?12/t.intervalMonths:0;const taskCost=(t.parts||[]).filter(p=>p.status==="order").reduce((pc,p)=>pc+(p.cost||0),0);return st+taskCost*timesPerYear;},0),0);
  const overdueTasks = allTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;
  const upcomingTaskList = allTasks.map(t=>({...t,next:getNextDue(t),days:daysUntil(getNextDue(t))})).filter(t=>t.days!==null&&t.days>=0&&t.days<=30).sort((a,b)=>a.days-b.days);
  const upcomingCount = upcomingTaskList.length;
  const overdueTaskList = allTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).sort((a,b)=>daysUntil(getNextDue(a))-daysUntil(getNextDue(b)));
  const searchResults = searchQuery.trim().length>=2 ? allTasks.filter(t=>{const q=searchQuery.toLowerCase();return t.name.toLowerCase().includes(q)||t.systemName.toLowerCase().includes(q)||(t.notes||"").toLowerCase().includes(q)||(t.parts||[]).some(p=>p.name.toLowerCase().includes(q));}) : [];
  const exportData = () => { const blob=new Blob([JSON.stringify({homes,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`upkeep-backup-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url); showToast("Data exported ✓"); };
  const importData = () => { const input=document.createElement("input"); input.type="file"; input.accept=".json"; input.onchange=(e)=>{const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=(ev)=>{try{const data=JSON.parse(ev.target.result); if(data.homes){setHomes(data.homes);setActiveHomeId(data.homes[0]?.id);showToast("Data imported ✓");}else{showToast("Invalid file format");}}catch(err){showToast("Import failed");}}; reader.readAsText(file);}; input.click(); };
  const addToCalendar = (task) => { const next=getNextDue(task); if(!next)return; const d=next.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; const end=new Date(next.getTime()+3600000).toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; const url=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("Upkeep: "+task.name)}&dates=${d}/${end}&details=${encodeURIComponent(task.notes||"")}`; window.open(url,"_blank"); };

  if (!loaded) return <div style={S.loadingWrap}><div style={S.loadingText}>Loading Upkeep…</div></div>;

  // ═══ LANDING PAGE ═══
  if (showLanding && !onboarded) {
    const LP = S.lp;
    return (
      <div className="app-container" style={{...S.app,background:K.bg}}>
        {/* Hero */}
        <div style={LP.hero}>
          <div style={LP.heroInner}>
            <div style={LP.badge}>Maintenance Tracking for Everything You Own</div>
            <h1 style={LP.heroTitle}>Your home,<br/><em style={{fontStyle:"italic",color:K.accent}}>handled.</em></h1>
            <p style={LP.heroSub}>Upkeep tracks every maintenance task, part, and due date for your home, vehicles, and boat — so nothing falls through the cracks.</p>
            <button style={LP.heroCta} onClick={()=>setShowLanding(false)}>Get Started — It's Free</button>
            <p style={LP.heroNote}>No account needed to start. <button style={{background:"transparent",border:"none",color:K.accent,textDecoration:"underline",fontSize:12,cursor:"pointer",fontFamily:sf,padding:0}} onClick={()=>{setShowLanding(false);setView("auth");}}>Sign in</button> to sync across devices.</p>
          </div>
        </div>

        {/* Problem */}
        <div style={LP.section}>
          <div style={LP.sectionInner}>
            <h2 style={LP.sectionTitle}>Maintenance never stops</h2>
            <p style={LP.sectionText}>Your furnace filter is 3 months overdue. The car's cabin air filter? You can't remember. The boat impeller should've been replaced before the season started. And the dryer vent hasn't been cleaned since you moved in. You don't forget because you don't care — you forget because there's no system.</p>
          </div>
        </div>

        {/* Solution */}
        <div style={{...LP.section,background:K.accentLight}}>
          <div style={LP.sectionInner}>
            <h2 style={{...LP.sectionTitle,color:K.accent}}>Upkeep is your system.</h2>
            <div style={LP.featureGrid}>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>📋</span>
                <h3 style={LP.featureTitle}>22 Pre-Built Templates</h3>
                <p style={LP.featureText}>HVAC, water heater, pool, generator, washer & dryer, gas and electric vehicles, boats — each loaded with the right tasks, intervals, and parts.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>⏰</span>
                <h3 style={LP.featureTitle}>Smart Scheduling</h3>
                <p style={LP.featureText}>See what's due, what's overdue, and what's coming up. Seasonal tags help you plan ahead for spring, summer, fall, and winter.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>🧰</span>
                <h3 style={LP.featureTitle}>Parts & Cost Tracking</h3>
                <p style={LP.featureText}>Every task lists what you need, what it costs, and whether you have it on hand. One-tap links to buy the right part.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>🏘️</span>
                <h3 style={LP.featureTitle}>Multi-Home Support</h3>
                <p style={LP.featureText}>Own a rental? A vacation home? Track maintenance across every property from a single dashboard.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>📅</span>
                <h3 style={LP.featureTitle}>Calendar Integration</h3>
                <p style={LP.featureText}>Push any task straight to Google Calendar so it shows up where you actually look.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>📥</span>
                <h3 style={LP.featureTitle}>Export & Backup</h3>
                <p style={LP.featureText}>Download your entire maintenance history as a JSON file. Import it on any device. Your data is always yours.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={LP.section}>
          <div style={LP.sectionInner}>
            <h2 style={LP.sectionTitle}>How it works</h2>
            <div style={LP.stepsRow}>
              <div style={LP.step}><div style={LP.stepNum}>1</div><h3 style={LP.stepTitle}>Pick your systems</h3><p style={LP.stepText}>Choose from 22 templates — furnace, pool, EV, boat, generator, and more.</p></div>
              <div style={LP.step}><div style={LP.stepNum}>2</div><h3 style={LP.stepTitle}>Set your dates</h3><p style={LP.stepText}>Tell us when you last did each task. We calculate when it's due next.</p></div>
              <div style={LP.step}><div style={LP.stepNum}>3</div><h3 style={LP.stepTitle}>Stay on top of it</h3><p style={LP.stepText}>Check your dashboard, mark tasks done, and never wonder "when did I last…" again.</p></div>
            </div>
          </div>
        </div>

        {/* Annual cost */}
        <div style={{...LP.section,background:"#1A1A1A",color:"#fff"}}>
          <div style={{...LP.sectionInner,textAlign:"center"}}>
            <h2 style={{...LP.sectionTitle,color:"#fff"}}>Homes, cars, and boats don't maintain themselves.</h2>
            <p style={{...LP.sectionText,color:"rgba(255,255,255,0.7)",maxWidth:500,margin:"0 auto"}}>Between your property, vehicles, and toys, you're spending thousands a year on upkeep. This app shows you exactly where that money goes — and helps you plan for it instead of getting surprised.</p>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{...LP.section,paddingBottom:60}}>
          <div style={{...LP.sectionInner,textAlign:"center"}}>
            <span style={{fontSize:48}}>△</span>
            <h2 style={{...LP.sectionTitle,marginTop:12}}>Ready to take control?</h2>
            <p style={{...LP.sectionText,marginBottom:24}}>Set up your home, car, or boat in under 2 minutes. Free forever for a single property.</p>
            <button style={LP.heroCta} onClick={()=>setShowLanding(false)}>Get Started Free</button>
          </div>
        </div>

        {/* Footer */}
        <div style={LP.footer}>
          <p style={LP.footerText}>Upkeep — Everything you own, maintained.</p>
        </div>
      </div>
    );
  }

  // ═══ ONBOARDING ═══
  if (!onboarded) {
    const obSystems = homes.length>0 ? homes[0].systems : [];
    return (
      <div className="app-container" style={S.app}>
        <div style={S.onboard}>
          <div style={S.onboardHero}><span style={{fontSize:56}}>△</span><h1 style={S.onboardTitle}>Upkeep</h1><p style={S.onboardSub}>Your home, handled. Pick the systems you own and we'll track every task, part, and due date — so nothing slips through the cracks.</p></div>
          <div style={S.onboardTemplates}>
            {SYSTEM_TEMPLATES.map((tpl,i) => {
              const added = obSystems.some(s=>s.name===tpl.name);
              return <button key={i} style={added?S.tplBtnAdded:S.tplBtn} onClick={()=>{
                if (!added) {
                  if (homes.length===0) { const h={id:genId(),name:"My Home",icon:"🏡",systems:[]}; setHomes([h]); setActiveHomeId(h.id); setTimeout(()=>addSystemFromTemplate(tpl), 0); }
                  else addSystemFromTemplate(tpl);
                }
              }} disabled={added}><span style={{fontSize:22}}>{tpl.icon}</span><span style={S.tplName}>{tpl.name}</span><span style={S.tplMeta}>{tpl.tasks.length} tasks</span>{added&&<span style={S.tplCheck}>✓</span>}</button>;
            })}
          </div>
          <div style={S.onboardActions}>
            <button style={S.onboardPrimary} onClick={finishOnboarding} disabled={obSystems.length===0}>Get Started{obSystems.length>0?` with ${obSystems.length} system${obSystems.length>1?"s":""}`:""}</button>
            <button style={S.onboardSecondary} onClick={finishOnboarding}>Skip — I'll add my own</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══ MAIN RENDER ═══
  return (
    <div className="app-container" style={S.app}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logoRow} onClick={()=>{setView("dashboard");setSelectedSystem(null);setListView(null);}}>
            <span style={S.logoIcon}>△</span>
            <div><h1 style={S.logoTitle}>Upkeep</h1><p style={S.logoSub}>Maintenance Tracking</p></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {homes.length>1 && view==="dashboard" && (
              <button style={S.homePickerBtn} onClick={()=>setShowHomePicker(!showHomePicker)}>{home?.icon} {home?.name?.length>12?home.name.slice(0,12)+"…":home?.name} ▾</button>
            )}
            {view==="dashboard"&&<button style={S.addBtn} onClick={()=>{setFormSystem({name:"",icon:"🔧",category:"HVAC",notes:""});setView("add-system");}}>+ System</button>}
            {view==="system"&&<button style={S.backBtn} onClick={()=>{setView("dashboard");setSelectedSystem(null);}}>← Back</button>}
            {view==="list"&&<button style={S.backBtn} onClick={()=>{setView("dashboard");setListView(null);}}>← Back</button>}
            {(view==="templates"||view==="manage-homes")&&<button style={S.backBtn} onClick={()=>setView("dashboard")}>← Back</button>}
            {(view==="add-system"||view==="add-task"||view==="edit-task"||view==="add-home"||view==="edit-system")&&<button style={S.backBtn} onClick={()=>{setView(view==="add-system"||view==="add-home"?"dashboard":view==="edit-system"?"system":"system");setEditingTask(null);}}>← Cancel</button>}
            {view==="dashboard"&&<button style={S.accountBtn} onClick={()=>{if(user){setShowAccount(!showAccount);}else{setView("auth");}}}>{user?"👤":"Sign In"}</button>}
          </div>
        </div>
      </header>

      {/* Home picker dropdown */}
      {showHomePicker && (
        <div style={S.homeDropdown}>
          {homes.map(h=>(
            <button key={h.id} style={h.id===activeHomeId?S.homeDropItemActive:S.homeDropItem} onClick={()=>{setActiveHomeId(h.id);setShowHomePicker(false);setView("dashboard");setSelectedSystem(null);setCategoryFilter("All");}}>{h.icon} {h.name}</button>
          ))}
          <div style={{borderTop:`1px solid ${K.border}`,margin:"4px 0"}}/>
          <button style={S.homeDropItem} onClick={()=>{setShowHomePicker(false);setView("manage-homes");}}>⚙️ Manage Homes</button>
          <button style={S.homeDropItem} onClick={()=>{setShowHomePicker(false);setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add Home</button>
        </div>
      )}

      {/* Account dropdown */}
      {showAccount && user && (
        <div style={S.homeDropdown}>
          <div style={{padding:"10px 14px",fontSize:13,color:K.textMuted,fontFamily:sf,borderBottom:`1px solid ${K.border}`}}>{user.email}</div>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);showToast("Synced ✓");}}>☁️ Sync Now</button>
          <button style={{...S.homeDropItem,color:K.danger}} onClick={handleLogout}>Sign Out</button>
        </div>
      )}

      <main style={S.main}>
        {/* ═══ AUTH VIEW ═══ */}
        {view==="auth"&&(
          <div style={S.content}>
            <div style={{maxWidth:360,margin:"40px auto",textAlign:"center"}}>
              <span style={{fontSize:40}}>△</span>
              <h2 style={{...S.formTitle,marginTop:12,marginBottom:4}}>{authView==="signup"?"Create Account":authView==="forgot"?"Reset Password":"Sign In"}</h2>
              <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:24}}>{authView==="signup"?"Sync your data across devices.":authView==="forgot"?"We'll send you a reset link.":"Access your data anywhere."}</p>
              {authError&&<div style={{background:K.danger+"12",border:`1px solid ${K.danger}33`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:K.danger,fontFamily:sf}}>{authError}</div>}
              <div style={S.formGroup}><input style={S.input} type="email" value={authEmail} onChange={e=>{setAuthEmail(e.target.value);setAuthError("");}} placeholder="Email address"/></div>
              {authView!=="forgot"&&<div style={S.formGroup}><input style={S.input} type="password" value={authPass} onChange={e=>{setAuthPass(e.target.value);setAuthError("");}} placeholder="Password" onKeyDown={e=>{if(e.key==="Enter"){authView==="login"?handleLogin():handleSignup();}}}/></div>}
              <button style={{...S.submitBtn,opacity:authLoading?0.6:1}} disabled={authLoading||!authEmail.trim()||(authView!=="forgot"&&!authPass.trim())} onClick={()=>{authView==="login"?handleLogin():authView==="signup"?handleSignup():handleForgot();}}>{authLoading?"...":(authView==="signup"?"Create Account":authView==="forgot"?"Send Reset Link":"Sign In")}</button>
              <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:8}}>
                {authView==="login"&&<><button style={S.authLink} onClick={()=>{setAuthView("signup");setAuthError("");}}>Don't have an account? Sign up</button><button style={S.authLink} onClick={()=>{setAuthView("forgot");setAuthError("");}}>Forgot password?</button></>}
                {authView==="signup"&&<button style={S.authLink} onClick={()=>{setAuthView("login");setAuthError("");}}>Already have an account? Sign in</button>}
                {authView==="forgot"&&<button style={S.authLink} onClick={()=>{setAuthView("login");setAuthError("");}}>Back to sign in</button>}
              </div>
              <button style={{...S.authLink,marginTop:20,color:K.textMuted}} onClick={()=>setView("dashboard")}>Skip — continue without account</button>
            </div>
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {view==="dashboard" && (
          <div style={S.content}>
            {homes.length > 1 && <div style={S.homeBanner}>{home?.icon} <strong>{home?.name}</strong> <span style={{color:K.textMuted}}>· {systems.length} system{systems.length!==1?"s":""}</span></div>}
            <div style={S.statsRow}>
              <div style={{...S.statCard,cursor:"pointer"}} onClick={()=>{setListView("systems");setView("list");}}><div style={S.statNum}>{systems.length}</div><div style={S.statLabel}>Systems</div></div>
              <div style={{...S.statCard,cursor:"pointer",borderColor:upcomingCount>0?K.warning:K.border}} onClick={()=>{setListView("upcoming");setView("list");}}><div style={{...S.statNum,color:upcomingCount>0?K.warning:K.text}}>{upcomingCount}</div><div style={S.statLabel}>Upcoming</div></div>
              <div style={{...S.statCard,cursor:"pointer",borderColor:overdueTasks>0?K.danger:"#2E7D32"}} onClick={()=>{setListView("overdue");setView("list");}}><div style={{...S.statNum,color:overdueTasks>0?K.danger:"#2E7D32"}}>{overdueTasks}</div><div style={S.statLabel}>Overdue</div></div>
              {annualCost>0&&<div style={S.statCard}><div style={{...S.statNum,fontSize:18,color:K.warm}}>${annualCost>=1000?(annualCost/1000).toFixed(1)+"k":annualCost.toFixed(0)}</div><div style={S.statLabel}>Est/Year</div></div>}
            </div>
            <div style={{marginBottom:16}}><input style={{...S.input,fontSize:14,padding:"10px 14px",background:K.surface,fontFamily:sf}} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 Search tasks, systems, parts..."/></div>
            {searchQuery.trim().length>=2&&<div style={{marginBottom:20}}><h2 style={S.sectionTitle}>Search Results ({searchResults.length})</h2>{searchResults.length===0&&<p style={{fontSize:13,color:K.textMuted,fontFamily:sf}}>No matches found.</p>}<div style={S.taskList}>{searchResults.slice(0,10).map(t=>(<div key={t.id+t.systemId} style={{...S.taskCard,cursor:"pointer"}} onClick={()=>{setSelectedSystem(t.systemId);setView("system");}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:getStatusColor(t)}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.taskStatus,color:getStatusColor(t)}}>{getStatusLabel(t)}</div></div></div>))}</div></div>}
            {!searchQuery.trim()&&<>{urgentTasks.length>0&&<section style={S.section}><h2 style={S.sectionTitle}>⚠️ Upcoming & Overdue</h2><div style={S.urgentList}>{urgentTasks.slice(0,6).map(t=>(<div key={t.id+t.systemId} style={S.urgentCard} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}><div style={{...S.urgentDot,backgroundColor:getStatusColor(t)}}/><div style={S.urgentInfo}><div style={S.urgentName}>{t.name}</div><div style={S.urgentSys}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:getStatusColor(t)+"22",color:getStatusColor(t)}}>{getStatusLabel(t)}</div></div>))}</div></section>}
            {untrackedTasks.length>0&&<section style={S.section}><h2 style={S.sectionTitle}>📋 Needs First Entry — {untrackedTasks.length} tasks</h2><p style={S.sectionHint}>Tap a system, then set each task's last completion date.</p></section>}
            {systems.length>0&&<div style={S.filterRow}>{CATEGORIES.map(c=><button key={c} style={categoryFilter===c?S.filterActive:S.filterBtn} onClick={()=>setCategoryFilter(c)}>{c}</button>)}</div>}
            {systems.length>0&&<div style={{...S.filterRow,marginTop:-8}}>{["","🌸 Spring","☀️ Summer","🍂 Fall","❄️ Winter"].map(s=><button key={s} style={seasonFilter===s?(s?S.seasonBtnActive:S.filterActive):S.filterBtn} onClick={()=>setSeasonFilter(seasonFilter===s?"":s)}>{s||"All Seasons"}</button>)}</div>}
            {systems.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><p style={{...S.sectionHint,marginBottom:16}}>No systems yet.</p><button style={S.addTaskBtn} onClick={()=>setView("templates")}>Browse Templates</button></div>}
            <div style={S.grid}>{filteredSystems.map(sys=>{const so=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;const su=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;const sn=sys.tasks.filter(t=>!t.lastCompleted).length;return(<div key={sys.id} style={S.sysCard} onClick={()=>{setSelectedSystem(sys.id);setView("system");}}><div style={S.sysCardHead}><span style={S.sysIcon}>{sys.icon}</span><span style={S.sysCat}>{sys.category}</span></div><h3 style={S.sysName}>{sys.name}</h3><div style={S.sysMeta}><span>{sys.tasks.length} task{sys.tasks.length!==1?"s":""}</span>{so>0&&<span style={S.sysOverdue}>● {so} overdue</span>}{so===0&&su>0&&<span style={S.sysUpcoming}>● {su} upcoming</span>}{so===0&&su===0&&sn>0&&<span style={S.sysUntracked}>○ {sn} untracked</span>}{so===0&&su===0&&sn===0&&<span style={S.sysGood}>● All good</span>}</div></div>);})}</div>
            {systems.length>0&&<div style={{textAlign:"center",marginTop:20,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}><button style={S.templateLinkBtn} onClick={()=>setView("templates")}>+ Add from templates</button>{homes.length<=1&&<button style={S.templateLinkBtn} onClick={()=>{setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add another home</button>}<button style={S.templateLinkBtn} onClick={exportData}>📥 Export</button><button style={S.templateLinkBtn} onClick={importData}>📤 Import</button></div>}
            </>}
          </div>
        )}

        {/* ═══ TEMPLATES ═══ */}
        {view==="templates"&&<div style={S.content}><h2 style={S.formTitle}>System Templates</h2><p style={{...S.sectionHint,marginBottom:20}}>Tap to add pre-built systems with common tasks.</p><div style={S.taskList}>{SYSTEM_TEMPLATES.map((tpl,i)=>{const added=systems.some(s=>s.name===tpl.name);return <button key={i} style={added?S.tplBtnAdded:{...S.tplBtn,width:"100%"}} onClick={()=>!added&&addSystemFromTemplate(tpl)} disabled={added}><span style={{fontSize:22}}>{tpl.icon}</span><span style={S.tplName}>{tpl.name}</span><span style={S.tplMeta}>{tpl.tasks.length} tasks</span>{added&&<span style={S.tplCheck}>✓</span>}</button>;})}</div></div>}

        {/* ═══ ADD HOME ═══ */}
        {view==="add-home"&&<div style={S.content}><h2 style={S.formTitle}>Add Home</h2><p style={{...S.sectionHint,marginBottom:16}}>Add a second property — great for landlords, vacation homes, or rental units.</p><div style={S.formGroup}><label style={S.label}>Home Name</label><input style={S.input} value={formHome.name} onChange={e=>setFormHome({...formHome,name:e.target.value})} placeholder="e.g., Beach House, 42 Oak St"/></div><div style={S.formGroup}><label style={S.label}>Icon</label><input style={S.input} value={formHome.icon} onChange={e=>setFormHome({...formHome,icon:e.target.value})} placeholder="🏡"/></div><button style={S.submitBtn} onClick={addHome} disabled={!formHome.name.trim()}>Add Home</button></div>}

        {/* ═══ MANAGE HOMES ═══ */}
        {view==="manage-homes"&&<div style={S.content}><h2 style={S.formTitle}>Manage Homes ({homes.length})</h2><div style={S.taskList}>{homes.map(h=><div key={h.id} style={S.taskCard}><div style={S.taskTop}><span style={{fontSize:24}}>{h.icon}</span><div style={S.taskInfo}><div style={S.taskName}>{h.name}</div><div style={S.taskFreq}>{h.systems.length} system{h.systems.length!==1?"s":""}</div></div><div style={S.taskBtns}><button style={S.taskEditBtn} onClick={()=>{const n=prompt("Rename home:",h.name);if(n&&n.trim())renameHome(h.id,n.trim());}}>Rename</button>{homes.length>1&&<button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${h.name}" and all its systems?`))deleteHome(h.id);}}>×</button>}</div></div></div>)}</div><button style={{...S.submitBtn,marginTop:16}} onClick={()=>{setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add Home</button></div>}

        {/* ═══ LIST VIEW ═══ */}
        {view==="list"&&listView&&<div style={S.content}>
          {listView==="systems"&&<><h2 style={S.formTitle}>All Systems ({systems.length})</h2><div style={S.taskList}>{systems.map(sys=>{const so=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;const su=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;return(<div key={sys.id} style={{...S.taskCard,cursor:"pointer"}} onClick={()=>{setSelectedSystem(sys.id);setView("system");}}><div style={S.taskTop}><span style={{fontSize:24,flexShrink:0}}>{sys.icon}</span><div style={S.taskInfo}><div style={S.taskName}>{sys.name}</div><div style={S.taskFreq}>{sys.category} · {sys.tasks.length} tasks</div></div><div style={S.listBadgeWrap}>{so>0&&<span style={S.listBadgeRed}>{so} overdue</span>}{su>0&&<span style={S.listBadgeYellow}>{su} upcoming</span>}</div></div></div>);})}</div></>}
          {listView==="upcoming"&&<><h2 style={{...S.formTitle,color:upcomingCount>0?K.warning:"#2E7D32"}}>{upcomingCount>0?`Upcoming Tasks (${upcomingCount})`:"Nothing Due Within 30 Days ✓"}</h2><div style={S.taskList}>{upcomingCount===0&&<p style={S.emptyMsg}>You're ahead of schedule!</p>}{upcomingTaskList.map(t=>{const oc=(t.parts||[]).filter(p=>p.status==="order").reduce((s,p)=>s+(p.cost||0),0);return(<div key={t.id+t.systemId} style={{...S.taskCard,borderColor:K.warning+"66"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:K.warning}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:K.warning+"22",color:K.warning}}>{t.days===0?"Due today":`${t.days}d left`}</div></div>{oc>0&&<div style={S.upcomingCostRow}><span style={S.upcomingCostLabel}>🛒 Est. cost:</span><span style={S.upcomingCostValue}>${oc.toFixed(2)}</span></div>}<PartsDisplay parts={t.parts}/><div style={S.taskCountdownRow}><span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}>✓ Done</button></div></div>);})}</div></>}
          {listView==="overdue"&&<><h2 style={{...S.formTitle,color:overdueTaskList.length>0?K.danger:"#2E7D32"}}>{overdueTaskList.length>0?`Overdue Tasks (${overdueTaskList.length})`:"No Overdue Tasks ✓"}</h2><div style={S.taskList}>{overdueTaskList.length===0&&<p style={S.emptyMsg}>Everything on schedule!</p>}{overdueTaskList.map(t=>{const next=getNextDue(t);const days=daysUntil(next);return(<div key={t.id+t.systemId} style={{...S.taskCard,borderColor:K.danger+"44"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:K.danger}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:K.danger+"18",color:K.danger}}>{Math.abs(days)}d overdue</div></div><div style={S.taskCountdownRow}><span style={S.taskLast}>Was due: {next.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}>✓ Done</button></div></div>);})}</div></>}
        </div>}

        {/* ═══ SYSTEM DETAIL ═══ */}
        {view==="system"&&selectedSystem&&(()=>{const sys=systems.find(s=>s.id===selectedSystem);if(!sys)return null;const sysCost=sys.tasks.reduce((s,t)=>s+(t.parts||[]).filter(p=>p.status==="order").reduce((s2,p)=>s2+(p.cost||0),0),0);const schedT=sys.tasks.filter(t=>!isAsReq(t));const arT=sys.tasks.filter(t=>isAsReq(t));return(
          <div style={S.content}>
            <div style={S.sysDetailHead}><span style={{fontSize:40}}>{sys.icon}</span><div><h2 style={S.sysDetailTitle}>{sys.name}</h2><span style={S.sysDetailCat}>{sys.category}</span></div></div>
            {sys.notes&&<p style={S.sysNotes}>{sys.notes}</p>}
            {sysCost>0&&<div style={S.sysCostSummary}><span>💰 Total order costs:</span><strong>${sysCost.toFixed(2)}</strong></div>}
            <div style={S.sysActions}>
              <button style={S.addTaskBtn} onClick={()=>{setFormTask({name:"",intervalMonths:12,notes:"",parts:[],taskType:"scheduled",season:""});setView("add-task");}}>+ Add Task</button>
              <button style={S.asNeededBtn} onClick={()=>{setFormTask({name:"",intervalMonths:0,notes:"",parts:[],taskType:"as-required",season:""});setView("add-task");}}>+ As Needed</button>
              <button style={S.taskEditBtn} onClick={()=>editSystem(sys.id)}>✏️ Edit</button>
              <button style={S.deleteBtn} onClick={()=>{if(confirm(`Delete "${sys.name}"?`))deleteSystem(sys.id);}}>Delete</button>
            </div>
            {sys.tasks.length===0&&<p style={S.emptyMsg}>No tasks yet.</p>}
            {schedT.length>0&&<div style={{marginBottom:20}}><div style={S.taskList}>{schedT.map(t=>(<div key={t.id} style={S.taskCard}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:getStatusColor(t)}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{formatInterval(t.intervalMonths)}{t.season&&<span style={{marginLeft:6,fontSize:11,color:K.accent}}>{t.season}</span>}</div></div><div style={{...S.taskStatus,color:getStatusColor(t)}}>{getStatusLabel(t)}</div></div>{t.notes&&<p style={S.taskNotes}>{t.notes}</p>}{(t.workLog||[]).length>1&&<div style={{margin:"6px 0 4px 20px",fontSize:12,fontFamily:sf,color:K.textMuted}}><div style={{fontWeight:600,marginBottom:3,color:K.accent}}>History ({(t.workLog||[]).length}):</div>{(t.workLog||[]).slice(-4).reverse().map((e,i)=>(<div key={i} style={{padding:"2px 0"}}>{formatDate(e.date)}{e.notes&&e.notes!=="Completed"?` — ${e.notes}`:""}</div>))}</div>}<PartsDisplay parts={t.parts}/><div style={S.taskBottom}><div style={S.taskDateRow}><span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span>{(()=>{const next=getNextDue(t);if(!next)return(<span style={{...S.countdownBadge,color:K.warm,backgroundColor:K.warm+"15"}}>No date set</span>);const d=daysUntil(next);const c=getStatusColor(t);return(<span style={{...S.countdownBadge,color:c,backgroundColor:c+"15"}}>{d<0?`${Math.abs(d)}d overdue`:d===0?"Due today!":`${d}d remaining`}</span>);})()}</div><div style={S.taskBtns}><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:sys.id,task:t})}>✓ Done</button>{getNextDue(t)&&<button style={S.taskEditBtn} onClick={()=>addToCalendar(t)} title="Add to calendar">📅</button>}<button style={S.taskEditBtn} onClick={()=>{setFormTask({name:t.name,intervalMonths:t.intervalMonths,notes:t.notes||"",parts:t.parts||[],taskType:t.taskType||"scheduled",season:t.season||""});setEditingTask(t.id);setView("edit-task");}}>Edit</button><button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${t.name}"?`))deleteTask(sys.id,t.id);}}>×</button></div></div></div>))}</div></div>}
            {arT.length>0&&<div><h3 style={{fontSize:14,fontWeight:700,color:"#6B7D8A",marginBottom:8,fontFamily:sf}}>🔧 As Needed</h3><div style={S.taskList}>{arT.map(t=>{const wl=t.workLog||[];return(<div key={t.id} style={{...S.taskCard,borderLeft:"3px solid #6B7D8A"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:"#6B7D8A"}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>As Needed{wl.length>0?` · ${wl.length} log entr${wl.length===1?"y":"ies"}`:""}</div></div><div style={{...S.taskStatus,color:"#6B7D8A"}}>{getStatusLabel(t)}</div></div>{t.notes&&<p style={S.taskNotes}>{t.notes}</p>}{wl.length>0&&<div style={{margin:"6px 0 4px 20px",fontSize:12,fontFamily:sf,color:K.textMuted}}>{wl.slice(-3).reverse().map((e,i)=>(<div key={i} style={{padding:"3px 0"}}><span style={{color:K.text}}>{formatDate(e.date)}</span> — {e.notes||"No notes"}</div>))}</div>}<div style={S.taskBottom}><span style={S.taskLast}>{wl.length>0?`${wl.length} entries`:"No entries yet"}</span><div style={S.taskBtns}><button style={S.asNeededLogBtn} onClick={()=>setShowLogModal({systemId:sys.id,task:t})}>📝 Log</button><button style={S.taskEditBtn} onClick={()=>{setFormTask({name:t.name,intervalMonths:t.intervalMonths,notes:t.notes||"",parts:t.parts||[],taskType:"as-required",season:""});setEditingTask(t.id);setView("edit-task");}}>Edit</button><button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${t.name}"?`))deleteTask(sys.id,t.id);}}>×</button></div></div></div>);})}</div></div>}
          </div>);})()}

        {/* ═══ ADD SYSTEM ═══ */}
        {view==="add-system"&&<div style={S.content}><h2 style={S.formTitle}>Add New System</h2><div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} value={formSystem.name} onChange={e=>setFormSystem({...formSystem,name:e.target.value})} placeholder="e.g., Pool Pump"/></div><div style={S.formGroup}><label style={S.label}>Icon</label><input style={S.input} value={formSystem.icon} onChange={e=>setFormSystem({...formSystem,icon:e.target.value})}/></div><div style={S.formGroup}><label style={S.label}>Category</label><select style={S.input} value={formSystem.category} onChange={e=>setFormSystem({...formSystem,category:e.target.value})}>{CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}<option value="Other">Other</option></select></div><div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={formSystem.notes} onChange={e=>setFormSystem({...formSystem,notes:e.target.value})}/></div><button style={S.submitBtn} onClick={addSystem} disabled={!formSystem.name.trim()}>Add System</button></div>}

        {view==="edit-system"&&selectedSystem&&<div style={S.content}><h2 style={S.formTitle}>Edit System</h2><div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} value={formSystem.name} onChange={e=>setFormSystem({...formSystem,name:e.target.value})}/></div><div style={S.formGroup}><label style={S.label}>Icon</label><input style={S.input} value={formSystem.icon} onChange={e=>setFormSystem({...formSystem,icon:e.target.value})}/></div><div style={S.formGroup}><label style={S.label}>Category</label><select style={S.input} value={formSystem.category} onChange={e=>setFormSystem({...formSystem,category:e.target.value})}>{CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}<option value="Other">Other</option></select></div><div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={formSystem.notes} onChange={e=>setFormSystem({...formSystem,notes:e.target.value})}/></div><button style={S.submitBtn} onClick={()=>saveEditSystem(selectedSystem)} disabled={!formSystem.name.trim()}>Save Changes</button></div>}

        {/* ═══ ADD/EDIT TASK ═══ */}
        {(view==="add-task"||view==="edit-task")&&selectedSystem&&<div style={S.content}><h2 style={S.formTitle}>{view==="edit-task"?"Edit Task":formTask.taskType==="as-required"?"Add As-Needed Task":"Add Task"}</h2><div style={S.formGroup}><label style={S.label}>Type</label><div style={{display:"flex",gap:8}}><button style={formTask.taskType==="scheduled"?S.typeToggleActive:S.typeToggle} onClick={()=>setFormTask({...formTask,taskType:"scheduled",intervalMonths:formTask.intervalMonths||12})}>📅 Scheduled</button><button style={formTask.taskType==="as-required"?{...S.typeToggleActive,borderColor:"#6B7D8A",background:"#6B7D8A22",color:"#6B7D8A"}:S.typeToggle} onClick={()=>setFormTask({...formTask,taskType:"as-required",intervalMonths:0})}>🔧 As Needed</button></div></div><div style={S.formGroup}><label style={S.label}>Task Name</label><input style={S.input} value={formTask.name} onChange={e=>setFormTask({...formTask,name:e.target.value})} placeholder={formTask.taskType==="as-required"?"e.g., Garbage disposal repair":"e.g., Replace filter"}/></div>{formTask.taskType==="scheduled"&&<div style={S.formGroup}><label style={S.label}>Interval (months)</label><input style={S.input} type="number" min="0.25" max="240" step="0.25" value={formTask.intervalMonths} onChange={e=>setFormTask({...formTask,intervalMonths:e.target.value})}/></div>}<div style={S.formGroup}><label style={S.label}>{formTask.taskType==="as-required"?"Description":"Notes"}</label><textarea style={{...S.input,minHeight:60}} value={formTask.notes} onChange={e=>setFormTask({...formTask,notes:e.target.value})} placeholder={formTask.taskType==="as-required"?"What needs to be tracked when this comes up?":""}/></div><div style={S.formGroup}><label style={S.label}>🧰 Parts, Tools & Materials</label><PartsEditor parts={formTask.parts} onChange={parts=>setFormTask({...formTask,parts})}/></div>{formTask.taskType==="scheduled"&&<div style={S.formGroup}><label style={S.label}>Season (optional)</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["","🌸 Spring","☀️ Summer","🍂 Fall","❄️ Winter"].map(s=>(<button key={s} style={formTask.season===s?(s?{...S.seasonBtnActive}:S.seasonBtnClear):(s?S.seasonBtn:S.seasonBtnClear)} onClick={()=>setFormTask({...formTask,season:s})}>{s||"None"}</button>))}</div></div>}<button style={S.submitBtn} onClick={()=>view==="edit-task"?updateTask(selectedSystem,editingTask):addTask(selectedSystem)} disabled={!formTask.name.trim()}>{view==="edit-task"?"Save Changes":formTask.taskType==="as-required"?"Add As-Needed Task":"Add Task"}</button></div>}
      </main>

      {/* ═══ COMPLETE MODAL ═══ */}
      {showCompleteModal&&(()=>{const MC=()=>{const[pd,setPd]=useState(new Date().toISOString().split("T")[0]);const[sp,setSp]=useState(false);return(<div style={S.overlay} onClick={()=>setShowCompleteModal(null)}><div style={S.modal} onClick={e=>e.stopPropagation()}><h3 style={S.modalTitle}>Mark Complete</h3><p style={S.modalTask}>{showCompleteModal.task.name}</p><p style={S.modalHint}>When was this last done?</p>{!sp?<div style={S.modalBtns}><button style={S.modalBtn} onClick={()=>markComplete(showCompleteModal.systemId,showCompleteModal.task.id,new Date().toISOString())}>Today</button><button style={S.modalBtnAlt} onClick={()=>setSp(true)}>Choose Date…</button></div>:<div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}><input type="date" value={pd} onChange={e=>setPd(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{...S.input,width:"auto",minWidth:180,textAlign:"center"}}/><div style={S.modalBtns}><button style={S.modalBtn} onClick={()=>{if(pd)markComplete(showCompleteModal.systemId,showCompleteModal.task.id,new Date(pd+"T12:00:00").toISOString());}}>Confirm</button><button style={S.modalBtnAlt} onClick={()=>setSp(false)}>Back</button></div></div>}<button style={S.modalCancel} onClick={()=>setShowCompleteModal(null)}>Cancel</button></div></div>);};return(<MC/>);})()}

      {showLogModal&&(()=>{const LM=()=>{const[dt,setDt]=useState(new Date().toISOString().split("T")[0]);const[notes,setNotes]=useState("");return(<div style={S.overlay} onClick={()=>setShowLogModal(null)}><div style={{...S.modal,maxWidth:380,textAlign:"left"}} onClick={e=>e.stopPropagation()}><h3 style={{...S.modalTitle,textAlign:"center",color:"#6B7D8A"}}>Log Entry</h3><p style={{...S.modalTask,textAlign:"center"}}>{showLogModal.task.name}</p><div style={{marginBottom:12}}><label style={S.label}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{...S.input,textAlign:"center"}}/></div><div style={{marginBottom:16}}><label style={S.label}>What was done</label><textarea style={{...S.input,minHeight:80}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe what happened and what you did..."/></div><div style={S.modalBtns}><button style={{...S.modalBtn,background:"#6B7D8A"}} onClick={()=>{if(notes.trim())logWorkEntry(showLogModal.systemId,showLogModal.task.id,{id:genId(),date:new Date(dt+"T12:00:00").toISOString(),notes});}} disabled={!notes.trim()}>Save Entry</button><button style={S.modalBtnAlt} onClick={()=>setShowLogModal(null)}>Cancel</button></div></div></div>);};return(<LM/>);})()}

      {toast&&<div style={S.toast}>{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
const K = { bg:"#F4F1EC", surface:"#FEFDFB", border:"#DDD7CC", text:"#1A1A1A", textMuted:"#6B6560", accent:"#2D5A3D", accentLight:"#E6EFE9", warm:"#8B7355", danger:"#BF3636", warning:"#C49520", radius:12 };
const sf = "'DM Sans', system-ui, -apple-system, sans-serif";
const S = {
  app:{fontFamily:"'Newsreader',Georgia,serif",background:K.bg,minHeight:"100vh",color:K.text,position:"relative",letterSpacing:"-0.01em"},
  loadingWrap:{display:"flex",justifyContent:"center",alignItems:"center",minHeight:"100vh",background:K.bg},
  loadingText:{fontFamily:"'Newsreader',Georgia,serif",fontSize:18,color:K.textMuted},
  onboard:{maxWidth:520,margin:"0 auto",padding:"20px 20px 40px"},
  onboardHero:{textAlign:"center",padding:"30px 0 24px"},
  onboardTitle:{fontSize:42,fontWeight:700,margin:"16px 0 10px",fontFamily:"'Newsreader',Georgia,serif",letterSpacing:"0.5px"},
  onboardSub:{fontSize:15,color:K.textMuted,lineHeight:1.6,fontFamily:sf,maxWidth:360,margin:"0 auto"},
  onboardTemplates:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:8},
  tplBtn:{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,cursor:"pointer",textAlign:"left",fontFamily:sf,fontSize:13,position:"relative"},
  tplBtnAdded:{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:K.accentLight,border:`1.5px solid ${K.accent}`,borderRadius:K.radius,cursor:"default",textAlign:"left",fontFamily:sf,fontSize:13,opacity:0.7,position:"relative",width:"100%"},
  tplName:{fontWeight:600,flex:1},tplMeta:{fontSize:11,color:K.textMuted},tplCheck:{position:"absolute",top:6,right:8,color:K.accent,fontWeight:700,fontSize:14},
  onboardActions:{display:"flex",flexDirection:"column",gap:10,marginTop:24},
  onboardPrimary:{padding:"14px 24px",background:K.accent,color:"#fff",border:"none",borderRadius:K.radius,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:sf},
  onboardSecondary:{padding:"10px",background:"transparent",color:K.textMuted,border:"none",fontSize:14,cursor:"pointer",fontFamily:sf},
  templateLinkBtn:{background:"transparent",border:`1.5px solid ${K.border}`,borderRadius:20,padding:"8px 20px",fontSize:13,color:K.textMuted,cursor:"pointer",fontFamily:sf},
  header:{background:"linear-gradient(135deg, #2D5A3D 0%, #1E3F2B 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.12)"},
  headerInner:{maxWidth:720,margin:"0 auto",padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center"},
  logoRow:{display:"flex",gap:12,alignItems:"center",cursor:"pointer"},logoIcon:{fontSize:24,color:"#fff",fontWeight:300,opacity:0.9},
  logoTitle:{margin:0,fontSize:22,fontWeight:700,color:"#fff",letterSpacing:"0.5px",fontFamily:"'Newsreader',Georgia,serif",textTransform:"capitalize"},
  logoSub:{margin:0,fontSize:10,color:"rgba(255,255,255,0.6)",letterSpacing:"2.5px",textTransform:"uppercase",fontFamily:sf,fontWeight:500},
  addBtn:{background:"rgba(255,255,255,0.18)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"8px 16px",fontSize:14,cursor:"pointer",fontFamily:sf,fontWeight:600},
  backBtn:{background:"rgba(255,255,255,0.18)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"8px 16px",fontSize:14,cursor:"pointer",fontFamily:sf},
  homePickerBtn:{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,whiteSpace:"nowrap"},
  homeDropdown:{position:"fixed",top:60,right:16,background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:150,minWidth:200,padding:6,display:"flex",flexDirection:"column",gap:2},
  homeDropItem:{background:"transparent",border:"none",padding:"10px 14px",fontSize:14,textAlign:"left",cursor:"pointer",borderRadius:6,fontFamily:sf,color:K.text},
  homeDropItemActive:{background:K.accentLight,border:"none",padding:"10px 14px",fontSize:14,textAlign:"left",cursor:"pointer",borderRadius:6,fontFamily:sf,color:K.accent,fontWeight:600},
  homeBanner:{display:"flex",alignItems:"center",gap:8,fontSize:15,marginBottom:16,fontFamily:sf},
  main:{maxWidth:720,margin:"0 auto",padding:"0 16px 80px"},content:{paddingTop:20},
  statsRow:{display:"flex",gap:10,marginBottom:24},
  statCard:{flex:1,background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:"16px 12px",textAlign:"center"},
  statNum:{fontSize:26,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text},
  statLabel:{fontSize:11,color:K.textMuted,textTransform:"uppercase",letterSpacing:"1px",marginTop:2,fontFamily:sf},
  section:{marginBottom:24},sectionTitle:{fontSize:15,fontWeight:700,marginBottom:10,fontFamily:sf,color:K.text},
  sectionHint:{fontSize:13,color:K.textMuted,fontFamily:sf,marginTop:-4},
  urgentList:{display:"flex",flexDirection:"column",gap:6},
  urgentCard:{display:"flex",alignItems:"center",gap:10,background:K.surface,border:`1px solid ${K.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer"},
  urgentDot:{width:8,height:8,borderRadius:"50%",flexShrink:0},urgentInfo:{flex:1,minWidth:0},
  urgentName:{fontSize:14,fontWeight:600,fontFamily:sf,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  urgentSys:{fontSize:12,color:K.textMuted,fontFamily:sf},
  urgentBadge:{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap",fontFamily:sf},
  filterRow:{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"},
  filterBtn:{background:"transparent",border:`1px solid ${K.border}`,borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",color:K.textMuted,fontFamily:sf},
  filterActive:{background:K.accent,border:`1px solid ${K.accent}`,borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",color:"#fff",fontWeight:600,fontFamily:sf},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:12},
  sysCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:16,cursor:"pointer"},
  sysCardHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},sysIcon:{fontSize:26},
  sysCat:{fontSize:10,textTransform:"uppercase",letterSpacing:"1px",color:K.textMuted,fontFamily:sf},
  sysName:{margin:"0 0 8px",fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  sysMeta:{display:"flex",flexWrap:"wrap",gap:8,fontSize:12,color:K.textMuted,fontFamily:sf},
  sysOverdue:{color:K.danger,fontWeight:600},sysUpcoming:{color:K.warning,fontWeight:600},sysUntracked:{color:K.warm},sysGood:{color:"#2E7D32"},
  sysDetailHead:{display:"flex",gap:14,alignItems:"center",marginBottom:12},
  sysDetailTitle:{margin:0,fontSize:24,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  sysDetailCat:{fontSize:12,color:K.textMuted,textTransform:"uppercase",letterSpacing:"1px",fontFamily:sf},
  sysNotes:{background:K.accentLight,border:`1px solid ${K.accent}33`,borderRadius:8,padding:"10px 14px",fontSize:13,color:K.accent,marginBottom:16,fontFamily:sf,lineHeight:1.5},
  sysCostSummary:{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#FDF6E3",border:`1px solid ${K.warning}44`,borderRadius:8,padding:"10px 14px",fontSize:13,color:K.text,marginBottom:16,fontFamily:sf},
  sysActions:{display:"flex",gap:10,marginBottom:20},
  addTaskBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:sf},
  deleteBtn:{background:"transparent",color:K.danger,border:`1px solid ${K.danger}44`,borderRadius:8,padding:"9px 18px",fontSize:13,cursor:"pointer",fontFamily:sf},
  emptyMsg:{fontSize:14,color:K.textMuted,textAlign:"center",padding:40,fontFamily:sf},
  taskList:{display:"flex",flexDirection:"column",gap:10},
  taskCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:14},
  taskTop:{display:"flex",alignItems:"center",gap:10},taskDot:{width:10,height:10,borderRadius:"50%",flexShrink:0},taskInfo:{flex:1},
  taskName:{fontSize:15,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  taskFreq:{fontSize:12,color:K.textMuted,fontFamily:sf},taskStatus:{fontSize:12,fontWeight:700,fontFamily:sf,whiteSpace:"nowrap"},
  taskNotes:{fontSize:12,color:K.textMuted,margin:"8px 0 4px 20px",lineHeight:1.4,fontFamily:sf},
  taskBottom:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:`1px solid ${K.border}`,flexWrap:"wrap",gap:6},
  taskLast:{fontSize:12,color:K.textMuted,fontFamily:sf},taskBtns:{display:"flex",gap:6},
  taskCompleteBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:sf},
  taskEditBtn:{background:"transparent",color:K.textMuted,border:`1px solid ${K.border}`,borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:sf},
  taskDeleteBtn:{background:"transparent",color:K.danger,border:`1px solid ${K.danger}44`,borderRadius:6,padding:"4px 10px",fontSize:16,cursor:"pointer",fontFamily:sf,lineHeight:1},
  formTitle:{fontSize:22,fontFamily:"'Newsreader',Georgia,serif",marginBottom:20,fontWeight:700},formGroup:{marginBottom:16},
  label:{display:"block",fontSize:12,fontWeight:600,marginBottom:5,color:K.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:sf},
  input:{width:"100%",padding:"10px 12px",fontSize:16,border:`1.5px solid ${K.border}`,borderRadius:8,background:K.surface,color:K.text,fontFamily:"'Newsreader',Georgia,serif",boxSizing:"border-box",outline:"none"},
  submitBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontSize:15,cursor:"pointer",fontWeight:700,fontFamily:sf,marginTop:8,width:"100%"},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:200},
  modal:{background:K.surface,borderRadius:14,padding:28,width:"90%",maxWidth:340,textAlign:"center"},
  modalTitle:{margin:"0 0 4px",fontSize:18,fontFamily:"'Newsreader',Georgia,serif"},
  modalTask:{fontSize:14,color:K.textMuted,marginBottom:16,fontFamily:sf},modalHint:{fontSize:12,color:K.textMuted,marginBottom:14,fontFamily:sf},
  modalBtns:{display:"flex",gap:10,justifyContent:"center",marginBottom:12},
  modalBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:sf},
  modalBtnAlt:{background:"transparent",color:K.accent,border:`1.5px solid ${K.accent}`,borderRadius:8,padding:"10px 18px",fontSize:14,cursor:"pointer",fontFamily:sf},
  modalCancel:{background:"transparent",border:"none",color:K.textMuted,fontSize:13,cursor:"pointer",fontFamily:sf,marginTop:4},
  toast:{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#2C2416",color:"#fff",padding:"10px 24px",borderRadius:10,fontSize:14,fontFamily:sf,fontWeight:600,zIndex:300,boxShadow:"0 4px 16px rgba(0,0,0,0.2)"},
  listBadgeWrap:{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"},
  listBadgeRed:{fontSize:11,fontWeight:700,color:K.danger,background:K.danger+"15",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  listBadgeYellow:{fontSize:11,fontWeight:700,color:K.warning,background:K.warning+"20",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  countdownBadge:{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:6,fontFamily:sf,whiteSpace:"nowrap"},
  taskDateRow:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flex:1},
  taskCountdownRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:`1px solid ${K.border}`,flexWrap:"wrap",gap:6},
  upcomingCostRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"6px 10px",background:"#FDF6E3",borderRadius:6,fontSize:12,fontFamily:sf},
  upcomingCostLabel:{color:K.textMuted},upcomingCostValue:{fontWeight:700,color:K.warning},
  partsSection:{margin:"8px 0 4px 20px",padding:"10px 12px",background:"#FAFAF5",border:`1px solid ${K.border}`,borderRadius:8},
  partsSectionHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},
  partsSectionTitle:{fontSize:12,fontWeight:700,fontFamily:sf,color:K.text},
  partsCostBadge:{fontSize:11,fontWeight:700,color:K.warning,background:K.warning+"18",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  partsGroup:{marginBottom:6},partsGroupLabel:{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,color:K.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4,fontFamily:sf},
  orderDot:{width:7,height:7,borderRadius:"50%",background:K.warning},onHandDot:{width:7,height:7,borderRadius:"50%",background:"#2E7D32"},
  partRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0 3px 13px",fontSize:12,fontFamily:sf},
  partName:{color:K.text},partCost:{color:K.textMuted,fontWeight:600,minWidth:50,textAlign:"right"},
  partsEditor:{background:"#FAFAF5",border:`1px solid ${K.border}`,borderRadius:8,padding:12},
  partsListEdit:{marginBottom:10,display:"flex",flexDirection:"column",gap:4},
  partRowEdit:{display:"flex",alignItems:"center",gap:8,fontSize:13,fontFamily:sf},
  partToggleOn:{width:32,height:32,borderRadius:6,border:"1.5px solid #2E7D32",background:"#2E7D3218",color:"#2E7D32",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  partToggleOff:{width:32,height:32,borderRadius:6,border:`1.5px solid ${K.warning}`,background:K.warning+"18",color:K.warning,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  partEditName:{flex:1,color:K.text},partEditCost:{minWidth:50,textAlign:"right",color:K.textMuted,fontWeight:600},
  partRemoveBtn:{background:"transparent",border:"none",color:K.danger,fontSize:20,cursor:"pointer",padding:"0 4px",lineHeight:1},
  partAddRow:{display:"flex",gap:6,alignItems:"center"},
  partInput:{padding:"8px",fontSize:14,border:`1.5px solid ${K.border}`,borderRadius:6,background:K.surface,color:K.text,fontFamily:sf,boxSizing:"border-box",outline:"none"},
  partAddBtn:{width:36,height:36,borderRadius:6,border:"none",background:K.accent,color:"#fff",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  partDetailEdit:{padding:"8px 8px 8px 40px"},
  partDetailRow:{display:"flex",gap:6},
  asNeededBtn:{background:"#6B7D8A22",color:"#6B7D8A",border:"1px solid #6B7D8A44",borderRadius:8,padding:"9px 18px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:sf},
  asNeededLogBtn:{background:"#6B7D8A22",color:"#6B7D8A",border:"1px solid #6B7D8A33",borderRadius:6,padding:"5px 12px",fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:sf},
  typeToggle:{flex:1,padding:"10px",background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:8,color:K.textMuted,fontSize:14,cursor:"pointer",textAlign:"center",fontFamily:sf},
  typeToggleActive:{flex:1,padding:"10px",background:K.accentLight,border:`1.5px solid ${K.accent}`,borderRadius:8,color:K.accent,fontSize:14,cursor:"pointer",textAlign:"center",fontWeight:600,fontFamily:sf},
  buyLink:{display:"inline-block",padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",background:K.accent,borderRadius:4,textDecoration:"none",fontFamily:sf,whiteSpace:"nowrap"},
  seasonBtn:{padding:"6px 14px",border:`1.5px solid ${K.border}`,borderRadius:20,background:"transparent",color:K.textMuted,fontSize:12,cursor:"pointer",fontFamily:sf},
  seasonBtnActive:{padding:"6px 14px",border:`1.5px solid ${K.accent}`,borderRadius:20,background:K.accentLight,color:K.accent,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:sf},
  seasonBtnClear:{padding:"6px 14px",border:`1.5px solid ${K.border}`,borderRadius:20,background:"transparent",color:K.textMuted,fontSize:12,cursor:"pointer",fontFamily:sf},
  accountBtn:{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,whiteSpace:"nowrap",fontWeight:500},
  authLink:{background:"transparent",border:"none",color:K.accent,fontSize:13,cursor:"pointer",fontFamily:sf,textDecoration:"underline",padding:0},

  // ── Landing page styles ──
  lp: {
    hero:{background:"linear-gradient(170deg, #F4F1EC 0%, #E6EFE9 100%)",padding:"60px 24px 50px",textAlign:"center"},
    heroInner:{maxWidth:560,margin:"0 auto"},
    badge:{display:"inline-block",padding:"6px 16px",background:"rgba(45,90,61,0.08)",border:"1.5px solid rgba(45,90,61,0.15)",borderRadius:20,fontSize:12,fontWeight:600,color:K.accent,fontFamily:sf,letterSpacing:"0.5px",marginBottom:20},
    heroTitle:{fontSize:48,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",lineHeight:1.1,color:K.text,margin:"0 0 20px",letterSpacing:"-0.5px"},
    heroSub:{fontSize:17,color:K.textMuted,lineHeight:1.6,fontFamily:sf,margin:"0 auto 28px",maxWidth:440},
    heroCta:{display:"inline-block",padding:"16px 40px",background:K.accent,color:"#fff",border:"none",borderRadius:12,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:sf,boxShadow:"0 4px 20px rgba(45,90,61,0.3)",letterSpacing:"0.3px"},
    heroNote:{fontSize:12,color:K.textMuted,marginTop:14,fontFamily:sf},
    section:{padding:"50px 24px"},
    sectionInner:{maxWidth:640,margin:"0 auto"},
    sectionTitle:{fontSize:28,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text,marginBottom:16,lineHeight:1.2},
    sectionText:{fontSize:16,color:K.textMuted,lineHeight:1.7,fontFamily:sf},
    featureGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16,marginTop:24},
    featureCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:14,padding:"22px 20px"},
    featureIcon:{fontSize:28,display:"block",marginBottom:10},
    featureTitle:{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",marginBottom:6,color:K.text},
    featureText:{fontSize:13,color:K.textMuted,lineHeight:1.6,fontFamily:sf},
    stepsRow:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:20,marginTop:24},
    step:{textAlign:"center"},
    stepNum:{width:40,height:40,borderRadius:"50%",background:K.accent,color:"#fff",fontSize:18,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontFamily:sf},
    stepTitle:{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",marginBottom:6,color:K.text},
    stepText:{fontSize:13,color:K.textMuted,lineHeight:1.5,fontFamily:sf},
    footer:{padding:"24px",textAlign:"center",borderTop:`1px solid ${K.border}`},
    footerText:{fontSize:13,color:K.textMuted,fontFamily:sf},
  },
};
