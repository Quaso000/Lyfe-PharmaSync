document.getElementById('current-date').innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

let heartbeatInterval;
let tempOtp = null;
let batchToDelete = null;

// Your actual global variables
let currentUserRole = "";
let currentUserName = "";
let currentUserId = "";

let originalProfileData = {};
let currentUserPhone = "";
let currentUserSmsEnabled = true;

let dispatchedSmsAlerts = new Set();

// Dummy variables to prevent UI crash during testing
let db = [];
let cart = [];
let salesHistory = [];
let inventoryHistory = [];
let dismissedAlerts = [];
let totalRevenue = 0;
let revenueChartInst = null;
let financialHealthChartInst = null;


// =========================================
// ===== UI / DATA REFRESH FUNCTIONS =======
// =========================================

//   =============== WORKING FINE ===========
window.onload = async function() {
    const fd = new FormData();
    fd.append('action', 'check_session');

    try {
        const res = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await res.json();
        
        if (data.success) {
            // Restore Global Variables so the rest of the JS doesn't crash!
            currentUserRole = data.role;
            currentUserName = data.name;
            currentUserId = data.id;
            currentUserPhone = data.phone_number || "";
            currentUserSmsEnabled = data.sms_enabled == 1;

            // Restore UI details
            document.getElementById('user-role-display').innerText = data.role;
            document.getElementById('user-name-display').innerText = data.name;
            document.getElementById('user-name-display').setAttribute('data-userid', data.id);

            // Re-filter the sidebar modules based on role
            document.querySelectorAll('.module-link').forEach(btn => {
                const allowedRoles = btn.getAttribute('data-roles').split(',');
                btn.style.display = allowedRoles.includes(currentUserRole) ? 'block' : 'none';
            });

            // Bypass Login
            document.getElementById('auth-screen').classList.add('hidden');
            document.getElementById('app-sidebar').style.display = 'flex';
            document.getElementById('app-content').style.display = 'flex';
            
            startHeartbeat(); 
            await fetchInventoryList();
            await fetchSalesHistory();
            switchModule('dashboard');
            initCharts();
        }
    } catch (error) {
        console.error("Session check failed.", error);
    }
};

//   =============== WORKING FINE ===========
window.addEventListener('pagehide', function() {
    const userId = document.getElementById('user-name-display').getAttribute('data-userid');
    
    if (userId) {
        const fd = new FormData();
        fd.append('action', 'tab_closed');
        fd.append('user_id', userId); 
        
        navigator.sendBeacon('user_management.php', fd);
    }
});

//   =============== WORKING FINE ===========
window.addEventListener('DOMContentLoaded', () => {
    const otpBoxes = document.querySelectorAll('.otp-box');
    
    otpBoxes.forEach((box, i) => {
        box.addEventListener('input', function() {
            if (this.value.length === 1 && i < otpBoxes.length - 1) {
                otpBoxes[i + 1].focus();
            }
        });
        
        box.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && this.value === '' && i > 0) {
                otpBoxes[i - 1].focus();
            }
        });

        box.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/[^0-9]/g, '');
            pastedData.split('').forEach((char, index) => {
                if (index < otpBoxes.length) {
                    otpBoxes[index].value = char;
                    if (index < otpBoxes.length - 1) otpBoxes[index + 1].focus();
                }
            });
        });
    });
});

//   =============== WORKING FINE ===========
function startHeartbeat() {
    heartbeatInterval = setInterval(() => {
        const fd = new FormData();
        fd.append('action', 'heartbeat');
        fetch('user_management.php', { method: 'POST', body: fd });
    }, 60000); 
}

//   =============== WORKING FINE ===========
function switchModule(modId) {
    document.querySelectorAll('.module').forEach(m => m.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(modId).classList.add('active');

    const activeBtn = document.querySelector(`.nav-btn[data-target="${modId}"]`);
    if(activeBtn) activeBtn.classList.add('active');

    if(modId === 'users') {
        fetchUsersList();
    }

    if(modId === 'inventory') {
        fetchInventoryList();
    }

    if(modId === 'expiry-alerts') {
        renderSmsSettings();
    }
}

//   =============== WORKING FINE ===========
function closeModal(id) { 
    document.getElementById(id).classList.add('hidden'); 
}

// =========================================
// ===== AUTHENTICATION FUNCTIONS ==========
// =========================================

//   =============== WORKING FINE ===========
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.remove('active');
    document.getElementById('tab-signup').classList.remove('active');
    
    // Hide ALL auth sections dynamically
    const sections = ['login', 'signup', 'forgot', 'loading', 'otp'];
    sections.forEach(sec => {
        const el = document.getElementById(`form-${sec}`);
        if(el) el.classList.add('hidden');
    });

    if(tab === 'login' || tab === 'signup') {
        document.getElementById(`tab-${tab}`).classList.add('active');
        document.getElementById(`form-${tab}`).classList.remove('hidden');
    } else {
        // Show forgot, loading, or otp sections without highlighting top tabs
        document.getElementById(`form-${tab}`).classList.remove('hidden');
    }
}

//   =============== WORKING FINE ===========
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
        currentUserPhone = data.user.phone_number || "";
        currentUserSmsEnabled = data.user.sms_enabled == 1;

        document.getElementById('user-role-display').innerText = currentUserRole;
        document.getElementById('user-name-display').innerText = currentUserName;
        document.getElementById('user-name-display').setAttribute('data-userid', data.user.id);

        // para ipakita yung modules na kaya nilang iaccess based on roles
        document.querySelectorAll('.module-link').forEach(btn => {
            const allowedRoles = btn.getAttribute('data-roles').split(',');
            btn.style.display = allowedRoles.includes(currentUserRole) ? 'block' : 'none';
        });

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-sidebar').style.display = 'flex';
        document.getElementById('app-content').style.display = 'flex';

    } catch (error) {
        console.error("System error: ", error);
        alert("A connection error occurred with the server. Please ensure the database hosting is up.")
    }
    
    await fetchInventoryList();
    await fetchSalesHistory();
    switchModule('dashboard');
    initCharts();
    renderSmsSettings(); 
}

//   =============== WORKING FINE ===========
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === "password" ? "text" : "password";
}

