window.Ledger = window.Ledger || {};

/* ---------- Transaction modal ---------- */
window.Ledger.openTxModal = function(existing){
  var isEdit = !!existing;
  var t = existing ? Object.assign({}, existing) : { type:"expense", date:window.Ledger.todayISO(), amount:"", desc:"", notes:"", account: (window.Ledger.DB.accounts[0]||{}).id, category:"", subcategory:"", fromType:"account", fromId:"", toType:"account", toId:"" };

  // If editing one half of a linked cross-currency transfer pair, reconstruct
  // a synthetic transfer view so the modal shows both legs correctly.
  var linkedToAmount = null;
  if(isEdit && t.linkId){
    var pairRows = window.Ledger.DB.transactions.filter(function(x){ return x.linkId === t.linkId; });
    var outRow = pairRows.find(function(x){ return x.linkRole === "out"; });
    var inRow = pairRows.find(function(x){ return x.linkRole === "in"; });
    if(outRow && inRow){
      t = {
        id: t.id, linkId: t.linkId, type: "transfer",
        date: outRow.date,
        amount: outRow.amount,
        desc: (outRow.desc||"").split(" \u2192 ")[0] || "Transfer",
        notes: outRow.notes || "",
        fromType: "account", fromId: outRow.account,
        toType: "account", toId: inRow.account,
        created: outRow.created
      };
      linkedToAmount = inRow.amount;
    }
  }

  var accOptsAll = window.Ledger.DB.accounts.map(function(a){ return '<option value="'+a.id+'">'+window.Ledger.escapeHtml(a.name)+' ('+a.currency+')</option>'; }).join("");
  var peopleOpts = window.Ledger.DB.people.map(function(p){ return '<option value="'+p.id+'">'+window.Ledger.escapeHtml(p.name)+' ('+p.currency+')</option>'; }).join("");

  function catOptions(forType){
    var relevant = window.Ledger.DB.categories.filter(function(c){ return c.type === forType; });
    if(relevant.length === 0){
      return '<option value="">No category</option>';
    }
    return '<option value="">No category</option>' + relevant.map(function(c){
      return '<option value="'+c.id+'" '+(t.category===c.id?'selected':'')+'>'+window.Ledger.escapeHtml(c.name)+'</option>';
    }).join("");
  }

  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit transaction':'New transaction') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body">'
    + '  <div class="type-pills" id="typePills">'
    + '    <button type="button" class="type-pill ' + (t.type==='expense'?'active':'') + '" data-t="expense">\u2212 Expense</button>'
    + '    <button type="button" class="type-pill ' + (t.type==='income'?'active':'') + '" data-t="income">+ Income</button>'
    + '    <button type="button" class="type-pill ' + (t.type==='transfer'?'active':'') + '" data-t="transfer">\u21c4 Transfer</button>'
    + '  </div>'
    + '  <div class="field"><label>Description <span class="faint">(optional)</span></label><input type="text" id="txDesc" value="' + window.Ledger.escapeHtml(t.desc||"") + '" placeholder="e.g. Groceries at Metro"></div>'
    + '  <div class="form-row">'
    + '    <div class="field"><label>Amount</label><input type="number" id="txAmount" step="0.01" min="0.01" value="' + (t.amount||"") + '"></div>'
    + '    <div class="field"><label>Date</label><input type="date" id="txDate" value="' + t.date + '"></div>'
    + '  </div>'
    + '  <div id="exIncFields" style="display:' + (t.type==='transfer'?'none':'flex') + '; flex-direction:column; gap:14px;">'
    + '    <div class="form-row">'
    + '      <div class="field"><label>Account</label><select id="txAccount">' + accOptsAll + '</select></div>'
    + '      <div class="field"><label>Category</label><select id="txCategory">' + catOptions(t.type==='income'?'income':'expense') + '</select></div>'
    + '    </div>'
    + '    <div class="field" id="subcatField" style="display:none;"><label>Subcategory <span class="faint">(required)</span></label><select id="txSubcategory"></select></div>'
    + (t.type !== 'income' ? (
        '    <div style="display:flex; gap:16px; padding-top:2px;">'
        + '      <button type="button" id="openCategorySplitBtn" class="icon-btn" style="font-size:11.5px; font-weight:700; color:var(--brass); padding:2px 0;">&#8862; Split across categories</button>'
        + '      <button type="button" id="openFriendSplitBtn" class="icon-btn" style="font-size:11.5px; font-weight:700; color:var(--brass); padding:2px 0;">&#128101; Split with friends</button>'
        + '    </div>'
        + '    <div id="splitSummaryBanner" style="display:none; background:var(--brass-soft); border:1px solid rgba(240,194,78,0.3); border-radius:var(--radius); padding:10px 14px; font-size:12px;"></div>'
      ) : '')
    + '  </div>'
    + '  <div id="transferFields" style="display:' + (t.type==='transfer'?'flex':'none') + '; flex-direction:column; gap:14px;">'
    + '    <div class="form-row">'
    + '      <div class="field"><label>From</label><select id="txFromType"><option value="account">Account</option><option value="person">Person</option></select></div>'
    + '      <div class="field"><label>&nbsp;</label><select id="txFromId">' + accOptsAll + '</select></div>'
    + '    </div>'
    + '    <div class="form-row">'
    + '      <div class="field"><label>To</label><select id="txToType"><option value="account">Account</option><option value="person">Person</option></select></div>'
    + '      <div class="field"><label>&nbsp;</label><select id="txToId">' + accOptsAll + '</select></div>'
    + '    </div>'
    + '    <div id="conversionField" class="field" style="display:none;">'
    + '      <label>Amount received <span class="faint" id="conversionCurLabel"></span></label>'
    + '      <input type="number" id="txConvertedAmount" step="0.01" min="0.01" placeholder="0.00">'
    + '      <p class="faint" style="font-size:11px; margin:4px 0 0;">Different currencies detected &mdash; enter what actually landed in the destination account after conversion.</p>'
    + '    </div>'
    + '    <p class="faint" style="font-size:11.5px; margin:0;">Tip: paying a credit card bill is a transfer from your bank account to the card. Lending money is a transfer from an account to a person.</p>'
    + '  </div>'
    + '  <div class="field"><label>Notes <span class="faint">(optional)</span></label><textarea id="txNotes">' + window.Ledger.escapeHtml(t.notes||"") + '</textarea></div>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelTxBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveTxBtn">' + (isEdit?'Save changes':'Add to ledger') + '</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    var currentType = t.type;
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelTxBtn").addEventListener("click", window.Ledger.closeModal);

    if(t.account) document.getElementById("txAccount").value = t.account;

    function refreshSubcatOptions(){
      var catId = document.getElementById("txCategory").value;
      var subField = document.getElementById("subcatField");
      var subSel = document.getElementById("txSubcategory");
      if(catId && window.Ledger.categoryHasSubs(catId)){
        var cat = window.Ledger.findCategory(catId);
        subSel.innerHTML = cat.subs.map(function(s){
          return '<option value="'+s.id+'" '+(t.subcategory===s.id?'selected':'')+'>'+window.Ledger.escapeHtml(s.name)+'</option>';
        }).join("");
        subField.style.display = "flex";
      } else {
        subField.style.display = "none";
        subSel.innerHTML = "";
      }
    }
    document.getElementById("txCategory").addEventListener("change", refreshSubcatOptions);
    refreshSubcatOptions();

    Array.prototype.forEach.call(document.querySelectorAll("#typePills .type-pill"), function(btn){
      btn.addEventListener("click", function(){
        currentType = btn.getAttribute("data-t");
        Array.prototype.forEach.call(document.querySelectorAll("#typePills .type-pill"), function(b){ b.classList.toggle("active", b===btn); });
        document.getElementById("exIncFields").style.display = currentType === "transfer" ? "none" : "flex";
        document.getElementById("transferFields").style.display = currentType === "transfer" ? "flex" : "none";
        if(currentType === "expense" || currentType === "income"){
          var catSel = document.getElementById("txCategory");
          catSel.innerHTML = catOptions(currentType);
          refreshSubcatOptions();
        }
      });
    });

    function refreshEntitySelect(typeSelId, idSelId){
      var kind = document.getElementById(typeSelId).value;
      var sel = document.getElementById(idSelId);
      sel.innerHTML = kind === "account" ? accOptsAll : peopleOpts;
    }
    function checkCurrencyMismatch(){
      var fromType = document.getElementById("txFromType").value;
      var fromId = document.getElementById("txFromId").value;
      var toType = document.getElementById("txToType").value;
      var toId = document.getElementById("txToId").value;
      var fromRef = fromId ? window.Ledger.entityRef(fromType, fromId) : null;
      var toRef = toId ? window.Ledger.entityRef(toType, toId) : null;
      // A person has no fixed currency of their own, so a transfer involving a
      // person never triggers the cross-currency conversion field.
      var mismatch = fromRef && toRef && fromRef.currency && toRef.currency && fromRef.currency !== toRef.currency;
      var field = document.getElementById("conversionField");
      if(mismatch){
        field.style.display = "block";
        document.getElementById("conversionCurLabel").textContent = "(in " + toRef.currency + ")";
      } else {
        field.style.display = "none";
      }
    }
    ["txFromType","txToType"].forEach(function(selId){
      document.getElementById(selId).addEventListener("change", function(){
        refreshEntitySelect(selId, selId.replace("Type","Id"));
        checkCurrencyMismatch();
      });
    });
    document.getElementById("txFromId").addEventListener("change", checkCurrencyMismatch);
    document.getElementById("txToId").addEventListener("change", checkCurrencyMismatch);
    if(isEdit && t.type === "transfer"){
      document.getElementById("txFromType").value = t.fromType;
      refreshEntitySelect("txFromType","txFromId");
      document.getElementById("txFromId").value = t.fromId;
      document.getElementById("txToType").value = t.toType;
      refreshEntitySelect("txToType","txToId");
      document.getElementById("txToId").value = t.toId;
      checkCurrencyMismatch();
      if(linkedToAmount != null){
        document.getElementById("txConvertedAmount").value = linkedToAmount;
      }
    }
    // Initial check for a fresh transfer form (default From/To selections)
    setTimeout(checkCurrencyMismatch, 0);

    // ---- Split state (category split and friend split are mutually exclusive per transaction) ----
    var categorySplits = (isEdit && t.categorySplits) ? t.categorySplits.slice() : null;
    var friendSplit = (isEdit && t.friendSplit) ? Object.assign({}, t.friendSplit) : null;

    function refreshSplitBanner(){
      var banner = document.getElementById("splitSummaryBanner");
      if(!banner) return;
      if(categorySplits && categorySplits.length){
        var lines = categorySplits.map(function(s){ return window.Ledger.categoryName(s.categoryId) + ": " + window.Ledger.fmtMoney(s.amount); }).join(" &middot; ");
        banner.style.display = "block";
        banner.innerHTML = "<b>Split across " + categorySplits.length + " categories</b> &mdash; " + lines + ' &nbsp; <button type="button" id="clearSplitBtn" class="icon-btn" style="color:var(--clay);">Remove split</button>';
        document.getElementById("txCategory").closest(".form-row").style.opacity = "0.4";
        document.getElementById("txCategory").disabled = true;
      } else if(friendSplit && friendSplit.shares && friendSplit.shares.length){
        var names = friendSplit.shares.map(function(s){
          var label = s.personId ? (window.Ledger.findPerson(s.personId)||{}).name : "Unassigned";
          return (label||"Unassigned") + ": " + window.Ledger.fmtMoney(s.amount);
        }).join(" &middot; ");
        banner.style.display = "block";
        banner.innerHTML = "<b>Split with friends</b> &mdash; your share " + window.Ledger.fmtMoney(friendSplit.yourShare) + " &middot; " + names + ' &nbsp; <button type="button" id="clearSplitBtn" class="icon-btn" style="color:var(--clay);">Remove split</button>';
      } else {
        banner.style.display = "none";
        banner.innerHTML = "";
        var catRow = document.getElementById("txCategory");
        if(catRow){ catRow.closest(".form-row").style.opacity = "1"; catRow.disabled = false; }
      }
      var clearBtn = document.getElementById("clearSplitBtn");
      if(clearBtn){
        clearBtn.addEventListener("click", function(){
          categorySplits = null; friendSplit = null; refreshSplitBanner();
        });
      }
    }
    refreshSplitBanner();

    var catBtn = document.getElementById("openCategorySplitBtn");
    if(catBtn) catBtn.addEventListener("click", function(){
      var amt = parseFloat(document.getElementById("txAmount").value);
      if(!amt || amt <= 0){ window.Ledger.showToast("Enter an amount first"); return; }
      window.Ledger.openCategorySplitModal(amt, categorySplits, function(splits){
        categorySplits = splits;
        friendSplit = null;
        refreshSplitBanner();
      });
    });
    var friendBtn = document.getElementById("openFriendSplitBtn");
    if(friendBtn) friendBtn.addEventListener("click", function(){
      var amt = parseFloat(document.getElementById("txAmount").value);
      if(!amt || amt <= 0){ window.Ledger.showToast("Enter an amount first"); return; }
      window.Ledger.openFriendSplitModal(amt, friendSplit, function(result){
        friendSplit = result;
        categorySplits = null;
        refreshSplitBanner();
      });
    });

    document.getElementById("saveTxBtn").addEventListener("click", function(){
      var desc = document.getElementById("txDesc").value.trim();
      var amount = parseFloat(document.getElementById("txAmount").value);
      var date = document.getElementById("txDate").value;
      var notes = document.getElementById("txNotes").value.trim();

      if(!amount || amount <= 0 || isNaN(amount)){ window.Ledger.showToast("Enter a valid amount"); return; }
      if(!date){ window.Ledger.showToast("Pick a date"); return; }

      if(currentType === "transfer"){
        var fromType = document.getElementById("txFromType").value;
        var fromId = document.getElementById("txFromId").value;
        var toType = document.getElementById("txToType").value;
        var toId = document.getElementById("txToId").value;
        if(!fromId || !toId){ window.Ledger.showToast("Select both From and To"); return; }
        if(fromType===toType && fromId===toId){ window.Ledger.showToast("From and To must be different"); return; }
        var fromCur = window.Ledger.entityRef(fromType, fromId), toCur = window.Ledger.entityRef(toType, toId);
        var isCrossCurrency = fromCur && toCur && fromCur.currency && toCur.currency && fromCur.currency !== toCur.currency;

        if(isCrossCurrency){
          var convertedAmount = parseFloat(document.getElementById("txConvertedAmount").value);
          if(!convertedAmount || convertedAmount <= 0 || isNaN(convertedAmount)){
            window.Ledger.showToast("Enter the amount received in " + toCur.currency);
            return;
          }
          if(isEdit && t.linkId){
            window.Ledger.commitLinkedTransferPair(t.linkId, date, amount, convertedAmount, desc, notes, fromType, fromId, toType, toId, t.created);
          } else {
            window.Ledger.commitLinkedTransferPair(window.Ledger.uid(), date, amount, convertedAmount, desc, notes, fromType, fromId, toType, toId, Date.now());
          }
          return;
        }

        var rec = {
          id: isEdit ? t.id : window.Ledger.uid(), type:"transfer", date:date, amount:amount,
          desc: desc || "Transfer", notes:notes,
          fromType:fromType, fromId:fromId, toType:toType, toId:toId,
          created: isEdit ? t.created : Date.now()
        };
        window.Ledger.commitTransaction(rec, isEdit);
      } else {
        var account = document.getElementById("txAccount").value;
        if(!account){ window.Ledger.showToast("Select an account"); return; }

        // ---- Friend split: your share is a normal expense + debt items per friend ----
        if(friendSplit && friendSplit.shares && friendSplit.shares.length){
          var fCategory = document.getElementById("txCategory").value;
          if(!fCategory){ window.Ledger.showToast("Select a category for your share"); return; }
          var fSub = "";
          if(fCategory && window.Ledger.categoryHasSubs(fCategory)){
            fSub = document.getElementById("txSubcategory").value;
            if(!fSub){ window.Ledger.showToast("This category requires a subcategory"); return; }
          }
          var yourDesc = desc || (window.Ledger.categoryName(fCategory) + " (split)");
          var mainId = isEdit ? t.id : window.Ledger.uid();
          var mainRec = {
            id: mainId, type:"expense", date:date, amount: friendSplit.yourShare,
            desc: yourDesc, notes:notes, account:account, category:fCategory, subcategory:fSub,
            created: isEdit ? t.created : Date.now()
          };
          if(isEdit){
            var idx = window.Ledger.DB.transactions.findIndex(function(x){ return x.id===mainId; });
            if(idx>=0) window.Ledger.DB.transactions[idx] = mainRec; else window.Ledger.DB.transactions.push(mainRec);
            window.Ledger.DB.debtItems = window.Ledger.DB.debtItems.filter(function(d){ return d.sourceTransactionId !== mainId; });
          } else {
            window.Ledger.DB.transactions.push(mainRec);
          }
          friendSplit.shares.forEach(function(share){
            window.Ledger.DB.debtItems.push({
              id: window.Ledger.uid(),
              sourceTransactionId: mainId,
              personId: share.personId || null,
              description: yourDesc,
              amount: share.amount,
              currency: (window.Ledger.findAccount(account)||{}).currency || "USD",
              status: share.personId ? "open" : "pending",
              date: date,
              created: Date.now()
            });
          });
          window.Ledger.saveData();
          window.Ledger.closeModal();
          window.Ledger.showToast("Expense split saved (" + friendSplit.shares.length + " share" + (friendSplit.shares.length===1?"":"s") + " tracked)");
          window.Ledger.renderPage();
          return;
        }

        var category = document.getElementById("txCategory").value;
        if(!category && !(categorySplits && categorySplits.length)){ window.Ledger.showToast("Select a category"); return; }
        var subcategory = "";
        if(category && window.Ledger.categoryHasSubs(category)){
          subcategory = document.getElementById("txSubcategory").value;
          if(!subcategory){ window.Ledger.showToast("This category requires a subcategory"); return; }
        }

        // ---- Category split: one transaction, multiple category allocations ----
        if(categorySplits && categorySplits.length){
          var splitDesc = desc || "Split purchase";
          var rec3 = {
            id: isEdit ? t.id : window.Ledger.uid(), type:currentType, date:date, amount:amount,
            desc: splitDesc, notes:notes, account:account, category:"", subcategory:"",
            categorySplits: categorySplits,
            created: isEdit ? t.created : Date.now()
          };
          window.Ledger.commitTransaction(rec3, isEdit);
          return;
        }

        var fallbackDesc = window.Ledger.categoryName(category) + (subcategory ? " \u2014 " + window.Ledger.subcatName(category, subcategory) : "");
        var rec2 = {
          id: isEdit ? t.id : window.Ledger.uid(), type:currentType, date:date, amount:amount,
          desc: desc || fallbackDesc, notes:notes, account:account, category:category, subcategory:subcategory,
          created: isEdit ? t.created : Date.now()
        };
        window.Ledger.commitTransaction(rec2, isEdit);
      }
    });
  });
};

