import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "./supabase";

const STORAGE_KEY = "homesked-data-v3";
const ONBOARDED_KEY = "homesked-onboarded";
const OLD_STORAGE_KEY = "maintainly-data-v1";
const OLD_ONBOARDED_KEY = "maintainly-onboarded";
const LEGACY_STORAGE_KEY = "upkeep-data-v1";
const LEGACY_ONBOARDED_KEY = "upkeep-onboarded";
const THEME_KEY = "homesked-theme";

// ── System templates ────────────────────────────────────────────────
const SYSTEM_TEMPLATES = [
  { name: "Central Air / Furnace", icon: "🔥", category: "HVAC", notes: "", tasks: [
    { name: "Replace air filter", intervalMonths: 3, notes: "Use MERV 8–11 rated filters; check monthly", parts: [{ name: "HVAC air filter", cost: 18, status: "order", brand: "", model: "", size: "" }] },
    { name: "Annual professional service", intervalMonths: 12, notes: "Full tune-up: combustion test, heat exchanger inspection", parts: [{ name: "Professional HVAC service", cost: 250, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect ductwork & vents", intervalMonths: 12, notes: "Check for dust buildup, disconnected joints", parts: [] },
  ]},
  { name: "Fuel Furnace System", icon: "⛽", category: "HVAC", notes: "Includes fuel filter, fuel pump, and burner assembly", tasks: [
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
  { name: "Septic Tank", icon: "🚽", category: "Plumbing", notes: "Document tank size, type, and condition during first inspection", tasks: [
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
  { name: "Fireplace & Chimney", icon: "🌡️", category: "HVAC", notes: "Wood-burning, gas, or pellet fireplace and chimney system", tasks: [
    { name: "Professional chimney sweep", intervalMonths: 12, notes: "Before heating season — removes creosote buildup, inspects flue", parts: [{ name: "Chimney sweep service", cost: 250, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect chimney cap & crown", intervalMonths: 12, notes: "Check for cracks, missing cap, animal nests", parts: [] },
    { name: "Check damper operation", intervalMonths: 12, notes: "Should open/close freely with good seal", parts: [] },
    { name: "Inspect firebox & mortar", intervalMonths: 12, notes: "Look for cracked mortar, damaged firebrick", parts: [] },
    { name: "Clean glass doors", intervalMonths: 3, notes: "Soot buildup on glass — use fireplace glass cleaner", parts: [{ name: "Fireplace glass cleaner", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace gasket / seal", intervalMonths: 24, notes: "Door gasket wears over time — check for air leaks", parts: [{ name: "Fireplace door gasket kit", cost: 15, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Garage Door", icon: "🚪", category: "Exterior", notes: "Garage door opener, springs, tracks, and hardware", tasks: [
    { name: "Lubricate moving parts", intervalMonths: 6, notes: "Spray hinges, rollers, springs, and tracks with silicone or lithium grease", parts: [{ name: "Garage door lubricant", cost: 8, status: "order", brand: "", model: "", size: "" }] },
    { name: "Test auto-reverse safety", intervalMonths: 3, notes: "Place 2x4 on floor under door — must reverse on contact", parts: [] },
    { name: "Inspect springs & cables", intervalMonths: 6, notes: "Look for fraying cables, rust on springs. DO NOT attempt spring replacement — call a pro.", parts: [] },
    { name: "Tighten hardware", intervalMonths: 12, notes: "Check and tighten all bolts, brackets, roller hinges", parts: [] },
    { name: "Replace weather stripping", intervalMonths: 24, notes: "Bottom seal and side seals — keeps out water, pests, drafts", parts: [{ name: "Garage door seal kit", cost: 25, status: "order", brand: "", model: "", size: "" }] },
    { name: "Replace opener battery", intervalMonths: 12, notes: "Backup battery in opener unit", parts: [{ name: "Opener backup battery", cost: 30, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Sump Pump", icon: "🔧", category: "Plumbing", notes: "Primary and backup sump pump system", tasks: [
    { name: "Test pump operation", intervalMonths: 3, notes: "Pour water into pit until float triggers — verify pump runs and discharges", parts: [] },
    { name: "Clean pit & inlet screen", intervalMonths: 6, notes: "Remove debris, gravel, sediment from pit. Clean check valve.", parts: [] },
    { name: "Test backup pump / battery", intervalMonths: 3, notes: "Disconnect primary power and verify backup engages", parts: [] },
    { name: "Replace backup battery", intervalMonths: 36, notes: "Battery backup pumps need new battery every 3 years", parts: [{ name: "Sump pump backup battery", cost: 100, status: "order", brand: "", model: "", size: "" }] },
    { name: "Inspect discharge line", intervalMonths: 12, notes: "Check for clogs, proper slope, frozen sections in winter", parts: [] },
    { name: "Replace sump pump", intervalMonths: 84, notes: "Average lifespan 7–10 years — replace proactively", parts: [{ name: "Sump pump", cost: 150, status: "order", brand: "", model: "", size: "" }] },
  ]},
  { name: "Well & Well Pump", icon: "🚰", category: "Plumbing", notes: "Private well water system — pump, pressure tank, and treatment", tasks: [
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
  amazon: "homesked-20",       // Amazon Associates tag
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

// ── Icon Picker Options ─────────────────────────────────────────
const SYSTEM_ICONS = ["🔥","🌬️","🚽","🌿","🚿","💧","⚡","🚗","👕","🏠","🌱","🏊","⚙️","🐜","🚤","🔌","🚪","🚰","❄️","🛠️","🔧","🏗️","🧹","🧰","💡","🔋","🌡️","📡","🔒","🛡️","🏡","🏘️","🏢","⛽","🔩","🎯","📦","🌊","☀️","🌙","🔑","🏋️","🚲","🛒","💨","🔔"];
const HOME_ICONS = ["🏠","🏡","🏘️","🏗️","🏢","🏨","🏪","🏫","🏭","🏰","🏯","⛺","🌴","🏔️","🚢","✈️","🌊","🌲","🏖️","⛰️"];

// ── Season Contextual Messages ─────────────────────────────────
const SEASON_CONTEXT = {
  "🌸 Spring": { label: "Spring Prep", hint: "Tasks to kick off this spring" },
  "☀️ Summer": { label: "Summer Ready", hint: "Get ahead of the heat — due for summer" },
  "🍂 Fall": { label: "Fall Prep", hint: "Prepare your home before winter hits" },
  "❄️ Winter": { label: "Winter Ready", hint: "Winterize and protect what you own" },
};

// ── Confetti ────────────────────────────────────────────────────
const createConfetti = () => {
  const colors = ["#2D5A3D","#4CAF50","#FFD700","#FF6B6B","#42A5F5","#AB47BC","#FF7043","#26C6DA"];
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden";
  document.body.appendChild(container);
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    const color = colors[Math.floor(Math.random()*colors.length)];
    const left = Math.random()*100;
    const delay = Math.random()*0.5;
    const size = 6 + Math.random()*8;
    const rotation = Math.random()*360;
    const shape = Math.random() > 0.5 ? "50%" : "0";
    piece.style.cssText = "position:absolute;top:-20px;left:"+left+"%;width:"+size+"px;height:"+size+"px;background:"+color+";border-radius:"+shape+";transform:rotate("+rotation+"deg);animation:confetti-fall "+(0.8+Math.random()*1.0)+"s ease-out "+delay+"s forwards;opacity:0";
    container.appendChild(piece);
  }
  if (!document.getElementById("confetti-style")) {
    const style = document.createElement("style");
    style.id = "confetti-style";
    style.textContent = "@keyframes confetti-fall{0%{opacity:1;transform:translateY(0) rotate(0deg) scale(1)}50%{opacity:1}100%{opacity:0;transform:translateY(100vh) rotate(720deg) scale(0.3)}}";
    document.head.appendChild(style);
  }
  setTimeout(() => container.remove(), 2200);
};

// ── Helpers ─────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);
const isAsReq = (t) => t.taskType === "as-required";
const getNextDue = (t) => { if (isAsReq(t)) return null; if (!t.lastCompleted) return null; const d = new Date(t.lastCompleted); d.setMonth(d.getMonth() + t.intervalMonths); return d; };
const daysUntil = (d) => d ? Math.ceil((d - new Date()) / 864e5) : null;
const formatDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never";
const formatInterval = (m) => { if (m < 1) return "Weekly"; if (m === 1) return "Monthly"; if (m === 3) return "Quarterly"; if (m < 12) return `Every ${m} mo`; if (m === 12) return "Annually"; return m % 12 === 0 ? `Every ${m/12} yr` : `Every ${m} mo`; };
const fmtCost = (n) => n === 0 ? "—" : `$${Number(n).toFixed(2)}`;
const getStatusColor = (t, themeK) => { const k = themeK || {danger:"#BF3636",warning:"#C49520",warm:"#8B7355"}; if (isAsReq(t)) return "#6B7D8A"; const n = getNextDue(t); if (!n) return k.warm; const d = daysUntil(n); return d < 0 ? k.danger : d <= 30 ? k.warning : "#2E7D32"; };
const getStatusLabel = (t) => { if (isAsReq(t)) { const wl = t.workLog || []; return wl.length > 0 ? `${wl.length} log entr${wl.length===1?"y":"ies"}` : "As needed"; } const n = getNextDue(t); if (!n) return "Not yet tracked"; const d = daysUntil(n); if (d < 0) return `Overdue ${Math.abs(d)}d`; if (d === 0) return "Due today"; if (d <= 14) return `Due in ${d}d`; if (d <= 60) return `Due in ${Math.ceil(d/7)}w`; return `Due ${n.toLocaleDateString("en-US",{month:"short",year:"numeric"})}`; };

// ── Storage ─────────────────────────────────────────────────────────
const migrate = (raw) => {
  const migTask = (t) => ({ taskType: "scheduled", workLog: [], ...t, parts: (t.parts||[]).map(p => ({ brand:"", model:"", size:"", purchaseUrl:"", ...p })) });
  if (Array.isArray(raw)) return [{ id: genId(), name: "My Home", icon: "🏡", systems: raw.map(s => ({ ...s, tasks: s.tasks.map(migTask) })) }];
  if (raw.homes) return raw.homes.map(h => ({ ...h, systems: h.systems.map(s => ({ ...s, tasks: s.tasks.map(migTask) })) }));
  return [];
};
const loadData = () => { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return migrate(JSON.parse(r)); const old1 = localStorage.getItem(OLD_STORAGE_KEY); if (old1) return migrate(JSON.parse(old1)); const old2 = localStorage.getItem(LEGACY_STORAGE_KEY); if (old2) return migrate(JSON.parse(old2)); const old3 = localStorage.getItem("homesked-data-v2"); if (old3) return migrate(JSON.parse(old3)); } catch(e) { console.error(e); } return []; };
const saveData = (homes) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ homes })); } catch(e) { console.error(e); } };

// ── Icon Picker ─────────────────────────────────────────────────
const IconPicker = ({ icons, value, onChange, K: pK }) => {
  const [open, setOpen] = useState(false);
  const tk = pK || K_LIGHT;
  return (
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(!open)} style={{fontSize:28,padding:"8px 16px",background:tk.surface,border:"1.5px solid "+tk.border,borderRadius:10,cursor:"pointer",minHeight:44}}>
        {value} ▾
      </button>
      {open && <div style={{position:"absolute",top:"100%",left:0,zIndex:50,background:tk.surface,border:"1.5px solid "+tk.border,borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,0.25)",padding:10,marginTop:4,minWidth:220,maxHeight:240,overflowY:"auto"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:4}}>
        {icons.map((ic,i)=><button key={i} onClick={()=>{onChange(ic);setOpen(false);}} style={{fontSize:22,padding:6,background:value===ic?tk.accentLight:"transparent",border:value===ic?"1.5px solid "+tk.accent:"1.5px solid transparent",borderRadius:6,cursor:"pointer",lineHeight:1}}>
          {ic}
        </button>)}
        </div>
      </div>}
    </div>
  );
};

// ── House Logo (chimney + dark mode smoke & lights) ─────────
const HouseLogo = ({ size = 40, dark = false }) => {
  const s = size;
  const scale = s / 40;
  return (
    <div style={{position:"relative",width:s,height:s,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Chimney */}
        <rect x="28" y="5" width="5" height="12" rx="1" fill={dark?"#8B7355":"#6B5B4A"}/>
        {/* Roof */}
        <path d="M4 20L20 6L36 20" stroke={dark?"#5CB270":"#2D5A3D"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill={dark?"#253D2C":"#E6EFE9"}/>
        {/* House body */}
        <rect x="9" y="19" width="22" height="16" rx="1.5" fill={dark?"#3A3F47":"#FEFDFB"} stroke={dark?"#5CB270":"#2D5A3D"} strokeWidth="1.5"/>
        {/* Door */}
        <rect x="17" y="26" width="6" height="9" rx="1" fill={dark?"#5CB270":"#2D5A3D"}/>
        <circle cx="21.5" cy="31" r="0.8" fill={dark?"#253D2C":"#E6EFE9"}/>
        {/* Windows */}
        <rect x="12" y="23" width="4" height="4" rx="0.5" fill={dark?"#F0B429":"#E6EFE9"} stroke={dark?"#5CB270":"#2D5A3D"} strokeWidth="0.8"/>
        <rect x="24" y="23" width="4" height="4" rx="0.5" fill={dark?"#F0B429":"#E6EFE9"} stroke={dark?"#5CB270":"#2D5A3D"} strokeWidth="0.8"/>
        {/* Window glow in dark mode */}
        {dark && <><rect x="12" y="23" width="4" height="4" rx="0.5" fill="#F0B429" opacity="0.9"/><rect x="24" y="23" width="4" height="4" rx="0.5" fill="#F0B429" opacity="0.9"/></>}
      </svg>
      {/* Smoke animation - dark mode only */}
      {dark && <div style={{position:"absolute",top:-2*scale,left:28*scale,width:12*scale,height:14*scale,overflow:"visible",pointerEvents:"none"}}>
        <div style={{position:"absolute",bottom:0,left:2*scale,width:3*scale,height:3*scale,borderRadius:"50%",background:"rgba(200,200,200,0.4)",animation:"hs-smoke 2.5s ease-out infinite"}}/>
        <div style={{position:"absolute",bottom:0,left:0,width:2.5*scale,height:2.5*scale,borderRadius:"50%",background:"rgba(200,200,200,0.3)",animation:"hs-smoke 2.5s ease-out 0.8s infinite"}}/>
        <div style={{position:"absolute",bottom:0,left:4*scale,width:2*scale,height:2*scale,borderRadius:"50%",background:"rgba(200,200,200,0.25)",animation:"hs-smoke 2.5s ease-out 1.6s infinite"}}/>
      </div>}
    </div>
  );
};

// ── Parts editor ────────────────────────────────────────────────────
const PartsEditor = ({ parts, onChange, S, K }) => {
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
                  <input style={{...S.partInput, width:"100%", boxSizing:"border-box"}} value={p.purchaseUrl||""} onChange={e => onChange(parts.map(x=>x.id===p.id?{...x,purchaseUrl:e.target.value}:x))} placeholder="Paste your exact product link here..." />
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
      <p style={{fontSize:11, color:K.textMuted, margin:"6px 0 0", fontFamily:sf}}>Tap any item to add details and save the exact product link for next time.</p>
    </div>
  );
};

// ── Parts display ───────────────────────────────────────────────────
const PartsDisplay = ({ parts, S, K, priceHistory, systemId, taskId }) => {
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
        {(()=>{const key=(systemId||"")+"-"+(taskId||"");const hist=priceHistory?.[key];if(!hist||hist.length<2)return null;const avg=hist.reduce((s,h)=>s+h.cost,0)/hist.length;const latest=hist[hist.length-1].cost;const trend=latest>avg*1.15?"📈":"";return <div style={{fontSize:9,color:K.textMuted,fontFamily:sf}}>{hist.length}× bought · avg ${avg.toFixed(0)} {trend}</div>;})()}
      </div>
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <span style={S.partCost}>{fmtCost(p.cost)}</span>
        {!isService && p.cost>0 && buyUrl && <><a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{...S.buyLink, background: p.purchaseUrl ? "#2E7D32" : K.accent}} onClick={e=>e.stopPropagation()}>{p.purchaseUrl ? "Buy ✓" : "Buy"}</a>{!p.purchaseUrl && <span style={{fontSize:9,color:K.textMuted,fontFamily:sf}}>generic</span>}</>}
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

// ── Push Notifications ────────────────────────────────────────
const requestNotifPermission = async () => {
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  const result = await Notification.requestPermission();
  return result;
};

const sendNotification = (title, body, tag) => {
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body, icon: "/pwa-192x192.png", tag: tag || "homesked", badge: "/pwa-192x192.png" }); } catch(e) { console.log("Notif error:", e); }
};

const updateBadge = (count) => {
  if ("setAppBadge" in navigator) {
    if (count > 0) navigator.setAppBadge(count).catch(()=>{});
    else navigator.clearAppBadge().catch(()=>{});
  }
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
  const [digestFreq, setDigestFreq] = useState("weekly");
  const [formSystem, setFormSystem] = useState({ name:"", icon:"🔧", category:"HVAC", notes:"" });
  const [formTask, setFormTask] = useState({ name:"", intervalMonths:12, notes:"", parts:[], taskType:"scheduled", season:"", dependsOn:"" });
  const [formHome, setFormHome] = useState({ name:"", icon:"🏡" });
  const [showHomePicker, setShowHomePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLogModal, setShowLogModal] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [partsFilter, setPartsFilter] = useState(null); // "on-hand" or "order"
  const [showCelebration, setShowCelebration] = useState(null);
  const [budget, setBudget] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-budget")) || { monthly: 0, spent: 0, entries: [] }; } catch(e) { return { monthly: 0, spent: 0, entries: [] }; } });
  const [showBudgetSetup, setShowBudgetSetup] = useState(false);
  const [providers, setProviders] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-providers")) || []; } catch(e) { return []; } });
  const [formProvider, setFormProvider] = useState({ name:"", phone:"", email:"", specialty:"", notes:"", systemIds:[] });
  const [editingProvider, setEditingProvider] = useState(null);
  const [shareEmail, setShareEmail] = useState("");
  const [notifEnabled, setNotifEnabled] = useState(() => Notification?.permission === "granted");
  const [customTemplates, setCustomTemplates] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-custom-templates")) || []; } catch(e) { return []; } });
  const [documents, setDocuments] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-docs")) || []; } catch(e) { return []; } });
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [dashSort, setDashSort] = useState("default"); // default, urgency, cost, alpha
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [homeProfile, setHomeProfile] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-profile-"+activeHomeId)) || {}; } catch(e) { return {}; } });
  const [dismissedSuggestions, setDismissedSuggestions] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-dismissed-suggestions")) || []; } catch(e) { return []; } });
  const [walkthrough, setWalkthrough] = useState(null); // {step, systems, completed, skipped}
  const [priceHistory, setPriceHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-prices")) || {}; } catch(e) { return {}; } });
  const [weatherAlerts, setWeatherAlerts] = useState([]);
  const [weatherDismissed, setWeatherDismissed] = useState([]);
  const [achievements, setAchievements] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-achievements")) || { unlocked:[], streak:0, bestStreak:0, score:0 }; } catch(e) { return { unlocked:[], streak:0, bestStreak:0, score:0 }; } });
  const [showTrophies, setShowTrophies] = useState(false);
  const [calMonth, setCalMonth] = useState(() => { const n=new Date(); return { year:n.getFullYear(), month:n.getMonth() }; });
  const [calSelectedDay, setCalSelectedDay] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [sharedUsers, setSharedUsers] = useState(() => { try { return JSON.parse(localStorage.getItem("homesked-shared")) || []; } catch(e) { return []; } });

  // Dark mode theme override
  const K = darkMode ? {
    bg:"#1A1D21", surface:"#23272E", border:"#3A3F47", text:"#E8E6E3", textMuted:"#9A9590",
    accent:"#4CAF50", accentLight:"#2E3B30", warm:"#C49520", danger:"#E74C3C", warning:"#F0B429", radius:12
  } : {
    bg:"#F4F1EC", surface:"#FEFDFB", border:"#DDD7CC", text:"#1A1A1A", textMuted:"#6B6560",
    accent:"#2D5A3D", accentLight:"#E6EFE9", warm:"#8B7355", danger:"#BF3636", warning:"#C49520", radius:12
  };
  const S = makeStyles(K, sf, darkMode);
  const LP = S.lp;

  // ── Cloud sync helpers ──
  const loadFromCloud = async (uid) => {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.from("user_data").select("homes").eq("user_id", uid).maybeSingle();
      if (error) { console.error("Cloud load error:", error); return null; }
      if (data && data.homes) return migrate({ homes: data.homes });
    } catch (e) { console.error("Cloud load error:", e); }
    return null;
  };
  const saveToCloud = async (uid, homesData) => {
    if (!supabase) return;
    try {
      await supabase.from("user_data").upsert({ user_id: uid, homes: homesData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    } catch (e) { console.error("Cloud save error:", e); }
  };
  const loadProfile = async (uid) => {
    if (!supabase) return;
    try {
      const { data } = await supabase.from("profiles").select("digest_frequency").eq("id", uid).maybeSingle();
      if (data?.digest_frequency) setDigestFreq(data.digest_frequency);
    } catch (e) { console.error("Profile load error:", e); }
  };
  const saveDigestPref = async (freq) => {
    setDigestFreq(freq);
    if (user) {
      try {
        await supabase.from("profiles").update({ digest_frequency: freq }).eq("id", user.id);
        showToast(freq === "off" ? "Digests turned off" : `${freq.charAt(0).toUpperCase() + freq.slice(1)} digest enabled ✓`);
      } catch (e) { console.error("Profile save error:", e); }
    }
  };

  // ── Photo helpers ──
  const compressImage = (file, maxW = 1200) => new Promise((res) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        c.width = img.width * ratio;
        c.height = img.height * ratio;
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.7));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const uploadPhoto = async (sysId, taskId, dataUrl) => {
    const photoId = genId();
    // Save to task data (works offline)
    setSystems(prev => prev.map(s => s.id === sysId ? {
      ...s, tasks: s.tasks.map(t => t.id === taskId ? {
        ...t, photos: [...(t.photos || []), { id: photoId, data: dataUrl, date: new Date().toISOString() }]
      } : t)
    } : s));
    showToast("Photo added ✓");
    // Upload to Supabase if signed in
    if (user) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const path = `${user.id}/${taskId}/${photoId}.jpg`;
        await supabase.storage.from("task-photos").upload(path, blob, { contentType: "image/jpeg" });
      } catch (e) { console.error("Photo upload error:", e); }
    }
  };

  const deletePhoto = (sysId, taskId, photoId) => {
    setSystems(prev => prev.map(s => s.id === sysId ? {
      ...s, tasks: s.tasks.map(t => t.id === taskId ? {
        ...t, photos: (t.photos || []).filter(p => p.id !== photoId)
      } : t)
    } : s));
    showToast("Photo removed");
    if (user) {
      try {
        supabase.storage.from("task-photos").remove([`${user.id}/${taskId}/${photoId}.jpg`]);
      } catch (e) { console.error("Photo delete error:", e); }
    }
  };

  const [photoViewer, setPhotoViewer] = useState(null);

  const PhotoStrip = ({ photos, sysId, taskId }) => {
    if (!photos || photos.length === 0) return null;
    return (
      <div style={{ display: "flex", gap: 8, margin: "8px 0 4px 20px", overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch", msOverflowStyle: "none", scrollbarWidth: "none" }}>
        {photos.map(p => (
          <div key={p.id} style={{ position: "relative", flexShrink: 0 }}>
            <img src={p.data} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: `1.5px solid ${K.border}` }}
              onClick={() => setPhotoViewer({ ...p, sysId, taskId })} />
          </div>
        ))}
      </div>
    );
  };

  const PhotoButton = ({ sysId, taskId }) => {
    const fileRef = useRef(null);
    return (
      <>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const dataUrl = await compressImage(file);
            await uploadPhoto(sysId, taskId, dataUrl);
            e.target.value = "";
          }} />
        <button style={S.taskEditBtn} onClick={() => fileRef.current?.click()} title="Add photo">📷</button>
      </>
    );
  };

  // ── Auth handlers ──
  const handleSignup = async () => {
    if (!supabase) { setAuthError("Supabase not configured. Run in offline mode."); return; }
    setAuthError(""); setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: authEmail, password: authPass });
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    if (data?.user?.identities?.length === 0) { setAuthError("An account with this email already exists."); return; }
    if (data?.session) {
      setUser(data.user);
      if (homes.length === 0) {
        const h = { id: genId(), name: "My Home", icon: "🏡", systems: [] };
        setHomes([h]);
        setActiveHomeId(h.id);
      }
      setOnboarded(true);
      localStorage.setItem(ONBOARDED_KEY, "true");
      setView("dashboard");
      showToast("Account created ✓");
    } else {
      showToast("Check your email to confirm your account!");
    }
  };
  const handleLogin = async () => {
    if (!supabase) { setAuthError("Supabase not configured. Run in offline mode."); return; }
    setAuthError(""); setAuthLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass });
    if (error) { setAuthError(error.message); setAuthLoading(false); return; }
    setUser(data.user);
    // Try cloud load with 5s timeout — don't block sign-in on failure
    try {
      const cloudPromise = loadFromCloud(data.user.id);
      const timeout = new Promise(r => setTimeout(() => r(null), 5000));
      const cloudData = await Promise.race([cloudPromise, timeout]);
      if (cloudData && cloudData.length > 0) {
        setHomes(cloudData);
        setActiveHomeId(cloudData[0]?.id);
      } else if (homes.length === 0) {
        const h = { id: genId(), name: "My Home", icon: "🏡", systems: [] };
        setHomes([h]);
        setActiveHomeId(h.id);
      }
    } catch (e) {
      if (homes.length === 0) {
        const h = { id: genId(), name: "My Home", icon: "🏡", systems: [] };
        setHomes([h]);
        setActiveHomeId(h.id);
      }
    }
    setAuthLoading(false);
    setOnboarded(true);
    localStorage.setItem(ONBOARDED_KEY, "true");
    setView("dashboard");
    loadProfile(data.user.id);
    showToast("Signed in ✓");
  };
  const handleForgot = async () => {
    if (!supabase) { setAuthError("Supabase not configured. Run in offline mode."); return; }
    setAuthError(""); setAuthLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail);
    setAuthLoading(false);
    if (error) { setAuthError(error.message); return; }
    showToast("Password reset email sent!");
    setAuthView("login");
  };
  const handleLogout = async () => {
    if (supabase) await supabase.auth.signOut();
    setUser(null);
    setShowAccount(false);
    setOnboarded(false);
    setShowLanding(true);
    setView("dashboard");
    setSelectedSystem(null);
    setAuthEmail("");
    setAuthPass("");
    setAuthError("");
    showToast("Signed out");
  };

  // ── Init: check auth + load data ──
  useEffect(() => {
    // Load local data first (always available offline)
    const localData = loadData();
    setHomes(localData);
    if (localData.length > 0) setActiveHomeId(localData[0].id);
    const isReturning = localStorage.getItem(ONBOARDED_KEY)==="true" || localStorage.getItem(OLD_ONBOARDED_KEY)==="true" || localStorage.getItem(LEGACY_ONBOARDED_KEY)==="true" || localData.length > 0;
    setOnboarded(isReturning);
    setShowLanding(!isReturning);
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") setDarkMode(true);
    setLoaded(true);
    // Badge + notification check
    const checkOverdue = () => {
      const ld = loadData();
      let overdueCount = 0;
      ld.forEach(h => h.systems.forEach(s => s.tasks.forEach(t => {
        if (t.taskType === "as-required" || !t.lastCompleted) return;
        const next = new Date(t.lastCompleted);
        next.setMonth(next.getMonth() + t.intervalMonths);
        if (next < new Date()) overdueCount++;
      })));
      updateBadge(overdueCount);
      if (overdueCount > 0 && Notification.permission === "granted") {
        const lastNotif = localStorage.getItem("homesked-last-notif");
        const today = new Date().toDateString();
        if (lastNotif !== today) {
          sendNotification("HomeSked", overdueCount + " overdue task" + (overdueCount>1?"s":"") + " need attention", "overdue-daily");
          localStorage.setItem("homesked-last-notif", today);
        }
      }
    };
    checkOverdue();
    const notifInterval = setInterval(checkOverdue, 3600000); // hourly

    // Check for existing session
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user.id);
        loadFromCloud(session.user.id).then(cloudData => {
          if (cloudData && cloudData.length > 0) {
            setHomes(cloudData);
            setActiveHomeId(cloudData[0]?.id);
            setOnboarded(true);
            setShowLanding(false);
          }
        }).catch(() => {});
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        try {
          const cloudData = await loadFromCloud(session.user.id);
          if (cloudData && cloudData.length > 0) {
            setHomes(cloudData);
            setActiveHomeId(cloudData[0]?.id);
            setOnboarded(true);
            setShowLanding(false);
          } else {
            const local = loadData();
            if (local.length > 0) await saveToCloud(session.user.id, local);
          }
        } catch (e) { console.error("Auth sync error:", e); }
      } else {
        setUser(null);
      }
    });
    return () => { subscription.unsubscribe(); clearInterval(notifInterval); };
  }, []);

  // Save to localStorage AND cloud when data changes
  useEffect(() => {
    if (!loaded) return;
    saveData(homes);
    if (user) saveToCloud(user.id, homes);
  }, [homes, loaded]);
  useEffect(() => { localStorage.setItem(THEME_KEY, darkMode ? "dark" : "light"); }, [darkMode]);
  useEffect(() => { try { localStorage.setItem("homesked-budget", JSON.stringify(budget)); } catch(e){} }, [budget]);
  useEffect(() => { try { localStorage.setItem("homesked-providers", JSON.stringify(providers)); } catch(e){} }, [providers]);
  useEffect(() => { try { localStorage.setItem("homesked-shared", JSON.stringify(sharedUsers)); } catch(e){} }, [sharedUsers]);
  useEffect(() => { try { localStorage.setItem("homesked-custom-templates", JSON.stringify(customTemplates)); } catch(e){} }, [customTemplates]);
  useEffect(() => { try { localStorage.setItem("homesked-docs", JSON.stringify(documents)); } catch(e){} }, [documents]);
  useEffect(() => { try { localStorage.setItem("homesked-dismissed-suggestions", JSON.stringify(dismissedSuggestions)); } catch(e){} }, [dismissedSuggestions]);
  useEffect(() => { try { localStorage.setItem("homesked-prices", JSON.stringify(priceHistory)); } catch(e){} }, [priceHistory]);
  useEffect(() => { try { localStorage.setItem("homesked-achievements", JSON.stringify(achievements)); } catch(e){} }, [achievements]);
  useEffect(() => { if(activeHomeId) try { localStorage.setItem("homesked-profile-"+activeHomeId, JSON.stringify(homeProfile)); } catch(e){} }, [homeProfile, activeHomeId]);
  useEffect(() => { try { const p = JSON.parse(localStorage.getItem("homesked-profile-"+activeHomeId)) || {}; setHomeProfile(p); } catch(e){ setHomeProfile({}); } }, [activeHomeId]);

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
  const changeHomeIcon = (id, icon) => setHomes(prev => prev.map(h => h.id===id ? {...h, icon} : h));

  // ── System/task actions ──
  const markComplete = (sId, tId, date, completionNotes, actualCost) => { const noteText = completionNotes && completionNotes.trim() ? completionNotes.trim() : "Completed";
    if (actualCost && actualCost > 0) {
      setBudget(prev => ({...prev, spent: prev.spent + actualCost, entries: [...prev.entries, { date, amount: actualCost, task: tId, system: sId }]}));
      // Record price history
      const key = sId + "-" + tId;
      setPriceHistory(prev => ({...prev, [key]: [...(prev[key]||[]), { date, cost: actualCost }]}));
    } setSystems(prev=>prev.map(s=>s.id===sId?{...s,tasks:s.tasks.map(t=>t.id===tId?{...t,lastCompleted:date,workLog:[...(t.workLog||[]),{id:genId(),date,notes:noteText}]}:t)}:s)); setShowCompleteModal(null); setShowCelebration(sId+tId); createConfetti(); setTimeout(()=>setShowCelebration(null), 1800); };
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
  const isDepBlocked = (task, sysTasks) => {
    if (!task.dependsOn) return false;
    const dep = sysTasks.find(t => t.id === task.dependsOn);
    if (!dep) return false;
    // Blocked if dependency has never been completed, or was last completed before the task's last cycle
    if (!dep.lastCompleted) return true;
    if (!task.lastCompleted) return false; // If task itself never done, dependency just needs to be done once
    return new Date(dep.lastCompleted) < new Date(task.lastCompleted);
  };
  const allTasks = systems.flatMap(s=>s.tasks.map(t=>({...t, systemId:s.id, systemName:s.name, systemIcon:s.icon})));
  const urgentTasks = allTasks.map(t=>({...t,next:getNextDue(t),days:daysUntil(getNextDue(t))})).filter(t=>t.days!==null&&t.days<=30).sort((a,b)=>a.days-b.days);
  const untrackedTasks = allTasks.filter(t=>!t.lastCompleted);
  const filteredSystemsRaw = (categoryFilter==="All" ? systems : systems.filter(s=>s.category===categoryFilter)).filter(s=>!seasonFilter||s.tasks.some(t=>t.season===seasonFilter));
  const filteredSystems = [...filteredSystemsRaw].sort((a,b) => {
    if (dashSort === "urgency") {
      const aOD = a.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;
      const bOD = b.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;
      if (bOD !== aOD) return bOD - aOD;
      const aUp = a.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;
      const bUp = b.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;
      return bUp - aUp;
    }
    if (dashSort === "cost") {
      const aCost = a.tasks.reduce((s,t)=>(t.parts||[]).filter(p=>p.status==="order").reduce((s2,p)=>s2+(p.cost||0),s),0);
      const bCost = b.tasks.reduce((s,t)=>(t.parts||[]).filter(p=>p.status==="order").reduce((s2,p)=>s2+(p.cost||0),s),0);
      return bCost - aCost;
    }
    if (dashSort === "alpha") return a.name.localeCompare(b.name);
    return 0;
  });
  const annualCost = systems.reduce((total,s)=>total+s.tasks.filter(t=>!isAsReq(t)).reduce((st,t)=>{const timesPerYear=t.intervalMonths>0?12/t.intervalMonths:0;const taskCost=(t.parts||[]).filter(p=>p.status==="order").reduce((pc,p)=>pc+(p.cost||0),0);return st+taskCost*timesPerYear;},0),0);
  const overdueTasks = allTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;
  const upcomingTaskList = allTasks.map(t=>({...t,next:getNextDue(t),days:daysUntil(getNextDue(t))})).filter(t=>t.days!==null&&t.days>=0&&t.days<=30).sort((a,b)=>a.days-b.days);
  const upcomingCount = upcomingTaskList.length;
  const overdueTaskList = allTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).sort((a,b)=>daysUntil(getNextDue(a))-daysUntil(getNextDue(b)));
  const costBreakdown = systems.map(s => {
    const cost = s.tasks.filter(t=>!isAsReq(t)).reduce((st,t)=>{const tpy=t.intervalMonths>0?12/t.intervalMonths:0;const tc=(t.parts||[]).filter(p=>p.status==="order").reduce((pc,p)=>pc+(p.cost||0),0);return st+tc*tpy;},0);
    return { name: s.name, icon: s.icon, cost };
  }).filter(s=>s.cost>0).sort((a,b)=>b.cost-a.cost);
  // ── Seasonal banner ──
  const currentMonth = new Date().getMonth(); // 0-11
  const currentSeason = currentMonth >= 2 && currentMonth <= 4 ? "🌸 Spring" : currentMonth >= 5 && currentMonth <= 7 ? "☀️ Summer" : currentMonth >= 8 && currentMonth <= 10 ? "🍂 Fall" : "❄️ Winter";
  const seasonalTasks = allTasks.filter(t => t.season === currentSeason);
  const seasonNames = {"🌸 Spring":"spring","☀️ Summer":"summer","🍂 Fall":"fall","❄️ Winter":"winter"};
  const seasonBannerMessages = {
    "🌸 Spring": {emoji:"🌸", title:"Spring is here", sub:"Time to open up, clean out, and get ahead of the warm months."},
    "☀️ Summer": {emoji:"☀️", title:"Summer maintenance", sub:"Keep your systems running cool and your outdoor spaces in shape."},
    "🍂 Fall": {emoji:"🍂", title:"Fall prep season", sub:"Button things up before winter. Gutters, furnace, winterization."},
    "❄️ Winter": {emoji:"❄️", title:"Winter watch", sub:"Protect pipes, keep heating efficient, and plan for spring."},
  };
  const seasonBanner = seasonBannerMessages[currentSeason];

  // ── History (all completed tasks) ──
  const historyEntries = [];
  systems.forEach(s => s.tasks.forEach(t => {
    (t.workLog || []).forEach(w => {
      historyEntries.push({ date: w.date, notes: w.notes, taskName: t.name, systemName: s.name, systemIcon: s.icon, taskId: t.id, systemId: s.id });
    });
  }));
  historyEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── Smart Suggestions ──
  const smartSuggestions = [];
  const sysNames = systems.map(s => s.name.toLowerCase());

  // Suggest missing systems based on what user has
  const suggestionRules = [
    { has: ["swimming pool"], missing: "Pool Pump & Filter", reason: "You have a pool but no pump/filter system tracked" },
    { has: ["pool pump"], missing: "Swimming Pool", reason: "You track your pool pump but not your pool chemistry" },
    { has: ["central air", "fuel furnace", "mini-split"], missing: "Air Purifier", reason: "You have HVAC — an air purifier would complement it" },
    { has: ["electric water heater"], missing: "Water Softener", reason: "Water softeners protect your heater from sediment buildup" },
    { has: ["lawn & yard"], missing: "Pest Control", reason: "Yard maintenance pairs well with pest prevention" },
    { has: ["boat"], missing: "Generator", reason: "Many boat owners also have a generator — worth tracking if you do" },
    { has: ["gas / ice vehicle", "ev / tesla"], missing: "Garage Door", reason: "If you park in a garage, the door needs maintenance too" },
    { has: ["roof & gutters"], missing: "Sump Pump", reason: "If you have gutters, a sump pump is often part of the water management system" },
  ];
  suggestionRules.forEach(rule => {
    const hasMatch = rule.has.some(h => sysNames.some(sn => sn.includes(h)));
    const missingMatch = !sysNames.some(sn => sn.toLowerCase().includes(rule.missing.toLowerCase()));
    if (hasMatch && missingMatch && !dismissedSuggestions.includes(rule.missing)) {
      const tpl = SYSTEM_TEMPLATES.find(t => t.name === rule.missing);
      if (tpl) smartSuggestions.push({ type: "missing-system", tpl, reason: rule.reason });
    }
  });

  // Suggest tasks that are way overdue (3x interval)
  allTasks.forEach(t => {
    if (isAsReq(t) || !t.lastCompleted || !t.intervalMonths) return;
    const next = getNextDue(t);
    if (!next) return;
    const days = daysUntil(next);
    if (days !== null && days < -(t.intervalMonths * 30 * 2)) {
      const key = "overdue-" + t.id;
      if (!dismissedSuggestions.includes(key)) {
        smartSuggestions.push({ type: "forgotten", task: t, days: Math.abs(days), reason: t.name + " is " + Math.abs(days) + " days overdue — did you skip this or forget?" });
      }
    }
  });

  // Suggest push notifications if not enabled
  if (typeof Notification !== "undefined" && Notification.permission !== "granted" && overdueTasks > 0 && !dismissedSuggestions.includes("enable-notifs")) {
    smartSuggestions.push({ type: "enable-notifs", reason: "Turn on notifications so you never miss an overdue task" });
  }

  // Property-aware suggestions
  if (homeProfile.yearBuilt) {
    const age = new Date().getFullYear() - Number(homeProfile.yearBuilt);
    if (age >= 18 && !sysNames.some(s=>s.includes("roof")) && !dismissedSuggestions.includes("roof-age")) {
      smartSuggestions.push({ type: "property-hint", reason: "Your home is " + age + " years old — most roofs last 20-25 years. Consider tracking roof maintenance.", dismissKey: "roof-age" });
    }
    if (age >= 10 && !sysNames.some(s=>s.includes("water heater")) && !dismissedSuggestions.includes("wh-age")) {
      smartSuggestions.push({ type: "property-hint", reason: "Your home is " + age + " years old — water heaters typically last 10-15 years. Worth tracking.", dismissKey: "wh-age" });
    }
  }
  if (homeProfile.waterSource === "Well" && !sysNames.some(s=>s.includes("well")) && !dismissedSuggestions.includes("well-hint")) {
    const tpl = SYSTEM_TEMPLATES.find(t=>t.name.includes("Well"));
    if (tpl) smartSuggestions.push({ type: "missing-system", tpl, reason: "You have well water — track your well pump and water quality testing." });
  }
  if (homeProfile.sewage === "Septic" && !sysNames.some(s=>s.includes("septic")) && !dismissedSuggestions.includes("septic-hint")) {
    const tpl = SYSTEM_TEMPLATES.find(t=>t.name.includes("Septic"));
    if (tpl) smartSuggestions.push({ type: "missing-system", tpl, reason: "You have a septic system — pump-outs and inspections should be tracked." });
  }

  // Suggest budget if none set
  if (budget.monthly === 0 && annualCost > 0 && !dismissedSuggestions.includes("set-budget")) {
    smartSuggestions.push({ type: "set-budget", reason: "You're spending ~$" + (annualCost/12).toFixed(0) + "/mo on maintenance. Set a budget to track it." });
  }

  // ── Weather-based smart alerts ──
  useEffect(() => {
    const month = new Date().getMonth();
    const alerts = [];
    const has = (name) => systems.some(s => s.name.toLowerCase().includes(name.toLowerCase()));
    // Winter freeze alerts (Nov-Feb)
    if (month >= 10 || month <= 1) {
      if (has("plumbing") || has("water")) alerts.push({ id:"freeze", icon:"🥶", title:"Freeze Warning", body:"Protect exposed pipes, disconnect garden hoses, and insulate outdoor faucets.", priority:"high" });
      if (has("pool") || has("swimming")) alerts.push({ id:"pool-winter", icon:"❄️", title:"Pool Winterization", body:"Ensure your pool is properly winterized — check antifreeze levels in lines.", priority:"medium" });
      if (has("furnace") || has("hvac") || has("heat")) alerts.push({ id:"heat-check", icon:"🔥", title:"Heating System Check", body:"Cold stretch ahead. Verify furnace filter is fresh and thermostat is working.", priority:"medium" });
    }
    // Spring storms (Mar-May)
    if (month >= 2 && month <= 4) {
      if (has("roof") || has("gutter")) alerts.push({ id:"storm-prep", icon:"🌧️", title:"Storm Season Prep", body:"Clean gutters before spring rains. Check roof for winter damage.", priority:"high" });
      if (has("sump")) alerts.push({ id:"sump-spring", icon:"💧", title:"Sump Pump Check", body:"Spring melt and rain increase basement flooding risk. Test your sump pump now.", priority:"medium" });
    }
    // Summer heat (Jun-Aug)
    if (month >= 5 && month <= 7) {
      if (has("air") || has("hvac") || has("mini-split")) alerts.push({ id:"ac-heat", icon:"☀️", title:"Heat Wave Prep", body:"Check AC filters and clean condenser coils. Your system works hardest right now.", priority:"medium" });
      if (has("pool") || has("swimming")) alerts.push({ id:"pool-chem", icon:"🏊", title:"Pool Chemistry Alert", body:"High temps accelerate chlorine burn-off. Test water chemistry more frequently.", priority:"medium" });
      if (has("lawn") || has("yard")) alerts.push({ id:"lawn-heat", icon:"🌱", title:"Lawn Care", body:"Water deeply but less frequently during heat. Early morning is best.", priority:"low" });
    }
    // Fall prep (Sep-Oct)
    if (month >= 8 && month <= 9) {
      if (has("furnace") || has("fuel") || has("heat")) alerts.push({ id:"heat-prep", icon:"🍂", title:"Heating Season Prep", body:"Schedule furnace service before the rush. Replace filters, test thermostat.", priority:"high" });
      if (has("chimney") || has("fireplace")) alerts.push({ id:"chimney-fall", icon:"🌡️", title:"Chimney Sweep Time", body:"Get your chimney swept before the first fire of the season.", priority:"medium" });
      if (has("generator")) alerts.push({ id:"gen-fall", icon:"🔌", title:"Generator Prep", body:"Winter storms are coming. Run and load-test your generator now.", priority:"medium" });
    }
    setWeatherAlerts(alerts.filter(a => !weatherDismissed.includes(a.id)));
  }, [systems, weatherDismissed]);

  // ── Achievements & Gamification ──
  useEffect(() => {
    if (!loaded || systems.length === 0) return;
    const newUnlocked = [...achievements.unlocked];
    const badge = (id) => { if (!newUnlocked.includes(id)) newUnlocked.push(id); };

    // Check achievement conditions
    const totalCompleted = allTasks.filter(t => t.lastCompleted).length;
    if (totalCompleted >= 1) badge("first-complete");
    if (totalCompleted >= 10) badge("ten-complete");
    if (totalCompleted >= 50) badge("fifty-complete");
    if (totalCompleted >= 100) badge("century");
    if (systems.length >= 5) badge("five-systems");
    if (systems.length >= 10) badge("ten-systems");
    if (overdueTasks === 0 && totalCompleted > 0) badge("zero-overdue");
    if (budget.monthly > 0) badge("budget-set");
    if (providers.length >= 1) badge("first-provider");
    if (documents.length >= 1) badge("first-doc");
    if (homeProfile.yearBuilt) badge("property-details");
    if (homes.length >= 2) badge("multi-home");

    // Calculate streak (consecutive on-time completions)
    const entries = [];
    systems.forEach(s => s.tasks.forEach(t => (t.workLog||[]).forEach(w => entries.push(w.date))));
    entries.sort((a,b) => new Date(b) - new Date(a));
    let streak = 0;
    const uniqueDays = [...new Set(entries.map(d => new Date(d).toDateString()))];
    if (uniqueDays.length > 0) {
      streak = 1;
      for (let i = 1; i < uniqueDays.length && i < 365; i++) {
        const diff = (new Date(uniqueDays[i-1]) - new Date(uniqueDays[i])) / 864e5;
        if (diff <= 14) streak++; else break;
      }
    }

    // Score: 0-100 based on completion rate, overdue, and tracking
    const tracked = allTasks.filter(t => t.lastCompleted).length;
    const score = allTasks.length > 0 ? Math.min(100, Math.round(((tracked / allTasks.length) * 70) + ((overdueTasks === 0 ? 20 : Math.max(0, 20 - overdueTasks * 5))) + (systems.length >= 3 ? 10 : systems.length * 3))) : 0;

    if (newUnlocked.length !== achievements.unlocked.length || streak !== achievements.streak || score !== achievements.score) {
      setAchievements({ unlocked: newUnlocked, streak, bestStreak: Math.max(achievements.bestStreak, streak), score });
    }
  }, [systems, homes, loaded, providers, documents, homeProfile, budget]);

  // ── Calendar data ──
  const calDays = (() => {
    const y = calMonth.year, m = calMonth.month;
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const dayTasks = allTasks.filter(t => {
        const next = getNextDue(t);
        return next && next.getFullYear() === y && next.getMonth() === m && next.getDate() === d;
      });
      days.push({ day: d, date, tasks: dayTasks });
    }
    return days;
  })();
  const calMonthLabel = new Date(calMonth.year, calMonth.month).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // ── Analytics computations ──
  const totalTasks = allTasks.length;
  const completedTasks = allTasks.filter(t => t.lastCompleted).length;
  const healthPct = totalTasks > 0 ? Math.round((completedTasks - overdueTasks) / totalTasks * 100) : 0;
  const costByCategory = {};
  systems.forEach(s => {
    const cat = s.category || "Other";
    const cost = s.tasks.filter(t=>!isAsReq(t)).reduce((st,t)=>{const tpy=t.intervalMonths>0?12/t.intervalMonths:0;const tc=(t.parts||[]).filter(p=>p.status==="order").reduce((pc,p)=>pc+(p.cost||0),0);return st+tc*tpy;},0);
    costByCategory[cat] = (costByCategory[cat]||0) + cost;
  });
  const costByCatArr = Object.entries(costByCategory).filter(([,c])=>c>0).sort((a,b)=>b[1]-a[1]);
  // Weekly heatmap data (52 weeks)
  const now = new Date();
  const weeklyHeatmap = [];
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  for (let w = 0; w < 52; w++) {
    const wStart = new Date(weekStart); wStart.setDate(wStart.getDate() + w * 7);
    const wEnd = new Date(wStart); wEnd.setDate(wEnd.getDate() + 6);
    const wLabel = wStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const wMonth = wStart.toLocaleDateString("en-US", { month: "short" });
    let wCost = 0;
    const wTasks = [];
    allTasks.forEach(t => {
      if (isAsReq(t)) return;
      const next = getNextDue(t);
      if (!next) return;
      if (next >= wStart && next <= wEnd) {
        const tc = (t.parts||[]).filter(p=>p.status==="order").reduce((s,p)=>s+(p.cost||0),0);
        wCost += tc;
        wTasks.push({ name: t.name, system: t.systemName, systemIcon: t.systemIcon, cost: tc, taskId: t.id, systemId: t.systemId });
      }
    });
    weeklyHeatmap.push({ week: w, label: wLabel, month: wMonth, cost: wCost, tasks: wTasks, count: wTasks.length, start: wStart.toISOString(), end: wEnd.toISOString() });
  }
  const maxWeekCost = Math.max(...weeklyHeatmap.map(w=>w.cost), 1);
  // Also keep monthly aggregation for forecast
  const monthlyForecast = [];
  for (let m = 0; m < 12; m++) {
    const month = new Date(now.getFullYear(), now.getMonth() + m, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + m + 1, 0);
    const monthLabel = month.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    let mCost = 0;
    const mTasks = [];
    allTasks.forEach(t => {
      if (isAsReq(t)) return;
      const next = getNextDue(t);
      if (!next) return;
      if (next >= month && next <= monthEnd) {
        const tc = (t.parts||[]).filter(p=>p.status==="order").reduce((s,p)=>s+(p.cost||0),0);
        mCost += tc;
        mTasks.push({ name: t.name, system: t.systemName, cost: tc });
      }
    });
    monthlyForecast.push({ month: monthLabel, cost: mCost, tasks: mTasks, count: mTasks.length });
  }
  const topExpensive = allTasks.filter(t=>!isAsReq(t)).map(t => {
    const tpy = t.intervalMonths > 0 ? 12 / t.intervalMonths : 0;
    const tc = (t.parts||[]).filter(p=>p.status==="order").reduce((s,p)=>s+(p.cost||0),0);
    return { name: t.name, system: t.systemName, icon: t.systemIcon, annualCost: tc * tpy, perOccurrence: tc };
  }).filter(t=>t.annualCost>0).sort((a,b)=>b.annualCost-a.annualCost).slice(0, 8);
  const partsInventory = { onHand: 0, toOrder: 0, onHandValue: 0, toOrderValue: 0, onHandList: [], toOrderList: [] };
  allTasks.forEach(t => (t.parts||[]).forEach(p => {
    if (p.status === "on-hand") { partsInventory.onHand++; partsInventory.onHandValue += (p.cost||0); partsInventory.onHandList.push({...p, taskName: t.name, systemName: t.systemName, systemIcon: t.systemIcon}); }
    else { partsInventory.toOrder++; partsInventory.toOrderValue += (p.cost||0); partsInventory.toOrderList.push({...p, taskName: t.name, systemName: t.systemName, systemIcon: t.systemIcon}); }
  }));

  const searchResults = searchQuery.trim().length>=2 ? allTasks.filter(t=>{const q=searchQuery.toLowerCase();return t.name.toLowerCase().includes(q)||t.systemName.toLowerCase().includes(q)||(t.notes||"").toLowerCase().includes(q)||(t.parts||[]).some(p=>p.name.toLowerCase().includes(q));}) : [];
  const exportData = () => { const blob=new Blob([JSON.stringify({homes,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`homesked-backup-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url); showToast("Data exported ✓"); };
  const importData = () => { const input=document.createElement("input"); input.type="file"; input.accept=".json"; input.onchange=(e)=>{const file=e.target.files[0]; if(!file)return; const reader=new FileReader(); reader.onload=(ev)=>{try{const data=JSON.parse(ev.target.result); if(data.homes){setHomes(data.homes);setActiveHomeId(data.homes[0]?.id);showToast("Data imported ✓");}else{showToast("Invalid file format");}}catch(err){showToast("Import failed");}}; reader.readAsText(file);}; input.click(); };
  const addToCalendar = (task) => { const next=getNextDue(task); if(!next)return; const d=next.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; const end=new Date(next.getTime()+3600000).toISOString().replace(/[-:]/g,"").split(".")[0]+"Z"; const url=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent("HomeSked: "+task.name)}&dates=${d}/${end}&details=${encodeURIComponent(task.notes||"")}`; window.open(url,"_blank"); };

  if (!loaded) return <div style={S.loadingWrap}><div style={S.loadingText}>Loading HomeSked…</div></div>;

  // ═══ LANDING PAGE ═══
  if (showLanding && !onboarded) {
    return (
      <div className="app-container" style={{...S.app,background:K.bg}}>
        {/* Hero */}
        <div style={LP.hero}>
          <div style={LP.heroInner}>
            <div style={LP.badge}><HouseLogo size={22} dark={darkMode}/> <span style={{marginLeft:4}}>HomeSked</span></div>
            <h1 style={LP.heroTitle}>Your world,<br/><em style={{fontStyle:"italic",color:K.accent}}>maintained.</em></h1>
            <p style={LP.heroSub}>One place to track every maintenance task, part, and due date across your home, vehicles, and boat. Nothing slips through the cracks again.</p>
            <button style={LP.heroCta} onClick={()=>setShowLanding(false)}>Start for Free</button>
            <p style={LP.heroNote}>No account required. <button style={{background:"transparent",border:"none",color:K.accent,textDecoration:"underline",fontSize:12,cursor:"pointer",fontFamily:sf,padding:0}} onClick={()=>{setShowLanding(false);setView("auth");}}>Sign in</button> to sync across devices.</p>
          </div>
        </div>

        {/* Problem */}
        <div style={LP.section}>
          <div style={LP.sectionInner}>
            <h2 style={LP.sectionTitle}>You don't have a maintenance problem.<br/>You have a <em style={{fontStyle:"italic"}}>tracking</em> problem.</h2>
            <p style={LP.sectionText}>The furnace filter is overdue. The car's cabin filter — you can't remember. The boat impeller should've been swapped before the season. The dryer vent hasn't been touched since you moved in. You don't forget because you don't care. You forget because there's no system.</p>
          </div>
        </div>

        {/* Solution */}
        <div style={{...LP.section,background:K.accentLight}}>
          <div style={LP.sectionInner}>
            <h2 style={{...LP.sectionTitle,color:K.accent}}>HomeSked is that system.</h2>
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
                <p style={LP.featureText}>Every task lists what you need, what it costs, and whether you have it on hand. One-tap links to buy the exact right part.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>🏘️</span>
                <h3 style={LP.featureTitle}>Multi-Property</h3>
                <p style={LP.featureText}>Rental property. Vacation home. Primary residence. Track maintenance across every property from a single dashboard.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>📅</span>
                <h3 style={LP.featureTitle}>Calendar Sync</h3>
                <p style={LP.featureText}>Push any task to Google Calendar. It shows up where you already look — not buried in another app.</p>
              </div>
              <div style={LP.featureCard}>
                <span style={LP.featureIcon}>☁️</span>
                <h3 style={LP.featureTitle}>Cloud Backup & Sync</h3>
                <p style={LP.featureText}>Create a free account and your data syncs across every device. Export anytime — your maintenance history is always yours.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it works */}
        <div style={LP.section}>
          <div style={LP.sectionInner}>
            <h2 style={LP.sectionTitle}>Set up in under two minutes</h2>
            <div style={LP.stepsRow}>
              <div style={LP.step}><div style={LP.stepNum}>1</div><h3 style={LP.stepTitle}>Pick your systems</h3><p style={LP.stepText}>Choose from 22 templates — furnace, pool, EV, boat, generator, and more.</p></div>
              <div style={LP.step}><div style={LP.stepNum}>2</div><h3 style={LP.stepTitle}>Set your dates</h3><p style={LP.stepText}>Tell us when you last did each task. We calculate when everything's due next.</p></div>
              <div style={LP.step}><div style={LP.stepNum}>3</div><h3 style={LP.stepTitle}>Stay ahead</h3><p style={LP.stepText}>Check your dashboard, mark tasks done, get email digests. Never wonder "when did I last…" again.</p></div>
            </div>
          </div>
        </div>

        {/* Cost context */}
        <div style={{...LP.section,background:darkMode?"#111":"#1A1A1A",color:"#fff"}}>
          <div style={{...LP.sectionInner,textAlign:"center"}}>
            <h2 style={{...LP.sectionTitle,color:"#fff"}}>Everything you own costs money to maintain.</h2>
            <p style={{...LP.sectionText,color:"rgba(255,255,255,0.65)",maxWidth:480,margin:"0 auto"}}>Between your property, vehicles, and equipment — you're spending thousands a year whether you plan for it or not. HomeSked shows you where that money goes and helps you stay ahead of it.</p>
          </div>
        </div>

        {/* Final CTA */}
        <div style={{...LP.section,paddingBottom:60}}>
          <div style={{...LP.sectionInner,textAlign:"center"}}>
            <div style={{display:"inline-block",marginBottom:8}}><HouseLogo size={64} dark={darkMode}/></div>
            <h2 style={{...LP.sectionTitle,marginTop:12}}>Ready to take control?</h2>
            <p style={{...LP.sectionText,marginBottom:28,maxWidth:400,margin:"0 auto 28px"}}>Set up your home, car, or boat in under 2 minutes. Free forever for a single property.</p>
            <button style={LP.heroCta} onClick={()=>setShowLanding(false)}>Get Started Free</button>
          </div>
        </div>

        {/* Footer */}
        <div style={LP.footer}>
          <p style={LP.footerText}>HomeSked — Your world, maintained.</p>
        </div>
      </div>
    );
  }

  // ═══ ONBOARDING ═══
  if (!onboarded && view !== "auth") {
    const obSystems = homes.length>0 ? homes[0].systems : [];
    return (
      <div className="app-container" style={{...S.app,background:K.bg,color:K.text}}>
        <div style={S.onboard}>
          <div style={S.onboardHero}><div style={{display:"inline-block",marginBottom:4}}><HouseLogo size={72} dark={darkMode}/></div><h1 style={S.onboardTitle}>HomeSked</h1><p style={S.onboardSub}>Pick the systems you own and we'll track every task, part, and due date — so nothing slips through the cracks.</p></div>
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
    <div className="app-container" style={{...S.app,background:K.bg,color:K.text}}>
      <header style={{...S.header,background:darkMode?"linear-gradient(135deg, #1E3F2B 0%, #0F2318 100%)":"linear-gradient(135deg, #2D5A3D 0%, #1E3F2B 100%)"}}>
        <div style={S.headerInner}>
          <div style={S.logoRow} onClick={()=>{setView("dashboard");setSelectedSystem(null);setListView(null);}}>
            <HouseLogo size={32} dark={darkMode}/>
            <div><h1 style={S.logoTitle}>HomeSked</h1><p style={S.logoSub}>Your world, maintained</p></div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {homes.length>1 && view==="dashboard" && (
              <button style={S.homePickerBtn} onClick={()=>setShowHomePicker(!showHomePicker)}>{home?.icon} {home?.name?.length>12?home.name.slice(0,12)+"…":home?.name} ▾</button>
            )}
            {view==="system"&&<button style={S.backBtn} onClick={()=>{setView("dashboard");setSelectedSystem(null);}}>← Back</button>}
            {view==="list"&&<button style={S.backBtn} onClick={()=>{setView("dashboard");setListView(null);setPartsFilter(null);}}>← Back</button>}
            {(view==="templates"||view==="manage-homes"||view==="providers"||view==="sharing"||view==="budget-setup"||view==="documents"||view==="home-profile"||view==="walkthrough"||view==="portfolio"||view==="advisor"||view==="calendar"||view==="report")&&<button style={S.backBtn} onClick={()=>setView("dashboard")}>← Back</button>}
            {(view==="add-system"||view==="add-task"||view==="edit-task"||view==="add-home"||view==="edit-system"||view==="add-provider"||view==="edit-provider")&&<button style={S.backBtn} onClick={()=>{setView(view==="add-system"||view==="add-home"?"dashboard":view==="edit-system"?"system":view==="add-provider"||view==="edit-provider"?"providers":"system");setEditingTask(null);setEditingProvider(null);}}>← Cancel</button>}
            <button style={S.accountBtn} onClick={()=>{if(user){setShowAccount(!showAccount);}else{setView("auth");}}}>{user?"👤":"Sign In"}</button>
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
          <button style={S.homeDropItem} onClick={()=>{setShowHomePicker(false);setView("portfolio");}}>🏘️ Portfolio View</button>
          <button style={S.homeDropItem} onClick={()=>{setShowHomePicker(false);setView("manage-homes");}}>⚙️ Manage Homes</button>
          <button style={S.homeDropItem} onClick={()=>{setShowHomePicker(false);setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add Home</button>
        </div>
      )}

      {/* Account dropdown */}
      {showAccount && user && (
        <div style={{position:"fixed",top:60,right:16,background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,boxShadow:"0 8px 24px rgba(0,0,0,0.18)",zIndex:200,minWidth:220,padding:6,display:"flex",flexDirection:"column",gap:2}}>
          <div style={{padding:"10px 14px",fontSize:13,color:K.textMuted,fontFamily:sf,borderBottom:`1px solid ${K.border}`}}>{user.email}</div>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("settings");}}>⚙️ Notifications</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("documents");}}>📄 Documents</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("providers");}}>📞 Service Providers</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("sharing");}}>👥 Share Home</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("budget-setup");}}>💰 Budget</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("home-profile");}}>🏠 Property Details</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("advisor");}}>🤖 AI Advisor</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setListView("analytics");setView("list");}}>📊 Analytics</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("calendar");}}>📅 Calendar</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);setView("report");}}>📋 Report</button>
          <button style={S.homeDropItem} onClick={()=>{setShowAccount(false);showToast("Synced ✓");}}>☁️ Sync Now</button>
          <button style={{...S.homeDropItem,color:K.danger}} onClick={handleLogout}>Sign Out</button>
        </div>
      )}

      <main style={S.main}>
        {/* ═══ AUTH VIEW ═══ */}
        {view==="auth"&&(
          <div style={S.content}>
            <div style={{maxWidth:360,margin:"40px auto",textAlign:"center"}}>
              <div style={{display:"flex",justifyContent:"center"}}><HouseLogo size={56} dark={darkMode}/></div>
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

        {/* ═══ SETTINGS VIEW ═══ */}
        {view==="settings"&&(
          <div style={S.content}>
            <button style={{...S.backBtn,marginBottom:16}} onClick={()=>setView("dashboard")}>← Back</button>
            <h2 style={S.formTitle}>Notification Settings</h2>
            {!user ? (
              <div style={{textAlign:"center",padding:"40px 20px"}}>
                <p style={{fontSize:15,color:K.textMuted,fontFamily:sf,marginBottom:16}}>Sign in to enable email notifications.</p>
                <button style={S.submitBtn} onClick={()=>setView("auth")}>Sign In</button>
              </div>
            ) : (
              <div>
                <p style={{fontSize:14,color:K.textMuted,fontFamily:sf,marginBottom:20,lineHeight:1.6}}>Get an email summary of upcoming and overdue maintenance tasks. We'll only email you when something needs attention.</p>
                <div style={S.formGroup}>
                  <label style={S.label}>Email Digest Frequency</label>
                  <div style={{display:"flex",gap:8,marginTop:8}}>
                    {[{v:"weekly",l:"Weekly"},{v:"monthly",l:"Monthly"},{v:"off",l:"Off"}].map(o=>(
                      <button key={o.v} style={digestFreq===o.v?{...S.seasonBtnActive,flex:1,padding:"12px 8px",fontSize:14}:{...S.filterBtn,flex:1,padding:"12px 8px",fontSize:14}} onClick={()=>saveDigestPref(o.v)}>{o.l}</button>
                    ))}
                  </div>
                </div>
                <div style={{marginTop:24,padding:"16px",background:K.accentLight,borderRadius:K.radius,fontSize:13,color:K.textMuted,fontFamily:sf,lineHeight:1.6}}>
                  {digestFreq==="off" ? "Email notifications are turned off." : `You'll receive a ${digestFreq} email at ${user.email}.`}
                </div>
                <div style={{marginTop:20}}>
                  <label style={S.label}>Push Notifications</label>
                  <button style={notifEnabled?{...S.filterActive,padding:"12px 20px",fontSize:14}:{...S.filterBtn,padding:"12px 20px",fontSize:14}} onClick={async()=>{const r=await requestNotifPermission();setNotifEnabled(r==="granted");if(r==="granted")showToast("Push notifications enabled ✓");else if(r==="denied")showToast("Notifications blocked in browser settings");}}>
                    {notifEnabled?"🔔 Push Enabled":"Enable Push Notifications"}
                  </button>
                  <p style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginTop:4}}>Get alerted when tasks go overdue, even when the app is closed.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══ DASHBOARD ═══ */}
        {view==="dashboard" && (
          <div style={S.content}>
            {/* Toolbar */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <HouseLogo size={44} dark={darkMode}/>
                <div style={{marginLeft:4}}>
                  <div style={{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text}}>{homes.length>1?home?.name:"HomeSked"}</div>
                  <div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>{systems.length} system{systems.length!==1?"s":""} · {allTasks.length} tasks</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <button style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,color:K.accent,fontWeight:600,minHeight:36}} onClick={()=>{setFormSystem({name:"",icon:"🔧",category:"HVAC",notes:""});setView("add-system");}}>+ System</button>
                <button style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:8,padding:"6px 10px",fontSize:15,cursor:"pointer",minHeight:36,display:"flex",alignItems:"center"}} onClick={()=>setDarkMode(!darkMode)} title={darkMode?"Light mode":"Dark mode"}>{darkMode?"☀️":"🌙"}</button>
              </div>
            </div>
            {/* Weather Alerts */}
            {weatherAlerts.length > 0 && !searchQuery.trim() && <div style={{marginBottom:14}}>
              {weatherAlerts.slice(0,2).map(a => (
                <div key={a.id} style={{background:a.priority==="high"?K.danger+"12":K.warning+"12",border:"1.5px solid "+(a.priority==="high"?K.danger:K.warning)+"33",borderRadius:K.radius,padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"flex-start",gap:10}}>
                  <span style={{fontSize:22,flexShrink:0,marginTop:2}}>{a.icon}</span>
                  <div style={{flex:1}}><div style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:2}}>{a.title}</div><div style={{fontSize:12,color:K.textMuted,fontFamily:sf,lineHeight:1.4}}>{a.body}</div></div>
                  <button style={{background:"transparent",border:"none",color:K.textMuted,fontSize:16,cursor:"pointer",padding:"2px",flexShrink:0}} onClick={()=>setWeatherDismissed(prev=>[...prev,a.id])}>×</button>
                </div>
              ))}
            </div>}

            {/* Seasonal Banner */}
            {seasonBanner && seasonalTasks.length > 0 && !searchQuery.trim() && <div style={{background:K.accentLight,border:"1.5px solid "+K.accent+"44",borderRadius:K.radius,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",gap:12,cursor:"pointer"}} onClick={()=>{setSeasonFilter(currentSeason);}}>
              <span style={{fontSize:28}}>{seasonBanner.emoji}</span>
              <div><div style={{fontSize:15,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.accent}}>{seasonBanner.title}</div><div style={{fontSize:12,color:K.textMuted,fontFamily:sf}}>{seasonalTasks.length} {seasonNames[currentSeason]} task{seasonalTasks.length!==1?"s":""} to prep for — tap to view</div></div>
            </div>}

            {/* Smart Suggestions */}
            {smartSuggestions.length > 0 && !searchQuery.trim() && <div style={{marginBottom:14}}>
              {smartSuggestions.slice(0,3).map((sg,i) => (
                <div key={i} style={{background:K.surface,border:"1.5px solid "+K.warning+"44",borderRadius:K.radius,padding:"12px 14px",marginBottom:6,display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20,flexShrink:0}}>{sg.type==="missing-system"?"💡":sg.type==="forgotten"?"⚠️":sg.type==="enable-notifs"?"🔔":"💰"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontFamily:sf,color:K.text,lineHeight:1.4}}>{sg.reason}</div>
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    {sg.type==="missing-system"&&<button style={{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:sf}} onClick={()=>{addSystemFromTemplate(sg.tpl);setDismissedSuggestions(prev=>[...prev,sg.tpl.name]);}}>Add</button>}
                    {sg.type==="forgotten"&&<button style={{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:sf}} onClick={()=>setShowCompleteModal({systemId:sg.task.systemId,task:sg.task})}>Do Now</button>}
                    {sg.type==="enable-notifs"&&<button style={{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:sf}} onClick={async()=>{const r=await requestNotifPermission();setNotifEnabled(r==="granted");if(r==="granted")showToast("Notifications enabled ✓");setDismissedSuggestions(prev=>[...prev,"enable-notifs"]);}}>Enable</button>}
                    {sg.type==="set-budget"&&<button style={{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:sf}} onClick={()=>setView("budget-setup")}>Set Up</button>}
                    {sg.type==="property-hint"&&<button style={{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:sf}} onClick={()=>setView("templates")}>Browse</button>}
                    <button style={{background:"transparent",border:"none",color:K.textMuted,fontSize:16,cursor:"pointer",padding:"2px"}} onClick={()=>{const key=sg.type==="missing-system"?sg.tpl.name:sg.type==="forgotten"?"overdue-"+sg.task.id:sg.dismissKey||sg.type;setDismissedSuggestions(prev=>[...prev,key]);}}>×</button>
                  </div>
                </div>
              ))}
            </div>}

            {/* Budget Gauge */}
            {budget.monthly > 0 && !searchQuery.trim() && (()=>{
              const pct = Math.min(100, Math.round((budget.spent / (budget.monthly * 12)) * 100));
              const color = pct >= 90 ? K.danger : pct >= 70 ? K.warning : "#2E7D32";
              return <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:"12px 16px",marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:13,fontWeight:600,fontFamily:sf,color:K.text}}>💰 Annual Budget</span>
                  <span style={{fontSize:13,fontFamily:sf,color:K.textMuted}}>${budget.spent.toFixed(0)} / ${(budget.monthly*12).toFixed(0)}</span>
                </div>
                <div style={{height:8,background:K.border,borderRadius:4,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:color,borderRadius:4,transition:"width 0.3s"}}/></div>
                <div style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginTop:4}}>{pct}% of annual budget used</div>
              </div>;
            })()}

            {/* Gamification bar */}
            {achievements.score > 0 && !searchQuery.trim() && <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"8px 12px",background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius}}>
              <div style={{display:"flex",alignItems:"center",gap:4,cursor:"pointer"}} onClick={()=>setShowTrophies(true)}>
                <span style={{fontSize:18}}>🏆</span>
                <span style={{fontSize:20,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.accent}}>{achievements.score}</span>
              </div>
              <div style={{flex:1,height:4,background:K.border,borderRadius:2,overflow:"hidden"}}><div style={{width:achievements.score+"%",height:"100%",background:achievements.score>=80?"#2E7D32":achievements.score>=50?K.warning:K.danger,borderRadius:2}}/></div>
              {achievements.streak > 1 && <div style={{display:"flex",alignItems:"center",gap:3}}><span style={{fontSize:14}}>🔥</span><span style={{fontSize:13,fontWeight:700,fontFamily:sf,color:K.warning}}>{achievements.streak}</span></div>}
              <button style={{fontSize:10,color:K.textMuted,background:"transparent",border:"none",cursor:"pointer",fontFamily:sf}} onClick={()=>setShowTrophies(true)}>🏅 {achievements.unlocked.length}</button>
            </div>}

            <div style={S.statsRow}>
              <div style={{...S.statCard,cursor:"pointer"}} onClick={()=>{setListView("systems");setView("list");}}><div style={S.statNum}>{systems.length}</div><div style={S.statLabel}>Systems</div></div>
              <div style={{...S.statCard,cursor:"pointer",borderColor:upcomingCount>0?K.warning:K.border}} onClick={()=>{setListView("upcoming");setView("list");}}><div style={{...S.statNum,color:upcomingCount>0?K.warning:K.text}}>{upcomingCount}</div><div style={S.statLabel}>Upcoming</div></div>
              <div style={{...S.statCard,cursor:"pointer",borderColor:overdueTasks>0?K.danger:"#2E7D32"}} onClick={()=>{setListView("overdue");setView("list");}}><div style={{...S.statNum,color:overdueTasks>0?K.danger:"#2E7D32"}}>{overdueTasks}</div><div style={S.statLabel}>Overdue</div></div>
              {annualCost>0&&<div style={{...S.statCard,cursor:"pointer"}} onClick={()=>{setListView("analytics");setView("list");}}><div style={{...S.statNum,fontSize:18,color:K.warm}}>${annualCost>=1000?(annualCost/1000).toFixed(1)+"k":annualCost.toFixed(0)}</div><div style={S.statLabel}>Est/Year</div></div>}
            </div>
            <div style={{marginBottom:16}}><input style={{...S.input,fontSize:14,padding:"10px 14px",background:K.surface,fontFamily:sf}} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="🔍 Search tasks, systems, parts..."/></div>
            {searchQuery.trim().length>=2&&<div style={{marginBottom:20}}><h2 style={S.sectionTitle}>Search Results ({searchResults.length})</h2>{searchResults.length===0&&<p style={{fontSize:13,color:K.textMuted,fontFamily:sf}}>No matches found.</p>}<div style={S.taskList}>{searchResults.slice(0,10).map(t=>(<div key={t.id+t.systemId} style={{...S.taskCard,cursor:"pointer"}} onClick={()=>{setSelectedSystem(t.systemId);setView("system");}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:getStatusColor(t,K)}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.taskStatus,color:getStatusColor(t,K)}}>{getStatusLabel(t)}</div></div></div>))}</div></div>}
            {!searchQuery.trim()&&<>{urgentTasks.length>0&&<section style={S.section}><h2 style={S.sectionTitle}>⚠️ Upcoming & Overdue</h2><div style={S.urgentList}>{urgentTasks.slice(0,6).map(t=>(<div key={t.id+t.systemId} style={S.urgentCard} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}><div style={{...S.urgentDot,backgroundColor:getStatusColor(t,K)}}/><div style={S.urgentInfo}><div style={S.urgentName}>{t.name}</div><div style={S.urgentSys}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:getStatusColor(t,K)+"22",color:getStatusColor(t,K)}}>{getStatusLabel(t)}</div></div>))}</div></section>}
            {untrackedTasks.length>0&&<section style={S.section}><h2 style={S.sectionTitle}>📋 Needs First Entry — {untrackedTasks.length} tasks</h2><p style={S.sectionHint}>Tap a system, then set each task's last completion date.</p></section>}
            {systems.length>0&&<div style={S.filterRow}>{CATEGORIES.map(c=><button key={c} style={categoryFilter===c?S.filterActive:S.filterBtn} onClick={()=>setCategoryFilter(c)}>{c}</button>)}</div>}
            {systems.length>0&&<div style={{...S.filterRow,marginTop:-8}}>{["","🌸 Spring","☀️ Summer","🍂 Fall","❄️ Winter"].map(s=><button key={s} style={seasonFilter===s?(s?S.seasonBtnActive:S.filterActive):S.filterBtn} onClick={()=>setSeasonFilter(seasonFilter===s?"":s)}>{s||"All Seasons"}</button>)}</div>}
            {seasonFilter && ({"🌸 Spring":"Tasks to kick off this spring","☀️ Summer":"Get ahead of the heat — due for summer","🍂 Fall":"Prepare your home before winter hits","❄️ Winter":"Winterize and protect what you own"})[seasonFilter] && <div style={{background:K.accentLight,border:"1.5px solid "+K.accent+"44",borderRadius:K.radius,padding:"10px 16px",marginBottom:16,fontFamily:sf,fontSize:13,color:K.accent,fontWeight:500}}>{({"🌸 Spring":"Tasks to kick off this spring","☀️ Summer":"Get ahead of the heat — due for summer","🍂 Fall":"Prepare your home before winter hits","❄️ Winter":"Winterize and protect what you own"})[seasonFilter]}</div>}
            {systems.length>0&&<div style={{display:"flex",gap:4,marginBottom:10,alignItems:"center"}}><span style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginRight:4}}>Sort:</span>{[{k:"default",l:"Default"},{k:"urgency",l:"Urgency"},{k:"cost",l:"Cost"},{k:"alpha",l:"A-Z"}].map(s=><button key={s.k} style={{padding:"4px 10px",borderRadius:12,border:dashSort===s.k?"1.5px solid "+K.accent:"1px solid "+K.border,background:dashSort===s.k?K.accentLight:"transparent",color:dashSort===s.k?K.accent:K.textMuted,fontSize:11,cursor:"pointer",fontFamily:sf,fontWeight:dashSort===s.k?600:400}} onClick={()=>setDashSort(s.k)}>{s.l}</button>)}</div>}
            {systems.length===0&&<div style={{textAlign:"center",padding:"40px 20px"}}><p style={{...S.sectionHint,marginBottom:16}}>No systems yet.</p><button style={S.addTaskBtn} onClick={()=>setView("templates")}>Browse Templates</button></div>}
            <div style={S.grid}>{filteredSystems.map(sys=>{const so=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;const su=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;const sn=sys.tasks.filter(t=>!t.lastCompleted).length;return(<div key={sys.id} style={S.sysCard} onClick={()=>{setSelectedSystem(sys.id);setView("system");}}><div style={S.sysCardHead}><span style={S.sysIcon}>{sys.icon}</span><span style={S.sysCat}>{sys.category}</span></div><h3 style={S.sysName}>{sys.name}</h3><div style={S.sysMeta}><span>{sys.tasks.length} task{sys.tasks.length!==1?"s":""}</span>{so>0&&<span style={S.sysOverdue}>● {so} overdue</span>}{so===0&&su>0&&<span style={S.sysUpcoming}>● {su} upcoming</span>}{so===0&&su===0&&sn>0&&<span style={S.sysUntracked}>○ {sn} untracked</span>}{so===0&&su===0&&sn===0&&<span style={S.sysGood}>● All good</span>}</div></div>);})}</div>
            {systems.length>0&&<div style={{textAlign:"center",marginTop:20,display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap"}}><button style={S.templateLinkBtn} onClick={()=>setView("templates")}>+ Add from templates</button><button style={S.templateLinkBtn} onClick={()=>{setFormSystem({name:"",icon:"🔧",category:"HVAC",notes:""});setView("add-system");}}>+ Add custom system</button>
                <button style={S.templateLinkBtn} onClick={()=>{setListView("history");setView("list");}}>📜 History</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("providers")}>📞 Providers{providers.length>0?" ("+providers.length+")":""}</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("sharing")}>👥 Share Home</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("budget-setup")}>💰 Budget</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("home-profile")}>🏠 Property Details</button>
                <button style={S.templateLinkBtn} onClick={()=>{setWalkthrough({step:0,systems:[...systems],completed:[],skipped:[]});setView("walkthrough");}}>🚶 Walkthrough</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("advisor")}>🤖 AI Advisor</button>
                <button style={S.templateLinkBtn} onClick={()=>{setListView("analytics");setView("list");}}>📊 Analytics</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("calendar")}>📅 Calendar</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("report")}>📋 Report</button>
                <button style={S.templateLinkBtn} onClick={()=>setView("documents")}>📄 Documents{documents.length>0?" ("+documents.length+")":""}</button><button style={S.templateLinkBtn} onClick={()=>{setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add another home</button><button style={S.templateLinkBtn} onClick={exportData}>📥 Export</button><button style={S.templateLinkBtn} onClick={importData}>📤 Import</button></div>}
            </>}
          </div>
        )}

        {/* ═══ TEMPLATES ═══ */}
        {view==="templates"&&<div style={S.content}><h2 style={S.formTitle}>System Templates</h2>
          {customTemplates.length>0&&<><h3 style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.accent,marginBottom:8}}>Your Templates</h3><div style={{...S.taskList,marginBottom:20}}>{customTemplates.map((tpl,i)=>{const added=systems.some(s=>s.name===tpl.name);return <div key={tpl.id||i} style={{display:"flex",gap:6,alignItems:"center"}}><button style={added?{...S.tplBtnAdded}:{...S.tplBtn,flex:1}} onClick={()=>!added&&addSystemFromTemplate(tpl)} disabled={added}><span style={{fontSize:22}}>{tpl.icon}</span><span style={S.tplName}>{tpl.name}</span><span style={S.tplMeta}>{tpl.tasks.length} tasks</span>{added&&<span style={S.tplCheck}>✓</span>}</button><button style={{background:"transparent",border:"none",color:K.danger,fontSize:18,cursor:"pointer",padding:"4px"}} onClick={()=>{if(confirm("Delete template?"))setCustomTemplates(prev=>prev.filter(t=>t.id!==tpl.id));}}>×</button></div>;})}</div></>}
          <h3 style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:8}}>Built-in Templates</h3><p style={{...S.sectionHint,marginBottom:12}}>Tap to add pre-built systems with common tasks.</p><div style={S.taskList}>{SYSTEM_TEMPLATES.map((tpl,i)=>{const added=systems.some(s=>s.name===tpl.name);return <button key={i} style={added?S.tplBtnAdded:{...S.tplBtn,width:"100%"}} onClick={()=>!added&&addSystemFromTemplate(tpl)} disabled={added}><span style={{fontSize:22}}>{tpl.icon}</span><span style={S.tplName}>{tpl.name}</span><span style={S.tplMeta}>{tpl.tasks.length} tasks</span>{added&&<span style={S.tplCheck}>✓</span>}</button>;})}</div></div>}

        {/* ═══ ADD HOME ═══ */}
        {view==="add-home"&&<div style={S.content}><h2 style={S.formTitle}>Add Home</h2><p style={{...S.sectionHint,marginBottom:16}}>Add a second property — great for landlords, vacation homes, or rental units.</p><div style={S.formGroup}><label style={S.label}>Home Name</label><input style={S.input} value={formHome.name} onChange={e=>setFormHome({...formHome,name:e.target.value})} placeholder="e.g., Beach House, 42 Oak St"/></div><div style={S.formGroup}><label style={S.label}>Icon</label><IconPicker icons={HOME_ICONS} value={formHome.icon} onChange={ic=>setFormHome({...formHome,icon:ic})} K={K}/></div><button style={S.submitBtn} onClick={addHome} disabled={!formHome.name.trim()}>Add Home</button></div>}

        {/* ═══ MANAGE HOMES ═══ */}
        {view==="manage-homes"&&<div style={S.content}><h2 style={S.formTitle}>Manage Homes ({homes.length})</h2>
          <button style={{...S.templateLinkBtn,marginBottom:16,display:"inline-flex",alignItems:"center",gap:6}} onClick={()=>setView("home-profile")}>🏠 Edit Property Details</button><div style={S.taskList}>{homes.map(h=><div key={h.id} style={S.taskCard}><div style={S.taskTop}><IconPicker icons={HOME_ICONS} value={h.icon} onChange={ic=>changeHomeIcon(h.id,ic)} K={K}/><div style={S.taskInfo}><div style={S.taskName}>{h.name}</div><div style={S.taskFreq}>{h.systems.length} system{h.systems.length!==1?"s":""}</div></div><div style={S.taskBtns}><button style={S.taskEditBtn} onClick={()=>{const n=prompt("Rename home:",h.name);if(n&&n.trim())renameHome(h.id,n.trim());}}>Rename</button>{homes.length>1&&<button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${h.name}" and all its systems?`))deleteHome(h.id);}}>×</button>}</div></div></div>)}</div><button style={{...S.submitBtn,marginTop:16}} onClick={()=>{setFormHome({name:"",icon:"🏡"});setView("add-home");}}>+ Add Home</button></div>}

        
        {/* ═══ PROVIDERS ═══ */}
        {view==="providers"&&<div style={S.content}>
          <h2 style={S.formTitle}>📞 Service Providers</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:16,lineHeight:1.5}}>Save the pros you trust. When a task comes due, you'll know exactly who to call.</p>
          {providers.length>0&&<div style={S.taskList}>
            {providers.map(p=>(<div key={p.id} style={S.taskCard}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div><div style={{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text}}>{p.name}</div><div style={{fontSize:12,color:K.accent,fontFamily:sf,fontWeight:600}}>{p.specialty}</div></div>
                <div style={S.taskBtns}>
                  <button style={S.taskEditBtn} onClick={()=>{setFormProvider(p);setEditingProvider(p.id);setView("edit-provider");}}>Edit</button>
                  <button style={S.taskDeleteBtn} onClick={()=>{if(confirm("Remove "+p.name+"?"))setProviders(prev=>prev.filter(x=>x.id!==p.id));}}>×</button>
                </div>
              </div>
              {p.phone&&<div style={{fontSize:13,fontFamily:sf,color:K.text,marginBottom:2}}><a href={"tel:"+p.phone} style={{color:K.accent,textDecoration:"none"}}>📱 {p.phone}</a></div>}
              {p.email&&<div style={{fontSize:13,fontFamily:sf,color:K.text,marginBottom:2}}><a href={"mailto:"+p.email} style={{color:K.accent,textDecoration:"none"}}>✉️ {p.email}</a></div>}
              {p.notes&&<p style={{fontSize:12,color:K.textMuted,fontFamily:sf,marginTop:4,lineHeight:1.4}}>{p.notes}</p>}
              {p.systemIds&&p.systemIds.length>0&&<div style={{marginTop:6,display:"flex",gap:4,flexWrap:"wrap"}}>{p.systemIds.map(sid=>{const sys=systems.find(s=>s.id===sid);return sys?<span key={sid} style={{fontSize:11,background:K.accentLight,color:K.accent,padding:"2px 8px",borderRadius:4,fontFamily:sf}}>{sys.icon} {sys.name}</span>:null;})}</div>}
            </div>))}
          </div>}
          <button style={{...S.submitBtn,marginTop:16}} onClick={()=>{setFormProvider({name:"",phone:"",email:"",specialty:"",notes:"",systemIds:[]});setEditingProvider(null);setView("add-provider");}}>+ Add Provider</button>
        </div>}

        {/* ═══ ADD/EDIT PROVIDER ═══ */}
        {(view==="add-provider"||view==="edit-provider")&&<div style={S.content}>
          <h2 style={S.formTitle}>{editingProvider?"Edit Provider":"Add Provider"}</h2>
          <div style={S.formGroup}><label style={S.label}>Name / Company</label><input style={S.input} value={formProvider.name} onChange={e=>setFormProvider({...formProvider,name:e.target.value})} placeholder="e.g., ABC Plumbing, John the HVAC guy"/></div>
          <div style={S.formGroup}><label style={S.label}>Phone</label><input style={S.input} type="tel" value={formProvider.phone} onChange={e=>setFormProvider({...formProvider,phone:e.target.value})} placeholder="555-123-4567"/></div>
          <div style={S.formGroup}><label style={S.label}>Email</label><input style={S.input} type="email" value={formProvider.email} onChange={e=>setFormProvider({...formProvider,email:e.target.value})} placeholder="joe@abcplumbing.com"/></div>
          <div style={S.formGroup}><label style={S.label}>Specialty</label><input style={S.input} value={formProvider.specialty} onChange={e=>setFormProvider({...formProvider,specialty:e.target.value})} placeholder="e.g., HVAC, Plumbing, General Contractor"/></div>
          <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={formProvider.notes} onChange={e=>setFormProvider({...formProvider,notes:e.target.value})} placeholder="How you found them, pricing, availability..."/></div>
          {systems.length>0&&<div style={S.formGroup}><label style={S.label}>Linked Systems (optional)</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{systems.map(s=>{const linked=(formProvider.systemIds||[]).includes(s.id);return <button key={s.id} style={linked?S.seasonBtnActive:S.seasonBtn} onClick={()=>{const ids=formProvider.systemIds||[];setFormProvider({...formProvider,systemIds:linked?ids.filter(x=>x!==s.id):[...ids,s.id]});}}>{s.icon} {s.name}</button>;})}</div></div>}
          <button style={S.submitBtn} onClick={()=>{if(!formProvider.name.trim())return;if(editingProvider){setProviders(prev=>prev.map(p=>p.id===editingProvider?{...formProvider,id:editingProvider}:p));}else{setProviders(prev=>[...prev,{...formProvider,id:genId()}]);}setView("providers");showToast(editingProvider?"Provider updated ✓":"Provider added ✓");}} disabled={!formProvider.name.trim()}>{editingProvider?"Save Changes":"Add Provider"}</button>
        </div>}

        {/* ═══ SHARING ═══ */}
        {view==="sharing"&&<div style={S.content}>
          <h2 style={S.formTitle}>👥 Share {home?.name||"Home"}</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:20,lineHeight:1.5}}>Invite family members, partners, or property managers to view and help manage maintenance for this home.</p>
          <div style={S.formGroup}>
            <label style={S.label}>Invite by Email</label>
            <div style={{display:"flex",gap:8}}>
              <input style={{...S.input,flex:1}} type="email" value={shareEmail} onChange={e=>setShareEmail(e.target.value)} placeholder="partner@email.com" onKeyDown={e=>{if(e.key==="Enter"&&shareEmail.trim()){setSharedUsers(prev=>[...prev,{id:genId(),email:shareEmail.trim(),role:"editor",homeId:activeHomeId,invited:new Date().toISOString()}]);setShareEmail("");showToast("Invite sent ✓");}}}/>
              <button style={{...S.submitBtn,width:"auto",padding:"12px 20px",marginTop:0}} onClick={()=>{if(shareEmail.trim()){setSharedUsers(prev=>[...prev,{id:genId(),email:shareEmail.trim(),role:"editor",homeId:activeHomeId,invited:new Date().toISOString()}]);setShareEmail("");showToast("Invite sent ✓");}}}>Invite</button>
            </div>
          </div>
          {sharedUsers.filter(u=>u.homeId===activeHomeId).length>0&&<div style={{marginTop:16}}>
            <label style={S.label}>Shared With</label>
            <div style={S.taskList}>
              {sharedUsers.filter(u=>u.homeId===activeHomeId).map(u=>(<div key={u.id} style={{...S.taskCard,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div><div style={{fontSize:14,fontFamily:sf,color:K.text,fontWeight:600}}>{u.email}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>Invited {formatDate(u.invited)} · {u.role}</div></div>
                <button style={S.taskDeleteBtn} onClick={()=>setSharedUsers(prev=>prev.filter(x=>x.id!==u.id))}>×</button>
              </div>))}
            </div>
          </div>}
          {!user&&<div style={{marginTop:20,padding:16,background:K.accentLight,borderRadius:K.radius,fontSize:13,fontFamily:sf,color:K.accent,lineHeight:1.5}}>Sign in to enable real-time sharing. Invites are saved locally for now.</div>}
        </div>}

        {/* ═══ BUDGET SETUP ═══ */}
        {view==="budget-setup"&&<div style={S.content}>
          <h2 style={S.formTitle}>💰 Budget Setup</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:20,lineHeight:1.5}}>Set a monthly maintenance budget. We'll track what you spend when you complete tasks and show you how you're pacing.</p>
          <div style={S.formGroup}><label style={S.label}>Monthly Budget</label><input style={{...S.input,fontSize:24,textAlign:"center",fontWeight:700}} type="number" min="0" step="10" value={budget.monthly||""} onChange={e=>setBudget(prev=>({...prev,monthly:Number(e.target.value)||0}))} placeholder="$0"/><p style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginTop:4,textAlign:"center"}}>${((budget.monthly||0)*12).toFixed(0)}/year</p></div>
          {budget.entries.length>0&&<div style={{marginTop:16}}>
            <label style={S.label}>Spending History ({budget.entries.length} entries)</label>
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:K.accentLight,borderRadius:8,fontSize:14,fontFamily:sf,fontWeight:600,color:K.accent}}><span>Total Spent</span><span>${budget.spent.toFixed(2)}</span></div>
            <button style={{...S.authLink,marginTop:8,fontSize:12}} onClick={()=>{if(confirm("Reset all spending data?"))setBudget(prev=>({...prev,spent:0,entries:[]}));}}>Reset spending data</button>
          </div>}
          <button style={{...S.submitBtn,marginTop:20}} onClick={()=>{setView("dashboard");showToast(budget.monthly>0?"Budget set ✓":"Budget cleared");}}>Done</button>
        </div>}


        
        
        {/* ═══ WALKTHROUGH MODE ═══ */}
        {view==="walkthrough"&&walkthrough&&(()=>{
          const ws = walkthrough;
          const currentSys = ws.systems[ws.step];
          const progress = Math.round(((ws.completed.length+ws.skipped.length)/ws.systems.length)*100);
          const sysTasks = currentSys ? currentSys.tasks.filter(t=>!isAsReq(t)) : [];
          const overdueT = sysTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;});
          const upT = sysTasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;});

          if (ws.step >= ws.systems.length) {
            // Summary screen
            return <div style={S.content}>
              <div style={{textAlign:"center",padding:"20px 0"}}>
                <span style={{fontSize:56}}>🎉</span>
                <h2 style={{...S.formTitle,marginTop:12}}>Walkthrough Complete!</h2>
                <p style={{fontSize:14,color:K.textMuted,fontFamily:sf,marginBottom:20}}>You inspected {ws.systems.length} system{ws.systems.length>1?"s":""}.</p>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:300,margin:"0 auto 20px"}}>
                  <div style={{background:"#2E7D3215",borderRadius:8,padding:12,textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:"#2E7D32",fontFamily:"'Newsreader',Georgia,serif"}}>{ws.completed.length}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>Reviewed</div></div>
                  <div style={{background:K.warning+"15",borderRadius:8,padding:12,textAlign:"center"}}><div style={{fontSize:24,fontWeight:700,color:K.warning,fontFamily:"'Newsreader',Georgia,serif"}}>{ws.skipped.length}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>Skipped</div></div>
                </div>
                <button style={S.submitBtn} onClick={()=>{setWalkthrough(null);setView("dashboard");}}>Back to Dashboard</button>
              </div>
            </div>;
          }

          return <div style={S.content}>
            {/* Progress bar */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                <span style={{fontSize:13,fontWeight:600,fontFamily:sf,color:K.text}}>🚶 Walkthrough</span>
                <span style={{fontSize:12,fontFamily:sf,color:K.textMuted}}>Step {ws.step+1} of {ws.systems.length}</span>
              </div>
              <div style={{height:6,background:K.border,borderRadius:3,overflow:"hidden"}}><div style={{width:progress+"%",height:"100%",background:K.accent,borderRadius:3,transition:"width 0.3s"}}/></div>
            </div>

            {/* Current system */}
            <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:20,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
                <span style={{fontSize:36}}>{currentSys.icon}</span>
                <div><h2 style={{margin:0,fontSize:22,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text}}>{currentSys.name}</h2><span style={{fontSize:12,color:K.textMuted,fontFamily:sf}}>{currentSys.category} · {currentSys.tasks.length} tasks</span></div>
              </div>
              {currentSys.notes&&<p style={{fontSize:13,color:K.textMuted,fontFamily:sf,lineHeight:1.5,marginBottom:12}}>{currentSys.notes}</p>}

              {overdueT.length>0&&<div style={{background:K.danger+"12",border:"1px solid "+K.danger+"33",borderRadius:8,padding:"10px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:700,color:K.danger,fontFamily:sf,marginBottom:4}}>⚠️ {overdueT.length} Overdue</div>{overdueT.map(t=><div key={t.id} style={{fontSize:12,fontFamily:sf,color:K.text,padding:"3px 0",display:"flex",justifyContent:"space-between"}}><span>{t.name}</span><button style={{background:K.accent,color:"#fff",border:"none",borderRadius:4,padding:"2px 8px",fontSize:11,cursor:"pointer",fontFamily:sf}} onClick={()=>setShowCompleteModal({systemId:currentSys.id,task:t})}>✓ Done</button></div>)}</div>}
              {upT.length>0&&<div style={{background:K.warning+"12",border:"1px solid "+K.warning+"33",borderRadius:8,padding:"10px 12px",marginBottom:8}}><div style={{fontSize:13,fontWeight:700,color:K.warning,fontFamily:sf,marginBottom:4}}>📅 {upT.length} Coming Up</div>{upT.map(t=><div key={t.id} style={{fontSize:12,fontFamily:sf,color:K.text,padding:"3px 0"}}>{t.name} — {getStatusLabel(t)}</div>)}</div>}
              {overdueT.length===0&&upT.length===0&&<div style={{background:"#2E7D3212",borderRadius:8,padding:"10px 12px",fontSize:13,color:"#2E7D32",fontFamily:sf}}>✓ All good — nothing overdue or upcoming.</div>}
            </div>

            {/* Actions */}
            <div style={{display:"flex",gap:8}}>
              <button style={{...S.submitBtn,flex:1}} onClick={()=>setWalkthrough({...ws,step:ws.step+1,completed:[...ws.completed,currentSys.id]})}>✓ Reviewed — Next</button>
              <button style={{...S.modalBtnAlt,flex:0.5}} onClick={()=>setWalkthrough({...ws,step:ws.step+1,skipped:[...ws.skipped,currentSys.id]})}>Skip</button>
            </div>
            <button style={{...S.authLink,display:"block",textAlign:"center",marginTop:12}} onClick={()=>{setWalkthrough(null);setView("dashboard");}}>End walkthrough early</button>
          </div>;
        })()}

        
        {/* ═══ CALENDAR VIEW ═══ */}
        {view==="calendar"&&<div style={S.content}>
          <h2 style={S.formTitle}>📅 Maintenance Calendar</h2>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <button style={S.taskEditBtn} onClick={()=>setCalMonth(p=>({year:p.month===0?p.year-1:p.year,month:p.month===0?11:p.month-1}))}>← Prev</button>
            <span style={{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text}}>{calMonthLabel}</span>
            <button style={S.taskEditBtn} onClick={()=>setCalMonth(p=>({year:p.month===11?p.year+1:p.year,month:p.month===11?0:p.month+1}))}>Next →</button>
          </div>

          {/* Day headers */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",fontSize:11,fontWeight:600,color:K.textMuted,fontFamily:sf,padding:"4px 0"}}>{d}</div>)}
          </div>

          {/* Calendar grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:16}}>
            {calDays.map((d,i) => {
              if (!d) return <div key={"e"+i} style={{minHeight:48}}/>;
              const isToday = d.date.toDateString() === new Date().toDateString();
              const hasOD = d.tasks.some(t=>{const dd=daysUntil(getNextDue(t));return dd!==null&&dd<0;});
              const hasUp = d.tasks.some(t=>{const dd=daysUntil(getNextDue(t));return dd!==null&&dd>=0;});
              const isSelected = calSelectedDay === d.day;
              return <div key={d.day} onClick={()=>setCalSelectedDay(isSelected?null:d.day)} style={{
                minHeight:48,padding:"4px",borderRadius:6,cursor:"pointer",
                background:isSelected?K.accentLight:isToday?(K.accent+"15"):K.surface,
                border:isSelected?("1.5px solid "+K.accent):isToday?("1.5px solid "+K.accent+"44"):("1px solid "+K.border+"66"),
                transition:"all 0.1s"
              }}>
                <div style={{fontSize:13,fontWeight:isToday?700:400,color:isToday?K.accent:K.text,fontFamily:sf,textAlign:"center"}}>{d.day}</div>
                {d.tasks.length>0&&<div style={{display:"flex",justifyContent:"center",gap:2,marginTop:2,flexWrap:"wrap"}}>
                  {d.tasks.slice(0,3).map((t,j)=><div key={j} style={{width:6,height:6,borderRadius:"50%",background:hasOD?K.danger:K.warning}}/>)}
                  {d.tasks.length>3&&<span style={{fontSize:8,color:K.textMuted}}>+{d.tasks.length-3}</span>}
                </div>}
              </div>;
            })}
          </div>

          {/* Selected day detail */}
          {calSelectedDay && (()=>{
            const dayData = calDays.find(d=>d&&d.day===calSelectedDay);
            if (!dayData) return null;
            const dateStr = dayData.date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"});
            return <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16}}>
              <h3 style={{fontSize:15,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text,marginBottom:8}}>{dateStr}</h3>
              {dayData.tasks.length===0&&<p style={{fontSize:13,color:K.textMuted,fontFamily:sf}}>No tasks due this day.</p>}
              {dayData.tasks.map((t,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<dayData.tasks.length-1?"1px solid "+K.border:""}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,fontFamily:sf,color:K.text}}>{t.systemIcon} {t.name}</div>
                    <div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>{t.systemName}</div>
                  </div>
                  <button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}>✓ Done</button>
                </div>
              ))}
            </div>;
          })()}
        </div>}

        {/* ═══ PDF REPORT ═══ */}
        {view==="report"&&<div style={S.content}>
          <h2 style={S.formTitle}>📋 Property Maintenance Report</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:20,lineHeight:1.5}}>Generate a comprehensive report of your home's maintenance status. Great for insurance, home sales, or personal records.</p>

          <div id="homesked-report" style={{background:"#fff",color:"#1A1A1A",padding:24,borderRadius:K.radius,border:"1px solid #DDD",fontFamily:sf}}>
            <div style={{textAlign:"center",borderBottom:"2px solid #2D5A3D",paddingBottom:16,marginBottom:20}}>
              <h1 style={{fontSize:24,fontFamily:"'Newsreader',Georgia,serif",margin:"0 0 4px",color:"#2D5A3D"}}>🏠 HomeSked Maintenance Report</h1>
              <p style={{fontSize:14,color:"#666",margin:0}}>{home?.name||"My Home"} — {new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"})}</p>
            </div>

            {/* Property Overview */}
            {(homeProfile.sqft||homeProfile.yearBuilt)&&<div style={{marginBottom:20}}>
              <h3 style={{fontSize:16,fontFamily:"'Newsreader',Georgia,serif",color:"#2D5A3D",marginBottom:8}}>Property Details</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4,fontSize:13}}>
                {homeProfile.sqft&&<div>{Number(homeProfile.sqft).toLocaleString()} sq ft</div>}
                {homeProfile.yearBuilt&&<div>Built {homeProfile.yearBuilt} ({new Date().getFullYear()-homeProfile.yearBuilt} years)</div>}
                {homeProfile.roof&&<div>Roof: {homeProfile.roof}</div>}
                {homeProfile.waterSource&&<div>Water: {homeProfile.waterSource}</div>}
                {homeProfile.sewage&&<div>Sewage: {homeProfile.sewage}</div>}
                {homeProfile.heating&&<div>Heating: {homeProfile.heating}</div>}
              </div>
            </div>}

            {/* Summary Stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:20}}>
              <div style={{background:"#F5F5F5",borderRadius:6,padding:10,textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:"#2D5A3D"}}>{systems.length}</div><div style={{fontSize:10,color:"#666"}}>Systems</div></div>
              <div style={{background:"#F5F5F5",borderRadius:6,padding:10,textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:"#2D5A3D"}}>{allTasks.length}</div><div style={{fontSize:10,color:"#666"}}>Tasks</div></div>
              <div style={{background:overdueTasks>0?"#FFF5F5":"#F5FFF5",borderRadius:6,padding:10,textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:overdueTasks>0?"#C0392B":"#2E7D32"}}>{overdueTasks}</div><div style={{fontSize:10,color:"#666"}}>Overdue</div></div>
              <div style={{background:"#F5F5F5",borderRadius:6,padding:10,textAlign:"center"}}><div style={{fontSize:20,fontWeight:700,color:"#8B7355"}}>${annualCost.toFixed(0)}</div><div style={{fontSize:10,color:"#666"}}>Est/Year</div></div>
            </div>

            {/* Systems Status */}
            <h3 style={{fontSize:16,fontFamily:"'Newsreader',Georgia,serif",color:"#2D5A3D",marginBottom:8}}>Systems Status</h3>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,marginBottom:20}}>
              <thead><tr style={{borderBottom:"2px solid #2D5A3D"}}>
                <th style={{textAlign:"left",padding:"6px 4px"}}>System</th>
                <th style={{textAlign:"center",padding:"6px 4px"}}>Tasks</th>
                <th style={{textAlign:"center",padding:"6px 4px"}}>Overdue</th>
                <th style={{textAlign:"center",padding:"6px 4px"}}>Status</th>
              </tr></thead>
              <tbody>{systems.map(s=>{const od=s.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;return(
                <tr key={s.id} style={{borderBottom:"1px solid #EEE"}}>
                  <td style={{padding:"6px 4px"}}>{s.icon} {s.name}</td>
                  <td style={{textAlign:"center",padding:"6px 4px"}}>{s.tasks.length}</td>
                  <td style={{textAlign:"center",padding:"6px 4px",color:od>0?"#C0392B":"#2E7D32"}}>{od}</td>
                  <td style={{textAlign:"center",padding:"6px 4px"}}>{od>0?"⚠️":"✅"}</td>
                </tr>);})}</tbody>
            </table>

            {/* Provider Contacts */}
            {providers.length>0&&<><h3 style={{fontSize:16,fontFamily:"'Newsreader',Georgia,serif",color:"#2D5A3D",marginBottom:8}}>Service Providers</h3>
              <div style={{fontSize:12,marginBottom:20}}>{providers.map(p=><div key={p.id} style={{padding:"4px 0",borderBottom:"1px solid #EEE"}}><strong>{p.name}</strong>{p.specialty?" — "+p.specialty:""}{p.phone?" · "+p.phone:""}</div>)}</div></>}

            {/* Footer */}
            <div style={{textAlign:"center",borderTop:"1px solid #DDD",paddingTop:12,fontSize:11,color:"#999"}}>
              Generated by HomeSked · {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginTop:16}}>
            <button style={S.submitBtn} onClick={()=>{
              const el=document.getElementById("homesked-report");
              const w=window.open("","","width=800,height=900");
              w.document.write("<html><head><title>HomeSked Report</title><style>body{margin:20px;font-family:system-ui,sans-serif}@media print{body{margin:0}}</style></head><body>"+el.innerHTML+"</body></html>");
              w.document.close();
              setTimeout(()=>w.print(),500);
            }}>🖨️ Print / Save as PDF</button>
          </div>
        </div>}

