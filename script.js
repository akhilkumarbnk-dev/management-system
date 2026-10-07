// ==========================================
// 🚀 COMMAND CENTER: PURIX ACADEMY CRM
// ==========================================

// 👇 YAHAN APNA GOOGLE APPS SCRIPT KA URL (WEB APP URL) PASTE KAREIN 👇
const API_URL = "https://script.google.com/macros/s/AKfycbzqtjHyMz8zF7W8g9nPx6as3UUR89NsSMiGr0aYtobUVXoEELA_RYy6FwJxdczXv7CGIQ/exec";
// 👆 ================================================================ 👆


// --- 1. MODULE NAVIGATION SYSTEM (Pages Change Karne Ke Liye) ---
function loadModule(moduleName) {
    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => item.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.nav-links li[onclick*="${moduleName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    console.log("System Initializing Module: " + moduleName);
    
    fetch(`modules/${moduleName}.html`)
        .then(response => {
            if (!response.ok) throw new Error('Module not found');
            return response.text();
        })
        .then(html => {
            document.getElementById('module-container').innerHTML = html;
            
            // CRITICAL FIX: Executing scripts inside dynamically loaded HTML
            const scripts = document.getElementById('module-container').querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.text = oldScript.text;
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            });
            
            if(moduleName === 'home') {
                fetchHomeStats();
            }
        })
        .catch(error => {
            console.error("Error loading module:", error);
            document.getElementById('module-container').innerHTML = `<h3 style="color: #00f3ff; text-align: center; margin-top: 50px;">MODULE OFFLINE OR MISSING</h3>`;
        });
}


// --- 2. FETCH LIVE STATS FOR SCI-FI DASHBOARD ---
function fetchHomeStats() {
    if(API_URL === "YAHAN_APNA_WEB_APP_URL_PASTE_KAREIN" || API_URL === "") {
        console.warn("⚠️ SYSTEM ALERT: API URL missing in script.js!");
        return;
    }

    console.log("Fetching live data from Academy Database...");

    fetch(API_URL + "?action=getStats")
        .then(response => response.json())
        .then(data => {
            if(data.status === "success") {
                let activeStudentsEl = document.getElementById('homeActiveStudents');
                let monthAdmissionEl = document.getElementById('homeMonthAdmission');
                let todayCollectionEl = document.getElementById('homeTodayCollection');

                if(activeStudentsEl) activeStudentsEl.innerText = data.data.activeStudents;
                if(monthAdmissionEl) monthAdmissionEl.innerText = data.data.monthAdmission;
                if(todayCollectionEl) todayCollectionEl.innerText = "₹" + data.data.todayCollection;
            } else {
                console.error("Database connection failed:", data.message);
            }
        })
        .catch(error => {
            console.error("Signal Lost! Error connecting to server:", error);
        });
}

// ==========================================
// 🚀 NEW: GLOBAL HELPER FUNCTIONS (PDF & WhatsApp)
// ==========================================

// --- 3. PROFESSIONAL PDF EXPORT LOGIC ---
function downloadPDF(elementId, fileName) {
    const element = document.getElementById(elementId);
    if(!element) {
        console.error("PDF Target Element Not Found!");
        return;
    }

    // PDF specific white-paper styling add karna
    element.classList.add('pdf-document');

    const opt = {
        margin:       10,
        filename:     `${fileName}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // UI update to show processing
    Swal.fire({
        title: 'Generating Report...',
        text: 'Please wait while we prepare the professional PDF.',
        background: '#050914', color: '#00f3ff',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    html2pdf().set(opt).from(element).save().then(() => {
        // PDF banne ke baad dark mode wapas lana
        element.classList.remove('pdf-document');
        Swal.fire({
            title: 'Success!',
            text: 'PDF Report downloaded successfully.',
            icon: 'success',
            background: '#050914', color: '#00ff88',
            confirmButtonColor: '#00f3ff'
        });
    });
}

// --- 4. PAYMENT SUCCESS & WHATSAPP ALERT ---
function showPaymentSuccess(studentName, amount, dues, mobileNumber) {
    // WhatsApp pre-filled message generate karna
    const message = `Hello, this is Purix Academy.\n\nWe have successfully received a fee payment of ₹${amount} for ${studentName}.\n\nRemaining Dues: ₹${dues}\n\nThank you!`;
    const waLink = `https://wa.me/91${mobileNumber}?text=${encodeURIComponent(message)}`;

    // Modern Popup (SweetAlert) dikhana
    Swal.fire({
        title: 'Payment Successful!',
        html: `<p style="color: var(--text-glow);">Amount of <b>₹${amount}</b> collected for <b>${studentName}</b>.</p>
               <p style="color: var(--danger-neon); margin-top: 5px;">Remaining Dues: <b>₹${dues}</b></p>`,
        icon: 'success',
        background: '#050914', 
        color: '#00f3ff',
        showCancelButton: true,
        confirmButtonText: 'Done',
        cancelButtonText: '<i class="fa-brands fa-whatsapp"></i> WhatsApp Receipt',
        confirmButtonColor: '#00f3ff',
        cancelButtonColor: '#25d366'
    }).then((result) => {
        // Agar user ne WhatsApp button pe click kiya
        if (result.dismiss === Swal.DismissReason.cancel) {
            window.open(waLink, '_blank');
        }
    });
}

// --- 5. AUTO-START PROTOCOL ---
window.onload = function() {
    console.log("Purix System Online.");
    loadModule('home');
};
