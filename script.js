document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });



// let inventoryHistory = []; 
// let totalRevenue = 226.75; 
// let currentUserRole = "Owner";
// let currentUserName = "John Kaye P. Fernandez";
// let currentUserId = "admin";
// let revenueChartInst = null;
// let financialHealthChartInst = null;
// let dismissedAlerts = []; 



// sadsdasd


// ========= LOGIN AUTHENTICATION IS DONE ========
async function handleLogin(event) {
    if (event) {
        event.preventDefault();
    }
    
    const usernameInput = document.getElementById('login-user').value.trim();
    const pwdInput = document.getElementById('login-pwd').value;

    const toBeSend = new FormData();
    toBeSend.append('action', 'login');
    toBeSend.append('username', usernameInput);
    toBeSend.append('password', pwdInput);

    try {
        const response = await fetch('authentication.php', {
            method: 'POST',
            body: toBeSend
        });

        const data = await response.json();

        // lalagyan ng design feel ko pag nirun to pure text lang hehe
        if (!data.success){
            return alert("Access Denied: " + data.message);
        }

        currentUserRole = data.user.role;
        currentUserName = data.user.name;
        currentUserId = data.user.id;

        document.getElementById('user-role-display').innerText = currentUserRole;
        document.getElementById('user-name-display').innerText = currentUserName;

        // para ipakita yung modules na kaya nilang iaccess based on roles
        document.querySelectorAll('.module-link').forEach(btn => {
            const allowedRoles = btn.getAttribute('data-roles').split(',');
            if (allowedRoles.includes(currentUserRole)) {
                btn.style.display = 'block';
            } else {
                btn.style.display = 'none';
            }
        });

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-sidebar').style.display = 'flex';
        document.getElementById('app-content').style.display = 'flex';

    } catch (error) {
        console.error("System error: ", error);
        alert("A connection error occurred with the server. Please ensure the database hosting is up.")
    }
    
    switchModule('dashboard');
    initCharts();
    refreshUI();
    renderSmsSettings(); 
}

//   =============== WORKING FINE ===========
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === "password" ? "text" : "password";
}

//   =============== WORKING FINE ===========
function showForgotPassword() {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-signup').classList.add('hidden');
    document.getElementById('form-forgot').classList.remove('hidden');

    //more php work here to send password request

    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
}

async function handleForgotPassword() {
    const identifier = document.getElementById('forgot-identifier').value.trim();
    




    if(!identifier) return alert("Please enter your email or username.");

    //alert notif design

    // php confirmation to send approval password request
    const formData = new FormData();
    formData.append('action', 'forgot_password');
    formData.append('identifier', identifier);

    try {
        const response = await fetch('authentication.php', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();

        if (!data.success) {
            return alert("Verification Failed: " + data.message);
        }

        alert(`A password reset link has been sent to the email associated with "${identifier}". Please check your inbox.`);
        document.getElementById('forgot-identifier').value = '';
        switchAuthTab('login');
    } catch (error){
        alert("A connection error occured.");
    }
}

//   =============== WORKING FINE ===========
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-signup').classList.add('hidden');
    document.getElementById('form-forgot').classList.add('hidden');

    if(tab === 'login' || tab === 'signup') {
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`form-${tab}`).classList.remove('hidden');
    }
}

