/**
 * BC-POS Management Dashboard — Frontend Logic
 * -----------------------------------------------
 * Talks ONLY to the separate, read-only management-backend.gs deployment.
 * Never calls the main submission/generation Apps Script — this dashboard
 * is view-only, on purpose.
 */

// TODO: paste the deployment URL of management-backend.gs (a separate
// Apps Script project/deployment from your main POS request backend).
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyYicON7PyCyXDXVb6bzRIJCcgqroDXhhsjQ7AwiKlUd_Ey5PZeqJMxM8qeLdzxXQDv-A/exec';

// Static copy, kept identical to the equivalents in the main backend
// (SECTION_SUBTITLES_ / DRIVER_DESCRIPTIONS_ / etc.) and the print view,
// so the modal shows the same wording as the Doc/PDF/print output.
const SECTION_SUBTITLES = {
    driver: 'Select primary driver and provide required specifics',
    metrics: 'Enter baseline metrics to calculate projected operational ROI',
    site: 'Ensure store physical prerequisites are met prior to request dispatch',
    financial: 'Specify accounting source and capital estimation',
    approval: 'Sign-off flow for enterprise authorization and deployment trigger'
};
const DRIVER_DESCRIPTIONS = {
    'Sales Volume Growth': 'Significant sustained increase in store register traffic over recent months.',
    'Customer Queue Mitigation': 'Peak hour queue duration exceeds allowable SLA threshold.',
    'Store Footprint Expansion': 'Physical layout modifications or newly constructed counter space.',
    'Seasonal / Promo Peak': 'Anticipated surge due to upcoming campaigns, holidays, or events.'
};
const ASSET_DESCRIPTIONS = {
    'Refurbished / Good Stock Unit': 'Faster allocation from central buffer pool (approx 7–14 days setup lead time).',
    'New Unit Procurement': 'Brand new hardware procurement. Subject to standard 60–90 day vendor procurement lead time.'
};
const ALT_SOLUTIONS_HINT = "Why can't existing staff scheduling, queue reallocation, or handheld line-busting resolve this issue?";
const METRIC_LABEL_SUBTEXT = {
    tx: 'Items / hour processed',
    queue: 'Customer wait time (minutes)',
    rev: 'Total monthly store sales'
};
const INFRA_ITEM_SUBTEXT = {
    counter: 'Cleared & physically sized',
    power: 'UPS / Clean surge line',
    lan: 'Verified RJ45 ethernet drop'
};
const COST_FOOTNOTE = '* Cost estimation filled out in coordination with IT / FAS Asset Management.';

let allRecords = [];

// ---- Fetch & render ----

async function loadRecords() {
    const tbody = document.getElementById('recordsBody');
    tbody.innerHTML = `<tr><td colspan="6" class="loading-state">Loading records…</td></tr>`;

    try {
        const res = await fetch(APPS_SCRIPT_URL);
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Unknown error');

        allRecords = result.records || [];
        renderSummary(allRecords);
        applyFilters(); // re-applies any active search/status filter after a refresh
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Couldn't load records: ${esc(err.message)}</td></tr>`;
    }
}

function renderSummary(records) {
    const total = records.length;
    const generated = records.filter(r => r.status === 'Generated').length;
    const submitted = total - generated;
    document.getElementById('summaryTotal').innerText = total;
    document.getElementById('summarySubmitted').innerText = submitted;
    document.getElementById('summaryGenerated').innerText = generated;
}

function renderTable(records, isFilteredView) {
    const tbody = document.getElementById('recordsBody');
    if (!records.length) {
        const msg = isFilteredView
            ? 'No records match your search or filter.'
            : 'No records found.';
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state">${esc(msg)}</td></tr>`;
        return;
    }

    tbody.innerHTML = records.map(r => {
        const statusClass = r.status === 'Generated' ? 'status-generated'
            : r.status === 'Submitted' ? 'status-submitted'
            : 'status-default';

        const fileLinks = `
            <div class="file-links">
                ${r.docLink ? `<a href="${esc(r.docLink)}" target="_blank">Doc</a>` : `<span class="disabled">Doc</span>`}
                ${r.pdfLink ? `<a href="${esc(r.pdfLink)}" target="_blank">PDF</a>` : `<span class="disabled">PDF</span>`}
            </div>`;

        return `
            <tr>
                <td class="cell-id">${esc(r.id)}</td>
                <td class="cell-store">
                    <div class="name">${esc(r.storeInfo)}</div>
                    <div class="sub">${esc(r.storeManager)}</div>
                </td>
                <td><span class="status-badge ${statusClass}">${esc(r.status || '—')}</span></td>
                <td>${formatDate(r.timestamp)}</td>
                <td>${fileLinks}</td>
                <td><button class="btn-view" onclick="openModal('${esc(r.id)}')">View</button></td>
            </tr>`;
    }).join('');
}

