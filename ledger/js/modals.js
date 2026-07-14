window.Ledger = window.Ledger || {};

/* ============================================================
   MODAL SYSTEM
   ============================================================ */
window.Ledger.modalStack = [];

window.Ledger.openModal = function (html, onMount) {
  var root = document.getElementById("modalRoot");
  window.Ledger.modalStack.push(root.innerHTML);
  root.innerHTML = '<div class="modal-backdrop" id="modalBackdrop"><div class="modal" role="dialog" aria-modal="true">' + html + '</div></div>';
  document.getElementById("modalBackdrop").addEventListener("click", function (e) {
    if (e.target.id === "modalBackdrop") window.Ledger.closeModal();
  });
  if (onMount) onMount();
};

window.Ledger.openSubModal = function (html, onMount) {
  window.Ledger.openModal(html, onMount);
};

window.Ledger.closeSubModal = function () {
  var root = document.getElementById("modalRoot");
  var prev = window.Ledger.modalStack.pop();
  root.innerHTML = prev != null ? prev : "";
  var backdrop = document.getElementById("modalBackdrop");
  if (backdrop) {
    backdrop.addEventListener("click", function (e) {
      if (e.target.id === "modalBackdrop") window.Ledger.closeModal();
    });
  }
};

window.Ledger.closeModal = function () {
  window.Ledger.modalStack = [];
  document.getElementById("modalRoot").innerHTML = "";
};

/* ============================================================
   UTILITY MODALS
   ============================================================ */

window.Ledger.openTextPromptModal = function (title, placeholder, initial, onSave) {
  var html = ''
    + '<div class="modal-head"><h3>' + window.Ledger.escapeHtml(title) + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body"><div class="field"><input type="text" id="promptInput" value="' + window.Ledger.escapeHtml(initial || "") + '" placeholder="' + window.Ledger.escapeHtml(placeholder) + '"></div></div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="okBtn">Save</button></div>';
  window.Ledger.openModal(html, function () {
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("promptInput").focus();
    document.getElementById("okBtn").addEventListener("click", function () {
      var v = document.getElementById("promptInput").value.trim();
      if (!v) { window.Ledger.showToast("Enter a value"); return; }
      onSave(v);
      window.Ledger.closeModal();
    });
  });
};

window.Ledger.openConfirmModal = function (title, message, onConfirm) {
  var html = ''
    + '<div class="modal-head"><h3>' + window.Ledger.escapeHtml(title) + '</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body"><p style="margin:0; font-size:13.5px;">' + message + '</p></div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-danger" id="confirmBtn">Confirm</button></div>';
  window.Ledger.openModal(html, function () {
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("confirmBtn").addEventListener("click", function () { onConfirm(); window.Ledger.closeModal(); });
  });
};

window.Ledger.openMarkPaidModal = function (debtItem) {
  var person = window.Ledger.findPerson(debtItem.personId);
  var accOpts = window.Ledger.DB.accounts.map(function (a) {
    return '<option value="' + a.id + '">' + window.Ledger.escapeHtml(a.name) + ' (' + a.currency + ')</option>';
  }).join("");
  var html = ''
    + '<div class="modal-head"><h3>Mark as paid</h3><button class="icon-btn" id="closeModalBtn" aria-label="Close">&times;</button></div>'
    + '<div class="modal-body">'
    + '  <p style="font-size:13px; margin:0;">' + window.Ledger.escapeHtml((person || {}).name || "This person") + ' paying back <b class="num">' + window.Ledger.fmtMoney(debtItem.amount, debtItem.currency) + '</b> for &ldquo;' + window.Ledger.escapeHtml(debtItem.description) + '&rdquo;.</p>'
    + '  <div class="field"><label>Deposit into account</label><select id="paidAccount">' + accOpts + '</select></div>'
    + '  <p class="faint" style="font-size:11.5px; margin:0;">This records the repayment as a transfer, not income, since it\'s money you already spent being paid back.</p>'
    + '</div>'
    + '<div class="modal-foot"><button class="btn" id="cancelBtn">Cancel</button><button class="btn btn-primary" id="confirmPaidBtn">Mark paid &amp; record deposit</button></div>';
  window.Ledger.openModal(html, function () {
    document.getElementById("closeModalBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("cancelBtn").addEventListener("click", window.Ledger.closeModal);
    document.getElementById("confirmPaidBtn").addEventListener("click", function () {
      var accountId = document.getElementById("paidAccount").value;
      if (!accountId) { window.Ledger.showToast("Choose an account"); return; }
      debtItem.status = "settled";
      debtItem.settledDate = window.Ledger.todayISO();
      window.Ledger.DB.transactions.push({
        id: window.Ledger.uid(),
        type: "transfer",
        date: window.Ledger.todayISO(),
        amount: debtItem.amount,
        desc: "Repayment: " + debtItem.description,
        notes: "Debt settlement for " + (person ? person.name : "person"),
        fromType: "person",
        fromId: debtItem.personId,
        toType: "account",
        toId: accountId,
        debtItemId: debtItem.id,
        created: Date.now()
      });
      window.Ledger.saveData();
      window.Ledger.closeModal();
      window.Ledger.showToast("Marked as paid");
      window.Ledger.renderPage();
    });
  });
};
