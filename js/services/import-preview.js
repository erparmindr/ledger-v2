window.Ledger = window.Ledger || {};

/* ============================================================
   PASTED STATEMENT TEXT PARSER (for PDF bank statements)
   ============================================================ */

window.Ledger.STMT_DATE_RE = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{2,4})|([A-Za-z]{3,9}\.?\s+\d{1,2},?\s+\d{4})|(\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4})/;
window.Ledger.STMT_AMOUNT_RE = /(-?\(?\$?-?[\d,]+\.\d{2}\)?)\s*$/;
window.Ledger.TD_DATE_RE = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{1,2})\s+/i;
window.Ledger.TD_AMOUNT_RE = /(-?[\d,]+\.\d{2})\s*$/;
window.Ledger.MONTH_MAP = {jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};

window.Ledger.parseTDDate = function(mon, day){
  var mm = window.Ledger.MONTH_MAP[mon.toLowerCase().slice(0,3)];
  if(!mm) return null;
  var now = new Date();
  var year = now.getFullYear();
  if(parseInt(mm,10) > now.getMonth()+1) year--;
  return year + "-" + mm + "-" + (day.length<2?"0"+day:day);
};

window.Ledger.isTDFormat = function(text){
  var lines = text.trim().split(/\r?\n/);
  var matched = 0;
  lines.slice(0,5).forEach(function(l){ if(window.Ledger.TD_DATE_RE.test(l.trim())) matched++; });
  return matched >= 1;
};

window.Ledger.parseStatementText = function(text){
  var lines = text.split(/\r?\n/);
  var results = [];

  if(window.Ledger.isTDFormat(text)){
    lines.forEach(function(rawLine, idx){
      var line = rawLine.trim();
      if(!line) return;
      var dm = line.match(window.Ledger.TD_DATE_RE);
      if(!dm) return;
      var isoDate = window.Ledger.parseTDDate(dm[3], dm[4]);
      if(!isoDate) return;
      var rest = line.replace(window.Ledger.TD_DATE_RE, "").trim();
      var amtMatch = rest.match(window.Ledger.TD_AMOUNT_RE);
      if(!amtMatch) return;
      var amtRaw = amtMatch[1].replace(/,/g,"");
      var amt = parseFloat(amtRaw);
      if(isNaN(amt)) return;
      var desc = rest.replace(window.Ledger.TD_AMOUNT_RE,"").replace(/\s+[A-Z]{2}\s*$/, "").trim();
      desc = desc.replace(/\s+[A-Z]{2}$/, "").trim();
      if(!desc) desc = "Imported transaction";
      results.push({ lineNumber:idx+1, raw:line, date:isoDate, amount:amt, desc:desc });
    });
    return results;
  }

  lines.forEach(function(rawLine, idx){
    var line = rawLine.trim();
    if(!line) return;
    var dateMatch = line.match(window.Ledger.STMT_DATE_RE);
    if(!dateMatch) return;
    var amtMatch = line.match(window.Ledger.STMT_AMOUNT_RE);
    if(!amtMatch) return;
    var dateStr = dateMatch[0];
    var isoDate = window.Ledger.normalizeDate(dateStr);
    if(!isoDate) return;
    var amtRaw = amtMatch[1];
    var isParenNegative = /^\(.*\)$/.test(amtRaw);
    var cleaned = amtRaw.replace(/[()$,]/g, "");
    var amt = parseFloat(cleaned);
    if(isNaN(amt)) return;
    if(isParenNegative) amt = -Math.abs(amt);
    var desc = line
      .replace(dateStr, "")
      .replace(amtMatch[0], "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s\-:|,]+|[\s\-:|,]+$/g, "")
      .trim();
    if(!desc) desc = "Imported transaction";
    results.push({ lineNumber:idx+1, raw:line, date:isoDate, amount:amt, desc:desc });
  });
  return results;
};

window.Ledger.openStatementPasteModal = function(){
  var html = ''
    + '<div class="modal-head"><h3>Import from pasted statement text</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body">'
    + '  <p class="faint" style="font-size:12px; margin:0;">Open your PDF statement, select the transaction lines, copy, and paste them below. Works with most bank formats &mdash; you\'ll get a chance to review before anything is imported.</p>'
    + '  <div class="field"><textarea id="stmtPasteArea" rows="9" placeholder="Paste statement text here, e.g.:&#10;06/20/2026  GROCERY STORE PURCHASE   -45.20&#10;06/18/2026  PAYROLL DEPOSIT           2,000.00" style="min-height:160px; font-family:monospace; font-size:12px;"></textarea></div>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="parseStmtBtn">Parse text</button></div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("parseStmtBtn").addEventListener("click", function(){
      var text = document.getElementById("stmtPasteArea").value;
      if(!text.trim()){ window.Ledger.showToast("Paste some statement text first"); return; }
      var parsed = window.Ledger.parseStatementText(text);
      if(parsed.length === 0){
        window.Ledger.showToast("Couldn't find any date + amount lines in that text");
        return;
      }
      window.Ledger.openStatementPreviewModal(parsed);
    });
  });
};