window.Ledger.commitTransaction = function(rec, isEdit){
  if(isEdit){
    var idx = window.Ledger.DB.transactions.findIndex(function(x){ return x.id === rec.id; });
    if(idx >= 0) window.Ledger.DB.transactions[idx] = rec;
  } else {
    window.Ledger.DB.transactions.push(rec);
  }
  window.Ledger.saveData();
  window.Ledger.closeModal();
  window.Ledger.showToast(isEdit ? "Transaction updated" : "Transaction added");
  window.Ledger.renderPage();
};

/* Cross-currency transfer between own accounts/people: creates two linked rows
   (an expense on the From side, an income on the To side) sharing a linkId,
   so filters/register/currency totals all work correctly per-account. */
window.Ledger.commitLinkedTransferPair = function(linkId, date, fromAmount, toAmount, desc, notes, fromType, fromId, toType, toId, createdTs){
  var fromRef = window.Ledger.entityRef(fromType, fromId);
  var toRef = window.Ledger.entityRef(toType, toId);
  var baseDesc = desc || "Transfer";

  // Remove any existing rows for this linkId first (covers the edit case)
  window.Ledger.DB.transactions = window.Ledger.DB.transactions.filter(function(x){ return x.linkId !== linkId; });

  var outRec = {
    id: window.Ledger.uid(), type: "expense", date: date, amount: fromAmount,
    desc: baseDesc + " \u2192 " + (toRef ? toRef.name : "?"),
    notes: notes, account: (fromType==="account" ? fromId : null),
    person: (fromType==="person" ? fromId : null),
    category: "", subcategory: "",
    linkId: linkId, linkRole: "out", linkCurrency: toRef ? toRef.currency : "",
    created: createdTs
  };
  var inRec = {
    id: window.Ledger.uid(), type: "income", date: date, amount: toAmount,
    desc: baseDesc + " \u2190 " + (fromRef ? fromRef.name : "?"),
    notes: notes, account: (toType==="account" ? toId : null),
    person: (toType==="person" ? toId : null),
    category: "", subcategory: "",
    linkId: linkId, linkRole: "in", linkCurrency: fromRef ? fromRef.currency : "",
    created: createdTs
  };

  // Only push rows for the "account" side — person-side cross-currency transfers
  // are rare and people don't carry a running multi-currency ledger here, so we
  // still record against the account leg(s) that exist.
  if(fromType === "account") window.Ledger.DB.transactions.push(outRec);
  if(toType === "account") window.Ledger.DB.transactions.push(inRec);

  window.Ledger.saveData();
  window.Ledger.closeModal();
  window.Ledger.showToast("Cross-currency transfer added (2 linked entries)");
  window.Ledger.renderPage();
};