//   =============== WORKING FINE ===========
async function handleSignup(event) {
    if (event) {
        event.preventDefault();
    }
    

    let rawFirstName = document.getElementById('signup-firstname').value.trim();
    let rawSurname = document.getElementById('signup-surname').value.trim();
    let rawMI = document.getElementById('signup-middleInitial').value.trim();

    const firstName = rawFirstName ? rawFirstName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : '';
    const middleInitial = rawSurname ? rawSurname.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ') : '';
    const surname = rawMI ? rawMI.replace(/\./g, '').toUpperCase() : '';

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

//   =============== WORKING FINE ===========
async function handleLogout() {
    const userId = document.getElementById('user-name-display').getAttribute('data-userid');

    const toBeSend = new FormData();
    toBeSend.append('action', 'logout');
    toBeSend.append('user_id', userId);
    
    try {
        await fetch('authentication.php', {
            method: 'POST',
            body: toBeSend
        });

        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app-sidebar').style.display = 'none';
        document.getElementById('app-content').style.display = 'none';

        document.getElementById('login-pwd').value = '';
        document.getElementById('login-user').value = '';
        document.getElementById('user-name-display').removeAttribute('data-userid');

        currentUserRole = "";
        currentUserName = "";
        currentUserId = "";
        originalProfileData = {};
        db = [];
        cart = [];
        salesHistory = [];
        inventoryHistory = [];

        const profileInputs = ['inp-fname', 'inp-mi', 'inp-lname', 'inp-email', 'inp-phone', 'inp-username'];
        profileInputs.forEach(id => {
            const el = document.getElementById(id);
            if(el) {
                el.value = '';
                el.disabled = true;
            }
        });
        document.getElementById('profile-footer').classList.add('hidden');
        
        // 5. Reset the Users module to the default Personnel tab
        switchUserTab('personnel');
        switchAuthTab('login'); 

    } catch (error) {
        console.error("Logout Error: ", error);
        alert("A connection error occurred while logging out.");
    }
}

//   =============== WORKING FINE ===========
function showForgotPassword() {
    switchAuthTab('forgot'); // Now cleanly uses your switch function
}

//   =============== WORKING FINE ===========
async function handleForgotPassword() {
    const identifier = document.getElementById('forgot-identifier').value.trim();
    if(!identifier) return alert("Please enter your email or username.");

    const toBeSend = new FormData();
    toBeSend.append('action', 'forgot_password');
    toBeSend.append('identifier', identifier);

    try {
        const response = await fetch('authentication.php', { 
            method: 'POST', 
            body: toBeSend }
        );

        // having it text first then parsing to prevent crash
        const textToParse = await response.text();

        let data;
        try{
            data = JSON.parse(textToParse);
        } catch (e){
            console.error("PHP Error Output:", textToParse);
            return alert("System Error: The server returned an invalid response. Check the F12 console.");
        }

        if (!data.success) {
            return alert(data.message); // Stops here if username is wrong
        }

        // Step 1: Switch to Loading UI
        // Step 2: Username exists! Show the loading UI.
        switchAuthTab('loading');

        const loadingSection = document.getElementById('form-loading');
        const originalLoadingHTML = loadingSection.innerHTML;

        // Step 3: Simulate the SMS Gateway delay (2 seconds)
        setTimeout(() => {
            // Generate the fake OTP for testing
            tempOtp = Math.floor(100000 + Math.random() * 900000).toString();
            console.log(`%c[PharmaSync] Simulated OTP for ${identifier}: ${tempOtp}`, 'color: #20c997; font-size: 16px; font-weight: bold;');

            // Show success transition
            loadingSection.innerHTML = `
                <i class="fa-solid fa-circle-check" style="font-size: 45px; color: #20c997; margin-bottom: 20px;"></i>
                <h2 class="form-heading">OTP Sent!</h2>
                <p class="form-subheading">A verification code has been sent to ${data.masked_phone}.</p>
            `;

            // Step 4: Switch to the OTP input screen
            setTimeout(() => {
                // Inject the masked phone number from the database into the UI
                document.getElementById('otp-phone-display').innerText = data.masked_phone;
                
                switchAuthTab('otp');
                
                const firstBox = document.querySelector('.otp-box');
                if(firstBox) firstBox.focus();

                setTimeout(() => { loadingSection.innerHTML = originalLoadingHTML; }, 500);
            }, 2000);

        }, 2000);
    } catch (error) {
        console.error("Database connection error: ", error);
        alert("A connection error occurred. Please check if the server is running.");
    }
}

//   =============== WORKING FINE ===========
async function verifyOTP(event) {
    event.preventDefault();
    
    const otpBoxes = document.querySelectorAll('.otp-box');
    let enteredCode = '';
    otpBoxes.forEach(box => enteredCode += box.value);

    if (enteredCode === tempOtp) {
        const identifier = document.getElementById('forgot-identifier').value.trim();
        const toBeSend = new FormData();
        toBeSend.append('action', 'reset_password_default');
        toBeSend.append('identifier', identifier);

        try {
            const response = await fetch('authentication.php', {
                method: 'POST',
                body: toBeSend
            });
            const data = await response.json();
            
            if (!data.success){
                return alert("Database Error: " + data.message);
            }
            
            // Step 1: Switch back to the loading/transition container
            switchAuthTab('loading');
            
            const loadingSection = document.getElementById('form-loading');
    
            // Step 2: Inject the Success Message with the highlighted default password AND an action button
            loadingSection.innerHTML = `
                <i class="fa-solid fa-circle-check" style="font-size: 45px; color: #20c997; margin-bottom: 20px;"></i>
                <h2 class="form-heading">Verification Complete</h2>
                <p class="form-subheading" style="font-size: 15px; color: #333; line-height: 1.6;">
                    Your identity has been verified.<br><br>
                    Your password has been reset to: <br>
                    <strong style="display: inline-block; margin-top: 10px; font-size: 22px; color: #2563eb; background: #e0e7ff; padding: 6px 16px; border-radius: 6px; letter-spacing: 2px;">123</strong>
                </p>
                <button class="submit-btn btn-blue" style="margin-top: 25px;" onclick="finishPasswordReset()">Okay</button>
            `;
        } catch (error) {
            console.error("Password reset error: ", error);
            alert("A connection error occurred while resetting the password.");
        }

    } else {
        // For an invalid OTP, visually flash the boxes red
        otpBoxes.forEach(box => {
            box.style.borderColor = '#dc3545';
            box.style.backgroundColor = '#f8d7da';
            box.style.color = '#dc3545';
        });

        // Wait 1 second, then clear the boxes and let them try again
        setTimeout(() => {
            otpBoxes.forEach(box => {
                box.style.borderColor = '';
                box.style.backgroundColor = '';
                box.style.color = '';
                box.value = ''; 
            });
            otpBoxes[0].focus(); 
        }, 1000);
    }
}

//   =============== WORKING FINE ===========
function finishPasswordReset() {
    // Clear inputs
    document.getElementById('forgot-identifier').value = ''; 
    document.querySelectorAll('.otp-box').forEach(box => box.value = ''); 
    
    // Redirect to login
    switchAuthTab('login');

    // Quietly restore the original loading spinner HTML in the background for the next user
    setTimeout(() => {
        document.getElementById('form-loading').innerHTML = `
            <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 45px; color: #2563eb; margin-bottom: 20px;"></i>
            <h2 class="form-heading">Sending OTP...</h2>
            <p class="form-subheading">Please wait while we generate your code.</p>
        `;
    }, 500);
}

// =========================================
// ======== USER MODULE FUNCTIONS ==========
// =========================================

//   =============== WORKING FINE ===========
function switchUserTab(tab) {
    document.getElementById('utab-personnel').className = 'tab-btn inactive';
    document.getElementById('utab-profile').className = 'tab-btn inactive';
    document.getElementById('usec-personnel').classList.add('hidden');
    document.getElementById('usec-profile').classList.add('hidden');

    if (tab === 'personnel') {
        document.getElementById('utab-personnel').className = 'tab-btn active-blue';
        document.getElementById('usec-personnel').classList.remove('hidden');
    } else if (tab === 'profile') {
        document.getElementById('utab-profile').className = 'tab-btn active-blue';
        document.getElementById('usec-profile').classList.remove('hidden');
        loadProfileData(); 
    }
}

//   =============== WORKING FINE ===========
async function approveUser(userId) {
    if (!confirm("Are you sure you want to approve this account and grant system access?")) {
        return;
    }

    const fd = new FormData();
    fd.append('action', 'approve_user');
    fd.append('target_id', userId);

    try {
        const response = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await response.json();

        if (data.success) {
            alert("Account successfully approved. The employee can now log in.");
            fetchUsersList(); // Instantly refresh the table to show the new 'Offline' status
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Approval error: ", error);
        alert("A connection error occurred while trying to approve the account.");
    }
}

//   =============== WORKING FINE ===========
async function fetchUsersList() {
    const toBeSend = new FormData();
    toBeSend.append('action', 'fetch_users');
    
    try {
        const response = await fetch('user_management.php', { method: 'POST', body: toBeSend });
        const data = await response.json();
        
        if (data.success) {
            const tbody = document.getElementById('personnel-tbody');
            const actionHeader = document.getElementById('admin-action-header');
            
            // Show the "Manage" column header ONLY for the Owner
            if (currentUserRole === 'Owner') {
                actionHeader.style.display = 'table-cell';
            } else {
                actionHeader.style.display = 'none';
            }
            
            tbody.innerHTML = data.users.map(user => {
                let mi = user.middle_initial ? `${user.middle_initial}. ` : '';
                let fullName = `${user.first_name} ${mi}${user.last_name}`;
                
                let statusColor;
                if (user.status === 'Online') statusColor = '#28a745'; 
                else if (user.status === 'Idle') statusColor = '#ffc107'; 
                else if (user.status === 'Pending') statusColor = '#fd7e14'; 
                else statusColor = '#6c757d'; 
                
                let roleBadge = (user.role_name === "Owner")
                                ? `<span class="badge badge-success">${user.role_name}</span>` 
                                : `<span class="badge badge-warning">${user.role_name}</span>`;

                let lastLoginDisplay = user.last_login ? user.last_login : '<i style="color:#aaa;">Never logged in</i>';

                // Render Action Button Logic
                let actionCell = '';
                if (currentUserRole === 'Owner') {
                    if (user.status === 'Pending') {
                        actionCell = `<td>
                            <div style="display: flex; gap: 5px;">
                                <button class="btn" style="background: #28a745; color: white; padding: 4px 10px; font-size: 0.8rem;" onclick="approveUser(${user.user_id})">Approve</button>
                                <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="voidUser(${user.user_id})">Void</button>
                            </div>
                        </td>`;
                    } else {
                        // If they are an employee (not an Owner) and they aren't the current user logged in
                        if (user.role_name === 'Employee' && parseInt(user.user_id) !== parseInt(currentUserId)) {
                            actionCell = `<td><button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem;" onclick="promoteUser(${user.user_id}, '${user.first_name}')">Make Owner</button></td>`;
                        } else {
                            actionCell = `<td><span style="color:#aaa; font-size:0.85rem;">No Actions</span></td>`;
                        }
                    }
                }

                return `<tr>
                    <td><strong>${fullName}</strong></td>
                    <td>${roleBadge}</td>
                    <td><span style="color: ${statusColor}; font-weight: bold;">● ${user.status}</span></td>
                    <td style="font-size: 0.85rem; color: #555;">${lastLoginDisplay}</td>
                    ${actionCell}
                </tr>`;
            }).join('');
        }
    } catch (error) {
        console.error("Failed to load users: ", error);
    }
}

//   =============== WORKING FINE ===========
async function updatePassword() {
    const currentInput = document.getElementById('cp-current').value;
    const newInput = document.getElementById('cp-new').value;
    const confirmInput = document.getElementById('cp-confirm').value;

    if (!currentInput || !newInput || !confirmInput) {
        return alert("Please fill in all password fields.");
    }

    if (newInput !== confirmInput) {
        return alert("Validation Failed: New passwords do not match.");
    }

    if (newInput === currentInput) {
        return alert("Error: New password cannot be the same as your old password.");
    }

    const fd = new FormData();
    fd.append('action', 'update_password');
    fd.append('current_password', currentInput);
    fd.append('new_password', newInput);

    try {
        const response = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await response.json();

        if (!data.success) {
            return alert("Validation Failed: " + data.message);
        }

        // Clear the fields on success
        document.getElementById('cp-current').value = '';
        document.getElementById('cp-new').value = '';
        document.getElementById('cp-confirm').value = '';

        alert("Success! Your password has been updated securely.");
    } catch (error) {
        console.error("Password update error: ", error);
        alert("A connection error occurred with the server.");
    }
}

//   =============== WORKING FINE ===========
async function voidUser(userId) {
    if (!confirm("Are you sure you want to void and permanently delete this account request?")) {
        return;
    }

    const fd = new FormData();
    fd.append('action', 'void_user');
    fd.append('target_id', userId);

    try {
        const response = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await response.json();

        if (data.success) {
            alert("Account request has been successfully voided and removed.");
            fetchUsersList(); // Refresh the table
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Void error: ", error);
        alert("A connection error occurred while trying to void the account.");
    }
}

//   =============== WORKING FINE ===========
async function promoteUser(userId, firstName) {
    if (!confirm(`Are you sure you want to promote ${firstName} to an Owner? They will be granted full system access.`)) {
        return;
    }

    const toBeSend = new FormData();
    toBeSend.append('action', 'promote_user');
    toBeSend.append('target_id', userId);

    try {
        const response = await fetch('user_management.php', { method: 'POST', body: toBeSend });
        const data = await response.json();

        if (data.success) {
            alert(`${firstName} has been successfully promoted to Owner.`);
            fetchUsersList(); // Refresh the table
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Promotion error: ", error);
        alert("A connection error occurred while trying to promote the account.");
    }
}

//   =============== WORKING FINE ===========
async function loadProfileData() {
    const fd = new FormData();
    fd.append('action', 'get_profile');
    try {
        const res = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.success) {
            originalProfileData = data.profile;
            document.getElementById('inp-fname').value = data.profile.first_name;
            document.getElementById('inp-mi').value = data.profile.middle_initial;
            document.getElementById('inp-lname').value = data.profile.last_name;
            document.getElementById('inp-email').value = data.profile.email;
            document.getElementById('inp-phone').value = data.profile.phone_number;
            document.getElementById('inp-username').value = data.profile.username;
        }
    } catch (error) {
        console.error("Failed to load profile data", error);
    }
}

//   =============== WORKING FINE ===========
function toggleEditProfile() {
    const isDisabled = document.getElementById('inp-fname').disabled;
    const inputs = ['inp-fname', 'inp-mi', 'inp-lname', 'inp-email', 'inp-phone', 'inp-username'];
    
    if (isDisabled) {
        inputs.forEach(id => document.getElementById(id).disabled = false);
        document.getElementById('btn-edit-profile').innerText = "Cancel Editing";
        document.getElementById('btn-edit-profile').classList.replace('btn-outline', 'btn-secondary');
    } else {
        cancelEditProfile();
    }
}

//   =============== WORKING FINE ===========
function cancelEditProfile() {
    document.getElementById('inp-fname').value = originalProfileData.first_name;
    document.getElementById('inp-mi').value = originalProfileData.middle_initial;
    document.getElementById('inp-lname').value = originalProfileData.last_name;
    document.getElementById('inp-email').value = originalProfileData.email;
    document.getElementById('inp-phone').value = originalProfileData.phone_number;
    document.getElementById('inp-username').value = originalProfileData.username;
    
    ['inp-fname', 'inp-mi', 'inp-lname', 'inp-email', 'inp-phone', 'inp-username'].forEach(id => document.getElementById(id).disabled = true);
    document.getElementById('profile-footer').classList.add('hidden');
    document.getElementById('btn-edit-profile').innerText = "Edit Profile";
    document.getElementById('btn-edit-profile').classList.replace('btn-secondary', 'btn-outline');
}

['inp-fname', 'inp-mi', 'inp-lname', 'inp-email', 'inp-phone', 'inp-username'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
        document.getElementById('profile-footer').classList.remove('hidden');
    });
});