{/* ═══ PORTFOLIO VIEW ═══ */}
        {view==="portfolio"&&(()=>{
          let totalOverdue=0, totalUpcoming=0, totalCost=0, totalTasks=0;
          const homeCards = homes.map(h=>{
            let hOverdue=0,hUpcoming=0,hCost=0,hTasks=0;
            (h.systems||[]).forEach(s=>{
              s.tasks.forEach(t=>{
                hTasks++;
                if(!isAsReq(t)){
                  const tpy=t.intervalMonths>0?12/t.intervalMonths:0;
                  const tc=(t.parts||[]).filter(p=>p.status==="order").reduce((s2,p)=>s2+(p.cost||0),0);
                  hCost+=tc*tpy;
                  const d=daysUntil(getNextDue(t));
                  if(d!==null&&d<0)hOverdue++;
                  if(d!==null&&d>=0&&d<=30)hUpcoming++;
                }
              });
            });
            totalOverdue+=hOverdue;totalUpcoming+=hUpcoming;totalCost+=hCost;totalTasks+=hTasks;
            const health=hOverdue>2?K.danger:hOverdue>0?K.warning:"#2E7D32";
            return {id:h.id,name:h.name,icon:h.icon,systems:h.systems.length,tasks:hTasks,overdue:hOverdue,upcoming:hUpcoming,cost:hCost,health};
          });
          return <div style={S.content}>
            <h2 style={S.formTitle}>🏘️ Portfolio Overview</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))",gap:8,marginBottom:20}}>
              <div style={{...S.statCard,background:K.surface}}><div style={S.statNum}>{homes.length}</div><div style={S.statLabel}>Properties</div></div>
              <div style={S.statCard}><div style={{...S.statNum,color:totalOverdue>0?K.danger:"#2E7D32"}}>{totalOverdue}</div><div style={S.statLabel}>Overdue</div></div>
              <div style={S.statCard}><div style={{...S.statNum,color:K.warning}}>{totalUpcoming}</div><div style={S.statLabel}>Upcoming</div></div>
              <div style={S.statCard}><div style={{...S.statNum,fontSize:16,color:K.warm}}>${totalCost>=1000?(totalCost/1000).toFixed(1)+"k":totalCost.toFixed(0)}</div><div style={S.statLabel}>Total/Yr</div></div>
            </div>
            <div style={S.taskList}>
              {homeCards.map(h=>(<div key={h.id} style={{...S.taskCard,cursor:"pointer",borderLeft:"4px solid "+h.health}} onClick={()=>{setActiveHomeId(h.id);setView("dashboard");}}>
                <div style={S.taskTop}>
                  <span style={{fontSize:28}}>{h.icon}</span>
                  <div style={S.taskInfo}>
                    <div style={S.taskName}>{h.name}</div>
                    <div style={S.taskFreq}>{h.systems} systems · {h.tasks} tasks · ${h.cost.toFixed(0)}/yr</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"flex-end"}}>
                    {h.overdue>0&&<span style={{fontSize:11,fontWeight:700,color:K.danger,background:K.danger+"15",padding:"2px 6px",borderRadius:4,fontFamily:sf}}>{h.overdue} overdue</span>}
                    {h.upcoming>0&&<span style={{fontSize:11,fontWeight:700,color:K.warning,background:K.warning+"15",padding:"2px 6px",borderRadius:4,fontFamily:sf}}>{h.upcoming} soon</span>}
                    {h.overdue===0&&h.upcoming===0&&<span style={{fontSize:11,color:"#2E7D32",fontFamily:sf}}>✓ All good</span>}
                  </div>
                </div>
              </div>))}
            </div>
          </div>;
        })()}

        {/* ═══ AI ADVISOR CHAT ═══ */}
        {view==="advisor"&&<div style={{...S.content,display:"flex",flexDirection:"column",height:"calc(100vh - 120px)"}}>
          <h2 style={{...S.formTitle,marginBottom:8}}>🤖 Maintenance Advisor</h2>
          <p style={{fontSize:12,color:K.textMuted,fontFamily:sf,marginBottom:12}}>Ask anything about your home maintenance. I have context on all your systems, tasks, parts, and history.</p>

          <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:8,marginBottom:12,padding:"4px 0"}}>
            {chatMessages.length===0&&<div style={{textAlign:"center",padding:"30px 0"}}>
              <span style={{fontSize:32}}>💬</span>
              <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginTop:8}}>Try asking:</p>
              {["My furnace is making a clicking noise","What maintenance am I behind on?","Should I DIY or hire a pro for my pool?","How much should I budget for next year?"].map((q,i)=>(<button key={i} style={{display:"block",margin:"4px auto",padding:"8px 16px",background:K.surface,border:"1.5px solid "+K.border,borderRadius:8,fontSize:13,fontFamily:sf,color:K.text,cursor:"pointer",maxWidth:320,width:"100%",textAlign:"left"}} onClick={()=>setChatInput(q)}>"{q}"</button>))}
            </div>}
            {chatMessages.map((m,i)=>(<div key={i} style={{padding:"10px 14px",borderRadius:12,maxWidth:"85%",fontSize:14,fontFamily:sf,lineHeight:1.5,whiteSpace:"pre-wrap",alignSelf:m.role==="user"?"flex-end":"flex-start",background:m.role==="user"?K.accent:K.surface,color:m.role==="user"?"#fff":K.text,border:m.role==="user"?"none":"1.5px solid "+K.border}}>{m.content}</div>))}
            {chatLoading&&<div style={{padding:"10px 14px",borderRadius:12,background:K.surface,border:"1.5px solid "+K.border,fontSize:14,color:K.textMuted,fontFamily:sf,alignSelf:"flex-start"}}>Thinking...</div>}
          </div>

          <div style={{display:"flex",gap:8}}>
            <input style={{...S.input,flex:1}} value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="Ask about your home..." onKeyDown={async(e)=>{
              if(e.key!=="Enter"||!chatInput.trim()||chatLoading)return;
              const msg=chatInput.trim();setChatInput("");
              const newMsgs=[...chatMessages,{role:"user",content:msg}];setChatMessages(newMsgs);setChatLoading(true);
              try{
                const ctx="You are HomeSked's maintenance advisor. The user has these systems: "+systems.map(s=>s.icon+" "+s.name+" ("+s.tasks.length+" tasks, "+s.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length+" overdue)").join(", ")+". Annual est: $"+annualCost.toFixed(0)+". "+(homeProfile.yearBuilt?"Home built "+homeProfile.yearBuilt+". ":"")+(homeProfile.roof?"Roof: "+homeProfile.roof+". ":"")+(homeProfile.waterSource?"Water: "+homeProfile.waterSource+". ":"")+"Budget: $"+(budget.monthly*12).toFixed(0)+"/yr, spent $"+budget.spent.toFixed(0)+". Be concise, practical, specific to their home.";
                const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:ctx,messages:newMsgs.slice(-10).map(m=>({role:m.role,content:m.content}))})});
                const data=await res.json();
                const reply=data.content?.map(c=>c.text||"").join("")||"Sorry, I couldn't process that.";
                setChatMessages(prev=>[...prev,{role:"assistant",content:reply}]);
              }catch(err){setChatMessages(prev=>[...prev,{role:"assistant",content:"Connection error — check your network and try again."}]);}
              setChatLoading(false);
            }}/>
            <button style={{...S.submitBtn,width:"auto",padding:"12px 20px",marginTop:0}} disabled={!chatInput.trim()||chatLoading} onClick={async()=>{
              if(!chatInput.trim()||chatLoading)return;
              const msg=chatInput.trim();setChatInput("");
              const newMsgs=[...chatMessages,{role:"user",content:msg}];setChatMessages(newMsgs);setChatLoading(true);
              try{
                const ctx="You are HomeSked's maintenance advisor. The user has these systems: "+systems.map(s=>s.icon+" "+s.name+" ("+s.tasks.length+" tasks)").join(", ")+". Annual est: $"+annualCost.toFixed(0)+". Be concise and practical.";
                const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:ctx,messages:newMsgs.slice(-10).map(m=>({role:m.role,content:m.content}))})});
                const data=await res.json();
                const reply=data.content?.map(c=>c.text||"").join("")||"Sorry, I couldn't process that.";
                setChatMessages(prev=>[...prev,{role:"assistant",content:reply}]);
              }catch(err){setChatMessages(prev=>[...prev,{role:"assistant",content:"Connection error — try again."}]);}
              setChatLoading(false);
            }}>Send</button>
          </div>
        </div>}