/* ---------- Account modal ---------- */
window.Ledger.openAccountModal = function(existing){
  var isEdit = !!existing;
  var a = existing ? Object.assign({}, existing) : { name:"", type:"checking", currency:"USD", openingBalance:0, archived:false };
  var typeOpts = window.Ledger.ACCOUNT_TYPES.map(function(t){ return '<option value="'+t.id+'" '+(a.type===t.id?'selected':'')+'>'+t.label+'</option>'; }).join("");
  var curOpts = window.Ledger.CURRENCIES.map(function(c){ return '<option value="'+c+'" '+(a.currency===c?'selected':'')+'>'+c+'</option>'; }).join("");

  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit account':'Add account') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body">'
    + '  <div class="field"><label>Name</label><input type="text" id="acName" value="' + window.Ledger.escapeHtml(a.name) + '" placeholder="e.g. Checking"></div>'
    + '  <div class="form-row">'
    + '    <div class="field"><label>Type</label><select id="acType">' + typeOpts + '</select></div>'
    + '    <div class="field"><label>Currency</label><select id="acCurrency">' + curOpts + '</select></div>'
    + '  </div>'
    + '  <div class="field"><label>Opening balance' + (a.type==='credit_card' ? ' <span class="faint">(negative if you owe)</span>' : '') + '</label><input type="number" id="acOpening" step="0.01" value="' + (a.openingBalance||0) + '"></div>'
    + (isEdit ? '  <label style="display:flex; align-items:center; gap:8px; font-size:13px;"><input type="checkbox" id="acArchived" ' + (a.archived?'checked':'') + '> Archived (hide from active lists)</label>' : '')
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="saveAcctBtn">' + (isEdit?'Save changes':'Add account') + '</button>'
    + '</div>';

  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("saveAcctBtn").addEventListener("click", function(){
      var name = document.getElementById("acName").value.trim();
      if(!name){ window.Ledger.showToast("Enter an account name"); return; }
      var rec = {
        id: isEdit ? a.id : window.Ledger.uid(),
        name:name,
        type: document.getElementById("acType").value,
        currency: document.getElementById("acCurrency").value,
        openingBalance: parseFloat(document.getElementById("acOpening").value) || 0,
        archived: isEdit ? document.getElementById("acArchived").checked : false,
        created: isEdit ? a.created : Date.now()
      };
      if(isEdit){
        var idx = window.Ledger.DB.accounts.findIndex(function(x){ return x.id===a.id; });
        window.Ledger.DB.accounts[idx] = rec;
      } else {
        window.Ledger.DB.accounts.push(rec);
      }
      window.Ledger.saveData();
      window.Ledger.closeModal();
      window.Ledger.showToast(isEdit ? "Account updated" : "Account added");
      window.Ledger.renderPage();
    });
  });
};