//   =============== WORKING FINE ===========
async function handleSignup(event) {
    if (event) {
        event.preventDefault();
    }
    
    const firstName = document.getElementById('signup-firstname').value.trim();
    const middleInitial = document.getElementById('signup-middleInitial').value.trim();
    const surname = document.getElementById('signup-surname').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const phoneNumber = document.getElementById('signup-phoneNumber').value.trim();
    const username = document.getElementById('signup-username').value.trim();
    const password = document.getElementById('signup-pwd').value;
    const confirmPassword = document.getElementById('signup-confirm-pwd').value;

    if(!firstName || !surname || !phoneNumber || !email || !username || !password || !confirmPassword) {
        return alert("Please fill in all required fields.");
    }

    if(password !== confirmPassword) {
        return alert("The passwords you entered do not match.");
    }

    const toBeSend = new FormData();
    toBeSend.append('action', 'signup');
    toBeSend.append('firstName', firstName);
    toBeSend.append('middleInitial', middleInitial ?? '');
    toBeSend.append('surname', surname);
    toBeSend.append('phoneNumber', phoneNumber);
    toBeSend.append('email', email);
    toBeSend.append('username', username);
    toBeSend.append('password', password);
    toBeSend.append('cfrmpassword', confirmPassword);

    try{
        const response = await fetch('authentication.php', {
            method: 'POST',
            body: toBeSend
        });

        const data = await response.json();

        // const rawResponse = await response.text();
        // console.log("RAW SERVER RESPONSE:", rawResponse);

        // if (!response.ok) {
        //     throw new Error(`Server returned status code ${response.status}`);
        // }

        // const data = JSON.parse(rawResponse);

        if (!data.success){
            return alert("Access Denied: " + data.message);
        }

        alert(data.message); 

        document.getElementById('signup-firstname').value = '';
        document.getElementById('signup-middleInitial').value = '';
        document.getElementById('signup-surname').value = '';
        document.getElementById('signup-email').value = '';
        document.getElementById('signup-phoneNumber').value = '';
        document.getElementById('signup-username').value = '';
        document.getElementById('signup-pwd').value = '';
        document.getElementById('signup-confirm-pwd').value = '';
        
        switchAuthTab('login'); 

    } catch (error) {
        console.error("System error: ", error);
        alert("A connection error occurred with the server. Please ensure the database hosting is up.");
         
    }
}


function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
}






async function handleLogout() {
    const currentUser = document.getElementById('user-name-display').innerText.trim();

    const toBesend = new FormData();
    toBesend.append('action', 'logout');
    toBesend.append('user_name', currentUser);
    
    try {
        await fetch('authentication.php', {
            method: 'POST',
            body: toBesend
        });

        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-sidebar').style.display = 'none';
        document.getElementById('app-content').style.display = 'none';

        document.getElementById('login-pwd').value = '';
        document.getElementById('login-user').value = '';
        
        switchAuthTab('login'); 

    } catch (error) {
        console.error("Logout Error: ", error);
        alert("A connection error occurred while logging out.");
    }

    // if(currentUser) {
    //     currentUser.status = "Offline";
    //     currentUser.lastLogout = new Date().toLocaleString();
    // }

}