{/* ═══ HOME PROFILE ═══ */}
        {view==="home-profile"&&<div style={S.content}>
          <h2 style={S.formTitle}>🏠 Property Details</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:20,lineHeight:1.5}}>Record key details about your property. This information helps with insurance, resale, and smarter maintenance suggestions.</p>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={S.formGroup}><label style={S.label}>Square Footage</label><input style={S.input} type="number" value={homeProfile.sqft||""} onChange={e=>setHomeProfile(p=>({...p,sqft:e.target.value}))} placeholder="e.g., 2400"/></div>
            <div style={S.formGroup}><label style={S.label}>Year Built</label><input style={S.input} type="number" value={homeProfile.yearBuilt||""} onChange={e=>setHomeProfile(p=>({...p,yearBuilt:e.target.value}))} placeholder="e.g., 1998"/></div>
            <div style={S.formGroup}><label style={S.label}>Lot Size</label><input style={S.input} value={homeProfile.lotSize||""} onChange={e=>setHomeProfile(p=>({...p,lotSize:e.target.value}))} placeholder="e.g., 0.5 acres"/></div>
            <div style={S.formGroup}><label style={S.label}>Bedrooms</label><input style={S.input} type="number" value={homeProfile.bedrooms||""} onChange={e=>setHomeProfile(p=>({...p,bedrooms:e.target.value}))}/></div>
            <div style={S.formGroup}><label style={S.label}>Bathrooms</label><input style={S.input} type="number" step="0.5" value={homeProfile.bathrooms||""} onChange={e=>setHomeProfile(p=>({...p,bathrooms:e.target.value}))}/></div>
            <div style={S.formGroup}><label style={S.label}>Electrical (Amps)</label><input style={S.input} value={homeProfile.electrical||""} onChange={e=>setHomeProfile(p=>({...p,electrical:e.target.value}))} placeholder="e.g., 200A"/></div>
          </div>

          <div style={S.formGroup}><label style={S.label}>Roof Type & Age</label><input style={S.input} value={homeProfile.roof||""} onChange={e=>setHomeProfile(p=>({...p,roof:e.target.value}))} placeholder="e.g., Asphalt shingle, installed 2015"/></div>

          <div style={S.formGroup}><label style={S.label}>Water Source</label>
            <div style={{display:"flex",gap:6}}>
              {["Municipal","Well","Other"].map(o=><button key={o} style={homeProfile.waterSource===o?S.seasonBtnActive:S.seasonBtn} onClick={()=>setHomeProfile(p=>({...p,waterSource:o}))}>{o}</button>)}
            </div>
          </div>

          <div style={S.formGroup}><label style={S.label}>Sewage</label>
            <div style={{display:"flex",gap:6}}>
              {["Municipal Sewer","Septic","Other"].map(o=><button key={o} style={homeProfile.sewage===o?S.seasonBtnActive:S.seasonBtn} onClick={()=>setHomeProfile(p=>({...p,sewage:o}))}>{o}</button>)}
            </div>
          </div>

          <div style={S.formGroup}><label style={S.label}>Heating Type</label><input style={S.input} value={homeProfile.heating||""} onChange={e=>setHomeProfile(p=>({...p,heating:e.target.value}))} placeholder="e.g., Forced air gas, heat pump, oil"/></div>

          <div style={S.formGroup}><label style={S.label}>HVAC Model / Serial</label><input style={S.input} value={homeProfile.hvacModel||""} onChange={e=>setHomeProfile(p=>({...p,hvacModel:e.target.value}))} placeholder="e.g., Carrier 24ACC636A003"/></div>

          <div style={S.formGroup}><label style={S.label}>Water Heater Model / Serial</label><input style={S.input} value={homeProfile.waterHeaterModel||""} onChange={e=>setHomeProfile(p=>({...p,waterHeaterModel:e.target.value}))} placeholder="e.g., Rheem PROE50 S2 RH95"/></div>

          <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={homeProfile.notes||""} onChange={e=>setHomeProfile(p=>({...p,notes:e.target.value}))} placeholder="Insurance policy #, HOA info, special considerations..."/></div>

          {/* Summary card if data exists */}
          {(homeProfile.sqft || homeProfile.yearBuilt || homeProfile.roof) && <div style={{background:K.accentLight,border:"1.5px solid "+K.accent+"44",borderRadius:K.radius,padding:16,marginTop:8}}>
            <h3 style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.accent,marginBottom:8}}>Property Summary</h3>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8,fontSize:12,fontFamily:sf,color:K.text}}>
              {homeProfile.sqft&&<div><strong>{Number(homeProfile.sqft).toLocaleString()}</strong> sq ft</div>}
              {homeProfile.yearBuilt&&<div>Built <strong>{homeProfile.yearBuilt}</strong> ({new Date().getFullYear()-homeProfile.yearBuilt} yrs old)</div>}
              {homeProfile.lotSize&&<div><strong>{homeProfile.lotSize}</strong> lot</div>}
              {homeProfile.bedrooms&&<div><strong>{homeProfile.bedrooms}</strong> bed</div>}
              {homeProfile.bathrooms&&<div><strong>{homeProfile.bathrooms}</strong> bath</div>}
              {homeProfile.roof&&<div>Roof: <strong>{homeProfile.roof}</strong></div>}
              {homeProfile.waterSource&&<div>Water: <strong>{homeProfile.waterSource}</strong></div>}
              {homeProfile.sewage&&<div>Sewage: <strong>{homeProfile.sewage}</strong></div>}
            </div>
          </div>}

          <button style={{...S.submitBtn,marginTop:16}} onClick={()=>{setView("dashboard");showToast("Property details saved ✓");}}>Done</button>
        </div>}

