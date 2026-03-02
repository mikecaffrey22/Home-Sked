import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "homesked-data-v2";
const ONBOARDED_KEY = "homesked-onboarded";

// ── System templates (users pick what they have) ────────────────────
const SYSTEM_TEMPLATES = [
  {
    name: "Central Air / Furnace",
    icon: "🔥",
    category: "HVAC",
    notes: "",
    tasks: [
      { name: "Replace air filter", intervalMonths: 3, notes: "Use MERV 8–11 rated filters; check monthly", parts: [{ name: "HVAC air filter", cost: 18, status: "order" }] },
      { name: "Annual professional service", intervalMonths: 12, notes: "Full tune-up: combustion test, heat exchanger inspection", parts: [{ name: "Professional HVAC service", cost: 250, status: "order" }] },
      { name: "Inspect ductwork & vents", intervalMonths: 12, notes: "Check for dust buildup, disconnected joints", parts: [] },
    ],
  },
  {
    name: "Fuel Furnace System",
    icon: "🔥",
    category: "HVAC",
    notes: "Includes fuel filter, fuel pump, and burner assembly",
    tasks: [
      { name: "Replace fuel filter", intervalMonths: 12, notes: "Replace at start of heating season", parts: [{ name: "Fuel oil filter cartridge", cost: 12, status: "order" }, { name: "Filter wrench", cost: 0, status: "on-hand" }] },
      { name: "Annual professional service", intervalMonths: 12, notes: "Full tune-up: nozzle, electrodes, combustion test", parts: [{ name: "Professional HVAC service call", cost: 250, status: "order" }] },
      { name: "Bleed fuel line / check pump", intervalMonths: 12, notes: "Ensure pump pressure is within spec", parts: [{ name: "Pressure gauge", cost: 0, status: "on-hand" }] },
      { name: "Check fuel tank level & condition", intervalMonths: 3, notes: "Inspect for rust, leaks, or water contamination", parts: [] },
    ],
  },
  {
    name: "Air Purifier",
    icon: "🌬️",
    category: "Air Quality",
    notes: "",
    tasks: [
      { name: "Replace HEPA filter", intervalMonths: 12, notes: "Use genuine replacement filters", parts: [{ name: "HEPA filter cartridge", cost: 45, status: "order" }] },
      { name: "Clean pre-filter", intervalMonths: 1, notes: "Rinse under water and air dry", parts: [] },
      { name: "Wipe exterior & sensor", intervalMonths: 3, notes: "Damp cloth; clean air quality sensor", parts: [{ name: "Microfiber cloth", cost: 0, status: "on-hand" }] },
    ],
  },
  {
    name: "Septic Tank",
    icon: "🪠",
    category: "Plumbing",
    notes: "Document tank size, type, and condition during first inspection",
    tasks: [
      { name: "Professional pump-out", intervalMonths: 36, notes: "Every 3–5 years depending on size & usage", parts: [{ name: "Professional pump service", cost: 400, status: "order" }] },
      { name: "Visual inspection", intervalMonths: 12, notes: "Check risers & lids for cracks, odors, standing water", parts: [] },
      { name: "Full professional inspection", intervalMonths: 36, notes: "Document baffles, drain field condition", parts: [{ name: "Professional inspection", cost: 250, status: "order" }] },
    ],
  },
  {
    name: "Peat Moss System",
    icon: "🌿",
    category: "Septic / Wastewater",
    notes: "Peat moss wastewater treatment system",
    tasks: [
      { name: "Inspect bed condition", intervalMonths: 6, notes: "Check for ponding, odors, uneven distribution", parts: [] },
      { name: "Professional inspection", intervalMonths: 12, notes: "Check distribution pipes, dosing pump, peat integrity", parts: [{ name: "Professional inspection", cost: 200, status: "order" }] },
      { name: "Check dosing pump & floats", intervalMonths: 6, notes: "Verify pump cycles; clean floats", parts: [{ name: "Multimeter", cost: 0, status: "on-hand" }] },
      { name: "Replace peat moss media", intervalMonths: 96, notes: "Lifespan ~8–10 years", parts: [{ name: "Peat moss media", cost: 800, status: "order" }, { name: "Professional labor", cost: 1500, status: "order" }] },
    ],
  },
  {
    name: "Electric Water Heater",
    icon: "🚿",
    category: "Plumbing",
    notes: "",
    tasks: [
      { name: "Flush tank", intervalMonths: 12, notes: "Drain sediment to maintain efficiency", parts: [{ name: "Garden hose", cost: 0, status: "on-hand" }] },
      { name: "Inspect anode rod", intervalMonths: 24, notes: "Replace if >50% corroded", parts: [{ name: "Anode rod (magnesium)", cost: 25, status: "order" }, { name: "1-1/16\" socket + breaker bar", cost: 0, status: "on-hand" }] },
      { name: "Test T&P relief valve", intervalMonths: 12, notes: "Lift lever briefly — water should flow and stop", parts: [{ name: "Bucket", cost: 0, status: "on-hand" }] },
    ],
  },
  {
    name: "Water Softener",
    icon: "💧",
    category: "Plumbing",
    notes: "",
    tasks: [
      { name: "Refill salt", intervalMonths: 2, notes: "Keep salt above water line in brine tank", parts: [{ name: "Water softener salt (40 lb)", cost: 7, status: "order" }] },
      { name: "Clean brine tank", intervalMonths: 12, notes: "Remove salt bridges; rinse tank", parts: [] },
    ],
  },
  {
    name: "EV / Tesla",
    icon: "⚡",
    category: "Vehicle",
    notes: "",
    tasks: [
      { name: "Rotate tires", intervalMonths: 6, notes: "Every 6,250 miles or 6 months", parts: [{ name: "Tire rotation service", cost: 50, status: "order" }] },
      { name: "Replace cabin air filter", intervalMonths: 24, notes: "Every 2 years; DIY from glove box", parts: [{ name: "Cabin air filter", cost: 28, status: "order" }] },
      { name: "Test brake fluid", intervalMonths: 48, notes: "Check for contamination every 4 years", parts: [{ name: "Brake fluid test strips", cost: 8, status: "order" }] },
      { name: "Lubricate brake calipers", intervalMonths: 12, notes: "Clean and lubricate annually", parts: [{ name: "Brake caliper grease", cost: 9, status: "order" }, { name: "Jack & jack stands", cost: 0, status: "on-hand" }] },
      { name: "Top off washer fluid", intervalMonths: 3, notes: "", parts: [{ name: "Washer fluid (1 gal)", cost: 4, status: "order" }] },
    ],
  },
  {
    name: "Gas / ICE Vehicle",
    icon: "🚗",
    category: "Vehicle",
    notes: "",
    tasks: [
      { name: "Oil change", intervalMonths: 4, notes: "Every 5,000–7,500 miles or per manual", parts: [{ name: "Oil change service or supplies", cost: 45, status: "order" }] },
      { name: "Rotate tires", intervalMonths: 6, notes: "Every 5,000–7,500 miles", parts: [{ name: "Tire rotation service", cost: 30, status: "order" }] },
      { name: "Replace engine air filter", intervalMonths: 12, notes: "Check every oil change", parts: [{ name: "Engine air filter", cost: 15, status: "order" }] },
      { name: "Replace cabin air filter", intervalMonths: 12, notes: "", parts: [{ name: "Cabin air filter", cost: 18, status: "order" }] },
      { name: "Brake inspection", intervalMonths: 12, notes: "Check pads, rotors, and fluid", parts: [] },
      { name: "Coolant flush", intervalMonths: 36, notes: "Per vehicle manual", parts: [{ name: "Coolant flush service", cost: 120, status: "order" }] },
    ],
  },
  {
    name: "Washer & Dryer",
    icon: "👕",
    category: "Appliances",
    notes: "",
    tasks: [
      { name: "Clean dryer vent / duct", intervalMonths: 12, notes: "Fire hazard prevention — clean full duct run", parts: [{ name: "Dryer vent brush kit", cost: 15, status: "order" }] },
      { name: "Clean washer drum & gasket", intervalMonths: 3, notes: "Run cleaning cycle; wipe door gasket", parts: [{ name: "Washing machine cleaner tabs", cost: 8, status: "order" }] },
      { name: "Check hoses for wear", intervalMonths: 12, notes: "Replace rubber hoses every 5 years", parts: [] },
    ],
  },
  {
    name: "Roof & Gutters",
    icon: "🏠",
    category: "Exterior",
    notes: "",
    tasks: [
      { name: "Clean gutters", intervalMonths: 6, notes: "Spring and fall; check downspouts", parts: [{ name: "Ladder", cost: 0, status: "on-hand" }, { name: "Gloves & scoop", cost: 0, status: "on-hand" }] },
      { name: "Inspect roof", intervalMonths: 12, notes: "Look for missing shingles, flashing issues", parts: [] },
      { name: "Professional roof inspection", intervalMonths: 36, notes: "Every 3–5 years or after major storms", parts: [{ name: "Professional inspection", cost: 200, status: "order" }] },
    ],
  },
  {
    name: "Lawn & Yard",
    icon: "🌱",
    category: "Exterior",
    notes: "",
    tasks: [
      { name: "Fertilize lawn", intervalMonths: 3, notes: "4× per year: spring, early summer, late summer, fall", parts: [{ name: "Lawn fertilizer bag", cost: 30, status: "order" }] },
      { name: "Aerate lawn", intervalMonths: 12, notes: "Fall is ideal", parts: [{ name: "Aerator rental", cost: 60, status: "order" }] },
      { name: "Sharpen mower blades", intervalMonths: 12, notes: "Start of mowing season", parts: [{ name: "Blade sharpener or service", cost: 15, status: "order" }] },
      { name: "Winterize sprinkler system", intervalMonths: 12, notes: "Before first freeze", parts: [] },
    ],
  },
];