//   =============== WORKING FINE ===========
async function saveProfileChanges() {
    const fd = new FormData();
    fd.append('action', 'update_profile');
    
    const fn = document.getElementById('inp-fname').value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    const ln = document.getElementById('inp-lname').value.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    fd.append('first_name', fn);
    fd.append('middle_initial', document.getElementById('inp-mi').value);
    fd.append('last_name', ln);
    fd.append('email', document.getElementById('inp-email').value);
    fd.append('phone_number', document.getElementById('inp-phone').value);
    fd.append('username', document.getElementById('inp-username').value);

    try {
        const res = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await res.json();

        if (data.success) {
            alert("Profile successfully updated.");
            document.getElementById('user-name-display').innerText = `${fn} ${ln}`;
            await loadProfileData();
            cancelEditProfile();
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        alert("A connection error occurred.");
    }
}


// =========================================
// ===== INVENTORY MODULE FUNCTIONS ========
// =========================================

//   =============== WORKING FINE ===========
async function fetchInventoryList() {
    const fd = new FormData();
    fd.append('action', 'fetch_inventory');
    
    try {
        const response = await fetch('inventory.php', { method: 'POST', body: fd });
        const data = await response.json();
        
        if (data.success) {
            // Overwrite the global db array with real data so POS and Alerts can use it too!
            db = data.inventory; 
            renderInventoryTable();
            // Call refreshUI to update dashboard cards (but NOT the table)
            refreshUI(); 
        }
    } catch (error) {
        console.error("Connection error while fetching inventory:", error);
    }
}

//   =============== WORKING FINE ===========
function renderInventoryTable() {
    const tbody = document.getElementById('inventory-tbody');
    if (!tbody) return;

    const invSearch = document.getElementById('inv-search').value.toLowerCase();
    const invFilter = document.getElementById('inv-filter').value;
    
    const filteredDb = db.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(invSearch) || item.batch.toLowerCase().includes(invSearch);
        const matchesFilter = (invFilter === 'all') || (item.drug_type === invFilter);
        return matchesSearch && matchesFilter;
    });

    tbody.innerHTML = filteredDb.map(item => {
        let badgeClass = 'badge-success'; 
        if (item.status === 'Low Stock') badgeClass = 'badge-warning';
        if (item.status === 'Expiring Soon' || item.status === 'Expired') badgeClass = 'badge-danger';

        let statusBadge = `<span class="badge ${badgeClass}">${item.status}</span>`;
        let rxBadge = item.drug_type === 'Rx' ? `<span style="color: var(--danger); font-weight: bold; font-size: 0.8rem; margin-left: 5px;">[Rx]</span>` : '';

        return `<tr>
            <td><strong>${item.batch}</strong></td>
            <td>${item.name} ${rxBadge}</td>
            <td style="font-size: 0.85rem; color: #555;">${item.category}</td>
            <td>${item.stock}</td>
            <td style="font-weight: 600; color: var(--primary);">₱${item.price.toFixed(2)}</td>
            <td>${item.expiry}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <button class="btn btn-outline" style="padding: 4px 10px; font-size: 0.8rem;" onclick="openInventoryModal(${item.id})">Edit</button>
                    <button class="btn btn-danger" style="padding: 4px 10px; font-size: 0.8rem;" onclick="showDeleteConfirm(${item.id})">Delete</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

//   =============== WORKING FINE ===========
async function deleteInventory(batchId) {
    // Standard browser confirmation box
    if (!confirm("Are you sure you want to permanently delete this inventory batch? This action cannot be undone.")) {
        return;
    }

    const fd = new FormData();
    fd.append('action', 'delete_inventory');
    fd.append('batch_id', batchId);

    try {
        const response = await fetch('inventory.php', { method: 'POST', body: fd });
        const data = await response.json();

        if (data.success) {
            alert("Inventory batch deleted successfully.");
            fetchInventoryList(); // Instantly refresh the table
        } else {
            alert("Error: " + data.message);
        }
    } catch (error) {
        console.error("Delete error: ", error);
        alert("A connection error occurred while trying to delete the item.");
    }
}

//   =============== WORKING FINE ===========
function openInventoryModal(id = null) {
    const isEdit = id !== null;
    document.getElementById('inv-modal-title').innerText = isEdit ? "Update Inventory Record" : "Register New Batch";
    const item = isEdit ? db.find(i => i.id === id) : {id:'', batch:'', name:'', stock:'', price:'', expiry:'', drug_type: 'OTC', category: ''};

    document.getElementById('inv-id').value = item.id;
    document.getElementById('inv-batch').value = item.batch;
    document.getElementById('inv-stock').value = item.stock;
    document.getElementById('inv-price').value = item.price;
    document.getElementById('inv-expiry').value = item.expiry;
    document.getElementById('inv-rx').checked = (item.drug_type === 'Rx');
    
    document.getElementById('inv-name').value = isEdit ? item.name : '';
    document.getElementById('inv-category').value = isEdit ? item.category : '';
    document.getElementById('inv-brand').value = ''; 

    // Lock the master product details if editing an existing physical batch
    document.getElementById('inv-name').disabled = isEdit; 
    document.getElementById('inv-category').disabled = isEdit;
    document.getElementById('inv-brand').disabled = isEdit;

    // (The buggy inv-btn-delete logic has been completely removed from here)

    document.getElementById('inventory-modal').classList.remove('hidden');
}

//   =============== WORKING FINE ===========
async function saveInventory() {
    const id = document.getElementById('inv-id').value;
    const data = new FormData();
    
    // Capitalization Formatter: Capitalizes the first letter of every word
    const toTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
    
    data.append('action', id ? 'update_inventory' : 'add_inventory');
    if (id) data.append('batch_id', id);
    
    data.append('batch_number', document.getElementById('inv-batch').value);
    data.append('quantity_in_stock', document.getElementById('inv-stock').value);
    data.append('selling_price', document.getElementById('inv-price').value);
    data.append('expiry_date', document.getElementById('inv-expiry').value);
    data.append('drug_type', document.getElementById('inv-rx').checked ? 'Rx' : 'OTC');

    // Apply formatting to text fields
    data.append('name', toTitleCase(document.getElementById('inv-name').value.trim()));
    data.append('brand_name', toTitleCase(document.getElementById('inv-brand').value.trim()));
    data.append('category', toTitleCase(document.getElementById('inv-category').value.trim()));

    try {
        const res = await fetch('inventory.php', { method: 'POST', body: data });
        const json = await res.json();
        if(json.success) {
            alert(json.message);
            closeModal('inventory-modal');
            fetchInventoryList(); 
        } else {
            alert("Error: " + json.message);
        }
    } catch(e) {
        alert("A connection error occurred.");
    }
}

//   =============== WORKING FINE ===========
function showDeleteConfirm(id) {
    batchToDelete = id;
    document.getElementById('delete-confirm-modal').classList.remove('hidden');
}

//   =============== WORKING FINE ===========
async function confirmDelete() {
    if (!batchToDelete) return;
    
    const fd = new FormData();
    fd.append('action', 'delete_inventory');
    fd.append('batch_id', batchToDelete);

    try {
        const response = await fetch('inventory.php', { method: 'POST', body: fd });
        const data = await response.json();

        if (data.success) {
            alert("Inventory batch deleted successfully.");
            closeModal('delete-confirm-modal');
            fetchInventoryList(); 
        } else {
            alert("Error: " + data.message);
            closeModal('delete-confirm-modal');
        }
    } catch (error) {
        alert("A connection error occurred.");
    }
}

//   =============== WORKING FINE ===========
async function openHistoryModal() {
    const fd = new FormData();
    fd.append('action', 'fetch_history');
    
    try {
        const res = await fetch('inventory.php', { method: 'POST', body: fd });
        const data = await res.json();
        const tbody = document.getElementById('history-tbody');
        
        if (data.success && data.logs.length > 0) {
            tbody.innerHTML = data.logs.map(log => {
                // Ensure POS Sales get a distinct badge color (primary/blue)
                let badgeColor = (log.action === 'New Item' || log.action === 'Bulk Import' || log.action === 'Inventory Entry') ? 'badge-success' : 
                                 (log.action === 'Update' || log.action === 'Smart Pricing' || log.action === 'Rx Verification') ? 'badge-warning' : 
                                 (log.action === 'POS Sale') ? 'badge-primary' : 'badge-danger';
                
                return `<tr>
                    <td style="font-size: 0.85rem; color: #555;">${log.time}</td>
                    <td><strong>${log.user}</strong></td>
                    <td><span class="badge ${badgeColor}">${log.action}</span></td>
                    <td style="font-size: 0.9rem; color: #444;">${log.desc}</td>
                </tr>`;
            }).join('');
        } else {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#888;">No history recorded yet.</td></tr>`;
        }
        
        document.getElementById('history-modal').classList.remove('hidden');
    } catch (e) {
        alert("Failed to fetch history.");
    }
}