/* ---------- Person modal ---------- */
window.Ledger.openPersonModal = function(existing){
  var isEdit = !!existing;
  var p = existing ? Object.assign({}, existing) : { name:"" };
  var html = ''
    + '<div class="modal-head"><h3>' + (isEdit?'Edit person':'Add person') + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body">'
    + '  <div class="field"><label>Name</label><input type="text" id="pName" value="' + window.Ledger.escapeHtml(p.name) + '" placeholder="e.g. Alex"></div>'
    + '  <p class="faint" style="font-size:11.5px; margin:0;">Whatever currency a transaction or split is in, that\'s what they\'ll owe in &mdash; no need to fix a currency per person.</p>'
    + '</div>'
    + '<div class="modal-foot">'
    + '  <button class="btn" id="cancelBtn">Cancel</button>'
    + '  <button class="btn btn-primary" id="savePersonBtn">' + (isEdit?'Save changes':'Add person') + '</button>'
    + '</div>';
  window.Ledger.openModal(html, function(){
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("savePersonBtn").addEventListener("click", function(){
      var name = document.getElementById("pName").value.trim();
      if(!name){ window.Ledger.showToast("Enter a name"); return; }
      var rec = { id: isEdit?p.id:window.Ledger.uid(), name:name, created: isEdit?p.created:Date.now() };
      if(isEdit){ var idx = window.Ledger.DB.people.findIndex(function(x){return x.id===p.id;}); window.Ledger.DB.people[idx]=rec; }
      else window.Ledger.DB.people.push(rec);
      window.Ledger.saveData(); window.Ledger.closeModal(); window.Ledger.showToast(isEdit?"Person updated":"Person added"); window.Ledger.renderPage();
    });
  });
};