/* ============================================================
   UNIFIED IMPORT PREVIEW SYSTEM
   ============================================================ */

window.Ledger.openImportPreviewModal = function(parsedRows, preselectedAccount, source, onBack){
  var accOpts = window.Ledger.DB.accounts.map(function(a){
    return '<option value="'+a.id+'" '+(a.id===preselectedAccount?'selected':'')+'>'+window.Ledger.escapeHtml(a.name)+'</option>';
  }).join("");

  var thStyle = 'text-align:left; padding:7px 10px; font-size:10.5px; color:var(--text-faint); text-transform:uppercase; letter-spacing:.05em; border-bottom:1px solid var(--border); background:var(--surface-2); white-space:nowrap;';
  var tdStyle = 'padding:6px 8px; border-bottom:1px solid var(--border-soft); vertical-align:middle;';

  function catOptsFor(forType, selectedId){
    var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === forType; });
    return '<option value="">Choose category&hellip;</option>' + relevant.map(function(c){
      return '<option value="'+c.id+'" '+(c.id===selectedId?'selected':'')+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }

  parsedRows.forEach(function(r){
    if(r.suggestedCategoryId === undefined){
      var forType = r.type || (r.amount < 0 ? "expense" : "income");
      r.suggestedCategoryId = window.Ledger.suggestCategoryForDescription(r.desc, forType, window.Ledger.DB, window.Ledger.findCategory) || "";
    }
  });

  var rowsHtml = parsedRows.map(function(r, i){
    var preType = r.type || (r.amount < 0 ? "expense" : "income");
    return '<tr id="prev-row-'+i+'">'
      + '<td style="'+tdStyle+' text-align:center; width:32px;">'
      + '  <input type="checkbox" class="prev-chk" data-idx="'+i+'" checked style="width:15px;height:15px;cursor:pointer;">'
      + '</td>'
      + '<td style="'+tdStyle+' white-space:nowrap; font-size:12px;">'+r.date+'</td>'
      + '<td style="'+tdStyle+'">'
      + '  <input type="text" class="prev-desc" data-idx="'+i+'" value="'+window.Ledger.escapeHtml(r.desc)+'" style="width:100%; min-width:150px; background:transparent; border:none; border-bottom:1px solid var(--border-soft); padding:3px 4px; font-size:12.5px; color:var(--text);" title="Click to edit">'
      + '</td>'
      + '<td style="'+tdStyle+' text-align:right; font-weight:700; font-size:13px; white-space:nowrap; font-variant-numeric:tabular-nums;">'
      + window.Ledger.fmtMoney(Math.abs(r.amount))
      + '</td>'
      + '<td style="'+tdStyle+'">'
      + '  <select class="prev-type" data-idx="'+i+'" style="font-size:11.5px; padding:5px 7px; border-radius:8px; border:1px solid var(--border); background:var(--surface-2); color:var(--text);">'
      + '    <option value="expense" '+(preType==="expense"?"selected":"")+'>Expense</option>'
      + '    <option value="income" '+(preType==="income"?"selected":"")+'>Income</option>'
      + '    <option value="transfer" '+(preType==="transfer"?"selected":"")+'>Transfer</option>'
      + '  </select>'
      + '</td>'
      + '<td style="'+tdStyle+'">'
      + '  <select class="prev-category" data-idx="'+i+'" style="font-size:11.5px; padding:5px 7px; border-radius:8px; border:1px solid ' + (r.suggestedCategoryId ? 'var(--sage)' : 'var(--clay)') + '; background:var(--surface-2); color:var(--text);">'
      + catOptsFor(preType, r.suggestedCategoryId)
      + '  </select>'
      + '</td>'
      + '</tr>';
  }).join("");

  var html = ''
    + '<div class="modal-head">'
    + '  <h3>Review '+parsedRows.length+' transaction'+(parsedRows.length===1?"":"s")+' <span class="faint" style="font-size:12px; font-weight:500;">from '+window.Ledger.escapeHtml(source||"import")+'</span></h3>'
    + '  <button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button>'
    + '</div>'
    + '<div class="modal-body">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">'
    + '    <p class="faint" style="font-size:11.5px; margin:0;">Edit descriptions, flip types, uncheck rows to skip. Categories are auto-suggested &mdash; a category is required for every checked row.</p>'
    + '    <div style="display:flex; gap:8px;">'
    + '      <button class="btn btn-sm" id="selectAllBtn">Check all</button>'
    + '      <button class="btn btn-sm" id="deselectAllBtn">Uncheck all</button>'
    + '    </div>'
    + '  </div>'
    + '  <div style="overflow:auto; max-height:360px; border:1px solid var(--border); border-radius:var(--radius);">'
    + '    <table style="width:100%; border-collapse:collapse;">'
    + '      <tr>'
    + '        <th style="'+thStyle+'"></th>'
    + '        <th style="'+thStyle+'">Date</th>'
    + '        <th style="'+thStyle+'">Description</th>'
    + '        <th style="'+thStyle+' text-align:right;">Amount</th>'
    + '        <th style="'+thStyle+'">Type</th>'
    + '        <th style="'+thStyle+'">Category</th>'
    + '      </tr>'
    + rowsHtml
    + '    </table>'
    + '  </div>'
    + '  <div class="field"><label>Import into account</label><select id="prevAccount">'+accOpts+'</select></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + (onBack ? '<button class="btn" id="backBtn">Back</button>' : '<button class="btn" id="cancelImportBtn">Cancel</button>')
    + '  <button class="btn btn-primary" id="confirmImportBtn">Import checked rows</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    var cancelBtn = document.getElementById("cancelImportBtn");
    if(cancelBtn) cancelBtn.addEventListener("click", window.Ledger.closeModal);
    var backBtn = document.getElementById("backBtn");
    if(backBtn) backBtn.addEventListener("click", function(){ window.Ledger.closeModal(); if(onBack) onBack(); });
    document.getElementById("selectAllBtn").addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".prev-chk"), function(c){ c.checked = true; });
    });
    document.getElementById("deselectAllBtn").addEventListener("click", function(){
      Array.prototype.forEach.call(document.querySelectorAll(".prev-chk"), function(c){ c.checked = false; });
    });

    Array.prototype.forEach.call(document.querySelectorAll(".prev-type"), function(sel){
      sel.addEventListener("change", function(){
        var idx = parseInt(sel.getAttribute("data-idx"), 10);
        var catSel = document.querySelector('.prev-category[data-idx="'+idx+'"]');
        if(catSel){
          var suggestion = window.Ledger.suggestCategoryForDescription(parsedRows[idx].desc, sel.value, window.Ledger.DB, window.Ledger.findCategory) || "";
          catSel.innerHTML = catOptsFor(sel.value, suggestion);
          catSel.style.borderColor = suggestion ? "var(--sage)" : "var(--clay)";
        }
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll(".prev-category"), function(sel){
      sel.addEventListener("change", function(){
        sel.style.borderColor = sel.value ? "var(--sage)" : "var(--clay)";
      });
    });

    document.getElementById("confirmImportBtn").addEventListener("click", function(){
      var account = document.getElementById("prevAccount").value;
      if(!account){ window.Ledger.showToast("Choose an account"); return; }
      var checks = document.querySelectorAll(".prev-chk");
      var descs  = document.querySelectorAll(".prev-desc");
      var types  = document.querySelectorAll(".prev-type");
      var cats   = document.querySelectorAll(".prev-category");

      var missing = [];
      Array.prototype.forEach.call(checks, function(chk, i){
        if(chk.checked && !cats[i].value) missing.push(i+1);
      });
      if(missing.length){
        window.Ledger.showToast("Pick a category for row" + (missing.length===1?"":"s") + " " + missing.join(", ") + " (or uncheck to skip)");
        return;
      }

      var imported = 0;
      Array.prototype.forEach.call(checks, function(chk, i){
        if(!chk.checked) return;
        var r = parsedRows[i];
        var chosenType = types[i].value;
        var chosenDesc = descs[i].value.trim() || r.desc || "Imported transaction";
        var chosenCategory = cats[i].value;
        window.Ledger.DB.transactions.push({
          id: window.Ledger.uid(), type: chosenType, date: r.date, amount: Math.abs(r.amount),
          desc: chosenDesc, notes: "Imported from " + (source||"import"),
          account: account, category: chosenCategory, subcategory: "", created: Date.now()
        });
        if(chosenType !== "transfer") window.Ledger.learnCategoryMapping(chosenDesc, chosenCategory, window.Ledger.DB);
        imported++;
      });
      window.Ledger.saveData();
      window.Ledger.closeModal();
      window.Ledger.showToast(imported + " transaction"+(imported===1?"":"s")+" imported");
      window.Ledger.renderPage();
    });
  });
};

window.Ledger.openStatementPreviewModal = function(parsedRows, preselectedAccount){
  window.Ledger.openImportPreviewModal(parsedRows, preselectedAccount||"", "pasted statement", window.Ledger.openStatementPasteModal);
};
