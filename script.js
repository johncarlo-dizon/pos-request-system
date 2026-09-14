// ---- Backend wiring ----
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxqQBm5vCMzMBLV-2FTU0tm5DPxeWATCnXVG8iVDOmGbmMu4sKGKkbMPnqZ4U9RgDT4/exec';
let currentRecordId = null; // set after a successful Submit; used later by Generate

// Calculate Lead Time between dates
function calculateLeadTime() {
    const reqDateVal = document.getElementById('requestDate').value;
    const targetDateVal = document.getElementById('targetGoLiveDate').value;
    const daysSpan = document.getElementById('calculatedDays');
    const statusTag = document.getElementById('leadTimeStatusTag');
    const hiddenDays = document.getElementById('leadTimeDaysValue');

    if (reqDateVal && targetDateVal) {
        const reqDate = new Date(reqDateVal);
        const targetDate = new Date(targetDateVal);
        const diffTime = targetDate - reqDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
            daysSpan.innerText = "Invalid date sequence";
            statusTag.className = "px-2 py-0.5 rounded font-semibold text-[11px] bg-rose-100 text-rose-800";
            statusTag.innerText = "Error";
            hiddenDays.value = "";
        } else {
            daysSpan.innerText = `${diffDays} Days`;
            hiddenDays.value = diffDays;
            if (diffDays < 60) {
                statusTag.className = "px-2 py-0.5 rounded font-semibold text-[11px] bg-amber-100 text-amber-800";
                statusTag.innerText = "Expedited / Emergency Stock Buffer";
            } else if (diffDays <= 90) {
                statusTag.className = "px-2 py-0.5 rounded font-semibold text-[11px] bg-emerald-100 text-emerald-800";
                statusTag.innerText = "Standard Lead Time";
            } else {
                statusTag.className = "px-2 py-0.5 rounded font-semibold text-[11px] bg-blue-100 text-blue-800";
                statusTag.innerText = "Extended Lead Time";
            }
        }
    } else {
        daysSpan.innerText = "-- days";
        statusTag.className = "px-2 py-0.5 rounded font-semibold text-[11px] bg-slate-200 text-slate-700";
        statusTag.innerText = "Select dates";
        hiddenDays.value = "";
    }
    updateFormProgress();
}

// Helper to trigger driver selection radio
function selectPrimaryDriver(radioId) {
    const radio = document.getElementById(radioId);
    if (radio) {
        radio.checked = true;
        toggleDriverFields();
    }
}

// Dynamic conditional visibility for primary drivers
function toggleDriverFields() {
    document.getElementById('driver_sales_field').classList.add('hidden');
    document.getElementById('driver_queue_field').classList.add('hidden');
    document.getElementById('driver_seasonal_field').classList.add('hidden');

    const selected = document.querySelector('input[name="primaryDriver"]:checked');
    if (selected) {
        if (selected.value === 'Sales Volume Growth') {
            document.getElementById('driver_sales_field').classList.remove('hidden');
        } else if (selected.value === 'Customer Queue Mitigation') {
            document.getElementById('driver_queue_field').classList.remove('hidden');
        } else if (selected.value === 'Seasonal / Promo Peak') {
            document.getElementById('driver_seasonal_field').classList.remove('hidden');
        }
    }
    updateFormProgress();
}

