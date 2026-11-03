// What a review report's status means to the student who sent it (My reports and the profile folder).
// Approving a report deletes the review; declining keeps it up.
export const REPORT_STATUS = {
  Pending: { label: 'Waiting for an admin', short: 'Waiting' },
  Approved: { label: 'Review removed', short: 'Removed' },
  Declined: { label: 'Review kept', short: 'Kept' },
}

export const reportStatusLabel = status => REPORT_STATUS[status]?.label ?? status