/* ============================================================
   CATEGORY SPLIT MODAL — divide one expense across categories
   ============================================================ */
window.Ledger.openCategorySplitModal = function(totalAmount, existingSplits, onDone){
  var rowsState = existingSplits && existingSplits.length ? existingSplits.map(function(s){ return {categoryId:s.categoryId, amount:s.amount}; }) : [
    {categoryId:"", amount: totalAmount}
  ];

  function render(){
    var expenseCats = window.Ledger.DB.categories.filter(function(c){ return c.type === "expense"; });
    var catOpts = '<option value="">Choose category</option>' + expenseCats.map(function(c){ return '<option value="'+c.id+'">'+window.Ledger.escapeHtml(c.name)+'</option>'; }).join("");

    var rowsHtml = rowsState.map(function(r, i){
      var thisOpts = catOpts.replace('value="'+r.categoryId+'"', 'value="'+r.categoryId+'" selected');
      return '<div class="form-row" data-split-row="'+i+'" style="align-items:flex-end;">'
        + '  <div class="field"><label>Category</label><select class="splitCatSel" data-idx="'+i+'">'+thisOpts+'</select></div>'
        + '  <div class="field" style="max-width:130px;"><label>Amount</label><input type="number" class="splitAmtInput" data-idx="'+i+'" step="0.01" min="0" value="'+r.amount+'"></div>'
        + '  <button type="button" class="icon-btn danger splitRemoveBtn" data-idx="'+i+'" title="Remove row" style="margin-bottom:9px;">&times;</button>'
        + '</div>';
    }).join("");

    var sum = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
    var remaining = Math.round((totalAmount - sum) * 100) / 100;
    var remainingColor = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";

    var html = ''
      + '<div class="modal-head"><h3>Split across categories</h3><button class="icon-btn" id="closeSubBtn" aria-label="Close">&times;</button></div>'
      + '<div class="modal-body">'
      + '  <p class="faint" style="font-size:11.5px; margin:0;">Total to split: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b></p>'
      + '  <div id="splitRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + rowsHtml + '</div>'
      + '  <button type="button" class="btn btn-sm" id="addSplitRowBtn">+ Add category</button>'
      + '  <div style="font-size:12.5px; font-weight:700; color:'+remainingColor+';">Remaining: ' + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " &#10003; matches total" : "") + '</div>'
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);

      Array.prototype.forEach.call(document.querySelectorAll(".splitCatSel"), function(sel){
        sel.addEventListener("change", function(){ rowsState[parseInt(sel.getAttribute("data-idx"),10)].categoryId = sel.value; });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".splitAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          rowsState[parseInt(inp.getAttribute("data-idx"),10)].amount = parseFloat(inp.value)||0;
          render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".splitRemoveBtn"), function(btn){
        btn.addEventListener("click", function(){
          if(rowsState.length <= 1){ window.Ledger.showToast("Keep at least one row, or cancel the split"); return; }
          rowsState.splice(parseInt(btn.getAttribute("data-idx"),10), 1);
          render();
        });
      });
      document.getElementById("addSplitRowBtn").addEventListener("click", function(){
        var usedSum = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
        var leftover = Math.max(0, Math.round((totalAmount - usedSum) * 100) / 100);
        rowsState.push({categoryId:"", amount: leftover});
        render();
      });
      document.getElementById("saveSplitBtn").addEventListener("click", function(){
        var sumNow = rowsState.reduce(function(a,r){ return a + (parseFloat(r.amount)||0); }, 0);
        if(Math.abs(sumNow - totalAmount) > 0.005){ window.Ledger.showToast("Split amounts must add up to the total (" + window.Ledger.fmtMoney(totalAmount) + ")"); return; }
        for(var i=0;i<rowsState.length;i++){
          if(!rowsState[i].categoryId){ window.Ledger.showToast("Choose a category for every row"); return; }
        }
        window.Ledger.closeSubModal();
        onDone(rowsState.map(function(r){ return {categoryId:r.categoryId, amount:r.amount}; }));
      });
    });
  }
  render();
};

