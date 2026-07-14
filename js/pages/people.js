window.Ledger = window.Ledger || {};
window.Ledger.pages = window.Ledger.pages || {};

window.Ledger.pages.renderPeoplePage = function(){
  var DB = window.Ledger.DB;
  var escapeHtml = window.Ledger.escapeHtml;
  var fmtMoney = window.Ledger.fmtMoney;
  var personBalanceByCurrency = window.Ledger.personBalanceByCurrency;
  var openDebtItemsForPerson = window.Ledger.openDebtItemsForPerson;
  var pendingDebtItems = window.Ledger.pendingDebtItems;

  var cards = DB.people.map(function(p){
    var byCur = personBalanceByCurrency(p.id);
    var currencies = Object.keys(byCur);
    var initials = p.name.split(" ").map(function(w){return w[0];}).slice(0,2).join("").toUpperCase();
    var items = openDebtItemsForPerson(p.id);
    var itemsHtml = items.length ? items.map(function(d){
      var dateDisp = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric"});
      return '<div style="display:flex; justify-content:space-between; align-items:center; padding:7px 0; border-top:1px solid var(--border-soft); font-size:12px;">'
        + '<span>' + escapeHtml(d.description) + ' <span class="faint">&middot; ' + dateDisp + '</span></span>'
        + '<span style="display:flex; align-items:center; gap:8px;">'
        + '  <span class="num" style="font-size:12.5px;">' + fmtMoney(d.amount, d.currency) + '</span>'
        + '  <button class="btn btn-sm" data-mark-paid="' + d.id + '">Mark paid</button>'
        + '</span>'
        + '</div>';
    }).join("") : '';

    var balanceHtml;
    if(currencies.length === 0){
      balanceHtml = '<div class="bal-lbl">Settled</div>';
    } else {
      balanceHtml = currencies.map(function(cur){
        var amt = byCur[cur];
        var lbl = amt > 0 ? "Owes you" : "You owe";
        return '<div style="margin-bottom:2px;">'
          + '<div class="bal-lbl" style="font-size:10px;">' + lbl + ' &middot; ' + cur + '</div>'
          + '<div class="bal num ' + (amt>0?'pos':'neg') + '" style="font-size:16px;">' + fmtMoney(Math.abs(amt), cur) + '</div>'
          + '</div>';
      }).join("");
    }

    return '<div class="person-card" style="flex-direction:column; align-items:stretch;">'
      + '<div style="display:flex; justify-content:space-between; align-items:flex-start;">'
      + '  <div class="pinfo">'
      + '    <div class="avatar">' + escapeHtml(initials) + '</div>'
      + '    <div><div class="nm">' + escapeHtml(p.name) + '</div>' + (currencies.length===0 ? '<div class="bal-lbl">Settled</div>' : '') + '</div>'
      + '  </div>'
      + '  <div style="text-align:right;">'
      + '    ' + (currencies.length ? balanceHtml : '')
      + '    <div class="acct-ops" style="justify-content:flex-end; display:flex;">'
      + '      <button class="icon-btn" data-edit-person="' + p.id + '" title="Edit" aria-label="Edit"><i data-lucide="pencil" style="width:13px;height:13px;"></i></button>'
      + '      <button class="icon-btn danger" data-del-person="' + p.id + '" title="Delete" aria-label="Delete">&times;</button>'
      + '    </div>'
      + '  </div>'
      + '</div>'
      + (itemsHtml ? '<div style="margin-top:6px;">' + itemsHtml + '</div>' : '')
      + '</div>';
  }).join("");

  if(DB.people.length === 0){
    cards = '<div class="empty-state"><div class="big">No people added</div>Add someone to track money lent or borrowed via transfers or splits.</div>';
  }

  var pending = pendingDebtItems();
  var pendingHtml = "";
  if(pending.length){
    pendingHtml = '<div class="card card-pad section-gap">'
      + '  <h2 style="font-size:16px; font-weight:800; margin:0 0 4px;">Pending splits</h2>'
      + '  <p class="faint" style="font-size:11.5px; margin:0 0 12px;">Shares from a split that don\'t have a person assigned yet.</p>'
      + pending.map(function(d){
          var dateDisp = new Date(d.date + "T00:00:00").toLocaleDateString(undefined, {month:"short", day:"numeric"});
          var peopleOpts = '<option value="">Assign to&hellip;</option>' + DB.people.map(function(p){ return '<option value="'+p.id+'">'+escapeHtml(p.name)+'</option>'; }).join("");
          return '<div style="display:flex; justify-content:space-between; align-items:center; padding:9px 0; border-top:1px solid var(--border-soft);">'
            + '<span style="font-size:12.5px;">' + escapeHtml(d.description) + ' <span class="faint">&middot; ' + dateDisp + ' &middot; ' + fmtMoney(d.amount, d.currency) + '</span></span>'
            + '<select class="assign-pending-sel" data-debt-id="' + d.id + '" style="font-size:12px; padding:5px 8px;">' + peopleOpts + '</select>'
            + '</div>';
        }).join("")
      + '</div>';
  }

  return ''
    + '<div class="card card-pad">'
    + '  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">'
    + '    <h2 style="font-size:16px; font-weight:800; margin:0;">People</h2>'
    + '    <button class="btn btn-primary btn-sm" id="addPersonBtn">+ Add person</button>'
    + '  </div>'
    + '  <div style="display:flex; flex-direction:column; gap:10px;">' + cards + '</div>'
    + '</div>'
    + pendingHtml;
};