function switchModule(modId) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(modId).classList.add('active');

    const activeBtn = document.querySelector(`.nav-btn[data-target="${modId}"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if(modId === 'expiry-alerts') {
        renderSmsSettings();
    }
}

function updatePassword() {
    const currentInput = document.getElementById('cp-current').value;
    const newInput = document.getElementById('cp-new').value;
    const confirmInput = document.getElementById('cp-confirm').value;

    let user = usersDb.find(u => u.id === currentUserId);

    if (!currentInput || !newInput || !confirmInput) {
        return alert("Please fill in all password fields.");
    }

    if (currentInput !== user.password) {
        return alert("Validation Failed: Incorrect current password.");
    }

    if (newInput !== confirmInput) {
        return alert("Validation Failed: New passwords do not match.");
    }

    if (newInput === currentInput) {
        return alert("Error: New password cannot be the same as your old password.");
    }

    user.password = newInput;

    document.getElementById('cp-current').value = '';
    document.getElementById('cp-new').value = '';
    document.getElementById('cp-confirm').value = '';

    alert("Success! Your password has been updated securely.");
}

function renderSmsSettings() {
    let user = usersDb.find(u => u.id === currentUserId);
    let inputArea = document.getElementById('sms-input-area');
    let displayArea = document.getElementById('sms-display-area');
    let toggle = document.getElementById('sms-toggle');
    let statusMsg = document.getElementById('sms-status-msg');

    toggle.checked = user.smsEnabled;

    if (user.smsNumber) {
        inputArea.style.display = 'none';
        displayArea.style.display = 'flex';
        document.getElementById('saved-number-display').innerText = user.smsNumber;
    } else {
        inputArea.style.display = 'flex';
        displayArea.style.display = 'none';
        document.getElementById('user-phone').value = '';
    }

    if (user.smsEnabled && user.smsNumber) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--secondary)';
        statusMsg.innerText = `✅ Active: Alerts are currently routing to ${user.smsNumber}`;
    } else if (!user.smsEnabled && user.smsNumber) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--danger)';
        statusMsg.innerText = `❌ Paused: Alerts are currently disabled. Flip the switch above to resume.`;
    } else {
        statusMsg.style.display = 'none';
    }
}

function saveSmsNumber() {
    let phoneInput = document.getElementById('user-phone').value.trim();
    if(!phoneInput) return alert("Please enter a valid phone number.");

    let user = usersDb.find(u => u.id === currentUserId);
    user.smsNumber = phoneInput;
    user.smsEnabled = true; 

    alert(`Success! Contact number updated. SMS Alerts are now enabled.`);
    renderSmsSettings();
}

function editSmsNumber() {
    let user = usersDb.find(u => u.id === currentUserId);
    document.getElementById('sms-input-area').style.display = 'flex';
    document.getElementById('sms-display-area').style.display = 'none';
    document.getElementById('user-phone').value = user.smsNumber;
    document.getElementById('sms-status-msg').style.display = 'none';
}

function toggleSmsAlerts() {
    let user = usersDb.find(u => u.id === currentUserId);
    let toggle = document.getElementById('sms-toggle');

    if (!user.smsNumber && toggle.checked) {
        toggle.checked = false; 
        return alert("Please save a contact number first before enabling SMS alerts.");
    }

    user.smsEnabled = toggle.checked;
    renderSmsSettings(); 
}

function logHistory(actionType, shortDescription) {
    inventoryHistory.unshift({
        time: new Date().toLocaleString(),
        user: currentUserName,
        action: actionType,
        desc: shortDescription
    });
}

function openHistoryModal() {
    const tbody = document.getElementById('history-tbody');

    if (inventoryHistory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No history recorded yet.</td></tr>`;
    } else {
        tbody.innerHTML = inventoryHistory.map(log => {
            let actionBadgeColor = log.action.includes('New') ? 'badge-success' : (log.action.includes('Edit') ? 'badge-warning' : 'badge-info');
            
            return `
            <tr>
                <td style="font-size: 0.85rem; color: #555;">${log.time}</td>
                <td><strong>${log.user}</strong></td>
                <td><span class="badge ${actionBadgeColor}">${log.action}</span></td>
                <td style="font-size: 0.9rem; color: #444;">${log.desc}</td>
            </tr>`;
        }).join('');
    }

    document.getElementById('history-modal').classList.remove('hidden');
}

function openInventoryModal(id = null) {
    const isEdit = id !== null;
    document.getElementById('inv-modal-title').innerText = isEdit ? "Update Inventory Record" : "Create New Catalog Entry";
    const item = isEdit ? db.find(i => i.id === id) : {id:'', batch:'', name:'', stock:'', price:'', expiry:'', rxRequired: false};

    ['id','batch','name','stock','price','expiry'].forEach(key => {
        document.getElementById(`inv-${key}`).value = item[key];
    });
    document.getElementById('inv-rx').checked = item.rxRequired;

    document.getElementById('inventory-modal').classList.remove('hidden');
}

function saveInventory() {
    const id = document.getElementById('inv-id').value;
    const data = {
        batch: document.getElementById('inv-batch').value,
        name: document.getElementById('inv-name').value,
        stock: parseInt(document.getElementById('inv-stock').value),
        price: parseFloat(document.getElementById('inv-price').value),
        expiry: document.getElementById('inv-expiry').value,
        rxRequired: document.getElementById('inv-rx').checked
    };

    if (id) {
        const idx = db.findIndex(i => i.id == id);
        const oldData = db[idx];
        
        let changes = [];
        if (oldData.name !== data.name) changes.push(`Name: '${oldData.name}' to '${data.name}'`);
        if (oldData.stock !== data.stock) changes.push(`Stock: ${oldData.stock} to ${data.stock}`);
        if (oldData.price !== data.price) changes.push(`Price: ₱${oldData.price} to ₱${data.price}`);
        if (oldData.expiry !== data.expiry) changes.push(`Expiry: ${oldData.expiry} to ${data.expiry}`);
        if (oldData.rxRequired !== data.rxRequired) changes.push(`Rx: ${oldData.rxRequired} to ${data.rxRequired}`);
        
        let changeStr = changes.length > 0 ? changes.join(', ') : 'No changes made';

        db[idx] = { ...db[idx], ...data };
        logHistory("Edit Item", `Updated ${data.batch}: ${changeStr}.`);
    } else {
        db.push({ id: Date.now(), ...data });
        logHistory("New Item", `Added ${data.name} (Batch: ${data.batch}) with ${data.stock} stock at ₱${data.price}.`); 
    }

    closeModal('inventory-modal');
    refreshUI();
}