// Calculate dynamic ROI and Impact Metrics badges
function calculateMetrics() {
    const currTx = parseFloat(document.getElementById('currTx').value) || 0;
    const projTx = parseFloat(document.getElementById('projTx').value) || 0;
    const currQueue = parseFloat(document.getElementById('currQueue').value) || 0;
    const projQueue = parseFloat(document.getElementById('projQueue').value) || 0;
    const currRev = parseFloat(document.getElementById('currRev').value) || 0;
    const projRevInc = parseFloat(document.getElementById('projRevInc').value) || 0;

    // 1. Transaction Badge
    const txBadge = document.getElementById('txDeltaBadge');
    if (currTx > 0 && projTx > currTx) {
        const txUplift = Math.round(((projTx - currTx) / currTx) * 100);
        txBadge.innerText = `+${txUplift}% Capacity`;
        txBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else {
        txBadge.innerText = `+0% Capacity`;
        txBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600";
    }

    // 2. Queue Reduction Badge
    const queueBadge = document.getElementById('queueDeltaBadge');
    if (currQueue > 0 && projQueue < currQueue) {
        const queueSaved = (currQueue - projQueue).toFixed(1);
        queueBadge.innerText = `-${queueSaved} mins wait`;
        queueBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else {
        queueBadge.innerText = `0 mins reduction`;
        queueBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600";
    }

    // 3. Monthly Revenue Uplift %
    const revBadge = document.getElementById('revDeltaBadge');
    if (currRev > 0 && projRevInc > 0) {
        const revUplift = ((projRevInc / currRev) * 100).toFixed(1);
        revBadge.innerText = `+${revUplift}% Rev Uplift`;
        revBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200";
    } else {
        revBadge.innerText = `+0% Rev Uplift`;
        revBadge.className = "inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600";
    }

    updateFormProgress();
}

// Infrastructure Status Toggle
function updateInfraStatus() {
    const counter = document.getElementById('infraCounter').checked;
    const power = document.getElementById('infraPower').checked;
    const lan = document.getElementById('infraLan').checked;
    const badge = document.getElementById('infraStatusBadge');

    const count = (counter ? 1 : 0) + (power ? 1 : 0) + (lan ? 1 : 0);

    if (count === 3) {
        badge.innerText = "Site Fully Ready (3/3)";
        badge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300";
    } else if (count > 0) {
        badge.innerText = `Partially Ready (${count}/3)`;
        badge.className = "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300";
    } else {
        badge.innerText = "Checklist Pending (0/3)";
        badge.className = "px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200";
    }
    updateFormProgress();
}

// Helper for Asset Selection
function selectAssetType(assetId) {
    const radio = document.getElementById(assetId);
    if (radio) {
        radio.checked = true;
        updateLeadTimeNote();
    }
}

function updateLeadTimeNote() {
    const badge = document.getElementById('leadTimeBadge');
    const selectedAsset = document.querySelector('input[name="assetType"]:checked');
    if (selectedAsset && selectedAsset.value.includes('Refurbished')) {
        badge.innerHTML = `<i class="fa-solid fa-bolt text-amber-300"></i> <span>Lead Time: Fast Deployment (Buffer Pool)</span>`;
        badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
    } else {
        badge.innerHTML = `<i class="fa-solid fa-clock"></i> <span>Lead Time: Standard 60–90 Days</span>`;
        badge.className = "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30";
    }
    updateFormProgress();
}

// Unbudgeted Emergency Toggle
function toggleUnbudgetedNote() {
    const unbudgetedRadio = document.getElementById('budget_unbudgeted');
    const notice = document.getElementById('unbudgetedNotice');
    if (unbudgetedRadio && unbudgetedRadio.checked) {
        notice.classList.remove('hidden');
    } else {
        notice.classList.add('hidden');
    }
    updateFormProgress();
}

// Dynamic Approval Stamps & Signatures
function updateSignoff(role) {
    const check = document.getElementById(`app_${role}_check`);
    const dateInput = document.getElementById(`app_${role}_date`);
    const stamp = document.getElementById(`stamp_${role}`);

    if (check.checked) {
        if (!dateInput.value) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
        stamp.innerText = "APPROVED";
        stamp.className = "mt-2 text-center text-xs font-extrabold py-1 rounded bg-emerald-100 text-emerald-800 uppercase border border-emerald-300 shadow-sm tracking-wider";
    } else {
        stamp.innerText = "PENDING";
        stamp.className = "mt-2 text-center text-xs font-bold py-1 rounded bg-slate-200 text-slate-600 uppercase border border-slate-300 tracking-wider";
    }
    updateFormProgress();
}

// Calculate total form completion progress bar
function updateFormProgress() {
    const requiredIds = ['storeInfo', 'storeManager', 'areaManager', 'requestDate', 'targetGoLiveDate', 'alternativeSolutions'];
    let filledCount = 0;

    requiredIds.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.value.trim() !== '') filledCount++;
    });

    if (document.querySelector('input[name="primaryDriver"]:checked')) filledCount++;
    if (document.querySelector('input[name="assetType"]:checked')) filledCount++;
    if (document.querySelector('input[name="budgetStatus"]:checked')) filledCount++;

    const totalKeySteps = requiredIds.length + 3;
    const percentage = Math.min(100, Math.round((filledCount / totalKeySteps) * 100));

    const progressBar = document.getElementById('formProgressBar');
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
}

