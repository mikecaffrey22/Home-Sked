import React from 'react';
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { useLunch } from '../hooks/useLunch';
import { ROLES, can, DARK, LIGHT, sf, mono, EQUIPMENT_TEMPLATES } from '../lib/constants';
import { daysUntil } from '../lib/helpers';
import { supabase } from '../lib/supabase';
import Dashboard from '../components/Dashboard';
import Equipment from '../components/Equipment';
import Calendar from '../components/Calendar';
import Stock from '../components/Stock';
import Analytics from '../components/Analytics';
import AuditTrail from '../components/AuditTrail';
import SiteReport from '../components/SiteReport';
import NotificationPanel from '../components/NotificationPanel';
import GuidedDemo from '../components/GuidedDemo';
import UserManagement from '../components/UserManagement';
import WorkOrderModal from '../components/WorkOrderModal';
import AssignModal from '../components/AssignModal';
import AddEquipmentModal from '../components/AddEquipmentModal';
import AddSiteModal from '../components/AddSiteModal';
import AddPMModal from '../components/AddPMModal';
import { QRLabel, QRScanner } from '../components/QRFeatures';
import SeasonalTasks from '../components/SeasonalTasks';
import LunchInit from '../components/lunch/LunchInit';
import LunchBanner from '../components/lunch/LunchBanner';
import LunchOrderModal from '../components/lunch/LunchOrderModal';
import LunchDash from '../components/lunch/LunchDash';