function updatePricePreview(id, basePrice) {
    const slider = document.getElementById(`discount-slider-${id}`).value;
    document.getElementById(`discount-val-${id}`).innerText = slider + "% OFF";
    const discounted = basePrice - (basePrice * (slider / 100));
    document.getElementById(`new-price-preview-${id}`).innerText = discounted.toFixed(2);
}

function applySmartPrice(id) {
    const newPrice = parseFloat(document.getElementById(`new-price-preview-${id}`).innerText);
    let item = db.find(i => i.id === id);
    if(item) {
        const oldPrice = item.price;
        item.price = newPrice;
        logHistory("Smart Price Update", `Changed price of ${item.name} from ₱${oldPrice.toFixed(2)} to ₱${newPrice.toFixed(2)} due to expiry risk.`);
        alert(`Price for ${item.name} successfully updated to ₱${newPrice.toFixed(2)}`);
    }
    refreshUI();
}

function addToCart(id) {
    let item = db.find(i => i.id === id);
    if(item && item.stock > 0) { cart.push({...item}); item.stock--; refreshUI(); } 
}

function removeFromCart(index) {
    let item = cart[index];
    let dbItem = db.find(i => i.id === item.id);
    if (dbItem) dbItem.stock++; 
    cart.splice(index, 1); 
    refreshUI();
}

// NEW: Handles AI Upsell Logic for POS Terminal
function updateRecommendations() {
    const recWidget = document.getElementById('pos-recommendations');
    const recList = document.getElementById('rec-items-list');

    if (cart.length === 0) {
        recWidget.classList.add('hidden');
        return;
    }

    let suggestions = new Set();
    let hasAntibiotic = cart.some(i => i.name.toLowerCase().includes('amoxicillin'));
    let hasPainkiller = cart.some(i => i.name.toLowerCase().includes('paracetamol') || i.name.toLowerCase().includes('ibuprofen'));
    let hasCoughCold = cart.some(i => i.name.toLowerCase().includes('cetirizine') || i.name.toLowerCase().includes('salbutamol'));

    // System logic maps specific buys to upsells
    if (hasAntibiotic) suggestions.add("Ascorbic Acid (Vit C)"); // Immune support
    if (hasPainkiller) suggestions.add("Omeprazole 20mg Cap");   // Gastric protection
    if (hasCoughCold) suggestions.add("Paracetamol 500mg Tab");  // Fever management

    // Only suggest items not already in the cart
    let finalRecs = Array.from(suggestions).filter(recName => !cart.some(c => c.name === recName));

    if (finalRecs.length > 0) {
        recList.innerHTML = finalRecs.map(recName => {
            let dbItem = db.find(i => i.name === recName);
            if(!dbItem || dbItem.stock <= 0) return '';
            return `<div class="recommendation-item">
                        <span>${dbItem.name} <strong>(₱${dbItem.price.toFixed(2)})</strong></span>
                        <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.75rem;" onclick="addToCart(${dbItem.id})">+ Add</button>
                    </div>`;
        }).join('');
        recWidget.classList.remove('hidden');
    } else {
        recWidget.classList.add('hidden');
    }
}

function processCheckout() {
    if (cart.length === 0) return alert("Terminal basket is empty.");

    let requiresRx = cart.some(item => item.rxRequired);

    if (requiresRx) {
        document.getElementById('rx-customer').value = '';
        document.getElementById('rx-license').value = '';
        document.getElementById('rx-ptr').value = '';
        document.getElementById('prescription-modal').classList.remove('hidden');
    } else {
        finalizeCheckout(null);
    }
}

function validatePrescriptionAndCheckout() {
    let customer = document.getElementById('rx-customer').value.trim();
    let license = document.getElementById('rx-license').value.trim();
    let ptr = document.getElementById('rx-ptr').value.trim();

    if (!customer || !license || !ptr) {
        return alert("Validation Failed: Please fill in all prescription details (Patient Name, License No., and PTR No.) to proceed.");
    }

    closeModal('prescription-modal');
    finalizeCheckout({ customer, license, ptr });
}