// Load Sample Data into Form for Quick Testing
function loadSampleData() {
    document.getElementById('storeInfo').value = 'SM Megamall - Store #104';
    document.getElementById('storeManager').value = 'Elena Cruz';
    document.getElementById('areaManager').value = 'Marcus Vance';

    const today = new Date();
    const goLive = new Date();
    goLive.setDate(today.getDate() + 75);

    document.getElementById('requestDate').value = today.toISOString().split('T')[0];
    document.getElementById('targetGoLiveDate').value = goLive.toISOString().split('T')[0];
    calculateLeadTime();

    // Primary Driver
    document.getElementById('driver_queue').checked = true;
    toggleDriverFields();
    document.getElementById('currentWaitTime').value = 14;
    document.getElementById('targetWaitStandard').value = 5;

    // Metrics
    document.getElementById('currTx').value = 52;
    document.getElementById('projTx').value = 85;
    document.getElementById('currQueue').value = 14;
    document.getElementById('projQueue').value = 4.5;
    document.getElementById('currRev').value = 320000;
    document.getElementById('projRevInc').value = 55000;
    calculateMetrics();

    // Alternatives
    document.getElementById('alternativeSolutions').value = 'Evaluated handheld line-busting mobile tablets during lunchtime peak (11:30 AM - 2:00 PM). However, processing non-cash payment cards and printing immediate fiscal receipts requires a full dedicated POS terminal counter.';

    // Infrastructure
    document.getElementById('infraCounter').checked = true;
    document.getElementById('infraPower').checked = true;
    document.getElementById('infraLan').checked = true;
    updateInfraStatus();

    // Asset Type
    document.getElementById('asset_refurbished').checked = true;
    updateLeadTimeNote();

    // Financial
    document.getElementById('budget_approved').checked = true;
    toggleUnbudgetedNote();
    document.getElementById('estimatedCost').value = 68000;
    document.getElementById('costCurrency').value = 'PHP';

    // Signoffs
    document.getElementById('app_sm_name').value = 'Elena Cruz';
    document.getElementById('app_sm_check').checked = true;
    updateSignoff('sm');

    document.getElementById('app_am_name').value = 'Marcus Vance';
    document.getElementById('app_am_check').checked = true;
    updateSignoff('am');

    showModal('Sample Data Loaded', 'The form has been populated with sample business case data for testing.');
}

// Reset Form Values
function resetForm() {
    document.getElementById('posRequestForm').reset();
    toggleDriverFields();
    calculateMetrics();
    updateInfraStatus();
    updateLeadTimeNote();
    toggleUnbudgetedNote();
    
    ['sm', 'am', 'it', 'fas'].forEach(role => updateSignoff(role));
    calculateLeadTime();

    // Reset backend submission state too
    currentRecordId = null;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> <span>Submit Request</span>';

    const generateBtn = document.getElementById('generateBtn');
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-file-export"></i> <span>Generate (Doc + PDF)</span>';

    showModal('Form Reset', 'All input fields have been restored to default blank state.');
}

// Collects all form values into the object shape the backend expects
function collectFormData() {
    return {
        storeInfo: document.getElementById('storeInfo').value,
        storeManager: document.getElementById('storeManager').value,
        areaManager: document.getElementById('areaManager').value,
        requestDate: document.getElementById('requestDate').value,
        targetGoLiveDate: document.getElementById('targetGoLiveDate').value,
        leadTimeDays: document.getElementById('leadTimeDaysValue').value,

        primaryDriver: document.querySelector('input[name="primaryDriver"]:checked')?.value || '',
        growthPercentage: document.getElementById('growthPercentage').value,
        currentWaitTime: document.getElementById('currentWaitTime').value,
        targetWaitStandard: document.getElementById('targetWaitStandard').value,
        seasonalDetails: document.getElementById('seasonalDetails').value,

        currTx: document.getElementById('currTx').value,
        projTx: document.getElementById('projTx').value,
        currQueue: document.getElementById('currQueue').value,
        projQueue: document.getElementById('projQueue').value,
        currRev: document.getElementById('currRev').value,
        projRevInc: document.getElementById('projRevInc').value,
        alternativeSolutions: document.getElementById('alternativeSolutions').value,

        infraCounter: document.getElementById('infraCounter').checked,
        infraPower: document.getElementById('infraPower').checked,
        infraLan: document.getElementById('infraLan').checked,

        assetType: document.querySelector('input[name="assetType"]:checked')?.value || '',
        budgetStatus: document.querySelector('input[name="budgetStatus"]:checked')?.value || '',
        estimatedCost: document.getElementById('estimatedCost').value,
        costCurrency: document.getElementById('costCurrency').value,
        // FIX: this was rendered in print (Section 5 unbudgeted notice) but never
        // captured before — it never reached the Sheet or the generated Doc/PDF.
        hasEmergencyAttachment: document.getElementById('hasEmergencyAttachment').checked,

        smName: document.getElementById('app_sm_name').value,
        smCheck: document.getElementById('app_sm_check').checked,
        smDate: document.getElementById('app_sm_date').value,

        amName: document.getElementById('app_am_name').value,
        amCheck: document.getElementById('app_am_check').checked,
        amDate: document.getElementById('app_am_date').value,

        itName: document.getElementById('app_it_name').value,
        itCheck: document.getElementById('app_it_check').checked,
        itDate: document.getElementById('app_it_date').value,

        fasName: document.getElementById('app_fas_name').value,
        fasCheck: document.getElementById('app_fas_check').checked,
        fasDate: document.getElementById('app_fas_date').value
    };
}