function formatDate(val) {
    if (!val) return '—';
    const d = new Date(val);
    if (isNaN(d)) return esc(val);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function esc(val) {
    const div = document.createElement('div');
    div.innerText = (val === undefined || val === null || val === '') ? '—' : String(val);
    return div.innerHTML;
}

// ---- Search & filter ----
// Combines the free-text search box with the status dropdown — both apply
// together (e.g. "megamall" + "Generated" shows only matching, generated
// records for that store).

function applyFilters() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    const status = document.getElementById('statusFilter').value;

    const isFiltered = Boolean(q) || Boolean(status);

    let filtered = allRecords;

    if (q) {
        filtered = filtered.filter(r =>
            (r.id || '').toLowerCase().includes(q) ||
            (r.storeInfo || '').toLowerCase().includes(q) ||
            (r.storeManager || '').toLowerCase().includes(q) ||
            (r.areaManager || '').toLowerCase().includes(q) ||
            (r.status || '').toLowerCase().includes(q)
        );
    }

    if (status) {
        filtered = filtered.filter(r => r.status === status);
    }

    renderTable(filtered, isFiltered);
}

// ---- Modal: full-detail view, mirroring the Doc/PDF/print section order ----

function kvTable(rows) {
    const trs = rows.map(([label, value]) =>
        `<tr><td class="mv-label">${esc(label)}</td><td class="mv-value">${esc(value)}</td></tr>`
    ).join('');
    return `<table class="mv-table"><tbody>${trs}</tbody></table>`;
}