function finalizeCheckout(rxDetails) {
    let total = cart.reduce((sum, item) => sum + item.price, 0);
    totalRevenue += total;
    const txnId = "TXN-" + Math.floor(Math.random() * 89999 + 10000);
    const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    let itemSummary = cart.map(i => i.name).join(' | ');
    salesHistory.unshift({ 
        txn: txnId, 
        items: itemSummary, 
        qty: cart.length, 
        total: total, 
        time: timeStr, 
        cashier: currentUserName 
    });

    let receipt = `<div style="text-align:center; font-weight:bold; font-size:1.1rem;">LYFE PHARMACY</div><div style="text-align:center; margin-bottom:10px;">PharmaSync System<br>Transaction ID: ${txnId}<br>Served by: ${currentUserName}</div>`;

    if (rxDetails) {
        receipt += `<div style="font-size:0.8rem; background:#f1f3f5; padding:8px; margin-bottom:10px; border-radius:4px; border-left: 3px solid var(--primary);">
            <strong>Rx Details Verified</strong><br>
            Patient: ${rxDetails.customer}<br>
            Physician Lic: ${rxDetails.license}<br>
            PTR No: ${rxDetails.ptr}
        </div>`;
    }

    receipt += `<hr style="border-top:1px dashed #000; margin:10px 0;">`;
    cart.forEach(i => receipt += `<div style="display:flex; justify-content:space-between; margin: 3px 0;"><span>1x ${i.name.substring(0,15)}</span><span>₱${i.price.toFixed(2)}</span></div>`);
    receipt += `<hr style="border-top:1px dashed #000; margin:10px 0;"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem;"><span>TOTAL AMOUNT</span><span>₱${total.toFixed(2)}</span></div><div style="text-align:center; margin-top:20px; font-size:0.8rem;">Thank you! Have a safe day.</div>`;

    document.getElementById('receipt-content').innerHTML = receipt;
    document.getElementById('receipt-modal').classList.remove('hidden');

    cart = [];

    if(revenueChartInst) {
        revenueChartInst.data.datasets[0].data[6] = totalRevenue;
        revenueChartInst.update();
    }
    if(financialHealthChartInst) {
        financialHealthChartInst.data.datasets[0].data[3] = 130000 + totalRevenue; 
        financialHealthChartInst.update();
    }
    refreshUI();
}