// Form Submit Handler — now actually posts to the Apps Script backend
async function handleFormSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Submitting...</span>';

    const formData = collectFormData();

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // avoids CORS preflight against Apps Script
            body: JSON.stringify({ action: 'submit', data: formData })
        });

        const result = await response.json();

        if (result.ok) {
            currentRecordId = result.id;
            submitBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Submitted</span>';

            const generateBtn = document.getElementById('generateBtn');
            generateBtn.disabled = false;

            showModal(
                'Business Case Submitted!',
                `Request for <strong>${formData.storeInfo || 'this store'}</strong> was saved to the database.<br>Reference ID: <strong>${result.id}</strong><br><br>You can now click <strong>Generate</strong> to create the Doc + PDF.`
            );
        } else {
            throw new Error(result.error || 'Unknown error from server');
        }
    } catch (err) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
        showModal('Submission Failed', `Something went wrong while saving this request: ${err.message}. Please try again.`);
    }
}

// Generate Doc + PDF for the just-submitted record
async function handleGenerate() {
    if (!currentRecordId) {
        showModal('No Record Yet', 'Please submit the request first before generating documents.');
        return;
    }

    const generateBtn = document.getElementById('generateBtn');
    const originalBtnHtml = generateBtn.innerHTML;
    generateBtn.disabled = true;
    generateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Generating...</span>';

    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'generate', id: currentRecordId })
        });

        const result = await response.json();

        if (result.ok) {
            generateBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Generated</span>';
            showModal(
                'Documents Generated!',
                `Doc + PDF created in Google Drive for reference <strong>${currentRecordId}</strong>.<br><br>
                 <a href="${result.docLink}" target="_blank" class="text-sky-600 underline font-semibold">Open Google Doc</a><br>
                 <a href="${result.pdfLink}" target="_blank" class="text-sky-600 underline font-semibold">Open PDF</a>`
            );
            // Re-enable shortly after, in case they want to regenerate this same record again
            setTimeout(() => {
                generateBtn.disabled = false;
                generateBtn.innerHTML = '<i class="fa-solid fa-file-export"></i> <span>Regenerate (Doc + PDF)</span>';
            }, 1500);
        } else {
            throw new Error(result.error || 'Unknown error from server');
        }
    } catch (err) {
        generateBtn.disabled = false;
        generateBtn.innerHTML = originalBtnHtml;
        showModal('Generation Failed', `Something went wrong while generating the documents: ${err.message}. Please try again.`);
    }
}

// Modal Helpers
function showModal(title, msg) {
    document.getElementById('modalTitle').innerHTML = `<i class="fa-solid fa-circle-check text-white"></i> ${title}`;
    document.getElementById('modalMessage').innerHTML = msg;
    
    const backdrop = document.getElementById('modalBackdrop');
    const box = document.getElementById('modalBox');
    
    backdrop.classList.remove('hidden');
    setTimeout(() => {
        backdrop.classList.remove('opacity-0');
        box.classList.remove('scale-95');
        box.classList.add('scale-100');
    }, 10);
}

function closeModal() {
    const backdrop = document.getElementById('modalBackdrop');
    const box = document.getElementById('modalBox');
    
    backdrop.classList.add('opacity-0');
    box.classList.remove('scale-100');
    box.classList.add('scale-95');
    
    setTimeout(() => {
        backdrop.classList.add('hidden');
    }, 200);
}

// Initialize listeners on load
window.onload = function() {
    updateFormProgress();
};