{/* ═══ DOCUMENTS ═══ */}
        {view==="documents"&&<div style={S.content}>
          <h2 style={S.formTitle}>📄 Document Vault</h2>
          <p style={{fontSize:13,color:K.textMuted,fontFamily:sf,marginBottom:16,lineHeight:1.5}}>Store warranties, manuals, receipts, and inspection reports. Everything stays with your home.</p>

          <button style={{...S.addTaskBtn,marginBottom:16,display:"flex",alignItems:"center",gap:8}} onClick={()=>{
            const input=document.createElement("input");input.type="file";input.accept=".pdf,.jpg,.jpeg,.png,.doc,.docx";
            input.onchange=async(ev)=>{const file=ev.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=(e)=>{const doc={id:genId(),name:file.name,type:file.type,size:file.size,data:e.target.result,systemId:"",category:"general",warrantyExpires:"",notes:"",added:new Date().toISOString()};setDocuments(prev=>[doc,...prev]);showToast("Document added ✓");};reader.readAsDataURL(file);};input.click();
          }}>📎 Upload Document</button>

          {documents.length===0&&<p style={S.emptyMsg}>No documents yet. Upload warranties, manuals, or receipts.</p>}

          {documents.length>0&&<div style={S.taskList}>
            {documents.map(doc=>{
              const sys = systems.find(s=>s.id===doc.systemId);
              const isExpired = doc.warrantyExpires && new Date(doc.warrantyExpires) < new Date();
              const expiresIn = doc.warrantyExpires ? Math.ceil((new Date(doc.warrantyExpires) - new Date()) / 864e5) : null;
              return (<div key={doc.id} style={S.taskCard}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                      <span style={{fontSize:16}}>{doc.type?.includes("pdf")?"📕":doc.type?.includes("image")?"🖼️":"📄"}</span>
                      <span style={{fontSize:14,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{doc.name}</span>
                    </div>
                    <div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>
                      {doc.category!=="general"&&<span style={{background:K.accentLight,color:K.accent,padding:"1px 6px",borderRadius:3,marginRight:6,fontSize:10,fontWeight:600}}>{doc.category}</span>}
                      {sys&&<span>{sys.icon} {sys.name} · </span>}
                      Added {formatDate(doc.added)}
                      {doc.warrantyExpires&&<span> · {isExpired?<span style={{color:K.danger}}>Warranty expired</span>:<span style={{color:expiresIn<90?K.warning:"#2E7D32"}}>Warranty: {expiresIn}d left</span>}</span>}
                    </div>
                    {doc.notes&&<p style={{fontSize:12,color:K.textMuted,fontFamily:sf,marginTop:4}}>{doc.notes}</p>}
                  </div>
                  <div style={{display:"flex",gap:4,flexShrink:0}}>
                    <button style={S.taskEditBtn} onClick={()=>{const a=document.createElement("a");a.href=doc.data;a.download=doc.name;a.click();}}>⬇</button>
                    <button style={S.taskEditBtn} onClick={()=>{
                      const cat=prompt("Category (warranty, manual, receipt, inspection, general):",doc.category||"general");
                      const sys=prompt("Link to system ID (or leave blank):",doc.systemId||"");
                      const exp=prompt("Warranty expires (YYYY-MM-DD or blank):",doc.warrantyExpires||"");
                      const notes=prompt("Notes:",doc.notes||"");
                      setDocuments(prev=>prev.map(d=>d.id===doc.id?{...d,category:cat||"general",systemId:sys||"",warrantyExpires:exp||"",notes:notes||""}:d));
                    }}>✏️</button>
                    <button style={S.taskDeleteBtn} onClick={()=>{if(confirm("Delete this document?"))setDocuments(prev=>prev.filter(d=>d.id!==doc.id));}}>×</button>
                  </div>
                </div>
              </div>);
            })}
          </div>}

          {documents.some(d=>d.warrantyExpires)&&<div style={{marginTop:16,background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16}}>
            <h3 style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:8}}>🛡️ Warranty Tracker</h3>
            {documents.filter(d=>d.warrantyExpires).sort((a,b)=>new Date(a.warrantyExpires)-new Date(b.warrantyExpires)).map(d=>{
              const days=Math.ceil((new Date(d.warrantyExpires)-new Date())/864e5);
              const color=days<0?K.danger:days<90?K.warning:"#2E7D32";
              return <div key={d.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:"1px solid "+K.border}}><span style={{fontSize:13,fontFamily:sf,color:K.text}}>{d.name}</span><span style={{fontSize:12,fontWeight:600,fontFamily:sf,color}}>{days<0?"Expired "+Math.abs(days)+"d ago":days+"d remaining"}</span></div>;
            })}
          </div>}
        </div>}