//   =============== WORKING FINE ===========
function processCSVImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
        alert("Invalid file format. Please upload a .csv file.");
        event.target.value = ''; 
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(e) {
        // Strip hidden carriage returns that corrupt Excel CSV exports
        const text = e.target.result.replace(/\r/g, ""); 
        const lines = text.split('\n');
        let validData = [];

        const toTitleCase = (str) => str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue; 
            
            const columns = line.split(',');
            
            // As long as Batch Code and Name exist, the system will autofill the rest
            if (columns.length >= 2 && columns[0].trim() !== "" && columns[1].trim() !== "") {
                
                let rawBrand = columns[2] ? columns[2].trim() : "";
                let rawCategory = columns[3] ? columns[3].trim() : "";
                
                validData.push({
                    batch: columns[0].trim().toUpperCase(),
                    name: toTitleCase(columns[1].trim()),
                    // Auto-Default Handlers for blank Excel cells
                    brand: rawBrand ? toTitleCase(rawBrand) : 'Generic', 
                    category: rawCategory ? toTitleCase(rawCategory) : 'Uncategorized',
                    stock: parseInt(columns[4]) || 0, 
                    price: parseFloat(columns[5]) || 0.00,
                    expiry: columns[6] ? columns[6].trim() : ''
                });
            }
        }

        document.getElementById('csv-import').value = '';

        if (validData.length > 0) {
            const fd = new FormData();
            fd.append('action', 'import_csv');
            fd.append('csv_data', JSON.stringify(validData));

            try {
                const res = await fetch('inventory.php', { method: 'POST', body: fd });
                const json = await res.json();
                if (json.success) {
                    alert(json.message);
                    fetchInventoryList(); 
                } else {
                    alert("Database Error: " + json.message);
                }
            } catch(err) {
                alert("Connection error during bulk import.");
            }
        } else {
            alert(`Import Failed. Please ensure your CSV has data in the required columns (Batch Code and Medication Name).`);
        }
    };
    reader.readAsText(file);
}

