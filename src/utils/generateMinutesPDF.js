// src/utils/generateMinutesPDF.js
//
// Generates a professional PDF of finalized meeting minutes
// with distribution history appended.
//
// Install: npm install jspdf
//
// Usage:
//   import { downloadMinutesPDF } from '../utils/generateMinutesPDF';
//   downloadMinutesPDF(draft, members, organization, distributionLogs);

import jsPDF from 'jspdf';

// ─── Constants ───────────────────────────────────────────────────────
const HEADING = [30, 41, 59];     // #1e293b
const BLUE    = [30, 64, 175];    // #1e40af
const TEXT    = [30, 41, 59];     // #1e293b
const MUTED   = [148, 163, 184]; // #94a3b8
const BORDER  = [226, 232, 240]; // #e2e8f0

const MEETING_LABELS = { BOARD: 'Board', ANNUAL: 'Annual', SUBCOMMITTEE: 'Subcommittee' };

function fmtDate(d) {
  if (!d) return '[Not provided]';
  return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Load image as base64 for jsPDF ──────────────────────────────────
function loadImageAsBase64(url) {
  return new Promise((resolve) => {
    if (!url) { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        resolve({ data: canvas.toDataURL('image/png'), width: img.naturalWidth, height: img.naturalHeight });
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = url + '?t=' + Date.now(); // cache-bust
  });
}

// ─── Main export ─────────────────────────────────────────────────────
export async function downloadMinutesPDF(draft, members, organization, distributionLogs = []) {
  // Load logo before generating PDF
  const logo = await loadImageAsBase64(organization?.logo_url);

  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();   // 612
  const H = doc.internal.pageSize.getHeight();  // 792
  const ML = 54, MR = 54, MT = 54, MB = 72;
  const CW = W - ML - MR;
  let y = MT;
  const np = '[Not provided]';

  const mtLabel = MEETING_LABELS[draft.meeting_type] || 'Board';
  const isSC = draft.meeting_type === 'SUBCOMMITTEE';

  // ─── Member name helper (matches MinutesEdit fmtMember) ────────
  const fmtMember = (memberId) => {
    const m = (members || []).find(x => x.id === memberId);
    return m ? `${m.full_name}${m.board_position ? ' — ' + m.board_position : ''}` : (memberId || '');
  };

  // ─── Page break check ─────────────────────────────────────────
  function check(needed = 40) {
    if (y + needed > H - MB) { doc.addPage(); y = MT; }
  }

  // ─── Section heading ──────────────────────────────────────────
  function heading(text) {
    check(36);
    y += 10;
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
    doc.text(text, ML, y);
    y += 4;
    doc.setDrawColor(...BORDER); doc.setLineWidth(0.75);
    doc.line(ML, y, W - MR, y);
    y += 14;
  }

  // ─── Field: "Label: value" on one line ─────────────────────────
  function field(label, value) {
    check(20);
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
    const lbl = `${label}: `;
    doc.text(lbl, ML, y);
    const lw = doc.getTextWidth(lbl);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || np, CW - lw - 4);
    doc.text(lines, ML + lw, y);
    y += lines.length * 14 + 4;
  }

  // ─── Paragraph text ────────────────────────────────────────────
  function para(text, indent = 0) {
    if (!text) return;
    check(16);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT);
    const lines = doc.splitTextToSize(text, CW - indent);
    lines.forEach(line => { check(14); doc.text(line, ML + indent, y); y += 14; });
    y += 4;
  }

  // ─── Motion block ─────────────────────────────────────────────
  function motion(m, noMotion) {
    if (noMotion || !m?.text) {
      doc.setFontSize(10); doc.setFont('helvetica', 'italic'); doc.setTextColor(...MUTED);
      check(16); doc.text('No motion was made.', ML + 16, y); y += 16;
      return;
    }
    const startY = y;
    const indent = 16;
    const pairs = [
      ['Motion', m.text], ['Moved by', m.movedBy || m.moved_by],
      ['Seconded by', m.secondedBy || m.seconded_by],
      ['Decision', m.decision], ['Vote', m.vote],
    ];
    pairs.forEach(([lbl, val]) => {
      if (!val) return;
      check(14);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(`${lbl}:`, ML + indent + 6, y);
      const lw = doc.getTextWidth(`${lbl}: `);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(val, CW - indent - lw - 10);
      doc.text(lines, ML + indent + 6 + lw, y);
      y += lines.length * 14;
    });
    // Left border
    doc.setDrawColor(...BORDER); doc.setLineWidth(2);
    doc.line(ML + indent, startY - 4, ML + indent, y);
    y += 8;
  }

  // ═══════════════════════════════════════════════════════════════
  // HEADER (with logo)
  // ═══════════════════════════════════════════════════════════════
  const logoPos = organization?.logo_position || 'center';

  if (logo) {
    // Scale logo to max 80pt tall, preserve aspect ratio
    const maxH = 80;
    const maxW = 200;
    const ratio = Math.min(maxW / logo.width, maxH / logo.height, 1);
    const imgW = logo.width * ratio;
    const imgH = logo.height * ratio;
    let imgX = (W - imgW) / 2; // center
    if (logoPos === 'left') imgX = ML;
    if (logoPos === 'right') imgX = W - MR - imgW;
    doc.addImage(logo.data, 'PNG', imgX, y, imgW, imgH);
    y += imgH + 12;
  }

  const textAlign = logoPos === 'left' ? 'left' : logoPos === 'right' ? 'right' : 'center';
  const textX = logoPos === 'left' ? ML : logoPos === 'right' ? W - MR : W / 2;
  const textOpts = logoPos === 'center' ? { align: 'center' } : logoPos === 'right' ? { align: 'right' } : {};

  doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(...HEADING);
  doc.text(organization?.name || 'Organization', textX, y, textOpts);
  y += 22;
  doc.setFontSize(14); doc.setTextColor(...BLUE);
  doc.text(`${mtLabel} Meeting Minutes`, textX, y, textOpts);
  y += 18;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
  doc.text(fmtDate(draft.meeting_date), textX, y, textOpts);
  y += 8;
  doc.setDrawColor(...BLUE); doc.setLineWidth(1.5);
  doc.line(ML + 120, y, W - MR - 120, y);
  y += 20;

  // ═══════════════════════════════════════════════════════════════
  // MEETING INFORMATION
  // ═══════════════════════════════════════════════════════════════
  heading('Meeting Information');
  field('Organization', organization?.name);
  field('Meeting Type', mtLabel);
  field('Date', fmtDate(draft.meeting_date));
  field('Time', draft.meeting_time);
  field('Location', draft.location);
  field(isSC ? 'Chair' : 'Facilitator/President', fmtMember(draft.facilitator_id));
  field('Recorder', fmtMember(draft.recorder_id));

  // ═══════════════════════════════════════════════════════════════
  // CALL TO ORDER
  // ═══════════════════════════════════════════════════════════════
  heading('Call to Order');
  field('Time Called to Order', draft.time_called_to_order);
  if (!isSC) {
    field('Invocation', draft.invocation || 'Invocation was given.');
    field('Pledge of Allegiance', draft.pledge_recited ? 'Pledge was recited.' : 'Not recited.');
  }

  // ═══════════════════════════════════════════════════════════════
  // ATTENDANCE
  // ═══════════════════════════════════════════════════════════════
  heading('Roll Call / Introductions');
  const present = (draft.attendance || []).filter(a => a.status === 'present').map(a => fmtMember(a.member_id)).join(', ');
  const absent  = (draft.attendance || []).filter(a => a.status === 'absent').map(a => fmtMember(a.member_id)).join(', ');
  const excused = (draft.attendance || []).filter(a => a.status === 'excused').map(a => fmtMember(a.member_id)).join(', ');
  field('Present', present || np);
  field('Absent', absent || 'None');
  if (excused) field('Excused', excused);
  field('Guests', draft.guests || 'None');

  heading('Quorum');
  const qLabels = { present: 'Present', not_present: 'Not Present', not_recorded: 'Not Recorded' };
  para(qLabels[draft.quorum] || draft.quorum || np);

  // ═══════════════════════════════════════════════════════════════
  // AGENDA & MINUTES APPROVAL
  // ═══════════════════════════════════════════════════════════════
  heading('Agenda Review & Approval');
  field('Agenda Changes', draft.agenda_changes || 'None');
  motion(draft.agenda_approval_motion, draft.agenda_no_motion);

  heading('Approval of Previous Meeting Minutes');
  field('Meeting Date(s)', draft.previous_meeting_dates);
  motion(draft.minutes_approval_motion, draft.minutes_no_motion);

  // ═══════════════════════════════════════════════════════════════
  // FINANCIAL (Board/Annual only)
  // ═══════════════════════════════════════════════════════════════
  if (!isSC) {
    heading("Treasurer's / Financial Report");
    field('Total Donations (YTD)', draft.total_donations_ytd ? `$${draft.total_donations_ytd}` : '$0.00');
    field('Donations Since Last Meeting', draft.donations_since_last_meeting ? `$${draft.donations_since_last_meeting}` : '$0.00');

    // Multi-account balances
    if ((draft.accounts || []).length > 0) {
      check(20);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text('Account Balances:', ML, y); y += 16;
      let total = 0;
      draft.accounts.forEach(acct => {
        check(14);
        doc.setFont('helvetica', 'normal');
        const bal = parseFloat(acct.balance) || 0;
        total += bal;
        doc.text(`${acct.name || 'Account'}:`, ML + 16, y);
        doc.text(`$${bal.toFixed(2)}`, ML + 280, y);
        y += 14;
      });
      check(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Total:', ML + 16, y);
      doc.text(`$${total.toFixed(2)}`, ML + 280, y);
      y += 18;
    } else {
      field('Current Account Balance', draft.current_account_balance ? `$${draft.current_account_balance}` : '$0.00');
    }

    // Fundraising events
    if ((draft.financialItems || []).filter(f => f.type === 'fundraising').length > 0) {
      check(20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...TEXT);
      doc.text('Fundraising Events:', ML, y); y += 16;
      draft.financialItems.filter(f => f.type === 'fundraising').forEach(evt => {
        check(14); doc.setFont('helvetica', 'normal');
        doc.text(`${evt.name || evt.description || 'Event'}: $${evt.amount || '0.00'}`, ML + 16, y); y += 14;
      });
      y += 4;
    }

    // Expenses
    if ((draft.financialItems || []).filter(f => f.type === 'expense').length > 0) {
      check(20);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...TEXT);
      doc.text('Expenses:', ML, y); y += 16;
      draft.financialItems.filter(f => f.type === 'expense').forEach(exp => {
        check(14); doc.setFont('helvetica', 'normal');
        doc.text(`${exp.description || 'Expense'}: $${exp.amount || '0.00'}`, ML + 16, y); y += 14;
      });
      y += 4;
    }

    motion(draft.financial_report_motion, draft.financial_no_motion);
  }

  // ═══════════════════════════════════════════════════════════════
  // REPORTS (Board/Annual only)
  // ═══════════════════════════════════════════════════════════════
  if (!isSC) {
    if (draft.correspondence) { heading('Correspondence'); para(draft.correspondence); }

    heading("President's Report");
    para(draft.presidents_report || np);
    motion(draft.presidents_report_motion, draft.presidents_report_no_motion);

    heading('Member Services / Coordinator Report');
    para(draft.member_services_report || np);
    motion(draft.member_services_motion, draft.member_services_no_motion);

    heading('State Board / County Reports');
    para(draft.state_board_report || np);
    motion(draft.state_board_motion, draft.state_board_no_motion);

    // Committee Reports
    heading('Committee Reports');
    const committees = [
      { label: 'Membership Committee', text: draft.membership_committee, motion: draft.membership_motion, noMotion: draft.membership_no_motion, extra: draft.new_members ? `New Members: ${draft.new_members}` : null },
      { label: 'PAC Committee', text: draft.pac_committee, motion: draft.pac_motion, noMotion: draft.pac_no_motion },
      { label: 'Nomination Committee', text: draft.nomination_committee, motion: draft.nomination_motion, noMotion: draft.nomination_no_motion },
      { label: 'Policy Committee', text: draft.policy_committee, motion: draft.policy_motion, noMotion: draft.policy_no_motion },
    ];
    committees.forEach(c => {
      if (!c.text && c.label === 'Policy Committee') return; // skip if empty + optional
      check(30);
      doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(c.label, ML + 8, y); y += 16;
      para(c.text || np, 16);
      if (c.extra) { para(c.extra, 16); }
      motion(c.motion, c.noMotion);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // BUSINESS ITEMS
  // ═══════════════════════════════════════════════════════════════
  const oldBiz = (draft.businessItems || []).filter(b => b.item_type === 'old');
  const newBiz = (draft.businessItems || []).filter(b => b.item_type === 'new');

  heading('Old Business');
  if (oldBiz.length === 0) { para('None'); }
  else {
    oldBiz.forEach((item, i) => {
      check(30);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(`${i + 1}. ${item.title || 'Item'}`, ML + 8, y); y += 16;
      if (item.discussion) para(item.discussion, 20);
      motion(item.motion, item.noMotion !== undefined ? item.noMotion : item.no_motion);
    });
  }

  heading('New Business');
  if (newBiz.length === 0) { para('None'); }
  else {
    newBiz.forEach((item, i) => {
      check(30);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(`${i + 1}. ${item.title || 'Item'}`, ML + 8, y); y += 16;
      if (item.discussion) para(item.discussion, 20);
      motion(item.motion, item.noMotion !== undefined ? item.noMotion : item.no_motion);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // UPCOMING EVENTS
  // ═══════════════════════════════════════════════════════════════
  if ((draft.upcomingEvents || []).length > 0) {
    heading('Upcoming Events');
    draft.upcomingEvents.forEach(evt => {
      check(14);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...TEXT);
      doc.text(`• ${evt.name || 'Event'}${evt.date ? ' — ' + evt.date : ''}${evt.location ? ' at ' + evt.location : ''}`, ML + 8, y);
      y += 16;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // GOOD OF THE ORDER
  // ═══════════════════════════════════════════════════════════════
  heading('Good of the Order');
  para(draft.good_of_the_order || np);

  // ═══════════════════════════════════════════════════════════════
  // ADJOURNMENT
  // ═══════════════════════════════════════════════════════════════
  heading('Adjournment');
  field('Time Adjourned', draft.time_adjourned);
  motion(draft.adjournment_motion, draft.adjournment_no_motion);

  // ═══════════════════════════════════════════════════════════════
  // ACTION ITEMS
  // ═══════════════════════════════════════════════════════════════
  if ((draft.actionItems || []).length > 0) {
    heading('Action Items');
    draft.actionItems.forEach((item, i) => {
      check(28);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(`${i + 1}.`, ML + 8, y);
      doc.setFont('helvetica', 'normal');
      doc.text(item.task || item.description || 'Task', ML + 24, y);
      y += 14;
      if (item.assignee_name || item.assignee || item.due_date) {
        doc.setFont('helvetica', 'italic'); doc.setTextColor(...MUTED);
        const parts = [];
        if (item.assignee_name || item.assignee) parts.push(`Assignee: ${item.assignee_name || item.assignee}`);
        if (item.due_date) parts.push(`Due: ${item.due_date}`);
        doc.text(parts.join('  |  '), ML + 24, y);
        y += 14;
      }
      y += 4;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // DISTRIBUTION RECORD
  // ═══════════════════════════════════════════════════════════════
  if (distributionLogs.length > 0) {
    heading('Distribution Record');
    check(20);
    doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text('This document was distributed to the following recipients:', ML, y);
    y += 16;

    distributionLogs.forEach(send => {
      check(40);
      doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...TEXT);
      doc.text(`Sent: ${new Date(send.sent_at).toLocaleString()}`, ML + 8, y);
      if (send.sent_by_profile?.full_name) {
        doc.setFont('helvetica', 'normal');
        doc.text(`by ${send.sent_by_profile.full_name}`, ML + 250, y);
      }
      y += 14;

      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
      const emails = (send.recipient_emails || []).join(', ');
      const emailLines = doc.splitTextToSize(`Recipients: ${emails}`, CW - 16);
      emailLines.forEach(line => { check(12); doc.text(line, ML + 8, y); y += 12; });
      y += 8;
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // SIGNATURE LINES
  // ═══════════════════════════════════════════════════════════════
  check(100);
  y += 24;
  doc.setDrawColor(...BORDER); doc.setLineWidth(0.5);
  doc.line(ML, y, ML + 200, y);
  doc.line(ML + 240, y, ML + 340, y);
  doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text('Recorder / Secretary', ML, y + 14);
  doc.text('Date', ML + 240, y + 14);

  y += 44;
  check(60);
  doc.line(ML, y, ML + 200, y);
  doc.line(ML + 240, y, ML + 340, y);
  doc.text('President / Chair', ML, y + 14);
  doc.text('Date', ML + 240, y + 14);

  // ═══════════════════════════════════════════════════════════════
  // PAGE FOOTERS
  // ═══════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text(
      `${organization?.name || 'GoodOfTheOrder'} — ${mtLabel} Meeting Minutes — ${fmtDate(draft.meeting_date)}`,
      ML, H - 36
    );
    doc.text(`Page ${i} of ${totalPages}`, W - MR, H - 36, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════════
  // TRIGGER DOWNLOAD
  // ═══════════════════════════════════════════════════════════════
  const dateStr = draft.meeting_date || 'undated';
  const typeStr = (draft.meeting_type || 'board').toLowerCase();
  doc.save(`minutes-${typeStr}-${dateStr}.pdf`);
}