{/* ═══ LIST VIEW ═══ */}
        {view==="list"&&listView&&<div style={S.content}>
          {listView==="systems"&&<><h2 style={S.formTitle}>All Systems ({systems.length})</h2><div style={S.taskList}>{systems.map(sys=>{const so=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d<0;}).length;const su=sys.tasks.filter(t=>{const d=daysUntil(getNextDue(t));return d!==null&&d>=0&&d<=30;}).length;return(<div key={sys.id} style={{...S.taskCard,cursor:"pointer"}} onClick={()=>{setSelectedSystem(sys.id);setView("system");}}><div style={S.taskTop}><span style={{fontSize:24,flexShrink:0}}>{sys.icon}</span><div style={S.taskInfo}><div style={S.taskName}>{sys.name}</div><div style={S.taskFreq}>{sys.category} · {sys.tasks.length} tasks</div></div><div style={S.listBadgeWrap}>{so>0&&<span style={S.listBadgeRed}>{so} overdue</span>}{su>0&&<span style={S.listBadgeYellow}>{su} upcoming</span>}</div></div></div>);})}</div></>}
          {listView==="upcoming"&&<><h2 style={{...S.formTitle,color:upcomingCount>0?K.warning:"#2E7D32"}}>{upcomingCount>0?`Upcoming Tasks (${upcomingCount})`:"Nothing Due Within 30 Days ✓"}</h2><div style={S.taskList}>{upcomingCount===0&&<p style={S.emptyMsg}>You're ahead of schedule!</p>}{upcomingTaskList.map(t=>{const oc=(t.parts||[]).filter(p=>p.status==="order").reduce((s,p)=>s+(p.cost||0),0);return(<div key={t.id+t.systemId} style={{...S.taskCard,borderColor:K.warning+"66"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:K.warning}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:K.warning+"22",color:K.warning}}>{t.days===0?"Due today":`${t.days}d left`}</div></div>{oc>0&&<div style={S.upcomingCostRow}><span style={S.upcomingCostLabel}>🛒 Est. cost:</span><span style={S.upcomingCostValue}>${oc.toFixed(2)}</span></div>}<PartsDisplay parts={t.parts} S={S} K={K} priceHistory={priceHistory} systemId={typeof sys!=="undefined"?sys?.id:t.systemId} taskId={t.id}/><PhotoStrip photos={t.photos} sysId={t.systemId} taskId={t.id}/><div style={S.taskCountdownRow}><span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}>✓ Done</button></div></div>);})}</div></>}
          {listView==="history"&&<div style={S.content}>
            <h2 style={S.formTitle}>📜 Maintenance History</h2>
            {historyEntries.length===0&&<p style={S.emptyMsg}>No completed tasks yet. Mark a task done to start building your history.</p>}
            {historyEntries.length>0&&<div style={S.taskList}>
              {historyEntries.slice(0,50).map((e,i)=>{
                const d = new Date(e.date);
                const today = new Date();
                const daysAgo = Math.floor((today - d) / 864e5);
                const timeLabel = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : daysAgo < 7 ? daysAgo+"d ago" : daysAgo < 30 ? Math.floor(daysAgo/7)+"w ago" : formatDate(e.date);
                return (<div key={i} style={{...S.taskCard,cursor:"pointer"}} onClick={()=>{setSelectedSystem(e.systemId);setView("system");}}>
                  <div style={S.taskTop}>
                    <span style={{fontSize:20,flexShrink:0}}>{e.systemIcon}</span>
                    <div style={S.taskInfo}>
                      <div style={S.taskName}>{e.taskName}</div>
                      <div style={S.taskFreq}>{e.systemName}</div>
                    </div>
                    <span style={{fontSize:12,color:K.textMuted,fontFamily:sf,whiteSpace:"nowrap"}}>{timeLabel}</span>
                  </div>
                  {e.notes && e.notes !== "Completed" && <p style={S.taskNotes}>📝 {e.notes}</p>}
                </div>);
              })}
            </div>}
            {historyEntries.length>50&&<p style={{fontSize:12,color:K.textMuted,fontFamily:sf,textAlign:"center",marginTop:12}}>Showing most recent 50 entries</p>}
          </div>}

          {listView==="analytics"&&<div>
            <h2 style={S.formTitle}>📊 Analytics</h2>

            {/* Annual Cost by System */}
            {costBreakdown.length > 0 && <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:4}}>💰 Annual Cost by System</h3>
              <p style={{fontSize:22,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text,marginBottom:12}}>${annualCost.toFixed(0)}<span style={{fontSize:13,color:K.textMuted,fontWeight:400}}>/year est.</span></p>
              {costBreakdown.map((s,i)=>{const pct=annualCost>0?Math.round((s.cost/annualCost)*100):0;return(<div key={i} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}><span style={{fontSize:13,fontFamily:sf,color:K.text}}>{s.icon} {s.name}</span><span style={{fontSize:13,fontWeight:700,fontFamily:sf,color:K.text}}>${s.cost.toFixed(0)}</span></div><div style={{height:6,background:K.border,borderRadius:3,overflow:"hidden"}}><div style={{width:pct+"%",height:"100%",background:K.accent,borderRadius:3}}/></div></div>)})}
            </div>}

            {/* Expense Calendar Heatmap */}
            <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:4}}>📅 52-Week Expense Forecast</h3>
              <p style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginBottom:12}}>Each square = 1 week. Darker = more expensive. Tap any week for details.</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                {weeklyHeatmap.map((w,i)=>{
                  const intensity = w.cost > 0 ? Math.max(0.15, w.cost / maxWeekCost) : 0;
                  const hue = w.cost === 0 ? null : intensity > 0.7 ? K.danger : intensity > 0.35 ? K.warning : "#2E7D32";
                  const isSelected = selectedWeek === w.week;
                  const showMonthLabel = i === 0 || w.month !== weeklyHeatmap[i-1]?.month;
                  return (<div key={i} style={{display:"inline-flex",flexDirection:"column",alignItems:"center",gap:1}}>
                    {showMonthLabel && <span style={{fontSize:8,color:K.textMuted,fontFamily:sf,height:12,lineHeight:"12px"}}>{w.month}</span>}
                    {!showMonthLabel && <span style={{height:12}}/>}
                    <div onClick={()=>setSelectedWeek(isSelected?null:w.week)} style={{
                      width:16,height:16,borderRadius:3,cursor:"pointer",transition:"all 0.1s",
                      background: w.cost===0 ? (darkMode?K.border+"44":K.border+"66") : hue+(darkMode?Math.round(intensity*200+55).toString(16):Math.round(intensity*180+40).toString(16)),
                      border: isSelected ? "2px solid "+K.text : "1px solid "+(darkMode?"transparent":K.border+"44"),
                      transform: isSelected ? "scale(1.3)" : "scale(1)",
                    }} title={w.label+": "+w.count+" tasks, $"+w.cost.toFixed(0)}/>
                  </div>);
                })}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8,fontSize:10,color:K.textMuted,fontFamily:sf}}>
                <span>Less</span>
                {[0,0.2,0.4,0.7,1].map((v,i)=><div key={i} style={{width:12,height:12,borderRadius:2,background:v===0?(darkMode?K.border+"44":K.border+"66"):v>0.7?K.danger:v>0.35?K.warning:"#2E7D32",opacity:v===0?1:Math.max(0.3,v)}}/>)}
                <span>More $</span>
              </div>
              {selectedWeek!==null&&(()=>{
                const w=weeklyHeatmap[selectedWeek];
                return (<div style={{marginTop:12,background:K.bg,borderRadius:8,padding:12,border:"1px solid "+K.border}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                    <span style={{fontSize:14,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text}}>Week of {w.label}</span>
                    <span style={{fontSize:14,fontWeight:700,fontFamily:sf,color:w.cost>0?K.warning:K.textMuted}}>{w.cost>0?"$"+w.cost.toFixed(0):"No costs"}</span>
                  </div>
                  {w.tasks.length===0&&<p style={{fontSize:12,color:K.textMuted,fontFamily:sf}}>No maintenance tasks scheduled this week.</p>}
                  {w.tasks.map((t,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:i<w.tasks.length-1?"1px solid "+K.border:""}}>
                    <div><span style={{fontSize:13,fontFamily:sf,color:K.text,fontWeight:600}}>{t.systemIcon} {t.name}</span><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>{t.system}</div></div>
                    <span style={{fontSize:13,fontWeight:600,fontFamily:sf,color:K.warning}}>{t.cost>0?"$"+t.cost.toFixed(0):""}</span>
                  </div>))}
                </div>);
              })()}
            </div>

            {/* Top Expensive Tasks */}
            {topExpensive.length > 0 && <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:12}}>🔥 Most Expensive Tasks</h3>
              {topExpensive.map((t,i)=>(<div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:i<topExpensive.length-1?"1px solid "+K.border:""}}><div><div style={{fontSize:13,fontFamily:sf,color:K.text,fontWeight:600}}>{t.icon} {t.name}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>{t.system} · ${t.perOccurrence.toFixed(0)} each time</div></div><div style={{fontSize:14,fontWeight:700,fontFamily:sf,color:K.warning}}>${t.annualCost.toFixed(0)}/yr</div></div>))}
            </div>}

            {/* Parts Inventory */}
            <div style={{background:K.surface,border:"1.5px solid "+K.border,borderRadius:K.radius,padding:16,marginBottom:16}}>
              <h3 style={{fontSize:15,fontWeight:700,fontFamily:sf,color:K.text,marginBottom:12}}>🧰 Parts Inventory</h3>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:partsFilter?12:0}}>
                <div onClick={()=>setPartsFilter(partsFilter==="on-hand"?null:"on-hand")} style={{background:partsFilter==="on-hand"?"#2E7D3215":K.bg,border:partsFilter==="on-hand"?"1.5px solid #2E7D32":"1.5px solid transparent",borderRadius:8,padding:"12px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}><div style={{fontSize:22,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:"#2E7D32"}}>{partsInventory.onHand}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>On Hand</div><div style={{fontSize:13,fontWeight:600,fontFamily:sf,color:"#2E7D32",marginTop:2}}>${partsInventory.onHandValue.toFixed(0)} value</div></div>
                <div onClick={()=>setPartsFilter(partsFilter==="order"?null:"order")} style={{background:partsFilter==="order"?K.warning+"15":K.bg,border:partsFilter==="order"?"1.5px solid "+K.warning:"1.5px solid transparent",borderRadius:8,padding:"12px",textAlign:"center",cursor:"pointer",transition:"all 0.15s"}}><div style={{fontSize:22,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.warning}}>{partsInventory.toOrder}</div><div style={{fontSize:11,color:K.textMuted,fontFamily:sf}}>Need to Order</div><div style={{fontSize:13,fontWeight:600,fontFamily:sf,color:K.warning,marginTop:2}}>${partsInventory.toOrderValue.toFixed(0)} est.</div></div>
              </div>
              {partsFilter && (()=>{
                const list = partsFilter==="on-hand" ? partsInventory.onHandList : partsInventory.toOrderList;
                const label = partsFilter==="on-hand" ? "On Hand" : "Need to Order";
                const color = partsFilter==="on-hand" ? "#2E7D32" : K.warning;
                return (<div>
                  <div style={{fontSize:13,fontWeight:700,fontFamily:sf,color,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}><span>{label} ({list.length})</span><button onClick={()=>setPartsFilter(null)} style={{background:"transparent",border:"none",color:K.textMuted,fontSize:18,cursor:"pointer",padding:0,lineHeight:1}}>×</button></div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {list.map((p,i)=>{
                      const buyUrl = tagUrl(p.purchaseUrl, p);
                      const isService = /service|professional|contractor|inspection|rental|labor/i.test(p.name);
                      return (<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:K.bg,borderRadius:6,fontSize:13,fontFamily:sf}}>
                        <span style={{fontSize:16,flexShrink:0}}>{p.systemIcon}</span>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:600,color:K.text}}>{p.name}</div>
                          <div style={{fontSize:11,color:K.textMuted}}>{p.systemName} · {p.taskName}{(p.brand||p.model)?" · "+[p.brand,p.model].filter(Boolean).join(" "):""}</div>
                        </div>
                        <span style={{fontWeight:600,color:K.textMuted,whiteSpace:"nowrap"}}>{fmtCost(p.cost)}</span>
                        {partsFilter==="order" && !isService && p.cost>0 && buyUrl && <a href={buyUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-block",padding:"3px 10px",fontSize:11,fontWeight:700,color:"#fff",background:p.purchaseUrl?"#2E7D32":K.accent,borderRadius:4,textDecoration:"none",fontFamily:sf,whiteSpace:"nowrap"}} onClick={e=>e.stopPropagation()}>{p.purchaseUrl?"Buy ✓":"Buy"}</a>}
                      </div>);
                    })}
                  </div>
                </div>);
              })()}
            </div>

            {/* Monthly Avg */}
            <div style={{background:K.accentLight,border:"1.5px solid "+K.accent+"44",borderRadius:K.radius,padding:"14px 16px",marginBottom:16,textAlign:"center"}}>
              <span style={{fontSize:13,fontFamily:sf,color:K.accent}}>Averaging </span>
              <span style={{fontSize:18,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.accent}}>${(annualCost/12).toFixed(0)}/month</span>
              <span style={{fontSize:13,fontFamily:sf,color:K.accent}}> in maintenance costs</span>
            </div>
          </div>}

          {listView==="overdue"&&<><h2 style={{...S.formTitle,color:overdueTaskList.length>0?K.danger:"#2E7D32"}}>{overdueTaskList.length>0?`Overdue Tasks (${overdueTaskList.length})`:"No Overdue Tasks ✓"}</h2><div style={S.taskList}>{overdueTaskList.length===0&&<p style={S.emptyMsg}>Everything on schedule!</p>}{overdueTaskList.map(t=>{const next=getNextDue(t);const days=daysUntil(next);return(<div key={t.id+t.systemId} style={{...S.taskCard,borderColor:K.danger+"44"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:K.danger}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div><div style={{...S.urgentBadge,backgroundColor:K.danger+"18",color:K.danger}}>{Math.abs(days)}d overdue</div></div><PartsDisplay parts={t.parts} S={S} K={K} priceHistory={priceHistory} systemId={typeof sys!=="undefined"?sys?.id:t.systemId} taskId={t.id}/><PhotoStrip photos={t.photos} sysId={t.systemId} taskId={t.id}/><div style={S.taskCountdownRow}><span style={S.taskLast}>Was due: {next.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:t.systemId,task:t})}>✓ Done</button></div></div>);})}</div></>}
        </div>}

        {/* ═══ SYSTEM DETAIL ═══ */}
        {view==="system"&&selectedSystem&&(()=>{const sys=systems.find(s=>s.id===selectedSystem);if(!sys)return null;const sysCost=sys.tasks.reduce((s,t)=>s+(t.parts||[]).filter(p=>p.status==="order").reduce((s2,p)=>s2+(p.cost||0),0),0);const schedT=sys.tasks.filter(t=>!isAsReq(t));const arT=sys.tasks.filter(t=>isAsReq(t));return(
          <div style={S.content}>
            <div style={S.sysDetailHead}><span style={{fontSize:40}}>{sys.icon}</span><div><h2 style={S.sysDetailTitle}>{sys.name}</h2><span style={S.sysDetailCat}>{sys.category}</span></div></div>
            {sys.notes&&<p style={S.sysNotes}>{sys.notes}</p>}
            {sysCost>0&&<div style={S.sysCostSummary}><span>💰 Total order costs:</span><strong>${sysCost.toFixed(2)}</strong></div>}
            {(()=>{const sysProviders=providers.filter(p=>(p.systemIds||[]).includes(sys.id));return sysProviders.length>0?<div style={{marginBottom:12}}>{sysProviders.map(p=>(<div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:K.accentLight,borderRadius:8,marginBottom:4}}><span style={{fontSize:16}}>📞</span><div style={{flex:1}}><span style={{fontSize:13,fontWeight:600,fontFamily:sf,color:K.text}}>{p.name}</span>{p.specialty&&<span style={{fontSize:11,color:K.textMuted,fontFamily:sf}}> · {p.specialty}</span>}</div>{p.phone&&<a href={"tel:"+p.phone} style={{fontSize:13,color:K.accent,fontFamily:sf,fontWeight:600,textDecoration:"none"}}>Call</a>}</div>))}</div>:null;})()}
            <div style={S.sysActions}>
              <button style={S.addTaskBtn} onClick={()=>{setFormTask({name:"",intervalMonths:12,notes:"",parts:[],taskType:"scheduled",season:""});setView("add-task");}}>+ Add Task</button>
              <button style={S.asNeededBtn} onClick={()=>{setFormTask({name:"",intervalMonths:0,notes:"",parts:[],taskType:"as-required",season:""});setView("add-task");}}>+ As Needed</button>
              <button style={S.taskEditBtn} onClick={()=>editSystem(sys.id)}>✏️ Edit</button>
              <button style={{...S.taskEditBtn,fontSize:12}} onClick={()=>{const tpl={id:genId(),name:sys.name,icon:sys.icon,category:sys.category,notes:sys.notes||"",tasks:sys.tasks.map(t=>({name:t.name,intervalMonths:t.intervalMonths,notes:t.notes||"",taskType:t.taskType||"scheduled",season:t.season||"",parts:(t.parts||[]).map(p=>({name:p.name,cost:p.cost,status:p.status,brand:p.brand||"",model:p.model||"",size:p.size||"",purchaseUrl:p.purchaseUrl||""}))}))};setCustomTemplates(prev=>[...prev,tpl]);showToast("Saved as template ✓");}}>💾 Save Template</button>
              <button style={S.deleteBtn} onClick={()=>{if(confirm(`Delete "${sys.name}"?`))deleteSystem(sys.id);}}>Delete</button>
            </div>
            {sys.tasks.length===0&&<p style={S.emptyMsg}>No tasks yet.</p>}
            {schedT.length>0&&<div style={{marginBottom:20}}><div style={S.taskList}>{schedT.map(t=>{const blocked=isDepBlocked(t,sys.tasks);const depTask=t.dependsOn?sys.tasks.find(x=>x.id===t.dependsOn):null;return(<div key={t.id} style={{...S.taskCard,opacity:blocked?0.5:1,position:"relative"}}>{blocked&&<div style={{position:"absolute",top:8,right:10,fontSize:10,fontWeight:600,color:K.warning,background:K.warning+"18",padding:"2px 8px",borderRadius:4,fontFamily:sf}}>🔒 Waiting on: {depTask?.name}</div>}<div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:getStatusColor(t,K)}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{formatInterval(t.intervalMonths)}{t.season&&<span style={{marginLeft:6,fontSize:11,color:K.accent}}>{t.season} {SEASON_CONTEXT[t.season]?.label||""}</span>}</div></div><div style={{...S.taskStatus,color:getStatusColor(t,K)}}>{getStatusLabel(t)}</div></div>{t.notes&&<p style={S.taskNotes}>{t.notes}</p>}{(t.workLog||[]).length>1&&<div style={{margin:"6px 0 4px 20px",fontSize:12,fontFamily:sf,color:K.textMuted}}><div style={{fontWeight:600,marginBottom:3,color:K.accent}}>History ({(t.workLog||[]).length}):</div>{(t.workLog||[]).slice(-4).reverse().map((e,i)=>(<div key={i} style={{padding:"2px 0"}}>{formatDate(e.date)}{e.notes&&e.notes!=="Completed"?` — ${e.notes}`:""}</div>))}</div>}<PartsDisplay parts={t.parts} S={S} K={K} priceHistory={priceHistory} systemId={typeof sys!=="undefined"?sys?.id:t.systemId} taskId={t.id}/><PhotoStrip photos={t.photos} sysId={sys.id} taskId={t.id}/><div style={S.taskBottom}><div style={S.taskDateRow}><span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span>{(()=>{const next=getNextDue(t);if(!next)return(<span style={{...S.countdownBadge,color:K.warm,backgroundColor:K.warm+"15"}}>No date set</span>);const d=daysUntil(next);const c=getStatusColor(t,K);return(<span style={{...S.countdownBadge,color:c,backgroundColor:c+"15"}}>{d<0?`${Math.abs(d)}d overdue`:d===0?"Due today!":`${d}d remaining`}</span>);})()}</div><div style={S.taskBtns}><button style={S.taskCompleteBtn} onClick={()=>setShowCompleteModal({systemId:sys.id,task:t})}>✓ Done</button><PhotoButton sysId={sys.id} taskId={t.id}/>{getNextDue(t)&&<button style={S.taskEditBtn} onClick={()=>addToCalendar(t)} title="Add to calendar">📅</button>}<button style={S.taskEditBtn} onClick={()=>{setFormTask({name:t.name,intervalMonths:t.intervalMonths,notes:t.notes||"",parts:t.parts||[],taskType:t.taskType||"scheduled",season:t.season||""});setEditingTask(t.id);setView("edit-task");}}>Edit</button><button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${t.name}"?`))deleteTask(sys.id,t.id);}}>×</button></div></div></div>)})}</div></div>}
            {arT.length>0&&<div><h3 style={{fontSize:14,fontWeight:700,color:"#6B7D8A",marginBottom:8,fontFamily:sf}}>🔧 As Needed</h3><div style={S.taskList}>{arT.map(t=>{const wl=t.workLog||[];return(<div key={t.id} style={{...S.taskCard,borderLeft:"3px solid #6B7D8A"}}><div style={S.taskTop}><div style={{...S.taskDot,backgroundColor:"#6B7D8A"}}/><div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>As Needed{wl.length>0?` · ${wl.length} log entr${wl.length===1?"y":"ies"}`:""}</div></div><div style={{...S.taskStatus,color:"#6B7D8A"}}>{getStatusLabel(t)}</div></div>{t.notes&&<p style={S.taskNotes}>{t.notes}</p>}{wl.length>0&&<div style={{margin:"6px 0 4px 20px",fontSize:12,fontFamily:sf,color:K.textMuted}}>{wl.slice(-3).reverse().map((e,i)=>(<div key={i} style={{padding:"3px 0"}}><span style={{color:K.text}}>{formatDate(e.date)}</span> — {e.notes||"No notes"}</div>))}</div>}<PhotoStrip photos={t.photos} sysId={sys.id} taskId={t.id}/><div style={S.taskBottom}><span style={S.taskLast}>{wl.length>0?`${wl.length} entries`:"No entries yet"}</span><div style={S.taskBtns}><button style={S.asNeededLogBtn} onClick={()=>setShowLogModal({systemId:sys.id,task:t})}>📝 Log</button><PhotoButton sysId={sys.id} taskId={t.id}/><button style={S.taskEditBtn} onClick={()=>{setFormTask({name:t.name,intervalMonths:t.intervalMonths,notes:t.notes||"",parts:t.parts||[],taskType:"as-required",season:""});setEditingTask(t.id);setView("edit-task");}}>Edit</button><button style={S.taskDeleteBtn} onClick={()=>{if(confirm(`Delete "${t.name}"?`))deleteTask(sys.id,t.id);}}>×</button></div></div></div>);})}</div></div>}
          </div>);})()}

        {/* ═══ ADD SYSTEM ═══ */}
        {view==="add-system"&&<div style={S.content}><h2 style={S.formTitle}>Add Custom System</h2><div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} value={formSystem.name} onChange={e=>setFormSystem({...formSystem,name:e.target.value})} placeholder="e.g., Pool Pump, Solar Panels"/></div><div style={S.formGroup}><label style={S.label}>Icon</label><IconPicker icons={SYSTEM_ICONS} value={formSystem.icon} onChange={ic=>setFormSystem({...formSystem,icon:ic})} K={K}/></div><div style={S.formGroup}><label style={S.label}>Category</label><select style={S.input} value={formSystem.category} onChange={e=>setFormSystem({...formSystem,category:e.target.value})}>{CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}<option value="Other">Other</option></select></div><div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={formSystem.notes} onChange={e=>setFormSystem({...formSystem,notes:e.target.value})}/></div><button style={S.submitBtn} onClick={addSystem} disabled={!formSystem.name.trim()}>Add System</button></div>}

        {view==="edit-system"&&selectedSystem&&<div style={S.content}><h2 style={S.formTitle}>Edit System</h2><div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} value={formSystem.name} onChange={e=>setFormSystem({...formSystem,name:e.target.value})}/></div><div style={S.formGroup}><label style={S.label}>Icon</label><IconPicker icons={SYSTEM_ICONS} value={formSystem.icon} onChange={ic=>setFormSystem({...formSystem,icon:ic})} K={K}/></div><div style={S.formGroup}><label style={S.label}>Category</label><select style={S.input} value={formSystem.category} onChange={e=>setFormSystem({...formSystem,category:e.target.value})}>{CATEGORIES.filter(c=>c!=="All").map(c=><option key={c}>{c}</option>)}<option value="Other">Other</option></select></div><div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{...S.input,minHeight:60}} value={formSystem.notes} onChange={e=>setFormSystem({...formSystem,notes:e.target.value})}/></div><button style={S.submitBtn} onClick={()=>saveEditSystem(selectedSystem)} disabled={!formSystem.name.trim()}>Save Changes</button></div>}

        {/* ═══ ADD/EDIT TASK ═══ */}
        {(view==="add-task"||view==="edit-task")&&selectedSystem&&<div style={S.content}><h2 style={S.formTitle}>{view==="edit-task"?"Edit Task":formTask.taskType==="as-required"?"Add As-Needed Task":"Add Task"}</h2><div style={S.formGroup}><label style={S.label}>Type</label><div style={{display:"flex",gap:8}}><button style={formTask.taskType==="scheduled"?S.typeToggleActive:S.typeToggle} onClick={()=>setFormTask({...formTask,taskType:"scheduled",intervalMonths:formTask.intervalMonths||12})}>📅 Scheduled</button><button style={formTask.taskType==="as-required"?{...S.typeToggleActive,borderColor:"#6B7D8A",background:"#6B7D8A22",color:"#6B7D8A"}:S.typeToggle} onClick={()=>setFormTask({...formTask,taskType:"as-required",intervalMonths:0})}>🔧 As Needed</button></div></div><div style={S.formGroup}><label style={S.label}>Task Name</label><input style={S.input} value={formTask.name} onChange={e=>setFormTask({...formTask,name:e.target.value})} placeholder={formTask.taskType==="as-required"?"e.g., Garbage disposal repair":"e.g., Replace filter"}/></div>{formTask.taskType==="scheduled"&&<div style={S.formGroup}><label style={S.label}>Frequency</label><div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>{[{l:"Weekly",v:0.25},{l:"Monthly",v:1},{l:"Quarterly",v:3},{l:"Yearly",v:12}].map(q=>(<button key={q.l} style={{padding:"8px 14px",border:Number(formTask.intervalMonths)===q.v?"1.5px solid "+K.accent:"1.5px solid "+K.border,borderRadius:8,background:Number(formTask.intervalMonths)===q.v?K.accentLight:"transparent",color:Number(formTask.intervalMonths)===q.v?K.accent:K.textMuted,fontSize:13,cursor:"pointer",fontFamily:sf,fontWeight:Number(formTask.intervalMonths)===q.v?600:500}} onClick={()=>setFormTask({...formTask,intervalMonths:q.v})}>{q.l}</button>))}</div><input style={S.input} type="number" min="0.25" max="240" step="0.25" value={formTask.intervalMonths} onChange={e=>setFormTask({...formTask,intervalMonths:e.target.value})}/><p style={{fontSize:11,color:K.textMuted,margin:"4px 0 0",fontFamily:sf}}>Custom: enter months (e.g., 6 = every 6 months)</p></div>}<div style={S.formGroup}><label style={S.label}>{formTask.taskType==="as-required"?"Description":"Notes"}</label><textarea style={{...S.input,minHeight:60}} value={formTask.notes} onChange={e=>setFormTask({...formTask,notes:e.target.value})} placeholder={formTask.taskType==="as-required"?"What needs to be tracked when this comes up?":""}/></div><div style={S.formGroup}><label style={S.label}>🧰 Parts, Tools & Materials</label><PartsEditor parts={formTask.parts} onChange={parts=>setFormTask({...formTask,parts})} S={S} K={K}/></div>{formTask.taskType==="scheduled"&&<div style={S.formGroup}><label style={S.label}>Season (optional)</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{["","🌸 Spring","☀️ Summer","🍂 Fall","❄️ Winter"].map(s=>(<button key={s} style={formTask.season===s?(s?{...S.seasonBtnActive}:S.seasonBtnClear):(s?S.seasonBtn:S.seasonBtnClear)} onClick={()=>setFormTask({...formTask,season:s})}>{s||"None"}</button>))}</div></div>}{formTask.taskType==="scheduled"&&selectedSystem&&(()=>{const sys=systems.find(s=>s.id===selectedSystem);const otherTasks=(sys?.tasks||[]).filter(t=>t.id!==editingTask);return otherTasks.length>0?<div style={S.formGroup}><label style={S.label}>Depends On (optional)</label><select style={S.input} value={formTask.dependsOn||""} onChange={e=>setFormTask({...formTask,dependsOn:e.target.value})}><option value="">None — independent task</option>{otherTasks.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><p style={{fontSize:11,color:K.textMuted,fontFamily:sf,marginTop:4}}>This task will be grayed out until the prerequisite is completed.</p></div>:null;})()}
          <button style={S.submitBtn} onClick={()=>view==="edit-task"?updateTask(selectedSystem,editingTask):addTask(selectedSystem)} disabled={!formTask.name.trim()}>{view==="edit-task"?"Save Changes":formTask.taskType==="as-required"?"Add As-Needed Task":"Add Task"}</button></div>}
      </main>

      {/* ═══ COMPLETE MODAL ═══ */}
      {showCompleteModal&&(()=>{const MC=()=>{const[pd,setPd]=useState(new Date().toISOString().split("T")[0]);const[sp,setSp]=useState(false);const[notes,setNotes]=useState("");const[actualCost,setActualCost]=useState(0);const[step,setStep]=useState(1);return(<div style={S.overlay} onClick={()=>setShowCompleteModal(null)}><div style={{...S.modal,maxWidth:400}} onClick={e=>e.stopPropagation()}>{step===1?<><h3 style={S.modalTitle}>Mark Complete</h3><p style={S.modalTask}>{showCompleteModal.task.name}</p><p style={S.modalHint}>When was this last done?</p>{!sp?<div style={S.modalBtns}><button style={S.modalBtn} onClick={()=>{setPd(new Date().toISOString().split("T")[0]);setStep(2);}}>Today</button><button style={S.modalBtnAlt} onClick={()=>setSp(true)}>Choose Date…</button></div>:<div style={{display:"flex",flexDirection:"column",gap:10,alignItems:"center"}}><input type="date" value={pd} onChange={e=>setPd(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{...S.input,width:"auto",minWidth:180,textAlign:"center"}}/><div style={S.modalBtns}><button style={S.modalBtn} onClick={()=>{if(pd)setStep(2);}}>Next</button><button style={S.modalBtnAlt} onClick={()=>setSp(false)}>Back</button></div></div>}</>:<><h3 style={S.modalTitle}>Any notes?</h3><p style={{...S.modalTask,fontSize:13}}>Anything to remember? (optional)</p><textarea style={{...S.input,minHeight:60,textAlign:"left"}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="e.g., Used brand X filter, hired ABC company..."/>{budget.monthly>0&&<div style={{marginTop:8}}><label style={{...S.label,fontSize:11}}>Actual Cost Spent</label><input style={{...S.input,textAlign:"center"}} type="number" min="0" step="0.01" value={actualCost||""} onChange={e=>setActualCost(Number(e.target.value)||0)} placeholder="$0.00"/></div>}<div style={{...S.modalBtns,marginTop:12}}><button style={S.modalBtn} onClick={()=>markComplete(showCompleteModal.systemId,showCompleteModal.task.id,new Date(pd+"T12:00:00").toISOString(),notes,actualCost)}>Complete ✓</button><button style={S.modalBtnAlt} onClick={()=>markComplete(showCompleteModal.systemId,showCompleteModal.task.id,new Date(pd+"T12:00:00").toISOString(),"",0)}>Skip</button></div></>}<button style={S.modalCancel} onClick={()=>setShowCompleteModal(null)}>Cancel</button></div></div>);};return(<MC/>);})()}

      {showLogModal&&(()=>{const LM=()=>{const[dt,setDt]=useState(new Date().toISOString().split("T")[0]);const[notes,setNotes]=useState("");return(<div style={S.overlay} onClick={()=>setShowLogModal(null)}><div style={{...S.modal,maxWidth:380,textAlign:"left"}} onClick={e=>e.stopPropagation()}><h3 style={{...S.modalTitle,textAlign:"center",color:"#6B7D8A"}}>Log Entry</h3><p style={{...S.modalTask,textAlign:"center"}}>{showLogModal.task.name}</p><div style={{marginBottom:12}}><label style={S.label}>Date</label><input type="date" value={dt} onChange={e=>setDt(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{...S.input,textAlign:"center"}}/></div><div style={{marginBottom:16}}><label style={S.label}>What was done</label><textarea style={{...S.input,minHeight:80}} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Describe what happened and what you did..."/></div><div style={S.modalBtns}><button style={{...S.modalBtn,background:"#6B7D8A"}} onClick={()=>{if(notes.trim())logWorkEntry(showLogModal.systemId,showLogModal.task.id,{id:genId(),date:new Date(dt+"T12:00:00").toISOString(),notes});}} disabled={!notes.trim()}>Save Entry</button><button style={S.modalBtnAlt} onClick={()=>setShowLogModal(null)}>Cancel</button></div></div></div>);};return(<LM/>);})()}

      {photoViewer&&<div style={S.overlay} onClick={()=>setPhotoViewer(null)}><div style={{maxWidth:"90vw",maxHeight:"90vh",position:"relative",display:"flex",flexDirection:"column",alignItems:"center"}} onClick={e=>e.stopPropagation()}><img src={photoViewer.data} alt="" style={{maxWidth:"90vw",maxHeight:"70vh",borderRadius:12,objectFit:"contain"}}/><div style={{display:"flex",justifyContent:"center",gap:12,marginTop:16}}><button style={{background:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:sf,minHeight:44}} onClick={()=>setPhotoViewer(null)}>Close</button><button style={{background:K.danger,color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:sf,minHeight:44}} onClick={()=>{if(confirm("Delete this photo?")){deletePhoto(photoViewer.sysId,photoViewer.taskId,photoViewer.id);setPhotoViewer(null);}}}>Delete</button></div><div style={{textAlign:"center",marginTop:8,fontSize:12,color:"#fff9",fontFamily:sf}}>{photoViewer.date?new Date(photoViewer.date).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}):""}</div></div></div>}



      {/* Trophy Case Modal */}
      {showTrophies&&<div style={S.overlay} onClick={()=>setShowTrophies(false)}><div style={{...S.modal,maxWidth:400,textAlign:"left"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{...S.modalTitle,textAlign:"center"}}>🏆 Trophy Case</h3>
        <div style={{display:"flex",justifyContent:"center",gap:16,margin:"12px 0 16px"}}>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:K.accent,fontFamily:"'Newsreader',Georgia,serif"}}>{achievements.score}</div><div style={{fontSize:10,color:K.textMuted,fontFamily:sf}}>Score</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:K.warning,fontFamily:"'Newsreader',Georgia,serif"}}>🔥 {achievements.streak}</div><div style={{fontSize:10,color:K.textMuted,fontFamily:sf}}>Streak</div></div>
          <div style={{textAlign:"center"}}><div style={{fontSize:28,fontWeight:700,color:K.textMuted,fontFamily:"'Newsreader',Georgia,serif"}}>{achievements.bestStreak}</div><div style={{fontSize:10,color:K.textMuted,fontFamily:sf}}>Best Streak</div></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {[
            {id:"first-complete",icon:"⭐",name:"First Task",desc:"Complete your first task"},
            {id:"ten-complete",icon:"🌟",name:"Getting Going",desc:"Complete 10 tasks"},
            {id:"fifty-complete",icon:"💫",name:"Dedicated",desc:"Complete 50 tasks"},
            {id:"century",icon:"🏅",name:"Century Club",desc:"Complete 100 tasks"},
            {id:"five-systems",icon:"🏗️",name:"Well Equipped",desc:"Track 5 systems"},
            {id:"ten-systems",icon:"🏘️",name:"Full Coverage",desc:"Track 10 systems"},
            {id:"zero-overdue",icon:"✅",name:"All Clear",desc:"Zero overdue tasks"},
            {id:"budget-set",icon:"💰",name:"Budget Boss",desc:"Set a maintenance budget"},
            {id:"first-provider",icon:"📞",name:"Connected",desc:"Add a service provider"},
            {id:"first-doc",icon:"📄",name:"Documented",desc:"Upload first document"},
            {id:"property-details",icon:"🏠",name:"Homeowner",desc:"Fill in property details"},
            {id:"multi-home",icon:"🏘️",name:"Landlord",desc:"Manage 2+ properties"},
          ].map(b=>{const unlocked=achievements.unlocked.includes(b.id);return(
            <div key={b.id} style={{padding:"10px",borderRadius:8,background:unlocked?K.accentLight:K.bg,border:"1.5px solid "+(unlocked?K.accent+"44":K.border),opacity:unlocked?1:0.4}}>
              <div style={{fontSize:20,marginBottom:4}}>{b.icon}</div>
              <div style={{fontSize:12,fontWeight:700,fontFamily:sf,color:K.text}}>{b.name}</div>
              <div style={{fontSize:10,color:K.textMuted,fontFamily:sf}}>{b.desc}</div>
            </div>
          );})}
        </div>
        <button style={{...S.modalBtnAlt,width:"100%",marginTop:12}} onClick={()=>setShowTrophies(false)}>Close</button>
      </div></div>}

      {/* Celebration overlay */}
      {showCelebration&&<div style={{position:"fixed",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:400,textAlign:"center",pointerEvents:"none",animation:"celebration-pop 0.4s ease-out, celebration-fade 0.6s ease-in 1.2s forwards"}}><div style={{fontSize:64,marginBottom:8,animation:"celebration-pop 0.5s ease-out"}}>🎉</div><div style={{background:K.accent,color:"#fff",padding:"12px 28px",borderRadius:16,fontSize:18,fontWeight:700,fontFamily:sf,boxShadow:"0 8px 32px rgba(45,90,61,0.4)",animation:"celebration-pop 0.5s ease-out 0.1s both"}}>Task Complete!</div><div style={{marginTop:8,fontSize:14,color:K.text,fontFamily:sf,background:K.surface,padding:"6px 16px",borderRadius:8,boxShadow:"0 2px 8px rgba(0,0,0,0.1)",animation:"celebration-pop 0.5s ease-out 0.2s both"}}>Nice work — keep it up!</div></div>}

      {toast&&<div style={S.toast}>{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// Inject celebration animation
if (typeof document !== "undefined" && !document.getElementById("hs-anims")) {
  const s = document.createElement("style");
  s.id = "hs-anims";
  s.textContent = "@keyframes celebration-pop{0%{opacity:0;transform:scale(0.5)}50%{transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}@keyframes celebration-fade{0%{opacity:1}100%{opacity:0}}@keyframes hs-smoke{0%{opacity:0.5;transform:translateY(0) scale(1)}50%{opacity:0.3;transform:translateY(-8px) scale(1.4)}100%{opacity:0;transform:translateY(-18px) scale(0.6)}}";
  document.head.appendChild(s);
}

const K_LIGHT = { bg:"#F4F1EC", surface:"#FEFDFB", border:"#DDD7CC", text:"#1A1A1A", textMuted:"#6B6560", accent:"#2D5A3D", accentLight:"#E6EFE9", warm:"#8B7355", danger:"#BF3636", warning:"#C49520", radius:12 };
const K_DARK = { bg:"#1A1D21", surface:"#252A30", border:"#3A3F47", text:"#E4E2DE", textMuted:"#9A9590", accent:"#5CB270", accentLight:"#253D2C", warm:"#D4A530", danger:"#E74C3C", warning:"#F0B429", radius:12 };
const sf = "'DM Sans', system-ui, -apple-system, sans-serif";
const K = K_LIGHT; // default fallback for sub-components outside App
const makeStyles = (K, sf, darkMode) => ({
  app:{fontFamily:"'Newsreader',Georgia,serif",background:K.bg,minHeight:"100vh",minHeight:"100dvh",color:K.text,position:"relative",letterSpacing:"-0.01em",WebkitTapHighlightColor:"transparent",overflowX:"hidden"},
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
  header:{background:darkMode?"linear-gradient(135deg, #1E3F2B 0%, #0F2318 100%)":"linear-gradient(135deg, #2D5A3D 0%, #1E3F2B 100%)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(0,0,0,0.12)",WebkitBackdropFilter:"blur(8px)"},
  headerInner:{maxWidth:720,margin:"0 auto",padding:"12px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8},
  logoRow:{display:"flex",gap:10,alignItems:"center",cursor:"pointer",minWidth:0},logoIcon:{fontSize:22,color:"#fff",fontWeight:300,opacity:0.9},
  logoTitle:{margin:0,fontSize:20,fontWeight:700,color:"#fff",letterSpacing:"0.5px",fontFamily:"'Newsreader',Georgia,serif",textTransform:"capitalize"},
  logoSub:{margin:0,fontSize:10,color:"rgba(255,255,255,0.6)",letterSpacing:"2.5px",textTransform:"uppercase",fontFamily:sf,fontWeight:500},
  addBtn:{background:"rgba(255,255,255,0.18)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:sf,fontWeight:600,minHeight:40,whiteSpace:"nowrap"},
  backBtn:{background:"rgba(255,255,255,0.18)",color:"#fff",border:"1px solid rgba(255,255,255,0.3)",borderRadius:8,padding:"8px 14px",fontSize:13,cursor:"pointer",fontFamily:sf,minHeight:40},
  homePickerBtn:{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"6px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,whiteSpace:"nowrap"},
  homeDropdown:{position:"fixed",top:60,right:16,background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,boxShadow:"0 8px 24px rgba(0,0,0,0.15)",zIndex:150,minWidth:200,padding:6,display:"flex",flexDirection:"column",gap:2},
  homeDropItem:{background:"transparent",border:"none",padding:"10px 14px",fontSize:14,textAlign:"left",cursor:"pointer",borderRadius:6,fontFamily:sf,color:K.text},
  homeDropItemActive:{background:K.accentLight,border:"none",padding:"10px 14px",fontSize:14,textAlign:"left",cursor:"pointer",borderRadius:6,fontFamily:sf,color:K.accent,fontWeight:600},
  homeBanner:{display:"flex",alignItems:"center",gap:8,fontSize:15,marginBottom:16,fontFamily:sf},
  main:{maxWidth:720,margin:"0 auto",padding:"0 16px calc(80px + env(safe-area-inset-bottom, 0px))"},content:{paddingTop:20},
  statsRow:{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"},
  statCard:{flex:"1 1 70px",minWidth:70,background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:"14px 8px",textAlign:"center"},
  statNum:{fontSize:24,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text},
  statLabel:{fontSize:11,color:K.textMuted,textTransform:"uppercase",letterSpacing:"1px",marginTop:2,fontFamily:sf},
  section:{marginBottom:24},sectionTitle:{fontSize:15,fontWeight:700,marginBottom:10,fontFamily:sf,color:K.text},
  sectionHint:{fontSize:13,color:K.textMuted,fontFamily:sf,marginTop:-4},
  urgentList:{display:"flex",flexDirection:"column",gap:6},
  urgentCard:{display:"flex",alignItems:"center",gap:10,background:K.surface,border:`1px solid ${K.border}`,borderRadius:8,padding:"10px 14px",cursor:"pointer"},
  urgentDot:{width:8,height:8,borderRadius:"50%",flexShrink:0},urgentInfo:{flex:1,minWidth:0},
  urgentName:{fontSize:14,fontWeight:600,fontFamily:sf,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"},
  urgentSys:{fontSize:12,color:K.textMuted,fontFamily:sf},
  urgentBadge:{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,whiteSpace:"nowrap",fontFamily:sf},
  filterRow:{display:"flex",gap:6,marginBottom:16,flexWrap:"nowrap",overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:4,msOverflowStyle:"none",scrollbarWidth:"none"},
  filterBtn:{background:"transparent",border:`1px solid ${K.border}`,borderRadius:20,padding:"8px 14px",fontSize:12,cursor:"pointer",color:K.textMuted,fontFamily:sf,whiteSpace:"nowrap",flexShrink:0,minHeight:36},
  filterActive:{background:K.accent,border:`1px solid ${K.accent}`,borderRadius:20,padding:"8px 14px",fontSize:12,cursor:"pointer",color:"#fff",fontWeight:600,fontFamily:sf,whiteSpace:"nowrap",flexShrink:0,minHeight:36},
  grid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10},
  sysCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:16,cursor:"pointer",transition:"transform 0.15s, box-shadow 0.15s"},
  sysCardHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},sysIcon:{fontSize:26},
  sysCat:{fontSize:10,textTransform:"uppercase",letterSpacing:"1px",color:K.textMuted,fontFamily:sf},
  sysName:{margin:"0 0 8px",fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  sysMeta:{display:"flex",flexWrap:"wrap",gap:8,fontSize:12,color:K.textMuted,fontFamily:sf},
  sysOverdue:{color:K.danger,fontWeight:600},sysUpcoming:{color:K.warning,fontWeight:600},sysUntracked:{color:K.warm},sysGood:{color:"#2E7D32"},
  sysDetailHead:{display:"flex",gap:14,alignItems:"center",marginBottom:12},
  sysDetailTitle:{margin:0,fontSize:24,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  sysDetailCat:{fontSize:12,color:K.textMuted,textTransform:"uppercase",letterSpacing:"1px",fontFamily:sf},
  sysNotes:{background:K.accentLight,border:`1px solid ${K.accent}33`,borderRadius:8,padding:"10px 14px",fontSize:13,color:K.accent,marginBottom:16,fontFamily:sf,lineHeight:1.5},
  sysCostSummary:{display:"flex",justifyContent:"space-between",alignItems:"center",background:darkMode?"#2D2B20":"#FDF6E3",border:`1px solid ${K.warning}44`,borderRadius:8,padding:"10px 14px",fontSize:13,color:K.text,marginBottom:16,fontFamily:sf},
  sysActions:{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"},
  addTaskBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"10px 18px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:sf,minHeight:40},
  deleteBtn:{background:"transparent",color:K.danger,border:`1px solid ${K.danger}44`,borderRadius:8,padding:"10px 18px",fontSize:13,cursor:"pointer",fontFamily:sf,minHeight:40},
  emptyMsg:{fontSize:14,color:K.textMuted,textAlign:"center",padding:40,fontFamily:sf},
  taskList:{display:"flex",flexDirection:"column",gap:10},
  taskCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:K.radius,padding:14},
  taskTop:{display:"flex",alignItems:"center",gap:10},taskDot:{width:10,height:10,borderRadius:"50%",flexShrink:0},taskInfo:{flex:1},
  taskName:{fontSize:15,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif"},
  taskFreq:{fontSize:12,color:K.textMuted,fontFamily:sf},taskStatus:{fontSize:12,fontWeight:700,fontFamily:sf,whiteSpace:"nowrap"},
  taskNotes:{fontSize:12,color:K.textMuted,margin:"8px 0 4px 20px",lineHeight:1.4,fontFamily:sf},
  taskBottom:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10,paddingTop:8,borderTop:`1px solid ${K.border}`,flexWrap:"wrap",gap:8},
  taskLast:{fontSize:12,color:K.textMuted,fontFamily:sf},taskBtns:{display:"flex",gap:6,flexWrap:"wrap"},
  taskCompleteBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:6,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,fontFamily:sf,minHeight:36},
  taskEditBtn:{background:"transparent",color:K.textMuted,border:`1px solid ${K.border}`,borderRadius:6,padding:"7px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,minHeight:36},
  taskDeleteBtn:{background:"transparent",color:K.danger,border:`1px solid ${K.danger}44`,borderRadius:6,padding:"6px 10px",fontSize:16,cursor:"pointer",fontFamily:sf,lineHeight:1,minHeight:36},
  formTitle:{fontSize:22,fontFamily:"'Newsreader',Georgia,serif",marginBottom:20,fontWeight:700},formGroup:{marginBottom:16},
  label:{display:"block",fontSize:12,fontWeight:600,marginBottom:5,color:K.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",fontFamily:sf},
  input:{width:"100%",padding:"12px 14px",fontSize:16,border:`1.5px solid ${K.border}`,borderRadius:8,background:K.surface,color:K.text,fontFamily:"'Newsreader',Georgia,serif",boxSizing:"border-box",outline:"none",WebkitAppearance:"none"},
  submitBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"14px 24px",fontSize:16,cursor:"pointer",fontWeight:700,fontFamily:sf,marginTop:8,width:"100%",minHeight:48},
  overlay:{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",justifyContent:"center",alignItems:"center",zIndex:200,padding:16,backdropFilter:"blur(2px)",WebkitBackdropFilter:"blur(2px)"},
  modal:{background:K.surface,borderRadius:14,padding:24,width:"100%",maxWidth:340,textAlign:"center",maxHeight:"85vh",overflowY:"auto"},
  modalTitle:{margin:"0 0 4px",fontSize:18,fontFamily:"'Newsreader',Georgia,serif"},
  modalTask:{fontSize:14,color:K.textMuted,marginBottom:16,fontFamily:sf},modalHint:{fontSize:12,color:K.textMuted,marginBottom:14,fontFamily:sf},
  modalBtns:{display:"flex",gap:10,justifyContent:"center",marginBottom:12},
  modalBtn:{background:K.accent,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",fontSize:15,cursor:"pointer",fontWeight:600,fontFamily:sf,minHeight:44},
  modalBtnAlt:{background:"transparent",color:K.accent,border:`1.5px solid ${K.accent}`,borderRadius:8,padding:"12px 18px",fontSize:15,cursor:"pointer",fontFamily:sf,minHeight:44},
  modalCancel:{background:"transparent",border:"none",color:K.textMuted,fontSize:14,cursor:"pointer",fontFamily:sf,marginTop:8,padding:"8px",minHeight:36},
  toast:{position:"fixed",bottom:"max(24px, env(safe-area-inset-bottom, 24px))",left:"50%",transform:"translateX(-50%)",background:darkMode?"#E4E2DE":"#2C2416",color:darkMode?"#1A1D21":"#fff",padding:"12px 24px",borderRadius:10,fontSize:14,fontFamily:sf,fontWeight:600,zIndex:300,boxShadow:"0 4px 16px rgba(0,0,0,0.2)",maxWidth:"85vw",textAlign:"center"},
  listBadgeWrap:{display:"flex",flexDirection:"column",gap:4,alignItems:"flex-end"},
  listBadgeRed:{fontSize:11,fontWeight:700,color:K.danger,background:K.danger+"15",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  listBadgeYellow:{fontSize:11,fontWeight:700,color:K.warning,background:K.warning+"20",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  countdownBadge:{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:6,fontFamily:sf,whiteSpace:"nowrap"},
  taskDateRow:{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",flex:1},
  taskCountdownRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,paddingTop:8,borderTop:`1px solid ${K.border}`,flexWrap:"wrap",gap:6},
  upcomingCostRow:{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:8,padding:"6px 10px",background:darkMode?"#2D2B20":"#FDF6E3",borderRadius:6,fontSize:12,fontFamily:sf},
  upcomingCostLabel:{color:K.textMuted},upcomingCostValue:{fontWeight:700,color:K.warning},
  partsSection:{margin:"8px 0 4px 20px",padding:"10px 12px",background:darkMode?K.surface:"#FAFAF5",border:`1px solid ${K.border}`,borderRadius:8},
  partsSectionHead:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8},
  partsSectionTitle:{fontSize:12,fontWeight:700,fontFamily:sf,color:K.text},
  partsCostBadge:{fontSize:11,fontWeight:700,color:K.warning,background:K.warning+"18",padding:"2px 8px",borderRadius:6,fontFamily:sf},
  partsGroup:{marginBottom:6},partsGroupLabel:{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,color:K.textMuted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4,fontFamily:sf},
  orderDot:{width:7,height:7,borderRadius:"50%",background:K.warning},onHandDot:{width:7,height:7,borderRadius:"50%",background:"#2E7D32"},
  partRow:{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"3px 0 3px 13px",fontSize:12,fontFamily:sf},
  partName:{color:K.text},partCost:{color:K.textMuted,fontWeight:600,minWidth:50,textAlign:"right"},
  partsEditor:{background:darkMode?K.surface:"#FAFAF5",border:`1px solid ${K.border}`,borderRadius:8,padding:12},
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
  asNeededBtn:{background:"#6B7D8A22",color:"#6B7D8A",border:"1px solid #6B7D8A44",borderRadius:8,padding:"10px 18px",fontSize:14,cursor:"pointer",fontWeight:600,fontFamily:sf,minHeight:40},
  asNeededLogBtn:{background:"#6B7D8A22",color:"#6B7D8A",border:"1px solid #6B7D8A33",borderRadius:6,padding:"7px 14px",fontSize:13,cursor:"pointer",fontWeight:600,fontFamily:sf,minHeight:36},
  typeToggle:{flex:1,padding:"10px",background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:8,color:K.textMuted,fontSize:14,cursor:"pointer",textAlign:"center",fontFamily:sf},
  typeToggleActive:{flex:1,padding:"10px",background:K.accentLight,border:`1.5px solid ${K.accent}`,borderRadius:8,color:K.accent,fontSize:14,cursor:"pointer",textAlign:"center",fontWeight:600,fontFamily:sf},
  buyLink:{display:"inline-block",padding:"2px 8px",fontSize:10,fontWeight:700,color:"#fff",background:K.accent,borderRadius:4,textDecoration:"none",fontFamily:sf,whiteSpace:"nowrap"},
  seasonBtn:{padding:"6px 14px",border:`1.5px solid ${K.border}`,borderRadius:20,background:"transparent",color:K.textMuted,fontSize:12,cursor:"pointer",fontFamily:sf},
  seasonBtnActive:{padding:"6px 14px",border:`1.5px solid ${K.accent}`,borderRadius:20,background:K.accentLight,color:K.accent,fontSize:12,cursor:"pointer",fontWeight:600,fontFamily:sf},
  seasonBtnClear:{padding:"6px 14px",border:`1.5px solid ${K.border}`,borderRadius:20,background:"transparent",color:K.textMuted,fontSize:12,cursor:"pointer",fontFamily:sf},
  accountBtn:{background:"rgba(255,255,255,0.12)",color:"#fff",border:"1px solid rgba(255,255,255,0.25)",borderRadius:8,padding:"8px 12px",fontSize:13,cursor:"pointer",fontFamily:sf,whiteSpace:"nowrap",fontWeight:500,minHeight:40},
  authLink:{background:"transparent",border:"none",color:K.accent,fontSize:13,cursor:"pointer",fontFamily:sf,textDecoration:"underline",padding:0},

  // ── Landing page styles ──
  lp: {
    hero:{background:darkMode?"linear-gradient(170deg, #1A1D21 0%, #253D2C 100%)":"linear-gradient(170deg, #F4F1EC 0%, #E6EFE9 100%)",padding:"60px 20px 48px",textAlign:"center"},
    heroInner:{maxWidth:560,margin:"0 auto"},
    badge:{display:"inline-block",padding:"8px 18px",background:"rgba(45,90,61,0.06)",border:"1.5px solid rgba(45,90,61,0.12)",borderRadius:24,fontSize:13,fontWeight:600,color:K.accent,fontFamily:"'Newsreader',Georgia,serif",letterSpacing:"0.3px",marginBottom:20},
    heroTitle:{fontSize:"clamp(36px, 8vw, 52px)",fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",lineHeight:1.08,color:K.text,margin:"0 0 18px",letterSpacing:"-0.5px"},
    heroSub:{fontSize:"clamp(15px, 3.5vw, 17px)",color:K.textMuted,lineHeight:1.65,fontFamily:sf,margin:"0 auto 28px",maxWidth:440},
    heroCta:{display:"inline-block",padding:"16px 44px",background:K.accent,color:"#fff",border:"none",borderRadius:12,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:sf,boxShadow:"0 4px 20px rgba(45,90,61,0.3)",letterSpacing:"0.3px",minHeight:52,WebkitTapHighlightColor:"transparent"},
    heroNote:{fontSize:12,color:K.textMuted,marginTop:16,fontFamily:sf},
    section:{padding:"40px 20px"},
    sectionInner:{maxWidth:640,margin:"0 auto"},
    sectionTitle:{fontSize:"clamp(22px, 5vw, 28px)",fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",color:K.text,marginBottom:16,lineHeight:1.2},
    sectionText:{fontSize:"clamp(14px, 3.2vw, 16px)",color:K.textMuted,lineHeight:1.7,fontFamily:sf},
    featureGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12,marginTop:24},
    featureCard:{background:K.surface,border:`1.5px solid ${K.border}`,borderRadius:14,padding:"20px 18px"},
    featureIcon:{fontSize:28,display:"block",marginBottom:10},
    featureTitle:{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",marginBottom:6,color:K.text},
    featureText:{fontSize:13,color:K.textMuted,lineHeight:1.6,fontFamily:sf},
    stepsRow:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:16,marginTop:24},
    step:{textAlign:"center"},
    stepNum:{width:40,height:40,borderRadius:"50%",background:K.accent,color:"#fff",fontSize:18,fontWeight:700,display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:12,fontFamily:sf},
    stepTitle:{fontSize:16,fontWeight:700,fontFamily:"'Newsreader',Georgia,serif",marginBottom:6,color:K.text},
    stepText:{fontSize:13,color:K.textMuted,lineHeight:1.5,fontFamily:sf},
    footer:{padding:"24px",textAlign:"center",borderTop:`1px solid ${K.border}`},
    footerText:{fontSize:13,color:K.textMuted,fontFamily:sf},
  },
});