// =========================================
// ======= EXPIRY & SMS ALERT SYSTEM =======
// =========================================

//   =============== WORKING FINE ===========
function renderSmsSettings() {
    // Uses the browser's local storage to save preferences tied directly to the logged-in user
    let inputArea = document.getElementById('sms-input-area');
    let displayArea = document.getElementById('sms-display-area');
    let toggle = document.getElementById('sms-toggle');
    let statusMsg = document.getElementById('sms-status-msg');

    // Sync toggle switch to database state
    toggle.checked = currentUserSmsEnabled;

    if (currentUserPhone) {
        inputArea.style.display = 'none';
        displayArea.style.display = 'flex';
        document.getElementById('saved-number-display').innerText = currentUserPhone;
    } else {
        inputArea.style.display = 'flex';
        displayArea.style.display = 'none';
        document.getElementById('user-phone').value = '';
    }

    if (currentUserSmsEnabled && currentUserPhone) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--secondary)';
        statusMsg.innerText = `✅ Active: Alerts are currently routing to ${currentUserPhone}`;
    } else if (!currentUserSmsEnabled && currentUserPhone) {
        statusMsg.style.display = 'block';
        statusMsg.style.color = 'var(--danger)';
        statusMsg.innerText = `❌ Paused: Alerts are currently disabled. Flip the switch above to resume.`;
    } else {
        statusMsg.style.display = 'none';
    }
}

