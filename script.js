// ==========================================
// 🚀 COMMAND CENTER: PURIX ACADEMY CRM
// ==========================================

// 👇 YAHAN APNA GOOGLE APPS SCRIPT KA URL (WEB APP URL) PASTE KAREIN 👇
const API_URL = "https://script.google.com/macros/s/AKfycbwE3hB-RKimSeI11u8PqkLhG8_7MUj_Tqff0K9kvGNHp5grWW-pZmr0BKF_72xNSD6F/exec";
// 👆 ================================================================ 👆


// --- 1. MODULE NAVIGATION SYSTEM (Pages Change Karne Ke Liye) ---
let _moduleLoadToken = 0; // jaldi-jaldi page badalne par purana page naye ko overwrite na kare

function loadModule(moduleName) {
    const myToken = ++_moduleLoadToken;

    const navItems = document.querySelectorAll('.nav-links li');
    navItems.forEach(item => item.classList.remove('active'));

    const activeBtn = document.querySelector(`.nav-links li[onclick*="${moduleName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }

    console.log("System Initializing Module: " + moduleName);

    // Direct HTML file load karna bina kisi folder ke
    fetch(moduleName + '.html?nocache=' + new Date().getTime())
        .then(response => {
            if (!response.ok) throw new Error('Module not found: ' + moduleName);
            return response.text();
        })
        .then(html => {
            if (myToken !== _moduleLoadToken) return; // is beech koi aur page khul chuka hai

            document.getElementById('module-container').innerHTML = html;

            // CRITICAL FIX: Executing scripts inside dynamically loaded HTML
            const scripts = document.getElementById('module-container').querySelectorAll('script');
            scripts.forEach(oldScript => {
                const newScript = document.createElement('script');
                newScript.text = oldScript.text;
                document.body.appendChild(newScript).parentNode.removeChild(newScript);
            });
            // Home page apna data khud load karta hai (home.html ke andar), isliye yahan alag call nahi.
        })
        .catch(error => {
            if (myToken !== _moduleLoadToken) return;
            console.error("Error loading module:", error);
            document.getElementById('module-container').innerHTML = `<h3 style="color: #00f3ff; text-align: center; margin-top: 50px;">MODULE OFFLINE OR MISSING</h3>`;
        });
}


// --- 2. HOME STATS REFRESH ---
// Payment / admission ke baad pages ye function bulate hain. Home apna 5-minute cache
// khud rakhta hai, isliye yahan sirf wo cache hata dete hain - agli baar Home kholne par
// naya data aayega. (Pehle yahan ek bekaar server call jati thi aur "undefined" bhi aa sakta tha.)
function fetchHomeStats() {
    try { localStorage.removeItem("purix_home_stats"); } catch (e) {}
}

// ==========================================
// 🚀 GLOBAL HELPER FUNCTIONS (PDF & WhatsApp)
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