function exportTransactionsCSV() {
    if (salesHistory.length === 0) {
        return alert("No transaction data available to export.");
    }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Items Summary,Total Qty,Total Amount (PHP),Timestamp,Cashier\n";

    salesHistory.forEach(row => {
        let safeItems = row.items.replace(/,/g, " & "); 
        csvContent += `${row.txn},${safeItems},${row.qty},${row.total.toFixed(2)},${row.time},${row.cashier}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PharmaSync_Sales_Report_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function dismissAlert(alertId) {
    dismissedAlerts.push(alertId);
    refreshUI();
}

function initCharts() {
    const revCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChartInst = new Chart(revCtx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
            datasets: [{
                label: 'Gross Sales (₱)',
                data: [4200, 3900, 5100, 4800, 6200, 5500, totalRevenue],
                borderColor: '#0056b3', backgroundColor: 'rgba(0, 86, 179, 0.08)',
                borderWidth: 3, pointRadius: 4, pointBackgroundColor: '#20c997',
                tension: 0.4, fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display: false} } }
    });

    const demCtx = document.getElementById('demandChart').getContext('2d');
    new Chart(demCtx, {
        type: 'bar',
        data: {
            labels: ['Antibiotics', 'Analgesics', 'Vitamins', 'Antidiarrheals'],
            datasets: [{
                label: '7-Day Demand Spike (Units)',
                data: [150, 420, 110, 80], 
                backgroundColor: ['#e9ecef', '#20c997', '#e9ecef', '#e9ecef'],
                borderRadius: 4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: {display: false} } }
    });

    const velCtx = document.getElementById('velocityChart').getContext('2d');
    new Chart(velCtx, {
        type: 'line',
        data: {
            labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Today'],
            datasets: [{
                label: 'Cough & Cold Meds',
                data: [20, 25, 30, 45, 60, 85, 110],
                borderColor: '#dc3545', backgroundColor: 'rgba(220, 53, 69, 0.1)', fill: true, tension: 0.4
            }, {
                label: 'Standard Baseline',
                data: [22, 21, 24, 23, 25, 24, 26],
                borderColor: '#6c757d', borderDash: [5, 5], tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const reoCtx = document.getElementById('reorderChart').getContext('2d');
    new Chart(reoCtx, {
        type: 'doughnut',
        data: {
            labels: ['Urgent Reorder Required', 'Monitor Stock Closely', 'Sufficient Inventory'],
            datasets: [{
                data: [15, 30, 55],
                backgroundColor: ['#dc3545', '#ffc107', '#20c997']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, cutout: '70%' }
    });

    const finCtx = document.getElementById('financialHealthChart').getContext('2d');
    financialHealthChartInst = new Chart(finCtx, {
        type: 'bar',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr (Current)', 'May (Forecast)', 'Jun (Forecast)'],
            datasets: [
                {
                    type: 'line',
                    label: 'Gross Revenue (₱)',
                    data: [120000, 135000, 128000, 130000 + totalRevenue, 145200, 158000], 
                    borderColor: '#0056b3',
                    borderWidth: 3,
                    tension: 0.3,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Predicted Inventory Restock Needs (₱)',
                    data: [45000, 50000, 48000, 52000, 68000, 75000], 
                    backgroundColor: '#ffc107',
                    borderRadius: 4,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}

function processCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const lines = text.split('\n');
        let importedCount = 0;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; 

            const columns = line.split(',');

            if (columns.length >= 5) {
                const batch = columns[0].trim();
                const name = columns[1].trim();
                const stock = parseInt(columns[2].trim());
                const price = parseFloat(columns[3].trim());
                const expiry = columns[4].trim();

                if (batch && name && !isNaN(stock) && !isNaN(price) && expiry) {
                    db.push({
                        id: Date.now() + i, 
                        batch: batch,
                        name: name,
                        stock: stock,
                        price: price,
                        expiry: expiry,
                        rxRequired: false 
                    });
                    importedCount++;
                }
            }
        }

        document.getElementById('csv-import').value = '';

        if (importedCount > 0) {
            logHistory("Bulk Import", `Imported ${importedCount} new items via CSV.`);
            alert(`Success! Imported ${importedCount} items into the inventory.`);
            refreshUI(); 
        } else {
            alert("No valid items found. Please ensure your CSV follows the format: Batch, Name, Stock, Price, Expiry Date.");
        }
    };
    reader.readAsText(file);
}

function refreshUI() {
document.getElementById('dash-sales').innerText = `₱ ${totalRevenue.toFixed(2)}`;
document.getElementById('dash-stock').innerText = db.length;

let alertCount = 0;
const alertsHtml = db.map(item => {
    let alertBlock = '';
    
    if(item.stock <= 20) { 
        alertCount++; 
        alertBlock += `<div style="padding:15px; background:#fff3cd; color:#856404; margin-bottom:10px; border-radius:6px; border-left:5px solid var(--warning);"><strong>Critical Stock Alert:</strong> ${item.name} (${item.stock} remaining in batch ${item.batch})</div>`; 
    }
    
    if(item.expiry.startsWith("2026") && !dismissedAlerts.includes(item.batch)) { 
        alertCount++; 
        let dismissBtn = `<button class="btn btn-secondary" style="margin-top:10px; padding: 6px 12px; font-size: 0.8rem;" onclick="dismissAlert('${item.batch}')">Okay (Remove Alert)</button>`;
        alertBlock += `<div style="padding:15px; background:#f8d7da; color:#721c24; margin-bottom:10px; border-radius:6px; border-left:5px solid var(--danger);"><strong>Impending Expiry:</strong> ${item.name} (Batch ${item.batch}) expires on ${item.expiry}. Please monitor shelf life.<br>${dismissBtn}</div>`; 
    }
    
    return alertBlock;
}).join('');

document.getElementById('alerts-container').innerHTML = alertsHtml || '<p style="color:#888;">No active alerts at this time.</p>';
document.getElementById('dash-alerts-count').innerText = alertCount;

if (document.getElementById('inventory-tbody')) {
    const invSearch = document.getElementById('inv-search') ? document.getElementById('inv-search').value.toLowerCase() : '';
    const invFilter = document.getElementById('inv-filter') ? document.getElementById('inv-filter').value : 'all';
    
    const filteredInvDb = db.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(invSearch) || item.batch.toLowerCase().includes(invSearch);
        const matchesFilter = (invFilter === 'all') || 
                                (invFilter === 'rx' && item.rxRequired === true) || 
                                (invFilter === 'otc' && item.rxRequired === false);
        return matchesSearch && matchesFilter;
    });

    document.getElementById('inventory-tbody').innerHTML = filteredInvDb.map(item => {
        let badge = item.stock <= 20 ? `<span class="badge badge-warning">Low Stock</span>` : (item.expiry.startsWith("2026") ? `<span class="badge badge-danger">Expiring</span>` : `<span class="badge badge-success">Optimal</span>`);
        let rxIndicator = item.rxRequired ? `<span style="color: var(--danger); font-weight: bold; font-size: 0.8rem; margin-left: 5px;">[Rx]</span>` : '';
        return `<tr><td><strong>${item.batch}</strong></td><td>${item.name} ${rxIndicator}</td><td>${item.stock}</td><td>₱${item.price.toFixed(2)}</td><td>${item.expiry}</td><td>${badge}</td>
        <td><button class="btn btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="openInventoryModal(${item.id})">Update</button></td></tr>`;
    }).join('');
}