function openModal(id) {
    const r = allRecords.find(rec => rec.id === id);
    if (!r) return;

    document.getElementById('modalTitle').innerText = r.storeInfo || r.id;
    document.getElementById('modalSubtitle').innerText = `Ref: ${r.id}  •  Status: ${r.status || '—'}`;

    const linksHtml = `
        <div class="modal-links">
            ${r.docLink ? `<a href="${esc(r.docLink)}" target="_blank">Open Google Doc</a>` : `<span class="disabled">Doc not generated</span>`}
            ${r.pdfLink ? `<a href="${esc(r.pdfLink)}" target="_blank">Open PDF</a>` : `<span class="disabled">PDF not generated</span>`}
        </div>`;

    let html = linksHtml;

    // Section 1
    html += `<div class="mv-section-heading">1. Request Information</div>`;
    html += kvTable([
        ['Store Name / Code', r.storeInfo],
        ['Requested By (Store Manager)', r.storeManager],
        ['Area / District Manager', r.areaManager],
        ['Request Date', r.requestDate],
        ['Target Go-Live Date', r.targetGoLiveDate],
        ['Calculated Lead Time', r.leadTimeDays ? `${r.leadTimeDays} days` : '--']
    ]);

    // Section 2
    html += `<div class="mv-section-heading">2. Business Justification</div>`;
    html += `<div class="mv-section-sub">${esc(SECTION_SUBTITLES.driver)}</div>`;
    const driverRows = [['Primary Driver', r.primaryDriver]];
    if (r.primaryDriver && DRIVER_DESCRIPTIONS[r.primaryDriver]) {
        driverRows.push(['Driver Description', DRIVER_DESCRIPTIONS[r.primaryDriver]]);
    }
    if (r.growthPercentage) driverRows.push(['Transaction Volume Growth', `${r.growthPercentage}%`]);
    if (r.currentWaitTime) driverRows.push(['Peak Wait Time (Current / Target)', `${r.currentWaitTime} min / ${r.targetWaitStandard} min`]);
    if (r.seasonalDetails) driverRows.push(['Campaign / Event Details', r.seasonalDetails]);
    html += kvTable(driverRows);

    // Section 3
    html += `<div class="mv-section-heading">3. Impact &amp; Metrics Comparison</div>`;
    html += `<div class="mv-section-sub">${esc(SECTION_SUBTITLES.metrics)}</div>`;
    html += kvTable([
        [`Peak Hour Transactions (${METRIC_LABEL_SUBTEXT.tx})`, `${r.currTx || '--'} → ${r.projTx || '--'}`],
        [`Average Queue Time (min) (${METRIC_LABEL_SUBTEXT.queue})`, `${r.currQueue || '--'} → ${r.projQueue || '--'}`],
        [`Monthly Store Revenue (${METRIC_LABEL_SUBTEXT.rev})`, `${r.currRev || '--'} (+${r.projRevInc || 0})`]
    ]);
    html += `<div class="mv-section-sub" style="margin-top:8px;">${esc(ALT_SOLUTIONS_HINT)}</div>`;
    html += kvTable([['Alternative Solutions Evaluated', r.alternativeSolutions]]);

    // Section 4
    html += `<div class="mv-section-heading">4. Site Readiness &amp; Asset Preference</div>`;
    html += `<div class="mv-section-sub">${esc(SECTION_SUBTITLES.site)}</div>`;
    html += kvTable([
        [`Counter Space Ready (${INFRA_ITEM_SUBTEXT.counter})`, truthy(r.infraCounter) ? 'YES' : 'NO'],
        [`Dedicated AC Outlet (${INFRA_ITEM_SUBTEXT.power})`, truthy(r.infraPower) ? 'YES' : 'NO'],
        [`Active Network LAN (${INFRA_ITEM_SUBTEXT.lan})`, truthy(r.infraLan) ? 'YES' : 'NO'],
        ['Asset Type Requested', r.assetType],
        ['Asset Type Description', (r.assetType && ASSET_DESCRIPTIONS[r.assetType]) || '—']
    ]);

    // Section 5
    html += `<div class="mv-section-heading">5. Financial &amp; Budget Allocation</div>`;
    html += `<div class="mv-section-sub">${esc(SECTION_SUBTITLES.financial)}</div>`;
    const financialRows = [['Budget Allocation Status', r.budgetStatus]];
    if (r.budgetStatus && String(r.budgetStatus).indexOf('Unbudgeted') !== -1) {
        financialRows.push(['Emergency Justification Memo', truthy(r.hasEmergencyAttachment) ? 'ATTACHED' : 'NOT ATTACHED — REQUIRED']);
    }
    financialRows.push(['Estimated Investment', `${r.costCurrency || ''} ${r.estimatedCost || '--'}`]);
    html += kvTable(financialRows);
    html += `<div class="mv-footnote">${esc(COST_FOOTNOTE)}</div>`;

    // Section 6
    html += `<div class="mv-section-heading">6. Approval &amp; Governance Gate</div>`;
    html += `<div class="mv-section-sub">${esc(SECTION_SUBTITLES.approval)}</div>`;
    const roles = [
        ['Store Manager', r.smName, r.smCheck, r.smDate],
        ['Area Manager', r.amName, r.amCheck, r.amDate],
        ['IT Department', r.itName, r.itCheck, r.itDate],
        ['FAS / Finance', r.fasName, r.fasCheck, r.fasDate]
    ];
    html += `<table class="mv-approval"><thead><tr>${roles.map(x => `<th>${esc(x[0])}</th>`).join('')}</tr></thead>
        <tbody>
            <tr>${roles.map(x => `<td>${esc(x[1])}</td>`).join('')}</tr>
            <tr>${roles.map(x => `<td class="${truthy(x[2]) ? 'mv-approved' : 'mv-pending'}">${truthy(x[2]) ? 'APPROVED' : 'PENDING'}</td>`).join('')}</tr>
            <tr>${roles.map(x => `<td>${esc(x[3])}</td>`).join('')}</tr>
        </tbody></table>`;

    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalBackdrop').classList.add('open');
}

// Sheet booleans can come back as real booleans, or as the strings
// "TRUE"/"FALSE" depending on how Apps Script serializes them — normalize.
function truthy(val) {
    return val === true || val === 'TRUE' || val === 'true';
}

function closeModal() {
    document.getElementById('modalBackdrop').classList.remove('open');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
    loadRecords();
    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('refreshBtn').addEventListener('click', loadRecords);
    document.getElementById('modalBackdrop').addEventListener('click', (e) => {
        if (e.target.id === 'modalBackdrop') closeModal();
    });
});