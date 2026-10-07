// ==========================================
// 🚀 PURIX ACADEMY BACKEND SYSTEM (CODE.GS)
// ==========================================

// SHEET NAMES
const ADMISSION_SHEET = "Admission Sheet"; 
const PAYMENT_SHEET = "Payement History";

// Helper 1: Exact Date and Time for Payment History
function getExactTimestamp() {
  let now = new Date();
  return Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
}

// Helper 2: Dynamically calculate total expected fee based on time passed
function calculateTotalExpected(admDateStr, feePlan, monthlyAmt, totalAmt) {
  if (feePlan !== "Monthly") {
    return parseFloat(totalAmt) || 0; 
  }
  
  let admDate = new Date(admDateStr);
  if (isNaN(admDate.getTime())) return parseFloat(monthlyAmt) || 0;
  
  let now = new Date();
  let monthsPassed = (now.getFullYear() - admDate.getFullYear()) * 12 + (now.getMonth() - admDate.getMonth());
  
  if (now.getDate() >= admDate.getDate()) {
    monthsPassed += 1;
  }
  
  if (monthsPassed < 1) monthsPassed = 1; 
  
  return monthsPassed * (parseFloat(monthlyAmt) || 0);
}

// Helper 3: Calculate Next Due Date dynamically
function calculateNextDueDate(admDateStr, feePlan, monthlyAmt, totalPaid) {
  let admDate = new Date(admDateStr);
  if (isNaN(admDate.getTime())) return "-";
  
  if (feePlan === "Installment") {
    admDate.setMonth(admDate.getMonth() + 2); // 2 months grace
    return Utilities.formatDate(admDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  
  if (feePlan === "Monthly") {
    let monthsPaid = (monthlyAmt > 0) ? Math.floor(totalPaid / monthlyAmt) : 0;
    admDate.setMonth(admDate.getMonth() + monthsPaid);
    return Utilities.formatDate(admDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  
  return "-";
}

function doPost(e) {
  try {
    let data = JSON.parse(e.postData.contents);
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let action = data.action;
    
    // --- 1. NAYA ADMISSION (COLUMNS ALIGNED FIX) ---
    if (action === "addAdmission") {
      let admSheet = ss.getSheetByName(ADMISSION_SHEET);
      
      let feePlan = data.feePlan || "Monthly";
      let inputAmount = parseFloat(data.totalFee) || 0;
      let todayPay = parseFloat(data.todayPayment) || 0;
      
      let monthlyFeeVal = feePlan === "Monthly" ? inputAmount : 0;
      let totalFeeVal = feePlan !== "Monthly" ? inputAmount : 0;
      
      let totalExpected = calculateTotalExpected(data.admissionDate, feePlan, monthlyFeeVal, totalFeeVal);
      let initialDues = (totalExpected - todayPay > 0) ? (totalExpected - todayPay) : 0;
      
      let calculatedNextDues = calculateNextDueDate(data.admissionDate, feePlan, monthlyFeeVal, todayPay);
      
      // ✅ FIX: Data sheet ke exactly column indexes ke hisaab se align kar diya gaya hai
      admSheet.appendRow([
        data.uid,            // A
        data.name,           // B
        data.fatherName,     // C
        data.mobile,         // D
        data.parentMobile,   // E
        data.dob,            // F
        data.studentClass,   // G
        data.subjects,       // H
        data.district,       // I
        data.branch,         // J
        data.schoolName,     // K
        data.admissionDate,  // L
        feePlan,             // M 
        monthlyFeeVal,       // N 
        totalFeeVal,         // O 
        data.gender || "",   // P (Gender)
        data.studyMaterial || "", // Q (Study Material)
        data.status || "Active",  // R (Status)
        data.session || "2026-27" // S (Session)
      ]);
      
      if (todayPay > 0) {
        let paySheet = ss.getSheetByName(PAYMENT_SHEET);
        let txnId = "TXN" + new Date().getTime(); 
        let timestamp = getExactTimestamp(); 
        
        paySheet.appendRow([
          txnId, data.uid, timestamp, todayPay, "Cash", 
          calculatedNextDues, initialDues, 
          feePlan === "Monthly" ? "Monthly Fee Advance" : "Admission Advance", 
          data.session || "2026-27", "Success"
        ]);
      }
      
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "nextDuesDate": calculatedNextDues})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // --- 2. PAYMENT COLLECT (OVERWRITE FIX) ---
    if (action === "addPayment") {
      let admSheet = ss.getSheetByName(ADMISSION_SHEET);
      let paySheet = ss.getSheetByName(PAYMENT_SHEET);
      let admData = admSheet.getDataRange().getValues();
      
      let rowFound = -1;
      let feePlan = "Monthly";
      let admDate = "";
      let monthlyAmt = 0;
      let totalAmt = 0;
      
      for(let i = 1; i < admData.length; i++) {
        if(String(admData[i][0]).trim() === String(data.uid).trim()) {
          rowFound = i + 1;
          admDate = admData[i][11];
          feePlan = admData[i][12];
          monthlyAmt = parseFloat(admData[i][13]) || 0;
          totalAmt = parseFloat(admData[i][14]) || 0;
          break;
        }
      }

      let totalPaidTillNow = 0;
      if (paySheet && paySheet.getLastRow() > 1) {
        let pData = paySheet.getDataRange().getValues();
        for(let j = 1; j < pData.length; j++) {
          if(String(pData[j][1]).trim() === String(data.uid).trim()) {
            totalPaidTillNow += parseFloat(pData[j][3]) || 0;
          }
        }
      }
      
      let newlyPaid = parseFloat(data.amount) || 0;
      let grandTotalPaid = totalPaidTillNow + newlyPaid;
      
      let expected = calculateTotalExpected(admDate, feePlan, monthlyAmt, totalAmt);
      let remainingDues = expected - grandTotalPaid;
      if (remainingDues < 0) remainingDues = 0;
      
      // ✅ FIX: Column Q me ab remaining dues overwrite nahi hoga (kyuki waha Study Material hai)

      let txnId = "TXN" + new Date().getTime();
      let timestamp = getExactTimestamp(); 
      let nextDuesDate = calculateNextDueDate(admDate, feePlan, monthlyAmt, grandTotalPaid);

      paySheet.appendRow([
        txnId, data.uid, timestamp, newlyPaid, data.mode || "Cash", 
        nextDuesDate, remainingDues, data.remarks || "Fee Payment", 
        data.session || "2026-27", "Success"
      ]);

      return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
    }

    // --- 3. STATUS TOGGLE ---
    if (action === "toggleStatus") {
      let admSheet = ss.getSheetByName(ADMISSION_SHEET);
      let dataRows = admSheet.getDataRange().getValues();
      for(let i = 1; i < dataRows.length; i++) {
        if(String(dataRows[i][0]).trim() === String(data.uid).trim()) {
          admSheet.getRange(i + 1, 18).setValue(data.status); // Status is in Column R (18)
          return ContentService.createTextOutput(JSON.stringify({"status": "success"})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "UID not found"})).setMimeType(ContentService.MimeType.JSON);
    }
    
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    let action = e.parameter.action;
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let admSheet = ss.getSheetByName(ADMISSION_SHEET);
    let paySheet = ss.getSheetByName(PAYMENT_SHEET);
    
    // Dues Calculator function for Reports & Search
    function calculateStudentDues(uid, admDate, feePlan, monthlyAmt, totalAmt) {
      let totalPaid = 0;
      let history = [];
      if(paySheet && paySheet.getLastRow() > 1) {
        let pData = paySheet.getDataRange().getValues();
        for(let j = 1; j < pData.length; j++) {
          if(String(pData[j][1]).trim() === String(uid).trim()) {
            totalPaid += parseFloat(pData[j][3]) || 0;
            history.push({ date: pData[j][2], amount: pData[j][3], mode: pData[j][4], remarks: pData[j][7] });
          }
        }
      }
      let expected = calculateTotalExpected(admDate, feePlan, monthlyAmt, totalAmt);
      let realDues = expected - totalPaid;
      return { totalPaid, realDues: realDues > 0 ? realDues : 0, history };
    }

    // --- 🟢 NEW FIX: GET STATS FOR HOME PAGE (SPINNERS PROBLEM) ---
    if (action === "getStats") {
      let rows = admSheet.getDataRange().getValues();
      let activeCount = 0;
      let totalStudents = 0;

      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] !== "") { 
          totalStudents++;
          let status = rows[i][17] || "Active"; // Status column
          if (String(status).trim() === "Active") {
            activeCount++;
          }
        }
      }

      let todayColl = 0;
      if (paySheet && paySheet.getLastRow() > 1) {
        let pData = paySheet.getDataRange().getValues();
        let todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
        for (let j = 1; j < pData.length; j++) {
          let rowDate = pData[j][2]; // Timestamp Column C
          if (rowDate) {
            let rowDateStr = Utilities.formatDate(new Date(rowDate), Session.getScriptTimeZone(), "yyyy-MM-dd");
            if (rowDateStr === todayStr) {
              todayColl += parseFloat(pData[j][3]) || 0; 
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        data: {
          activeStudents: activeCount,
          monthAdmission: totalStudents,
          todayCollection: todayColl
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // --- SEARCH PROFILE ---
    if (action === "searchProfile") {
      let uid = e.parameter.uid;
      let data = admSheet.getDataRange().getValues();
      
      for(let i = 1; i < data.length; i++) {
        if(String(data[i][0]).trim() === String(uid).trim()) { 
          let admDate = data[i][11];
          let feePlan = data[i][12];
          let monthlyAmt = parseFloat(data[i][13]) || 0;
          let totalAmt = parseFloat(data[i][14]) || 0;
          let displayFee = feePlan === "Monthly" ? monthlyAmt : totalAmt;
          
          let financial = calculateStudentDues(uid, admDate, feePlan, monthlyAmt, totalAmt);
          
          let studentData = {
            name: data[i][1], fatherName: data[i][2], mobile: data[i][3], parentMobile: data[i][4],
            dob: data[i][5], class: data[i][6], subjects: data[i][7], district: data[i][8], branch: data[i][9],
            schoolName: data[i][10], admissionDate: admDate, feePlan: feePlan, totalFee: displayFee,
            todayPayment: financial.totalPaid, remainingDues: financial.realDues, status: data[i][17], 
            history: financial.history
          };
          return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": studentData})).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": "UID nahi mila!"})).setMimeType(ContentService.MimeType.JSON);
    }

    // --- GET REPORTS & ALERTS ---
    if (action === "getReports" || action === "getAlerts") {
      let rows = admSheet.getDataRange().getValues();
      let resultsList = [];

      for(let i = 1; i < rows.length; i++) {
        let uid = rows[i][0];
        let status = rows[i][17] || "Active";
        
        if(action === "getAlerts" && String(status).trim() !== "Active") continue; 

        let admDate = rows[i][11];
        let feePlan = rows[i][12];
        let monthlyAmt = parseFloat(rows[i][13]) || 0;
        let totalAmt = parseFloat(rows[i][14]) || 0;
        
        let financial = calculateStudentDues(uid, admDate, feePlan, monthlyAmt, totalAmt);
        let nextDueDate = calculateNextDueDate(admDate, feePlan, monthlyAmt, financial.totalPaid);

        // ✅ FIX: STRICT ALERT FILTER - Agar due 0 ya negative hai, toh alert nahi aayega (Sabhi plans ke liye)
        if(action === "getAlerts" && financial.realDues <= 0) continue;

        resultsList.push({
          uid: uid, name: rows[i][1], father: rows[i][2], class: rows[i][6], session: rows[i][18],
          feePlan: feePlan, paid: financial.totalPaid, dues: financial.realDues, 
          mobile: rows[i][3], status: status, dueDate: nextDueDate
        });
      }
      return ContentService.createTextOutput(JSON.stringify({"status": "success", "data": resultsList})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
     return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