//   =============== WORKING FINE ===========
async function saveSmsNumber() {
    let phoneInput = document.getElementById('user-phone').value.trim();
    if(!phoneInput) return alert("Please enter a valid phone number.");

    const fd = new FormData();
    fd.append('action', 'update_phone');
    fd.append('phone_number', phoneInput);

    try {
        const res = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await res.json();
        
        if (data.success) {
            alert(`Success! Contact number updated. SMS Alerts are now enabled.`);
            
            // Sync globally so UI updates instantly
            currentUserPhone = phoneInput;
            currentUserSmsEnabled = true; 
            
            if (document.getElementById('inp-phone')) {
                document.getElementById('inp-phone').value = phoneInput;
            }
            if (originalProfileData) {
                originalProfileData.phone_number = phoneInput;
            }
            
            renderSmsSettings();
        } else {
            alert("Error: " + data.message);
        }
    } catch (e) {
        alert("A connection error occurred.");
    }
}

//   =============== WORKING FINE ===========
function editSmsNumber() {
    document.getElementById('sms-input-area').style.display = 'flex';
    document.getElementById('sms-display-area').style.display = 'none';
    document.getElementById('user-phone').value = currentUserPhone;
    document.getElementById('sms-status-msg').style.display = 'none';
}

//   =============== WORKING FINE ===========
async function toggleSmsAlerts() {
    let toggle = document.getElementById('sms-toggle');

    if (!currentUserPhone && toggle.checked) {
        toggle.checked = false; 
        return alert("Please save a contact number first before enabling SMS alerts.");
    }

    const fd = new FormData();
    fd.append('action', 'toggle_sms');
    fd.append('is_enabled', toggle.checked);

    try {
        const res = await fetch('user_management.php', { method: 'POST', body: fd });
        const data = await res.json();
        
        if (data.success) {
            currentUserSmsEnabled = toggle.checked;
            renderSmsSettings(); 
        } else {
            toggle.checked = !toggle.checked; // Revert switch if DB fails
            alert("Failed to save preference to database.");
        }
    } catch(e) {
        toggle.checked = !toggle.checked; 
        alert("A connection error occurred.");
    }
}

//   =============== WORKING FINE ===========
function dismissAlert(alertId) {
    dismissedAlerts.push(alertId);
    refreshUI();
}

//   =============== WORKING FINE ===========
function simulateSmsDispatch() {
    // Abort if alerts are disabled or no phone number is registered
    if (!currentUserSmsEnabled || !currentUserPhone) return;

    db.forEach(item => {
        let message = "";
        let alertKey = ""; 

        if (item.status === 'Low Stock') {
            message = `Lyfe Pharmacy Alert: CRITICAL STOCK. ${item.name} is down to ${item.stock} units (Batch: ${item.batch}).`;
            alertKey = `low_stock_${item.batch}`;
        } else if (item.status === 'Expiring Soon' || item.status === 'Expired') {
            let urgency = item.status === 'Expired' ? 'EXPIRED' : 'EXPIRING SOON';
            message = `Lyfe Pharmacy Alert: ${urgency}. ${item.name} (Batch: ${item.batch}) expires on ${item.expiry}.`;
            alertKey = `expiry_${item.batch}`;
        }

        // Fire the alert only if it exists, hasn't been sent yet this session, and hasn't been manually dismissed
        if (message !== "" && !dispatchedSmsAlerts.has(alertKey) && !dismissedAlerts.includes(item.batch)) {
            
            // Prints a highly visible blue SMS pill in the F12 Developer Console
            console.log(`%c[SMS SENT TO ${currentUserPhone}]`, 'color: #fff; background: #2563eb; padding: 2px 6px; border-radius: 4px; font-weight: bold;', message);
            
            dispatchedSmsAlerts.add(alertKey);
        }
    });
}


// =========================================
// === SMART PRICING MODULE FUNCTION =======
// =========================================

//   =============== WORKING FINE ===========
async function applySmartPrice(id) {
    const newPriceText = document.getElementById(`new-price-preview-${id}`).innerText;
    const newPrice = parseFloat(newPriceText);
    
    let item = db.find(i => i.id === id);
    if (!item) return;

    const oldPrice = item.price;
    
    const fd = new FormData();
    fd.append('action', 'apply_smart_price');
    fd.append('batch_id', item.id);
    fd.append('new_price', newPrice);
    fd.append('old_price', oldPrice);

    try {
        const res = await fetch('inventory.php', { method: 'POST', body: fd });
        const json = await res.json();
        
        if (json.success) {
            alert(`Success! Price for ${item.name} permanently updated to ₱${newPrice.toFixed(2)}`);
            // Force a full inventory refresh to sync the POS and Masterlist with the new database price
            fetchInventoryList(); 
        } else {
            alert("Database Error: " + json.message);
        }
    } catch(e) {
        alert("A connection error occurred while applying the smart price.");
    }
}

//   =============== WORKING FINE ===========
function updatePricePreview(id, basePrice) {
    const slider = document.getElementById(`discount-slider-${id}`).value;
    document.getElementById(`discount-val-${id}`).innerText = slider + "% OFF";
    const discounted = basePrice - (basePrice * (slider / 100));
    document.getElementById(`new-price-preview-${id}`).innerText = discounted.toFixed(2);
}