if (document.getElementById('pos-grid')) {
    const posSearch = document.getElementById('pos-search') ? document.getElementById('pos-search').value.toLowerCase() : '';
    const posFilter = document.getElementById('pos-filter') ? document.getElementById('pos-filter').value : 'all';
    
    const filteredPosDb = db.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(posSearch);
        const matchesFilter = (posFilter === 'all') || 
                                (posFilter === 'rx' && item.rxRequired === true) || 
                                (posFilter === 'otc' && item.rxRequired === false);
        return matchesSearch && matchesFilter;
    });
    
    document.getElementById('pos-grid').innerHTML = filteredPosDb.map(item => {
        let rxBadge = item.rxRequired ? `<span style="font-size:0.7rem; background:var(--danger); color:white; padding:2px 6px; border-radius:4px; margin-top:5px; display:inline-block;">Rx Required</span>` : '';
        return `<div class="pos-item-btn" onclick="addToCart(${item.id})">
                    <div>
                        <span style="font-weight:600; color:var(--dark); font-size:0.95rem; display:block;">${item.name}</span>
                        ${rxBadge}
                    </div>
                    <div style="margin-top:auto;">
                        <span style="display:block; font-size:1.4rem; font-weight:bold; color:var(--primary); margin-bottom:5px;">₱${item.price.toFixed(2)}</span>
                        <span style="font-size:0.8rem; color:#888; background:#f1f3f5; padding:3px 8px; border-radius:12px;">Stock: ${item.stock}</span>
                    </div>
                </div>`;
    }).join('');
    
    let cartTotal = 0;
    document.getElementById('cart-list').innerHTML = cart.map((item, index) => { 
        cartTotal += item.price; 
        let itemRxIcon = item.rxRequired ? `<span style="color:var(--danger); font-size:0.75rem; font-weight:bold;">[Rx]</span>` : '';
        return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px dashed var(--border); padding-bottom:5px;">
                    <div style="flex:1;">
                        <span style="display:block; font-size:0.9rem;">${item.name} ${itemRxIcon}</span>
                        <span style="font-weight:bold; color:var(--dark);">₱${item.price.toFixed(2)}</span>
                    </div>
                    <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem; height: 30px; border-radius:4px;" onclick="removeFromCart(${index})">✕</button>
                </div>`; 
    }).join('');
    document.getElementById('cart-subtotal').innerText = cartTotal.toFixed(2);
    document.getElementById('cart-total').innerText = cartTotal.toFixed(2);
    
    updateRecommendations(); // Triggers the new recommendation widget
}

// NEW: Added AI logic to compute discounts inside the Expiry Mitigation Protocol
const expiringItems = db.filter(item => item.expiry.startsWith("2026"));
const spHtml = expiringItems.map(item => {
    let today = new Date();
    let expDate = new Date(item.expiry);
    let diffTime = Math.abs(expDate - today);
    let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let suggestedDiscount = 10;
    if (diffDays <= 30 && item.stock > 50) suggestedDiscount = 50;
    else if (diffDays <= 30 && item.stock <= 50) suggestedDiscount = 30;
    else if (diffDays <= 90 && item.stock > 100) suggestedDiscount = 25;
    else if (diffDays <= 90) suggestedDiscount = 15;

    return `
    <div class="card" style="border-top-color: var(--warning);">
        <h3>Expiry Mitigation Protocol</h3>
        <p style="margin-top: 15px; font-size: 0.95rem; line-height: 1.6; color: #555;"><strong>Flagged SKU:</strong> ${item.name} (${item.batch})<br><strong>Status:</strong> Impending expiration on ${item.expiry}.</p>
        
        <div style="background: #e8f4f8; border-left: 4px solid #17a2b8; padding: 12px; border-radius: 4px; margin-top: 15px;">
            <strong style="color: #0c5460; font-size: 0.9rem;">🤖 AI Analysis:</strong>
            <p style="font-size: 0.85rem; color: #0c5460; margin-top: 5px; line-height: 1.4;">Remaining shelf life is <strong>${diffDays} days</strong> with <strong>${item.stock} units</strong> in stock. To optimize sell-through rate before expiration, the system suggests a <strong>${suggestedDiscount}% discount</strong>.</p>
            <button class="btn btn-outline" style="margin-top: 8px; padding: 4px 10px; font-size: 0.8rem; border-color: #17a2b8; color: #17a2b8;" onclick="document.getElementById('discount-slider-${item.id}').value = ${suggestedDiscount}; updatePricePreview(${item.id}, ${item.price});">Apply ${suggestedDiscount}% Suggestion</button>
        </div>

        <div class="form-group" style="margin-top: 20px;">
            <label>Dynamic Discount Slider</label>
            <input type="range" id="discount-slider-${item.id}" min="0" max="75" value="0" style="width:100%; margin: 10px 0;" oninput="updatePricePreview(${item.id}, ${item.price})">
            <div style="text-align: center; font-weight:bold; font-size: 1.2rem; color: var(--primary);" id="discount-val-${item.id}">0% OFF</div>
        </div>
        <div style="background: var(--dark); color: white; padding: 20px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
            <span style="font-size: 0.9rem; opacity: 0.8;">New POS Terminal Price:</span><br>
            <strong style="font-size: 2rem; color: var(--secondary);">₱ <span id="new-price-preview-${item.id}">${item.price.toFixed(2)}</span></strong>
        </div>
        <button class="btn btn-primary" style="width: 100%;" onclick="applySmartPrice(${item.id})">Apply to Database</button>
    </div>
`}).join('');
document.getElementById('smart-pricing-container').innerHTML = spHtml || '<p style="color: #666; font-size: 1.1rem; grid-column: 1 / -1;">No items currently flagged for smart pricing mitigation.</p>';

let salesHtml = `<tr><td colspan="6" style="text-align:center; color:#888;">No transactions processed yet.</td></tr>`;
if (salesHistory.length > 0) {
    salesHtml = salesHistory.map(log => `
        <tr>
            <td><strong>${log.txn}</strong></td>
            <td style="font-size:0.85rem; max-width:250px;">${log.items}</td>
            <td>${log.qty} items</td>
            <td style="font-weight:bold; color:var(--primary);">₱${log.total.toFixed(2)}</td>
            <td>${log.time}</td>
            <td>${log.cashier}</td>
        </tr>
    `).join('');
}

if(document.getElementById('sales-reports-tbody')) {
    document.getElementById('sales-reports-tbody').innerHTML = salesHtml;
}
if(document.getElementById('admin-sales-reports-tbody')) {
    document.getElementById('admin-sales-reports-tbody').innerHTML = salesHtml;
}

document.getElementById('users-tbody').innerHTML = usersDb.map(user => {
    let roleBadge = user.role === "Owner" ? `<span class="badge badge-success">Owner</span>` : `<span class="badge badge-warning">Employee</span>`;
    let statusColor = user.status === "Online" ? `var(--secondary)` : `#6c757d`;
    return `<tr>
        <td><strong>${user.name}</strong></td>
        <td>${roleBadge}</td>
        <td><span style="color: ${statusColor};">● ${user.status}</span></td>
        <td style="font-size: 0.85rem; color: #555;">${user.lastLogin}</td>
        <td style="font-size: 0.85rem; color: #555;">${user.lastLogout}</td>
    </tr>`;
}).join('');
}