/* ============================================================
   FRIEND SPLIT MODAL — your share + debt items per friend
   ============================================================ */
window.Ledger.openFriendSplitModal = function(totalAmount, existing, onDone){
  var shares = existing && existing.shares ? existing.shares.map(function(s){ return Object.assign({},s); }) : [
    {personId:"", amount:0}
  ];
  var yourShare = existing ? existing.yourShare : Math.round((totalAmount/2)*100)/100;

  function evenSplit(){
    var n = shares.length + 1;
    var even = Math.round((totalAmount / n) * 100) / 100;
    yourShare = even;
    shares.forEach(function(s){ s.amount = even; });
    var sum = yourShare + shares.reduce(function(a,s){return a+s.amount;},0);
    var diff = Math.round((totalAmount - sum) * 100) / 100;
    if(shares.length) shares[shares.length-1].amount = Math.round((shares[shares.length-1].amount + diff)*100)/100;
    else yourShare = Math.round((yourShare + diff)*100)/100;
  }

  function render(){
    var peopleOpts = '<option value="">Pending &mdash; assign later</option>' + window.Ledger.DB.people.map(function(p){ return '<option value="'+p.id+'">'+window.Ledger.escapeHtml(p.name)+'</option>'; }).join("");

    var rowsHtml = shares.map(function(s, i){
      var thisOpts = peopleOpts.replace('value="'+s.personId+'"', 'value="'+s.personId+'" selected');
      return '<div class="form-row" data-friend-row="'+i+'" style="align-items:flex-end;">'
        + '  <div class="field"><label>Friend</label><select class="friendPersonSel" data-idx="'+i+'">'+thisOpts+'</select></div>'
        + '  <div class="field" style="max-width:130px;"><label>Their share</label><input type="number" class="friendAmtInput" data-idx="'+i+'" step="0.01" min="0" value="'+s.amount+'"></div>'
        + '  <button type="button" class="icon-btn danger friendRemoveBtn" data-idx="'+i+'" title="Remove" style="margin-bottom:9px;">&times;</button>'
        + '</div>';
    }).join("");

    var sum = yourShare + shares.reduce(function(a,s){ return a + (parseFloat(s.amount)||0); }, 0);
    var remaining = Math.round((totalAmount - sum) * 100) / 100;
    var remainingColor = Math.abs(remaining) < 0.005 ? "var(--sage)" : "var(--clay)";
    var unassignedCount = shares.filter(function(s){ return !s.personId; }).length;

    var html = ''
      + '<div class="modal-head"><h3>Split with friends</h3><button class="icon-btn" id="closeSubBtn" aria-label="Close">&times;</button></div>'
      + '<div class="modal-body">'
      + '  <p class="faint" style="font-size:11.5px; margin:0;">Total: <b class="num">' + window.Ledger.fmtMoney(totalAmount) + '</b> &middot; your share becomes a real expense, each friend\'s share becomes money owed to you.</p>'
      + '  <div class="field"><label>Your share</label><input type="number" id="yourShareInput" step="0.01" min="0" value="'+yourShare+'"></div>'
      + '  <div id="friendRowsWrap" style="display:flex; flex-direction:column; gap:10px;">' + rowsHtml + '</div>'
      + '  <div style="display:flex; gap:8px;">'
      + '    <button type="button" class="btn btn-sm" id="addFriendRowBtn">+ Add friend</button>'
      + '    <button type="button" class="btn btn-sm" id="addNewPersonBtn">+ New person</button>'
      + '    <button type="button" class="btn btn-sm" id="evenSplitBtn">Split evenly</button>'
      + '  </div>'
      + '  <div style="font-size:12.5px; font-weight:700; color:'+remainingColor+';">Remaining: ' + window.Ledger.fmtMoney(remaining) + (Math.abs(remaining)<0.005 ? " &#10003; matches total" : "") + '</div>'
      + (unassignedCount ? '<p class="faint" style="font-size:11px; margin:0;">' + unassignedCount + ' share' + (unassignedCount===1?"":"s") + ' left pending &mdash; assign a real person any time from the People page.</p>' : '')
      + '</div>'
      + '<div class="modal-foot"><button class="btn" id="cancelSubBtn">Cancel</button><button class="btn btn-primary" id="saveFriendSplitBtn">Use this split</button></div>';

    window.Ledger.openSubModal(html, function(){
      document.getElementById("closeSubBtn").addEventListener("click", window.Ledger.closeSubModal);
      document.getElementById("cancelSubBtn").addEventListener("click", window.Ledger.closeSubModal);

      document.getElementById("yourShareInput").addEventListener("input", function(e){
        yourShare = parseFloat(e.target.value)||0;
        render();
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendPersonSel"), function(sel){
        sel.addEventListener("change", function(){ shares[parseInt(sel.getAttribute("data-idx"),10)].personId = sel.value; });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendAmtInput"), function(inp){
        inp.addEventListener("input", function(){
          shares[parseInt(inp.getAttribute("data-idx"),10)].amount = parseFloat(inp.value)||0;
          render();
        });
      });
      Array.prototype.forEach.call(document.querySelectorAll(".friendRemoveBtn"), function(btn){
        btn.addEventListener("click", function(){
          if(shares.length <= 1){ window.Ledger.showToast("Keep at least one friend, or cancel the split"); return; }
          shares.splice(parseInt(btn.getAttribute("data-idx"),10), 1);
          render();
        });
      });
      document.getElementById("addFriendRowBtn").addEventListener("click", function(){
        shares.push({personId:"", amount:0});
        render();
      });
      document.getElementById("evenSplitBtn").addEventListener("click", function(){
        evenSplit();
        render();
      });
      document.getElementById("addNewPersonBtn").addEventListener("click", function(){
        window.Ledger.openTextPromptModal("Add person", "Name", "", function(name){
          var newPerson = { id: window.Ledger.uid(), name:name, created: Date.now() };
          window.Ledger.DB.people.push(newPerson);
          window.Ledger.saveData();
          shares.push({personId:newPerson.id, amount:0});
          render();
        });
      });
      document.getElementById("saveFriendSplitBtn").addEventListener("click", function(){
        var sumNow = yourShare + shares.reduce(function(a,s){ return a + (parseFloat(s.amount)||0); }, 0);
        if(Math.abs(sumNow - totalAmount) > 0.005){ window.Ledger.showToast("Shares must add up to the total (" + window.Ledger.fmtMoney(totalAmount) + ")"); return; }
        if(shares.some(function(s){ return !s.amount || s.amount <= 0; })){ window.Ledger.showToast("Every friend needs a share greater than 0"); return; }
        window.Ledger.closeSubModal();
        onDone({ yourShare: yourShare, shares: shares.map(function(s){ return {personId: s.personId||null, amount: s.amount}; }) });
      });
    });
  }
  render();
};