// =========================================
// ======== POS MODULE FUNCTIONS ===========
// =========================================

//   =============== WORKING FINE ===========
function addToCart(id) {
    let item = db.find(i => i.id === id);
    if (!item) return;

    let existingInCart = cart.find(c => c.id === id);
    let currentInCartQty = existingInCart ? existingInCart.qty : 0;

    if (currentInCartQty >= item.stock) {
        return alert(`Cannot add more. Only ${item.stock} unit(s) available in stock for this batch.`);
    }

    if (existingInCart) {
        existingInCart.qty++;
    } else {
        cart.push({
            id: item.id,
            batch: item.batch,
            name: item.name,
            price: item.price,
            drug_type: item.drug_type,
            maxStock: item.stock,
            qty: 1
        });
    }
    refreshUI();
}

function changeCartQty(index, delta) {
    let cartItem = cart[index];
    if (!cartItem) return;

    let newQty = cartItem.qty + delta;
    if (newQty <= 0) {
        removeFromCart(index);
        return;
    }

    if (newQty > cartItem.maxStock) {
        return alert(`Maximum stock reached. Only ${cartItem.maxStock} units available in this batch.`);
    }

    cartItem.qty = newQty;
    refreshUI();
}

function updateCartQty(index, value) {
    let cartItem = cart[index];
    if (!cartItem) return;

    let parsed = parseInt(value, 10);
    if (isNaN(parsed) || parsed <= 0) {
        removeFromCart(index);
        return;
    }

    if (parsed > cartItem.maxStock) {
        alert(`Stock limit reached. Quantity adjusted to available stock (${cartItem.maxStock}).`);
        cartItem.qty = cartItem.maxStock;
    } else {
        cartItem.qty = parsed;
    }
    refreshUI();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    refreshUI();
}

function processCheckout() {
    if (cart.length === 0) return alert("Terminal basket is empty.");

    // Checks real database drug_type
    let requiresRx = cart.some(item => item.drug_type === 'Rx');

    if (requiresRx) {
        document.getElementById('rx-customer').value = '';
        document.getElementById('rx-license').value = '';
        document.getElementById('rx-ptr').value = '';
        document.getElementById('prescription-modal').classList.remove('hidden');
    } else {
        finalizeCheckout(null);
    }
}