export default function App() {
  const { user, logout } = useAuth();
  const data = useData(user);
  const { sites, employees, stock, auditLog } = data;

  const [view, setView] = useState('dashboard');
  const [activeSiteId, setActiveSiteId] = useState('all');
  const [darkMode, setDarkMode] = useState(() => { try { return localStorage.getItem('plantlink-theme') !== 'light'; } catch { return true; } });
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedEqId, setSelectedEqId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showDemo, setShowDemo] = useState(false);
  const [woModal, setWoModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null);
  const [showAddEquip, setShowAddEquip] = useState(false);
  const [showAddSite, setShowAddSite] = useState(false);
  const [addPMTarget, setAddPMTarget] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [loadingJoke, setLoadingJoke] = useState('');
  const [showLunchInit, setShowLunchInit] = useState(false);
  const [showLunchOrder, setShowLunchOrder] = useState(false);
  const [qrEquipment, setQrEquipment] = useState(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [resetting, setResetting] = useState(false);

  // L3 can only see their site
  useEffect(() => {
    if (user?.role === 'L3' && user?.site_id) setActiveSiteId(user.site_id);
  }, [user]);


  const lunchSiteId = activeSiteId === 'all' ? (user?.site_id || sites[0]?.id) : activeSiteId;
  const { lunch, startLunch, submitOrder, endLunch } = useLunch(user, lunchSiteId);

  const C = darkMode ? DARK : LIGHT;
  useEffect(() => { try { localStorage.setItem('plantlink-theme', darkMode ? 'dark' : 'light'); } catch {} }, [darkMode]);
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const activeSite = sites.find(s => s.id === activeSiteId) || sites[0];
  const handleStartLunch = async (r) => { const res = await startLunch(r, activeSite?.name || ''); if (res) { setShowLunchInit(false); showToast('Lunch order sent!'); } };
  const handlePlaceLunchOrder = async (t) => { if (await submitOrder(t)) { setShowLunchOrder(false); showToast('Order placed!'); } };
  const handleEndLunch = async () => { if (await endLunch()) { setView('dashboard'); showToast('Lunch orders closed'); } };

  const activeSites = activeSiteId === 'all' ? sites : sites.filter(s => s.id === activeSiteId);
  const allSiteIds = sites.map(s => s.id);
  const equipment = activeSites.flatMap(s => (s.equipment || []).map(e => ({ ...e, siteName: s.name, siteIcon: s.icon, siteId: s.id })));

  // Handle QR scan URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const scanId = params.get('scan');
    if (scanId && equipment.length > 0) {
      const found = equipment.find(e => e.id === scanId || e.id.startsWith(scanId));
      if (found) { setSelectedEqId(found.id); setView('equipment'); }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [equipment]);
  const allTasks = equipment.flatMap(eq => (eq.tasks || []).map(t => ({ ...t, eqName: eq.name, eqIcon: eq.icon || '⚙️', siteName: eq.siteName, siteId: eq.siteId, equipmentId: eq.id })));
  const overdueTasks = allTasks.filter(t => t.due_date && daysUntil(t.due_date) < 0);
  const dueSoonTasks = allTasks.filter(t => { const d = daysUntil(t.due_date); return d >= 0 && d <= 7; });
  const lowStock = stock.filter(s => s.qty <= s.min_qty);
  const notifCount = overdueTasks.length + dueSoonTasks.length + lowStock.length;
  const roleInfo = ROLES[user?.role] || {};

  const handleSelectTask = (task) => { if (task.equipmentId) { setSelectedEqId(task.equipmentId); setSelectedTaskId(task.id); setView('equipment'); } };
  const handleSelectSite = (siteId) => { setActiveSiteId(siteId); setSelectedEqId(null); setSelectedTaskId(null); };
  const handleAssign = async (taskId, employeeId, scheduledDate) => {
    try {
      const update = { assigned_to: employeeId };
      if (scheduledDate) update.due_date = scheduledDate;
      await supabase.from('tasks').update(update).eq('id', taskId);
      data.refetch(); setAssignModal(null);
      showToast(employeeId ? 'Task assigned' : 'Assignment removed');
    } catch (err) { console.error(err); }
  };

  // Get all equipment IDs across all sites (for deletion)
  const getAllEquipIds = async () => {
    const ids = [];
    for (const sid of allSiteIds) {
      const { data: eqs } = await supabase.from('equipment').select('id').eq('site_id', sid);
      if (eqs) ids.push(...eqs.map(e => e.id));
    }
    return ids;
  };

  // FRESH START — delete by site_id, NOT org_id
  const handleFreshStart = async () => {
    setResetting(true);
    try {
      const eqIds = await getAllEquipIds();
      console.log('Deleting', eqIds.length, 'equipment...');
      
      // Delete work_logs by equipment_id
      for (const eid of eqIds) {
        await supabase.from('work_logs').delete().eq('equipment_id', eid);
      }
      // Delete tasks by equipment_id
      for (const eid of eqIds) {
        await supabase.from('tasks').delete().eq('equipment_id', eid);
      }
      // Delete equipment by site_id
      for (const sid of allSiteIds) {
        await supabase.from('equipment').delete().eq('site_id', sid);
      }
      // Delete audit_log
      for (const sid of allSiteIds) {
        await supabase.from('audit_log').delete().eq('site_id', sid);
      }
      
      await new Promise(r => setTimeout(r, 1000));
      
      // Verify
      const { data: check } = await supabase.from('equipment').select('id').in('site_id', allSiteIds).limit(1);
      if (check && check.length > 0) {
        showToast('Database blocked the delete. Run FIX_DATABASE.sql in Supabase!');
      } else {
        await data.refetch();
        setShowConfirm(null);
        setView('dashboard');
        showToast('Fresh start! All data cleared.');
      }
    } catch (err) {
      console.error('Fresh start error:', err);
      showToast('Error — check browser console. Run FIX_DATABASE.sql in Supabase.');
    }
    setResetting(false);
  };

  // RESTORE DEMO — rich seed using site_id only
  const handleRestoreDemo = async () => {
    setResetting(true);
    try {
      // Clean first (same as fresh start)
      const eqIds = await getAllEquipIds();
      for (const eid of eqIds) {
        await supabase.from('work_logs').delete().eq('equipment_id', eid);
        await supabase.from('tasks').delete().eq('equipment_id', eid);
      }
      for (const sid of allSiteIds) {
        await supabase.from('equipment').delete().eq('site_id', sid);
        await supabase.from('audit_log').delete().eq('site_id', sid);
      }
      
      await new Promise(r => setTimeout(r, 500));
      
      // Verify clean
      const { data: check } = await supabase.from('equipment').select('id').in('site_id', allSiteIds).limit(1);
      if (check && check.length > 0) {
        showToast('Cannot clear data. Run FIX_DATABASE.sql first!');
        setResetting(false); return;
      }

      // Get employees for assigning
      const { data: empList } = await supabase.from('users').select('id,name,role,site_id').limit(30);
      const allEmps = empList || [];
      const notes = ['All readings within spec','Replaced worn gaskets and seals','Minor vibration increase noted, monitoring','System operating normally','Cleaned, light corrosion treated','Calibrated to OEM specs','Oil changed, sample sent to lab','Filters replaced, DP back to baseline','Retorqued flange connections','Safety interlocks verified','Minor valve packing leak, tightened gland','Bearing temps normal, vib 0.08 IPS','Full functional test passed','Replaced drifting sensor','Lubricated pivot points','Borescope clean, no FOD','Thermography scan clear','Chemistry within limits, adjusted pH','Strainer basket cleaned','Annual inspection, good condition','Belt replaced, tension set to spec','Megger test passed all windings'];

      for (let si = 0; si < sites.length; si++) {
        const site = sites[si];
        const tplCount = si === 0 ? Math.min(EQUIPMENT_TEMPLATES.length, 12) : si === 1 ? Math.min(EQUIPMENT_TEMPLATES.length, 9) : Math.min(EQUIPMENT_TEMPLATES.length, 7);
        const siteEmps = allEmps.filter(e => e.site_id === site.id || !e.site_id);
        const techs = siteEmps.filter(e => e.role === 'L3' || e.role === 'L2');

        for (let ti = 0; ti < tplCount; ti++) {
          const tpl = EQUIPMENT_TEMPLATES[ti];
          const { data: eq, error } = await supabase.from('equipment').insert({
            site_id: site.id, name: tpl.name, icon: tpl.icon,
            category: tpl.category, notes: tpl.notes, active: true,
          }).select().single();
          if (error || !eq) { console.warn('Skip', tpl.name, error?.message); continue; }

          for (const t of tpl.tasks) {
            const due = new Date();
            due.setMonth(due.getMonth() + (t.interval_months || 12));
            const rnd = Math.random();
            if (rnd < 0.35) due.setMonth(due.getMonth() - (t.interval_months || 12) - Math.floor(Math.random() * 8));
            else if (rnd < 0.55) due.setDate(due.getDate() + Math.floor(Math.random() * 14) + 1);

            const asgn = Math.random() < 0.7 && techs.length > 0 ? techs[Math.floor(Math.random() * techs.length)] : null;

            const { data: tk } = await supabase.from('tasks').insert({
              equipment_id: eq.id, name: t.name,
              interval_months: t.interval_months, task_type: 'scheduled',
              notes: t.notes || '', seasons: t.seasons || [],
              due_date: due.toISOString().split('T')[0],
              assigned_to: asgn?.id || null,
            }).select().single();

            // Create 3-8 past work logs
            if (tk && Math.random() < 0.85) {
              const lc = 3 + Math.floor(Math.random() * 6);
              for (let li = 0; li < lc; li++) {
                const ld = new Date();
                ld.setMonth(ld.getMonth() - (li + 1) * Math.ceil((t.interval_months || 3) * 0.9));
                ld.setDate(ld.getDate() + Math.floor(Math.random() * 20) - 5);
                const hrs = Math.round((0.5 + Math.random() * 8) * 4) / 4;
                const labC = Math.round(hrs * 6000);
                const prtC = Math.random() < 0.5 ? Math.round((200 + Math.random() * 40000) * 100) : 0;
                const tc = techs.length > 0 ? techs[Math.floor(Math.random() * techs.length)] : { id: user.id, name: user.name };
                const wo = 'WO-' + ld.getFullYear() + '-' + String(Math.floor(Math.random() * 9000) + 1000);

                await supabase.from('work_logs').insert({
                  task_id: tk.id, equipment_id: eq.id, site_id: site.id,
                  org_id: site.org_id,
                  wo_number: wo, completed_by: tc.id, completed_by_name: tc.name,
                  completed_at: ld.toISOString().split('T')[0],
                  hours: hrs, notes: notes[Math.floor(Math.random() * notes.length)],
                  parts_used: [], photos: [],
                  labor_cost_cents: labC, parts_cost_cents: prtC, total_cost_cents: labC + prtC,
                });
              }
            }
          }
        }
      }

      await new Promise(r => setTimeout(r, 800));
      await data.refetch();
      setShowConfirm(null); setView('dashboard');
      showToast('Demo restored with rich history!');
    } catch (err) {
      console.error('Restore error:', err);
      showToast('Error: ' + (err.message || 'check console'));
    }
    setResetting(false);
  };

  const navTo = (v) => { setView(v); setShowMenu(false); setSelectedEqId(null); setSelectedTaskId(null); };

  const navItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'equipment', icon: '⚙️', label: 'Equipment' },
    { key: 'stock', icon: '📦', label: 'Warehouse & Stock' },
    { key: 'calendar', icon: '📅', label: 'PM Calendar' },
    { key: 'seasonal', icon: '🍂', label: 'Seasonal Tasks' },
    ...(can(user, 'view-analytics') ? [{ key: 'analytics', icon: '📈', label: 'Analytics' }] : []),
    ...(can(user, 'export-reports') ? [{ key: 'report', icon: '📄', label: 'Site Report' }] : []),
    ...(can(user, 'view-audit') ? [{ key: 'audit', icon: '📋', label: 'Audit Trail' }] : []),
  ];

  // L3 plant name
  const l3SiteName = user?.role === 'L3' ? sites.find(s => s.id === user.site_id) : null;

  return (
    <div style={{ fontFamily: sf, background: C.bg, minHeight: '100vh', color: C.text }}>
      {/* HEADER */}
      <header style={{ position: 'sticky', top: 0, zIndex: 100, background: C.surface, borderBottom: '1px solid ' + C.border }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.3px', cursor: 'pointer', color: C.accent }} onClick={() => navTo('dashboard')}>⚙️ PlantLink</div>
            {user?.role !== 'L3' ? (
              <select value={activeSiteId} onChange={e => { handleSelectSite(e.target.value); setView('dashboard'); }} style={{ background: C.bg, color: C.text, border: '1px solid ' + C.border, borderRadius: 6, padding: '4px 8px', fontSize: 12, fontFamily: 'inherit', cursor: 'pointer', outline: 'none' }}>
                {can(user, 'view-all-sites') && <option value="all">All Sites</option>}
                {sites.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 600, color: C.muted, padding: '4px 10px', background: C.bg, border: '1px solid ' + C.border, borderRadius: 6 }}>
                {l3SiteName ? (l3SiteName.icon + ' ' + l3SiteName.name) : 'My Site'}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(user?.role === 'L1' || user?.role === 'L2') && <button onClick={() => lunch && lunch.active ? setView('lunch-dash') : setShowLunchInit(true)} style={{ background: '#F59E0B15', color: '#F59E0B', border: '1px solid #F59E0B33', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, minHeight: 32, fontFamily: 'inherit' }}>🍔 {lunch && lunch.active ? 'Orders' : 'Lunch'}</button>}
            <button onClick={() => setShowQRScanner(true)} style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }} title="Scan QR">📷</button>
            <button onClick={() => setDarkMode(!darkMode)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, padding: 4 }}>{darkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => setShowNotifs(!showNotifs)} style={{ position: 'relative', background: 'transparent', border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 14 }}>
              🔔{notifCount > 0 && <span style={{ position: 'absolute', top: -5, right: -5, background: '#EF4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px', minWidth: 16, textAlign: 'center' }}>{notifCount}</span>}
            </button>
            <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'transparent', border: '1px solid ' + C.border, borderRadius: 8, padding: '4px 8px', cursor: 'pointer', fontSize: 14, color: C.text }}>☰</button>
          </div>
        </div>
        <div style={{ background: C.bg, borderTop: '1px solid ' + C.border, padding: '6px 16px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</span>
            <span style={{ fontSize: 10, color: C.muted }}>· {user?.job_title}</span>
          </div>
        </div>
      </header>

      {/* NOTIFICATIONS */}
      {showNotifs && <NotificationPanel overdue={overdueTasks} dueSoon={dueSoonTasks} lowStock={lowStock} C={C} onClose={() => setShowNotifs(false)} onSelectTask={handleSelectTask} onGoStock={() => { setShowNotifs(false); setView('stock'); }} />}

      {/* MENU */}
      {showMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={() => setShowMenu(false)}>
          <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', top: 56, right: 16, background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 220, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid ' + C.border }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: roleInfo.color }}>{roleInfo.icon} {user?.job_title}</div>
            </div>
            {navItems.map(item => <button key={item.key} onClick={() => navTo(item.key)} style={{ background: view === item.key ? C.accent + '20' : 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: C.text, borderRadius: 6, fontFamily: 'inherit' }}>{item.icon} {item.label}</button>)}
            {(user?.role === 'L1' || user?.role === 'L2') && <button onClick={() => { setShowMenu(false); lunch && lunch.active ? setView('lunch-dash') : setShowLunchInit(true); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#F59E0B', borderRadius: 6, fontFamily: 'inherit' }}>🍔 {lunch && lunch.active ? 'Lunch Orders' : 'Order Lunch'}</button>}
            {can(user, 'manage-equipment') && <button onClick={() => { setShowMenu(false); setShowAddEquip(true); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: C.ok, borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>+ Add Equipment</button>}
            {can(user, 'manage-sites') && <button onClick={() => { setShowMenu(false); setShowAddSite(true); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#3B82F6', borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>+ Add Site</button>}
            <div style={{ borderTop: '1px solid ' + C.border, marginTop: 4, paddingTop: 4 }}>
              {can(user, 'manage-users') && <button onClick={() => navTo('users')} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: C.text, borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>👥 Manage Employees</button>}
              <button onClick={() => { setShowMenu(false); setShowDemo(true); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: C.accent, borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>🎓 Guided Demo</button>
              <button onClick={() => { setShowMenu(false); setShowConfirm('restore'); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#3B82F6', borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>🔄 Restore Demo Data</button>
              <button onClick={() => { setShowMenu(false); setShowConfirm('fresh'); }} style={{ background: 'transparent', border: 'none', padding: '10px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#EF4444', borderRadius: 6, fontFamily: 'inherit', width: '100%' }}>🗑️ Fresh Start</button>
              <button onClick={logout} style={{ background: 'transparent', border: 'none', padding: '10px 12px', cursor: 'pointer', fontSize: 13, color: '#EF4444', fontFamily: 'inherit', width: '100%', textAlign: 'left', borderRadius: 6 }}>🚪 Sign Out</button>
            </div>
            <div style={{ fontSize: 9, color: C.muted, textAlign: 'center', padding: '8px 0 4px', fontFamily: mono, borderTop: '1px solid ' + C.border, marginTop: 4 }}>PlantLink v2.5</div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 80px' }}>
        {data.loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: C.muted }}><div style={{ fontSize: 32, marginBottom: 8 }}>⚙️</div><div>Loading plant data...</div></div>
        ) : (
          <>
            {view === 'dashboard' && (
              <>
                <LunchBanner lunch={lunch} currentUser={user} onOrder={() => setShowLunchOrder(true)} onManage={() => setView('lunch-dash')} C={C} />
                <Dashboard C={C} user={user} sites={activeSites} equipment={equipment} allTasks={allTasks} stock={stock} setView={setView} onSelectEq={(id) => { setSelectedEqId(id); setSelectedTaskId(null); }} onSelectTask={handleSelectTask} onOpenWO={setWoModal} onSelectSite={handleSelectSite} />
              </>
            )}
            {view === 'equipment' && <Equipment C={C} user={user} equipment={equipment} employees={employees} data={data} showToast={showToast} selectedEqId={selectedEqId} setSelectedEqId={(id) => { setSelectedEqId(id); setSelectedTaskId(null); }} selectedTaskId={selectedTaskId} setSelectedTaskId={setSelectedTaskId} onOpenWO={setWoModal} onAssign={t => setAssignModal(t)} onAddPM={eq => setAddPMTarget(eq)} onShowQR={eq => setQrEquipment(eq)} />}
            {view === 'stock' && <Stock C={C} user={user} stock={stock} data={data} showToast={showToast} />}
            {view === 'calendar' && <Calendar C={C} allTasks={allTasks} employees={employees} onSelectTask={handleSelectTask} />}
            {view === 'seasonal' && <SeasonalTasks C={C} allTasks={allTasks} employees={employees} onSelectTask={handleSelectTask} />}
            {view === 'analytics' && <Analytics C={C} sites={sites} equipment={equipment} allTasks={allTasks} />}
            {view === 'report' && <SiteReport C={C} sites={activeSites} allSites={sites} />}
            {view === 'audit' && <AuditTrail C={C} auditLog={auditLog} onOpenWO={setWoModal} />}
            {view === 'users' && can(user, 'manage-users') && <UserManagement C={C} employees={employees} sites={sites} currentUser={user} onRefresh={data.refetch} showToast={showToast} />}
            {view === 'lunch-dash' && lunch && <LunchDash lunch={lunch} employees={employees} currentUser={user} onClose={() => setView('dashboard')} onEnd={handleEndLunch} C={C} />}
          </>
        )}
      </div>

      {/* MODALS */}
      {showLunchInit && <LunchInit site={activeSite} onStart={handleStartLunch} onClose={() => setShowLunchInit(false)} C={C} />}
      {showLunchOrder && lunch && <LunchOrderModal lunch={lunch} currentUser={user} onSubmit={handlePlaceLunchOrder} onClose={() => setShowLunchOrder(false)} C={C} />}
      {woModal && <WorkOrderModal wo={woModal} C={C} onClose={() => setWoModal(null)} />}
      {assignModal && <AssignModal task={assignModal} employees={employees} currentSiteId={activeSiteId === 'all' ? null : activeSiteId} onAssign={handleAssign} onClose={() => setAssignModal(null)} C={C} />}
      {showAddEquip && <AddEquipmentModal siteId={activeSiteId === 'all' ? sites[0]?.id : activeSiteId} onDone={(name) => { setShowAddEquip(false); data.refetch(); showToast(name + ' added!'); }} onClose={() => setShowAddEquip(false)} C={C} />}
      {showAddSite && <AddSiteModal user={user} onDone={(name) => { setShowAddSite(false); data.refetch(); showToast(name + ' site created!'); }} onClose={() => setShowAddSite(false)} C={C} />}
      {addPMTarget && <AddPMModal equipmentId={addPMTarget.id} equipmentName={addPMTarget.name} onDone={(name) => { setAddPMTarget(null); data.refetch(); showToast(name + ' PM created!'); }} onClose={() => setAddPMTarget(null)} C={C} />}
      {qrEquipment && <QRLabel equipment={qrEquipment} C={C} onClose={() => setQrEquipment(null)} />}
      {showQRScanner && <QRScanner C={C} onClose={() => setShowQRScanner(false)} onScan={(val) => {
        setShowQRScanner(false);
        const id = val.includes('scan=') ? val.split('scan=')[1] : val;
        const found = equipment.find(e => e.id === id || e.id.startsWith(id));
        if (found) { setSelectedEqId(found.id); setView('equipment'); showToast('Found: ' + found.name); }
        else showToast('Equipment not found');
      }} />}
      {showDemo && <GuidedDemo onClose={() => setShowDemo(false)} setView={setView} C={C} />}

      {/* CONFIRM DIALOG */}
      {showConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={() => !resetting && setShowConfirm(null)}>
          <div style={{ background: C.surface, border: '1px solid ' + C.border, borderRadius: 12, padding: 28, width: '90%', maxWidth: 360, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>{showConfirm === 'fresh' ? '⚠️' : '🔄'}</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{showConfirm === 'fresh' ? 'Fresh Start?' : 'Restore Demo Data?'}</h3>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{showConfirm === 'fresh'
              ? 'Deletes ALL equipment, PMs, and work orders. Sites and employees stay. Use Add Equipment to rebuild.'
              : 'Replaces all data with demo equipment, PMs, and work history across all sites. This takes about a minute.'
            }</p>
            {resetting && showConfirm === 'restore' && (
              <div style={{ marginBottom: 12, padding: '12px 14px', background: C.bg, borderRadius: 8, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: C.accent, marginBottom: 4 }}>While we set up your demo...</div>
                <div style={{ color: C.muted }}>Knock knock.</div>
                <div style={{ color: C.muted }}>Who is there?</div>
                <div style={{ color: C.muted }}>PM.</div>
                <div style={{ color: C.muted }}>PM who?</div>
                <div style={{ color: C.text, fontWeight: 600, marginTop: 4 }}>PM me when the turbine is back online!</div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setShowConfirm(null)} disabled={resetting} style={{ background: 'transparent', color: C.muted, border: '1px solid ' + C.border, borderRadius: 6, padding: '10px 20px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={showConfirm === 'fresh' ? handleFreshStart : handleRestoreDemo} disabled={resetting} style={{ background: showConfirm === 'fresh' ? '#EF4444' : '#3B82F6', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 20px', fontSize: 13, cursor: resetting ? 'wait' : 'pointer', fontWeight: 700, fontFamily: 'inherit', opacity: resetting ? 0.6 : 1 }}>{resetting ? 'Working...' : showConfirm === 'fresh' ? 'Clear Everything' : 'Restore Demo'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: '#000', padding: '10px 20px', borderRadius: 20, fontSize: 13, fontWeight: 700, zIndex: 300, boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>{toast}</div>}
      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 10, color: C.muted }}>PlantLink v2.5</div>
    </div>
  );
}
