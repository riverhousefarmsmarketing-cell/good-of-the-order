/**
 * GoodOfTheOrder - File Naming Conventions
 *
 * Pattern: {org_slug}_{doc_type}_{meeting_type}_{YYYY-MM-DD}_{version}.pdf
 * Example: lcfb_minutes_board_2026-01-15_v2-approved.pdf
 */

export function generateFileName({
  organization,
  documentType,
  meetingType,
  date,
  originalFileName,
  version,
  status,
}) {
  const slug = organization.slug.toLowerCase();
  const dateStr = typeof date === 'string' ? date : formatDateISO(date);

  const meetingSlug = meetingType
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

  switch (documentType) {
    case 'minutes': {
      let filename = `${slug}_minutes_${meetingSlug}_${dateStr}`;
      if (version) filename += `_v${version}`;
      if (status === 'approved') filename += '-approved';
      return `${filename}.pdf`;
    }
    case 'agenda':
      return `${slug}_agenda_${meetingSlug}_${dateStr}.pdf`;
    case 'attachment': {
      const sanitized = sanitizeFileName(originalFileName || 'attachment');
      return `${slug}_attachment_${dateStr}_${sanitized}`;
    }
    default:
      throw new Error(`Unknown document type: ${documentType}`);
  }
}

export function sanitizeFileName(filename) {
  return filename
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/-+/g, '-')
    .substring(0, 100);
}

export function parseFileName(filename) {
  const pattern =
    /^([a-z0-9]+)_([a-z]+)_([a-z-]+)_(\d{4}-\d{2}-\d{2})(?:_v(\d+))?(?:-([a-z]+))?\.pdf$/;
  const match = filename.match(pattern);
  if (!match) return null;

  return {
    orgSlug: match[1],
    documentType: match[2],
    meetingType: match[3],
    date: match[4],
    version: match[5] ? parseInt(match[5]) : 1,
    status: match[6] || 'draft',
  };
}

function formatDateISO(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}