// ── Helpers ─────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).substr(2, 9);

const getNextDue = (task) => {
  if (!task.lastCompleted) return null;
  const d = new Date(task.lastCompleted);
  d.setMonth(d.getMonth() + task.intervalMonths);
  return d;
};

const daysUntil = (date) => {
  if (!date) return null;
  return Math.ceil((date - new Date()) / (1000 * 60 * 60 * 24));
};

const formatDate = (iso) => {
  if (!iso) return "Never";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const formatInterval = (months) => {
  if (months < 1) return "< 1 month";
  if (months === 1) return "Monthly";
  if (months < 12) return `Every ${months} months`;
  if (months === 12) return "Annually";
  if (months % 12 === 0) return `Every ${months / 12} years`;
  return `Every ${months} months`;
};

const fmtCost = (n) => (n === 0 ? "—" : `$${Number(n).toFixed(2)}`);

const getStatusColor = (task) => {
  const next = getNextDue(task);
  if (!next) return "#8B7355";
  const days = daysUntil(next);
  if (days < 0) return "#C0392B";
  if (days <= 30) return "#D4A017";
  return "#2E7D32";
};

const getStatusLabel = (task) => {
  const next = getNextDue(task);
  if (!next) return "Not yet tracked";
  const days = daysUntil(next);
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  if (days <= 14) return `Due in ${days}d`;
  if (days <= 60) return `Due in ${Math.ceil(days / 7)}w`;
  return `Due ${next.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
};

const CATEGORIES = ["All", "Air Quality", "HVAC", "Plumbing", "Septic / Wastewater", "Vehicle", "Appliances", "Exterior"];

// ── Storage helpers (localStorage) ──────────────────────────────────
const loadData = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.map((s) => ({ ...s, tasks: s.tasks.map((t) => ({ ...t, parts: t.parts || [] })) }));
    }
  } catch (e) { console.error("Load failed:", e); }
  return [];
};

const saveData = (systems) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(systems)); } catch (e) { console.error("Save failed:", e); }
};

// ── Parts editor ────────────────────────────────────────────────────
const PartsEditor = ({ parts, onChange }) => {
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newStatus, setNewStatus] = useState("order");

  const add = () => {
    if (!newName.trim()) return;
    onChange([...parts, { id: genId(), name: newName.trim(), cost: Number(newCost) || 0, status: newStatus }]);
    setNewName(""); setNewCost(""); setNewStatus("order");
  };

  return (
    <div style={S.partsEditor}>
      {parts.length > 0 && (
        <div style={S.partsListEdit}>
          {parts.map((p) => (
            <div key={p.id} style={S.partRowEdit}>
              <button
                style={p.status === "on-hand" ? S.partToggleOn : S.partToggleOff}
                onClick={() => onChange(parts.map((x) => x.id === p.id ? { ...x, status: x.status === "on-hand" ? "order" : "on-hand" } : x))}
              >
                {p.status === "on-hand" ? "✓" : "🛒"}
              </button>
              <span style={S.partEditName}>{p.name}</span>
              <span style={S.partEditCost}>{fmtCost(p.cost)}</span>
              <button style={S.partRemoveBtn} onClick={() => onChange(parts.filter((x) => x.id !== p.id))}>×</button>
            </div>
          ))}
        </div>
      )}
      <div style={S.partAddRow}>
        <input style={{ ...S.partInput, flex: 2 }} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name" onKeyDown={(e) => e.key === "Enter" && add()} />
        <input style={{ ...S.partInput, flex: 0.7 }} type="number" min="0" step="0.01" value={newCost} onChange={(e) => setNewCost(e.target.value)} placeholder="$" onKeyDown={(e) => e.key === "Enter" && add()} />
        <select style={{ ...S.partInput, flex: 0.8 }} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
          <option value="order">🛒 Order</option>
          <option value="on-hand">✓ On Hand</option>
        </select>
        <button style={S.partAddBtn} onClick={add} disabled={!newName.trim()}>+</button>
      </div>
    </div>
  );
};

// ── Parts display ───────────────────────────────────────────────────
const PartsDisplay = ({ parts }) => {
  if (!parts || parts.length === 0) return null;
  const orderParts = parts.filter((p) => p.status === "order");
  const onHandParts = parts.filter((p) => p.status === "on-hand");
  const orderCost = orderParts.reduce((s, p) => s + (p.cost || 0), 0);
  return (
    <div style={S.partsSection}>
      <div style={S.partsSectionHead}>
        <span style={S.partsSectionTitle}>🧰 Parts, Tools & Materials</span>
        {orderCost > 0 && <span style={S.partsCostBadge}>${orderCost.toFixed(2)} to order</span>}
      </div>
      {orderParts.length > 0 && (
        <div style={S.partsGroup}>
          <div style={S.partsGroupLabel}><span style={S.orderDot} />Needs Ordering</div>
          {orderParts.map((p) => (
            <div key={p.id} style={S.partRow}><span style={S.partName}>{p.name}</span><span style={S.partCost}>{fmtCost(p.cost)}</span></div>
          ))}
        </div>
      )}
      {onHandParts.length > 0 && (
        <div style={S.partsGroup}>
          <div style={S.partsGroupLabel}><span style={S.onHandDot} />On Hand</div>
          {onHandParts.map((p) => (
            <div key={p.id} style={S.partRow}><span style={{ ...S.partName, color: K.textMuted }}>{p.name}</span><span style={S.partCost}>{fmtCost(p.cost)}</span></div>
          ))}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  const [systems, setSystems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [onboarded, setOnboarded] = useState(false);
  const [view, setView] = useState("dashboard");
  const [listView, setListView] = useState(null);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showCompleteModal, setShowCompleteModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [formSystem, setFormSystem] = useState({ name: "", icon: "🔧", category: "HVAC", notes: "" });
  const [formTask, setFormTask] = useState({ name: "", intervalMonths: 12, notes: "", parts: [] });

  // ── Load ──
  useEffect(() => {
    const data = loadData();
    setSystems(data);
    setOnboarded(localStorage.getItem(ONBOARDED_KEY) === "true" || data.length > 0);
    setLoaded(true);
  }, []);

  // ── Save on change ──
  useEffect(() => { if (loaded) saveData(systems); }, [systems, loaded]);

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  // ── Actions ──
  const markComplete = (systemId, taskId, date) => {
    setSystems((prev) => prev.map((s) => s.id === systemId ? { ...s, tasks: s.tasks.map((t) => t.id === taskId ? { ...t, lastCompleted: date } : t) } : s));
    setShowCompleteModal(null); showToast("Marked complete ✓");
  };

  const addSystemFromTemplate = (tpl) => {
    const sys = {
      id: genId(), name: tpl.name, icon: tpl.icon, category: tpl.category, notes: tpl.notes,
      tasks: tpl.tasks.map((t) => ({ ...t, id: genId(), lastCompleted: null, parts: (t.parts || []).map((p) => ({ ...p, id: genId() })) })),
    };
    setSystems((prev) => [...prev, sys]);
    showToast(`Added ${tpl.name}`);
  };

  const addSystem = () => {
    setSystems((prev) => [...prev, { ...formSystem, id: genId(), tasks: [] }]);
    setFormSystem({ name: "", icon: "🔧", category: "HVAC", notes: "" });
    setView("dashboard"); showToast("System added");
  };

  const deleteSystem = (id) => {
    setSystems((prev) => prev.filter((s) => s.id !== id));
    setView("dashboard"); setSelectedSystem(null); showToast("System removed");
  };

  const addTask = (systemId) => {
    const t = { ...formTask, id: genId(), lastCompleted: null, intervalMonths: Number(formTask.intervalMonths) };
    setSystems((prev) => prev.map((s) => s.id === systemId ? { ...s, tasks: [...s.tasks, t] } : s));
    setFormTask({ name: "", intervalMonths: 12, notes: "", parts: [] }); setView("system"); showToast("Task added");
  };

  const updateTask = (systemId, taskId) => {
    setSystems((prev) => prev.map((s) => s.id === systemId ? { ...s, tasks: s.tasks.map((t) => t.id === taskId ? { ...t, ...formTask, intervalMonths: Number(formTask.intervalMonths) } : t) } : s));
    setFormTask({ name: "", intervalMonths: 12, notes: "", parts: [] }); setEditingTask(null); setView("system"); showToast("Task updated");
  };

  const deleteTask = (systemId, taskId) => {
    setSystems((prev) => prev.map((s) => s.id === systemId ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) } : s)); showToast("Task removed");
  };

  const finishOnboarding = () => {
    setOnboarded(true); localStorage.setItem(ONBOARDED_KEY, "true"); setView("dashboard");
  };

  // ── Computed ──
  const allTasks = systems.flatMap((s) => s.tasks.map((t) => ({ ...t, systemId: s.id, systemName: s.name, systemIcon: s.icon })));
  const urgentTasks = allTasks.map((t) => ({ ...t, next: getNextDue(t), days: daysUntil(getNextDue(t)) })).filter((t) => t.days !== null && t.days <= 30).sort((a, b) => a.days - b.days);
  const untrackedTasks = allTasks.filter((t) => !t.lastCompleted);
  const filteredSystems = categoryFilter === "All" ? systems : systems.filter((s) => s.category === categoryFilter);
  const overdueTasks = allTasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d < 0; }).length;
  const upcomingTaskList = allTasks.map((t) => ({ ...t, next: getNextDue(t), days: daysUntil(getNextDue(t)) })).filter((t) => t.days !== null && t.days >= 0 && t.days <= 30).sort((a, b) => a.days - b.days);
  const upcomingCount = upcomingTaskList.length;
  const overdueTaskList = allTasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d < 0; }).sort((a, b) => daysUntil(getNextDue(a)) - daysUntil(getNextDue(b)));

  if (!loaded) return <div style={S.loadingWrap}><div style={S.loadingText}>Loading Home Sked…</div></div>;

  // ═══════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ═══════════════════════════════════════════════════════════════════
  if (!onboarded) {
    return (
      <div className="app-container" style={S.app}>
        <div style={S.onboard}>
          <div style={S.onboardHero}>
            <span style={{ fontSize: 56 }}>🏡</span>
            <h1 style={S.onboardTitle}>Home Sked</h1>
            <p style={S.onboardSub}>Never miss a maintenance task again. Pick the systems in your home to get started.</p>
          </div>
          <div style={S.onboardTemplates}>
            {SYSTEM_TEMPLATES.map((tpl, i) => {
              const added = systems.some((s) => s.name === tpl.name);
              return (
                <button key={i} style={added ? S.tplBtnAdded : S.tplBtn} onClick={() => !added && addSystemFromTemplate(tpl)} disabled={added}>
                  <span style={{ fontSize: 22 }}>{tpl.icon}</span>
                  <span style={S.tplName}>{tpl.name}</span>
                  <span style={S.tplMeta}>{tpl.tasks.length} tasks</span>
                  {added && <span style={S.tplCheck}>✓</span>}
                </button>
              );
            })}
          </div>
          <div style={S.onboardActions}>
            <button style={S.onboardPrimary} onClick={finishOnboarding} disabled={systems.length === 0}>
              Get Started{systems.length > 0 ? ` with ${systems.length} system${systems.length > 1 ? "s" : ""}` : ""}
            </button>
            <button style={S.onboardSecondary} onClick={finishOnboarding}>Skip — I'll add my own</button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="app-container" style={S.app}>
      <header style={S.header}>
        <div style={S.headerInner}>
          <div style={S.logoRow} onClick={() => { setView("dashboard"); setSelectedSystem(null); setListView(null); }}>
            <span style={S.logoIcon}>🏡</span>
            <div>
              <h1 style={S.logoTitle}>Home Sked</h1>
              <p style={S.logoSub}>Maintenance Tracker</p>
            </div>
          </div>
          {view === "dashboard" && <button style={S.addBtn} onClick={() => { setFormSystem({ name: "", icon: "🔧", category: "HVAC", notes: "" }); setView("add-system"); }}>+ System</button>}
          {view === "system" && <button style={S.backBtn} onClick={() => { setView("dashboard"); setSelectedSystem(null); }}>← Back</button>}
          {view === "list" && <button style={S.backBtn} onClick={() => { setView("dashboard"); setListView(null); }}>← Back</button>}
          {view === "templates" && <button style={S.backBtn} onClick={() => setView("dashboard")}>← Back</button>}
          {(view === "add-system" || view === "add-task" || view === "edit-task") && <button style={S.backBtn} onClick={() => { setView(view === "add-system" ? "dashboard" : "system"); setEditingTask(null); }}>← Cancel</button>}
        </div>
      </header>

      <main style={S.main}>
        {/* ═══ DASHBOARD ═══ */}
        {view === "dashboard" && (
          <div style={S.content}>
            <div style={S.statsRow}>
              <div style={{ ...S.statCard, cursor: "pointer" }} onClick={() => { setListView("systems"); setView("list"); }}>
                <div style={S.statNum}>{systems.length}</div>
                <div style={S.statLabel}>Systems</div>
              </div>
              <div style={{ ...S.statCard, cursor: "pointer", borderColor: upcomingCount > 0 ? K.warning : K.border }} onClick={() => { setListView("upcoming"); setView("list"); }}>
                <div style={{ ...S.statNum, color: upcomingCount > 0 ? K.warning : K.text }}>{upcomingCount}</div>
                <div style={S.statLabel}>Upcoming</div>
              </div>
              <div style={{ ...S.statCard, cursor: "pointer", borderColor: overdueTasks > 0 ? K.danger : "#2E7D32" }} onClick={() => { setListView("overdue"); setView("list"); }}>
                <div style={{ ...S.statNum, color: overdueTasks > 0 ? K.danger : "#2E7D32" }}>{overdueTasks}</div>
                <div style={S.statLabel}>Overdue</div>
              </div>
            </div>

            {urgentTasks.length > 0 && (
              <section style={S.section}>
                <h2 style={S.sectionTitle}>⚠️ Upcoming & Overdue</h2>
                <div style={S.urgentList}>
                  {urgentTasks.slice(0, 6).map((t) => (
                    <div key={t.id + t.systemId} style={S.urgentCard} onClick={() => setShowCompleteModal({ systemId: t.systemId, task: t })}>
                      <div style={{ ...S.urgentDot, backgroundColor: getStatusColor(t) }} />
                      <div style={S.urgentInfo}><div style={S.urgentName}>{t.name}</div><div style={S.urgentSys}>{t.systemIcon} {t.systemName}</div></div>
                      <div style={{ ...S.urgentBadge, backgroundColor: getStatusColor(t) + "22", color: getStatusColor(t) }}>{getStatusLabel(t)}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {untrackedTasks.length > 0 && (
              <section style={S.section}>
                <h2 style={S.sectionTitle}>📋 Needs First Entry — {untrackedTasks.length} tasks</h2>
                <p style={S.sectionHint}>Tap a system below, then set each task's last completion date to start tracking.</p>
              </section>
            )}

            {systems.length > 0 && (
              <div style={S.filterRow}>
                {CATEGORIES.map((c) => (
                  <button key={c} style={categoryFilter === c ? S.filterActive : S.filterBtn} onClick={() => setCategoryFilter(c)}>{c}</button>
                ))}
              </div>
            )}

            {systems.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px" }}>
                <p style={{ ...S.sectionHint, marginBottom: 16 }}>No systems yet — add one or browse templates.</p>
                <button style={S.addTaskBtn} onClick={() => setView("templates")}>Browse Templates</button>
              </div>
            )}

            <div style={S.grid}>
              {filteredSystems.map((sys) => {
                const so = sys.tasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d < 0; }).length;
                const su = sys.tasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d >= 0 && d <= 30; }).length;
                const sn = sys.tasks.filter((t) => !t.lastCompleted).length;
                return (
                  <div key={sys.id} style={S.sysCard} onClick={() => { setSelectedSystem(sys.id); setView("system"); }}>
                    <div style={S.sysCardHead}><span style={S.sysIcon}>{sys.icon}</span><span style={S.sysCat}>{sys.category}</span></div>
                    <h3 style={S.sysName}>{sys.name}</h3>
                    <div style={S.sysMeta}>
                      <span>{sys.tasks.length} task{sys.tasks.length !== 1 ? "s" : ""}</span>
                      {so > 0 && <span style={S.sysOverdue}>● {so} overdue</span>}
                      {so === 0 && su > 0 && <span style={S.sysUpcoming}>● {su} upcoming</span>}
                      {so === 0 && su === 0 && sn > 0 && <span style={S.sysUntracked}>○ {sn} untracked</span>}
                      {so === 0 && su === 0 && sn === 0 && <span style={S.sysGood}>● All good</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {systems.length > 0 && (
              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button style={S.templateLinkBtn} onClick={() => setView("templates")}>+ Add from templates</button>
              </div>
            )}
          </div>
        )}

        {/* ═══ TEMPLATES ═══ */}
        {view === "templates" && (
          <div style={S.content}>
            <h2 style={S.formTitle}>System Templates</h2>
            <p style={{ ...S.sectionHint, marginBottom: 20 }}>Tap to add pre-built systems with common maintenance tasks.</p>
            <div style={S.taskList}>
              {SYSTEM_TEMPLATES.map((tpl, i) => {
                const added = systems.some((s) => s.name === tpl.name);
                return (
                  <button key={i} style={added ? S.tplBtnAdded : { ...S.tplBtn, width: "100%" }} onClick={() => !added && addSystemFromTemplate(tpl)} disabled={added}>
                    <span style={{ fontSize: 22 }}>{tpl.icon}</span>
                    <span style={S.tplName}>{tpl.name}</span>
                    <span style={S.tplMeta}>{tpl.tasks.length} tasks</span>
                    {added && <span style={S.tplCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ LIST VIEW ═══ */}
        {view === "list" && listView && (
          <div style={S.content}>
            {listView === "systems" && (
              <>
                <h2 style={S.formTitle}>All Systems ({systems.length})</h2>
                <div style={S.taskList}>
                  {systems.map((sys) => {
                    const so = sys.tasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d < 0; }).length;
                    const su = sys.tasks.filter((t) => { const d = daysUntil(getNextDue(t)); return d !== null && d >= 0 && d <= 30; }).length;
                    return (
                      <div key={sys.id} style={{ ...S.taskCard, cursor: "pointer" }} onClick={() => { setSelectedSystem(sys.id); setView("system"); }}>
                        <div style={S.taskTop}>
                          <span style={{ fontSize: 24, flexShrink: 0 }}>{sys.icon}</span>
                          <div style={S.taskInfo}><div style={S.taskName}>{sys.name}</div><div style={S.taskFreq}>{sys.category} · {sys.tasks.length} tasks</div></div>
                          <div style={S.listBadgeWrap}>
                            {so > 0 && <span style={S.listBadgeRed}>{so} overdue</span>}
                            {su > 0 && <span style={S.listBadgeYellow}>{su} upcoming</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {listView === "upcoming" && (
              <>
                <h2 style={{ ...S.formTitle, color: upcomingCount > 0 ? K.warning : "#2E7D32" }}>
                  {upcomingCount > 0 ? `Upcoming Tasks (${upcomingCount})` : "Nothing Due Within 30 Days ✓"}
                </h2>
                <div style={S.taskList}>
                  {upcomingCount === 0 && <p style={S.emptyMsg}>You're ahead of schedule!</p>}
                  {upcomingTaskList.map((t) => {
                    const oc = (t.parts || []).filter((p) => p.status === "order").reduce((s, p) => s + (p.cost || 0), 0);
                    return (
                      <div key={t.id + t.systemId} style={{ ...S.taskCard, borderColor: K.warning + "66" }}>
                        <div style={S.taskTop}>
                          <div style={{ ...S.taskDot, backgroundColor: K.warning }} />
                          <div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div>
                          <div style={{ ...S.urgentBadge, backgroundColor: K.warning + "22", color: K.warning }}>{t.days === 0 ? "Due today" : `${t.days}d left`}</div>
                        </div>
                        {oc > 0 && <div style={S.upcomingCostRow}><span style={S.upcomingCostLabel}>🛒 Est. order cost:</span><span style={S.upcomingCostValue}>${oc.toFixed(2)}</span></div>}
                        <PartsDisplay parts={t.parts} />
                        <div style={S.taskCountdownRow}>
                          <span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span>
                          <button style={S.taskCompleteBtn} onClick={() => setShowCompleteModal({ systemId: t.systemId, task: t })}>✓ Done</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {listView === "overdue" && (
              <>
                <h2 style={{ ...S.formTitle, color: overdueTaskList.length > 0 ? K.danger : "#2E7D32" }}>
                  {overdueTaskList.length > 0 ? `Overdue Tasks (${overdueTaskList.length})` : "No Overdue Tasks ✓"}
                </h2>
                <div style={S.taskList}>
                  {overdueTaskList.length === 0 && <p style={S.emptyMsg}>Everything on schedule!</p>}
                  {overdueTaskList.map((t) => {
                    const next = getNextDue(t); const days = daysUntil(next);
                    return (
                      <div key={t.id + t.systemId} style={{ ...S.taskCard, borderColor: K.danger + "44" }}>
                        <div style={S.taskTop}>
                          <div style={{ ...S.taskDot, backgroundColor: K.danger }} />
                          <div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{t.systemIcon} {t.systemName}</div></div>
                          <div style={{ ...S.urgentBadge, backgroundColor: K.danger + "18", color: K.danger }}>{Math.abs(days)}d overdue</div>
                        </div>
                        <div style={S.taskCountdownRow}>
                          <span style={S.taskLast}>Was due: {next.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <button style={S.taskCompleteBtn} onClick={() => setShowCompleteModal({ systemId: t.systemId, task: t })}>✓ Done</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══ SYSTEM DETAIL ═══ */}
        {view === "system" && selectedSystem && (() => {
          const sys = systems.find((s) => s.id === selectedSystem);
          if (!sys) return null;
          const sysCost = sys.tasks.reduce((s, t) => s + (t.parts || []).filter((p) => p.status === "order").reduce((s2, p) => s2 + (p.cost || 0), 0), 0);
          return (
            <div style={S.content}>
              <div style={S.sysDetailHead}><span style={{ fontSize: 40 }}>{sys.icon}</span><div><h2 style={S.sysDetailTitle}>{sys.name}</h2><span style={S.sysDetailCat}>{sys.category}</span></div></div>
              {sys.notes && <p style={S.sysNotes}>{sys.notes}</p>}
              {sysCost > 0 && <div style={S.sysCostSummary}><span>💰 Total order costs:</span><strong>${sysCost.toFixed(2)}</strong></div>}
              <div style={S.sysActions}>
                <button style={S.addTaskBtn} onClick={() => { setFormTask({ name: "", intervalMonths: 12, notes: "", parts: [] }); setView("add-task"); }}>+ Add Task</button>
                <button style={S.deleteBtn} onClick={() => { if (confirm(`Delete "${sys.name}"?`)) deleteSystem(sys.id); }}>Delete</button>
              </div>
              {sys.tasks.length === 0 && <p style={S.emptyMsg}>No tasks yet.</p>}
              <div style={S.taskList}>
                {sys.tasks.map((t) => (
                  <div key={t.id} style={S.taskCard}>
                    <div style={S.taskTop}>
                      <div style={{ ...S.taskDot, backgroundColor: getStatusColor(t) }} />
                      <div style={S.taskInfo}><div style={S.taskName}>{t.name}</div><div style={S.taskFreq}>{formatInterval(t.intervalMonths)}</div></div>
                      <div style={{ ...S.taskStatus, color: getStatusColor(t) }}>{getStatusLabel(t)}</div>
                    </div>
                    {t.notes && <p style={S.taskNotes}>{t.notes}</p>}
                    <PartsDisplay parts={t.parts} />
                    <div style={S.taskBottom}>
                      <div style={S.taskDateRow}>
                        <span style={S.taskLast}>Last done: {formatDate(t.lastCompleted)}</span>
                        {(() => {
                          const next = getNextDue(t);
                          if (!next) return <span style={{ ...S.countdownBadge, color: K.warm, backgroundColor: K.warm + "15" }}>No date set</span>;
                          const d = daysUntil(next); const c = getStatusColor(t);
                          return <span style={{ ...S.countdownBadge, color: c, backgroundColor: c + "15" }}>{d < 0 ? `${Math.abs(d)}d overdue` : d === 0 ? "Due today!" : `${d}d remaining`}</span>;
                        })()}
                      </div>
                      <div style={S.taskBtns}>
                        <button style={S.taskCompleteBtn} onClick={() => setShowCompleteModal({ systemId: sys.id, task: t })}>✓ Done</button>
                        <button style={S.taskEditBtn} onClick={() => { setFormTask({ name: t.name, intervalMonths: t.intervalMonths, notes: t.notes || "", parts: t.parts || [] }); setEditingTask(t.id); setView("edit-task"); }}>Edit</button>
                        <button style={S.taskDeleteBtn} onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteTask(sys.id, t.id); }}>×</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ═══ ADD SYSTEM ═══ */}
        {view === "add-system" && (
          <div style={S.content}>
            <h2 style={S.formTitle}>Add New System</h2>
            <div style={S.formGroup}><label style={S.label}>Name</label><input style={S.input} value={formSystem.name} onChange={(e) => setFormSystem({ ...formSystem, name: e.target.value })} placeholder="e.g., Pool Pump" /></div>
            <div style={S.formGroup}><label style={S.label}>Icon (emoji)</label><input style={S.input} value={formSystem.icon} onChange={(e) => setFormSystem({ ...formSystem, icon: e.target.value })} /></div>
            <div style={S.formGroup}><label style={S.label}>Category</label>
              <select style={S.input} value={formSystem.category} onChange={(e) => setFormSystem({ ...formSystem, category: e.target.value })}>
                {CATEGORIES.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}<option value="Other">Other</option>
              </select>
            </div>
            <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{ ...S.input, minHeight: 60 }} value={formSystem.notes} onChange={(e) => setFormSystem({ ...formSystem, notes: e.target.value })} /></div>
            <button style={S.submitBtn} onClick={addSystem} disabled={!formSystem.name.trim()}>Add System</button>
          </div>
        )}

        {/* ═══ ADD / EDIT TASK ═══ */}
        {(view === "add-task" || view === "edit-task") && selectedSystem && (
          <div style={S.content}>
            <h2 style={S.formTitle}>{view === "edit-task" ? "Edit Task" : "Add Task"}</h2>
            <div style={S.formGroup}><label style={S.label}>Task Name</label><input style={S.input} value={formTask.name} onChange={(e) => setFormTask({ ...formTask, name: e.target.value })} placeholder="e.g., Replace filter" /></div>
            <div style={S.formGroup}><label style={S.label}>Interval (months)</label><input style={S.input} type="number" min="1" max="240" value={formTask.intervalMonths} onChange={(e) => setFormTask({ ...formTask, intervalMonths: e.target.value })} /></div>
            <div style={S.formGroup}><label style={S.label}>Notes</label><textarea style={{ ...S.input, minHeight: 60 }} value={formTask.notes} onChange={(e) => setFormTask({ ...formTask, notes: e.target.value })} /></div>
            <div style={S.formGroup}>
              <label style={S.label}>🧰 Parts, Tools & Materials</label>
              <p style={{ fontSize: 12, color: K.textMuted, margin: "0 0 8px", fontFamily: "system-ui, sans-serif" }}>🛒 = needs purchasing · ✓ = already on hand. Tap icon to toggle.</p>
              <PartsEditor parts={formTask.parts} onChange={(parts) => setFormTask({ ...formTask, parts })} />
            </div>
            <button style={S.submitBtn} onClick={() => view === "edit-task" ? updateTask(selectedSystem, editingTask) : addTask(selectedSystem)} disabled={!formTask.name.trim()}>
              {view === "edit-task" ? "Save Changes" : "Add Task"}
            </button>
          </div>
        )}
      </main>

      {/* ═══ COMPLETE MODAL ═══ */}
      {showCompleteModal && (() => {
        const MC = () => {
          const [pd, setPd] = useState(new Date().toISOString().split("T")[0]);
          const [sp, setSp] = useState(false);
          return (
            <div style={S.overlay} onClick={() => setShowCompleteModal(null)}>
              <div style={S.modal} onClick={(e) => e.stopPropagation()}>
                <h3 style={S.modalTitle}>Mark Complete</h3>
                <p style={S.modalTask}>{showCompleteModal.task.name}</p>
                <p style={S.modalHint}>When was this last done?</p>
                {!sp ? (
                  <div style={S.modalBtns}>
                    <button style={S.modalBtn} onClick={() => markComplete(showCompleteModal.systemId, showCompleteModal.task.id, new Date().toISOString())}>Today</button>
                    <button style={S.modalBtnAlt} onClick={() => setSp(true)}>Choose Date…</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
                    <input type="date" value={pd} onChange={(e) => setPd(e.target.value)} max={new Date().toISOString().split("T")[0]} style={{ ...S.input, width: "auto", minWidth: 180, textAlign: "center" }} />
                    <div style={S.modalBtns}>
                      <button style={S.modalBtn} onClick={() => { if (pd) markComplete(showCompleteModal.systemId, showCompleteModal.task.id, new Date(pd + "T12:00:00").toISOString()); }}>Confirm</button>
                      <button style={S.modalBtnAlt} onClick={() => setSp(false)}>Back</button>
                    </div>
                  </div>
                )}
                <button style={S.modalCancel} onClick={() => setShowCompleteModal(null)}>Cancel</button>
              </div>
            </div>
          );
        };
        return <MC />;
      })()}

      {toast && <div style={S.toast}>{toast}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════
const K = { bg: "#F5F0E8", surface: "#FFFDF7", border: "#D9CEBD", text: "#2C2416", textMuted: "#7A6E5D", accent: "#3D6B50", accentLight: "#E8F0EB", warm: "#8B7355", danger: "#C0392B", warning: "#D4A017", radius: 10 };
const sf = "system-ui, -apple-system, sans-serif";
const S = {
  app: { fontFamily: "'Newsreader', Georgia, serif", background: K.bg, minHeight: "100vh", color: K.text, position: "relative" },
  loadingWrap: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: K.bg },
  loadingText: { fontFamily: "'Newsreader', Georgia, serif", fontSize: 18, color: K.textMuted },
  // Onboarding
  onboard: { maxWidth: 520, margin: "0 auto", padding: "20px 20px 40px" },
  onboardHero: { textAlign: "center", padding: "30px 0 24px" },
  onboardTitle: { fontSize: 36, fontWeight: 700, margin: "12px 0 8px", fontFamily: "'Newsreader', Georgia, serif" },
  onboardSub: { fontSize: 15, color: K.textMuted, lineHeight: 1.5, fontFamily: sf },
  onboardTemplates: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 },
  tplBtn: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: K.surface, border: `1.5px solid ${K.border}`, borderRadius: K.radius, cursor: "pointer", textAlign: "left", fontFamily: sf, fontSize: 13, position: "relative" },
  tplBtnAdded: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: K.accentLight, border: `1.5px solid ${K.accent}`, borderRadius: K.radius, cursor: "default", textAlign: "left", fontFamily: sf, fontSize: 13, opacity: 0.7, position: "relative", width: "100%" },
  tplName: { fontWeight: 600, flex: 1 },
  tplMeta: { fontSize: 11, color: K.textMuted },
  tplCheck: { position: "absolute", top: 6, right: 8, color: K.accent, fontWeight: 700, fontSize: 14 },
  onboardActions: { display: "flex", flexDirection: "column", gap: 10, marginTop: 24 },
  onboardPrimary: { padding: "14px 24px", background: K.accent, color: "#fff", border: "none", borderRadius: K.radius, fontSize: 16, fontWeight: 700, cursor: "pointer", fontFamily: sf },
  onboardSecondary: { padding: "10px", background: "transparent", color: K.textMuted, border: "none", fontSize: 14, cursor: "pointer", fontFamily: sf },
  templateLinkBtn: { background: "transparent", border: `1.5px solid ${K.border}`, borderRadius: 20, padding: "8px 20px", fontSize: 13, color: K.textMuted, cursor: "pointer", fontFamily: sf },
  // Header
  header: { background: K.accent, position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.12)" },
  headerInner: { maxWidth: 720, margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logoRow: { display: "flex", gap: 12, alignItems: "center", cursor: "pointer" },
  logoIcon: { fontSize: 28 },
  logoTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.5px", fontFamily: "'Newsreader', Georgia, serif" },
  logoSub: { margin: 0, fontSize: 11, color: "rgba(255,255,255,0.7)", letterSpacing: "1.5px", textTransform: "uppercase", fontFamily: sf },
  addBtn: { background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontFamily: sf, fontWeight: 600 },
  backBtn: { background: "rgba(255,255,255,0.18)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 14, cursor: "pointer", fontFamily: sf },
  main: { maxWidth: 720, margin: "0 auto", padding: "0 16px 80px" },
  content: { paddingTop: 20 },
  // Stats
  statsRow: { display: "flex", gap: 10, marginBottom: 24 },
  statCard: { flex: 1, background: K.surface, border: `1.5px solid ${K.border}`, borderRadius: K.radius, padding: "16px 12px", textAlign: "center" },
  statNum: { fontSize: 26, fontWeight: 700, fontFamily: "'Newsreader', Georgia, serif", color: K.text },
  statLabel: { fontSize: 11, color: K.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginTop: 2, fontFamily: sf },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: 700, marginBottom: 10, fontFamily: sf, color: K.text },
  sectionHint: { fontSize: 13, color: K.textMuted, fontFamily: sf, marginTop: -4 },
  urgentList: { display: "flex", flexDirection: "column", gap: 6 },
  urgentCard: { display: "flex", alignItems: "center", gap: 10, background: K.surface, border: `1px solid ${K.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer" },
  urgentDot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  urgentInfo: { flex: 1, minWidth: 0 },
  urgentName: { fontSize: 14, fontWeight: 600, fontFamily: sf, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  urgentSys: { fontSize: 12, color: K.textMuted, fontFamily: sf },
  urgentBadge: { fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6, whiteSpace: "nowrap", fontFamily: sf },
  filterRow: { display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" },
  filterBtn: { background: "transparent", border: `1px solid ${K.border}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", color: K.textMuted, fontFamily: sf },
  filterActive: { background: K.accent, border: `1px solid ${K.accent}`, borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer", color: "#fff", fontWeight: 600, fontFamily: sf },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 12 },
  sysCard: { background: K.surface, border: `1.5px solid ${K.border}`, borderRadius: K.radius, padding: 16, cursor: "pointer" },
  sysCardHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sysIcon: { fontSize: 26 },
  sysCat: { fontSize: 10, textTransform: "uppercase", letterSpacing: "1px", color: K.textMuted, fontFamily: sf },
  sysName: { margin: "0 0 8px", fontSize: 16, fontWeight: 700, fontFamily: "'Newsreader', Georgia, serif" },
  sysMeta: { display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12, color: K.textMuted, fontFamily: sf },
  sysOverdue: { color: K.danger, fontWeight: 600 },
  sysUpcoming: { color: K.warning, fontWeight: 600 },
  sysUntracked: { color: K.warm },
  sysGood: { color: "#2E7D32" },
  sysDetailHead: { display: "flex", gap: 14, alignItems: "center", marginBottom: 12 },
  sysDetailTitle: { margin: 0, fontSize: 24, fontWeight: 700, fontFamily: "'Newsreader', Georgia, serif" },
  sysDetailCat: { fontSize: 12, color: K.textMuted, textTransform: "uppercase", letterSpacing: "1px", fontFamily: sf },
  sysNotes: { background: K.accentLight, border: `1px solid ${K.accent}33`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: K.accent, marginBottom: 16, fontFamily: sf, lineHeight: 1.5 },
  sysCostSummary: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FDF6E3", border: `1px solid ${K.warning}44`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: K.text, marginBottom: 16, fontFamily: sf },
  sysActions: { display: "flex", gap: 10, marginBottom: 20 },
  addTaskBtn: { background: K.accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, cursor: "pointer", fontWeight: 600, fontFamily: sf },
  deleteBtn: { background: "transparent", color: K.danger, border: `1px solid ${K.danger}44`, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: sf },
  emptyMsg: { fontSize: 14, color: K.textMuted, textAlign: "center", padding: 40, fontFamily: sf },
  taskList: { display: "flex", flexDirection: "column", gap: 10 },
  taskCard: { background: K.surface, border: `1.5px solid ${K.border}`, borderRadius: K.radius, padding: 14 },
  taskTop: { display: "flex", alignItems: "center", gap: 10 },
  taskDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  taskInfo: { flex: 1 },
  taskName: { fontSize: 15, fontWeight: 700, fontFamily: "'Newsreader', Georgia, serif" },
  taskFreq: { fontSize: 12, color: K.textMuted, fontFamily: sf },
  taskStatus: { fontSize: 12, fontWeight: 700, fontFamily: sf, whiteSpace: "nowrap" },
  taskNotes: { fontSize: 12, color: K.textMuted, margin: "8px 0 4px 20px", lineHeight: 1.4, fontFamily: sf },
  taskBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, paddingTop: 8, borderTop: `1px solid ${K.border}`, flexWrap: "wrap", gap: 6 },
  taskLast: { fontSize: 12, color: K.textMuted, fontFamily: sf },
  taskBtns: { display: "flex", gap: 6 },
  taskCompleteBtn: { background: K.accent, color: "#fff", border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: sf },
  taskEditBtn: { background: "transparent", color: K.textMuted, border: `1px solid ${K.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontFamily: sf },
  taskDeleteBtn: { background: "transparent", color: K.danger, border: `1px solid ${K.danger}44`, borderRadius: 6, padding: "4px 10px", fontSize: 16, cursor: "pointer", fontFamily: sf, lineHeight: 1 },
  formTitle: { fontSize: 22, fontFamily: "'Newsreader', Georgia, serif", marginBottom: 20, fontWeight: 700 },
  formGroup: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, marginBottom: 5, color: K.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", fontFamily: sf },
  input: { width: "100%", padding: "10px 12px", fontSize: 16, border: `1.5px solid ${K.border}`, borderRadius: 8, background: K.surface, color: K.text, fontFamily: "'Newsreader', Georgia, serif", boxSizing: "border-box", outline: "none" },
  submitBtn: { background: K.accent, color: "#fff", border: "none", borderRadius: 8, padding: "12px 24px", fontSize: 15, cursor: "pointer", fontWeight: 700, fontFamily: sf, marginTop: 8, width: "100%" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 200 },
  modal: { background: K.surface, borderRadius: 14, padding: 28, width: "90%", maxWidth: 340, textAlign: "center" },
  modalTitle: { margin: "0 0 4px", fontSize: 18, fontFamily: "'Newsreader', Georgia, serif" },
  modalTask: { fontSize: 14, color: K.textMuted, marginBottom: 16, fontFamily: sf },
  modalHint: { fontSize: 12, color: K.textMuted, marginBottom: 14, fontFamily: sf },
  modalBtns: { display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 },
  modalBtn: { background: K.accent, color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 14, cursor: "pointer", fontWeight: 600, fontFamily: sf },
  modalBtnAlt: { background: "transparent", color: K.accent, border: `1.5px solid ${K.accent}`, borderRadius: 8, padding: "10px 18px", fontSize: 14, cursor: "pointer", fontFamily: sf },
  modalCancel: { background: "transparent", border: "none", color: K.textMuted, fontSize: 13, cursor: "pointer", fontFamily: sf, marginTop: 4 },
  toast: { position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "#2C2416", color: "#fff", padding: "10px 24px", borderRadius: 10, fontSize: 14, fontFamily: sf, fontWeight: 600, zIndex: 300, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" },
  // List
  listBadgeWrap: { display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" },
  listBadgeRed: { fontSize: 11, fontWeight: 700, color: K.danger, background: K.danger + "15", padding: "2px 8px", borderRadius: 6, fontFamily: sf },
  listBadgeYellow: { fontSize: 11, fontWeight: 700, color: K.warning, background: K.warning + "20", padding: "2px 8px", borderRadius: 6, fontFamily: sf },
  countdownBadge: { fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 6, fontFamily: sf, whiteSpace: "nowrap" },
  taskDateRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 },
  taskCountdownRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${K.border}`, flexWrap: "wrap", gap: 6 },
  upcomingCostRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8, padding: "6px 10px", background: "#FDF6E3", borderRadius: 6, fontSize: 12, fontFamily: sf },
  upcomingCostLabel: { color: K.textMuted },
  upcomingCostValue: { fontWeight: 700, color: K.warning },
  // Parts
  partsSection: { margin: "8px 0 4px 20px", padding: "10px 12px", background: "#FAFAF5", border: `1px solid ${K.border}`, borderRadius: 8 },
  partsSectionHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  partsSectionTitle: { fontSize: 12, fontWeight: 700, fontFamily: sf, color: K.text },
  partsCostBadge: { fontSize: 11, fontWeight: 700, color: K.warning, background: K.warning + "18", padding: "2px 8px", borderRadius: 6, fontFamily: sf },
  partsGroup: { marginBottom: 6 },
  partsGroupLabel: { display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 600, color: K.textMuted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4, fontFamily: sf },
  orderDot: { width: 7, height: 7, borderRadius: "50%", background: K.warning },
  onHandDot: { width: 7, height: 7, borderRadius: "50%", background: "#2E7D32" },
  partRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0 3px 13px", fontSize: 12, fontFamily: sf },
  partName: { color: K.text },
  partCost: { color: K.textMuted, fontWeight: 600, minWidth: 50, textAlign: "right" },
  partsEditor: { background: "#FAFAF5", border: `1px solid ${K.border}`, borderRadius: 8, padding: 12 },
  partsListEdit: { marginBottom: 10, display: "flex", flexDirection: "column", gap: 4 },
  partRowEdit: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontFamily: sf },
  partToggleOn: { width: 32, height: 32, borderRadius: 6, border: "1.5px solid #2E7D32", background: "#2E7D3218", color: "#2E7D32", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  partToggleOff: { width: 32, height: 32, borderRadius: 6, border: `1.5px solid ${K.warning}`, background: K.warning + "18", color: K.warning, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  partEditName: { flex: 1, color: K.text },
  partEditCost: { minWidth: 50, textAlign: "right", color: K.textMuted, fontWeight: 600 },
  partRemoveBtn: { background: "transparent", border: "none", color: K.danger, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1 },
  partAddRow: { display: "flex", gap: 6, alignItems: "center" },
  partInput: { padding: "8px", fontSize: 14, border: `1.5px solid ${K.border}`, borderRadius: 6, background: K.surface, color: K.text, fontFamily: sf, boxSizing: "border-box", outline: "none" },
  partAddBtn: { width: 36, height: 36, borderRadius: 6, border: "none", background: K.accent, color: "#fff", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};