async function finalizeCheckout(rxDetails) {
    if (cart.length === 0) return;

    const fd = new FormData();
    fd.append('action', 'process_checkout');
    fd.append('cart_data', JSON.stringify(cart));
    
    if (rxDetails) {
        fd.append('customer_name', rxDetails.customer);
        fd.append('prc_license', rxDetails.license);
        fd.append('ptr_number', rxDetails.ptr);
    }

    try {
        const res = await fetch('sales.php', { method: 'POST', body: fd });
        const json = await res.json();
        
        if (json.success) {
            // Use the real formatted ID returned from your database (e.g., TXN-000014)
            const txnId = json.transaction_id;
            const timeStr = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            let total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
            let totalItemsCount = cart.reduce((sum, item) => sum + item.qty, 0);
            
            totalRevenue += total;
            
            let itemSummary = cart.map(i => `${i.name} (x${i.qty})`).join(' | ');
            salesHistory.unshift({ 
                txn: txnId, 
                items: itemSummary, 
                qty: totalItemsCount, 
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
            cart.forEach(i => {
                let lineTotal = i.price * i.qty;
                receipt += `<div style="display:flex; justify-content:space-between; margin: 3px 0;"><span>${i.qty}x ${i.name.substring(0, 18)}</span><span>₱${lineTotal.toFixed(2)}</span></div>`;
            });
            receipt += `<hr style="border-top:1px dashed #000; margin:10px 0;"><div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1rem;"><span>TOTAL AMOUNT</span><span>₱${total.toFixed(2)}</span></div><div style="text-align:center; margin-top:20px; font-size:0.8rem;">Thank you! Have a safe day.</div>`;

            document.getElementById('receipt-content').innerHTML = receipt;
            document.getElementById('receipt-modal').classList.remove('hidden');

            cart = [];
            fetchInventoryList(); 
            
            if (revenueChartInst) {
                revenueChartInst.data.datasets[0].data[6] = totalRevenue;
                revenueChartInst.update();
            }
            if (financialHealthChartInst) {
                financialHealthChartInst.data.datasets[0].data[3] = 130000 + totalRevenue; 
                financialHealthChartInst.update();
            }
            
        } else {
            alert("Checkout Failed: " + json.message);
        }
    } catch (err) {
        alert("A connection error occurred during checkout. Please verify the server is running.");
    }
}

//   =============== WORKING FINE ===========
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

// =========================================
// ======== POS MODULE FUNCTIONS ===========
// =========================================


async function fetchSalesHistory() {
    const fd = new FormData();
    fd.append('action', 'fetch_sales');
    
    try {
        const res = await fetch('sales.php', { method: 'POST', body: fd });
        const data = await res.json();
        
        if (data.success) {
            salesHistory = data.sales;
            refreshUI(); // Instantly redraws the sales table
        }
    } catch (e) {
        console.error("Failed to fetch sales history.");
    }
}



function exportTransactionsCSV() {
    if (salesHistory.length === 0) {
        return alert("No transaction data available to export.");
    }
    // Just open the modal instead of the ugly browser confirm box
    document.getElementById('export-modal').classList.remove('hidden');
}

function executeCSVExport(scope) {
    // Hide the modal immediately after a choice is made
    closeModal('export-modal'); 

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    let dataToExport = salesHistory;

    // Filter logic if they clicked the 'Quarter' button
    if (scope === 'quarter') {
        dataToExport = salesHistory.filter(row => {
            const saleDate = new Date(row.raw_date);
            return saleDate.getFullYear() === currentYear && (Math.floor(saleDate.getMonth() / 3) + 1) === currentQuarter;
        });

        if (dataToExport.length === 0) {
            return alert(`No sales recorded yet for Q${currentQuarter} ${currentYear}.`);
        }
    }

    let csvTitle = (scope === 'quarter') ? `PharmaSync_Sales_Q${currentQuarter}_${currentYear}` : `PharmaSync_Master_Ledger_${currentYear}`;
    
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Transaction ID,Items Summary,Total Qty,Total Amount (PHP),Timestamp,Cashier\n";

    dataToExport.forEach(row => {
        let safeItems = row.items.replace(/,/g, " & "); 
        csvContent += `${row.txn},${safeItems},${row.qty},${row.total.toFixed(2)},${row.time},${row.cashier}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${csvTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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


function initCharts() {
    const chartIds = ['revenueChart', 'demandChart', 'velocityChart', 'reorderChart', 'financialHealthChart'];
    chartIds.forEach(id => {
        let existingChart = Chart.getChart(id);
        if (existingChart) {
            existingChart.destroy();
        }
    });

    const revCtx = document.getElementById('revenueChart').getContext('2d');
    revenueChartInst = new Chart(revCtx, {
        type: 'line',
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



// =========================================
// ====== GLOBAL UI & DYNAMIC REFRESH ======
// =========================================

function refreshUI() {
    document.getElementById('dash-sales').innerText = `₱ ${totalRevenue.toFixed(2)}`;
    document.getElementById('dash-stock').innerText = db.length;

    let alertCount = 0;
    const alertsHtml = db.map(item => {
        let alertBlock = '';
        
        // NOW USING THE PHP STATUS FOR LOW STOCK
        if(item.status === 'Low Stock') { 
            alertCount++; 
            alertBlock += `<div style="padding:15px; background:#fff3cd; color:#856404; margin-bottom:10px; border-radius:6px; border-left:5px solid var(--warning);"><strong>Critical Stock Alert:</strong> ${item.name} (${item.stock} remaining in batch ${item.batch})</div>`; 
        }
        
        // NOW USING THE PHP STATUS FOR EXPIRIES
        if((item.status === 'Expiring Soon' || item.status === 'Expired') && !dismissedAlerts.includes(item.batch)) { 
            alertCount++; 
            let dismissBtn = `<button class="btn btn-secondary" style="margin-top:10px; padding: 6px 12px; font-size: 0.8rem;" onclick="dismissAlert('${item.batch}')">Okay (Remove Alert)</button>`;
            let urgency = item.status === 'Expired' ? 'Expired' : 'Impending Expiry';
            alertBlock += `<div style="padding:15px; background:#f8d7da; color:#721c24; margin-bottom:10px; border-radius:6px; border-left:5px solid var(--danger);"><strong>${urgency}:</strong> ${item.name} (Batch ${item.batch}) expires on ${item.expiry}. Please monitor shelf life.<br>${dismissBtn}</div>`; 
        }
        
        return alertBlock;
    }).join('');

    document.getElementById('alerts-container').innerHTML = alertsHtml || '<p style="color:#888;">No active alerts at this time.</p>';
    document.getElementById('dash-alerts-count').innerText = alertCount;

    if (document.getElementById('pos-grid')) {
        const posSearch = document.getElementById('pos-search') ? document.getElementById('pos-search').value.toLowerCase() : '';
        const posFilter = document.getElementById('pos-filter') ? document.getElementById('pos-filter').value : 'all';
        
        const filteredPosDb = db.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(posSearch) || item.batch.toLowerCase().includes(posSearch);
            const isRx = item.drug_type === 'Rx';
            const matchesFilter = (posFilter === 'all') || 
                                  (posFilter === 'rx' && isRx) || 
                                  (posFilter === 'otc' && !isRx);
            return matchesSearch && matchesFilter;
        });
        
        document.getElementById('pos-grid').innerHTML = filteredPosDb.map(item => {
            const isRx = item.drug_type === 'Rx';
            let rxBadge = isRx ? `<span style="font-size:0.7rem; background:var(--danger); color:white; padding:2px 6px; border-radius:4px; margin-top:5px; display:inline-block;">Rx Required</span>` : '';
            
            // NEW: Calculate remaining stock dynamically based on cart contents
            let cartItem = cart.find(c => c.id === item.id);
            let qtyInCart = cartItem ? cartItem.qty : 0;
            let displayStock = item.stock - qtyInCart;

            return `<div class="pos-item-btn" onclick="addToCart(${item.id})">
                        <div>
                            <span style="font-weight:600; color:var(--dark); font-size:0.95rem; display:block;">${item.name}</span>
                            ${rxBadge}
                        </div>
                        <div style="margin-top:auto;">
                            <span style="display:block; font-size:1.4rem; font-weight:bold; color:var(--primary); margin-bottom:5px;">₱${item.price.toFixed(2)}</span>
                            <span style="font-size:0.8rem; color:#888; background:#f1f3f5; padding:3px 8px; border-radius:12px;">Stock: ${displayStock}</span>
                        </div>
                    </div>`;
        }).join('');
        
        let cartTotal = 0;
        document.getElementById('cart-list').innerHTML = cart.map((item, index) => { 
            let lineTotal = item.price * item.qty;
            cartTotal += lineTotal; 
            let itemRxIcon = item.drug_type === 'Rx' ? `<span style="color:var(--danger); font-size:0.75rem; font-weight:bold;">[Rx]</span>` : '';
            
            return `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed var(--border); padding-bottom:8px; gap:8px;">
                        <div style="flex:1;">
                            <span style="display:block; font-size:0.85rem; font-weight:600;">${item.name} ${itemRxIcon}</span>
                            <span style="font-size:0.8rem; color:#666;">₱${item.price.toFixed(2)} each</span>
                        </div>
                        <div style="display:flex; align-items:center; gap:4px;">
                            <input type="number" min="1" max="${item.maxStock}" value="${item.qty}" style="width: 48px; text-align: center; padding: 2px 4px; height: 26px; font-size: 0.85rem; border: 1px solid var(--border); border-radius: 4px;" onchange="updateCartQty(${index}, this.value)">
                        </div>
                        <div style="text-align:right; min-width: 60px;">
                            <span style="font-weight:bold; color:var(--dark); font-size:0.9rem; display:block;">₱${lineTotal.toFixed(2)}</span>
                            <button class="btn btn-danger" style="padding:2px 6px; font-size:0.75rem; height: 22px; margin-top:2px;" onclick="removeFromCart(${index})">✕</button>
                        </div>
                    </div>`; 
        }).join('');
        
        document.getElementById('cart-subtotal').innerText = cartTotal.toFixed(2);
        document.getElementById('cart-total').innerText = cartTotal.toFixed(2);
        
        updateRecommendations();
    }

    // NEW: Added AI logic to compute discounts inside the Expiry Mitigation Protocol
    const expiringItems = db.filter(item => item.status === 'Expiring Soon' || item.status === 'Expired');
    const spHtml = expiringItems.map(item => {
        let today = new Date();
        let expDate = new Date(item.expiry);
        
        // FIXED: Using Math.abs() prevents negative days for already expired items
        let diffTime = Math.abs(expDate - today);
        let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let suggestedDiscount = 10;
        if (diffDays <= 30 && item.stock > 50) suggestedDiscount = 50;
        else if (diffDays <= 30 && item.stock <= 50) suggestedDiscount = 30;
        else if (diffDays <= 90 && item.stock > 100) suggestedDiscount = 25;
        else if (diffDays <= 90) suggestedDiscount = 15;

        // FIXED: Restored the clean, unbroken HTML template for the button
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
    simulateSmsDispatch();
}