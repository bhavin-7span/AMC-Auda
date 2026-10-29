/** Display label and shadcn Badge variant per inspection workflow status. */
export const INSPECTION_STATUS: Record<
  string,
  { label: string; variant: 'outline' | 'info' | 'warning' | 'success' | 'destructive' }
> = {
  new: { label: 'New', variant: 'outline' },
  assigned: { label: 'Assigned', variant: 'info' },
  in_progress: { label: 'In progress', variant: 'info' },
  submitted: { label: 'Pending review', variant: 'warning' },
  under_review: { label: 'Under review', variant: 'warning' },
  rework: { label: 'Rework', variant: 'destructive' },
  completed: { label: 'Completed', variant: 'success' },
  closed: { label: 'Closed', variant: 'outline' },
};

export function inspectionStatus(code: string) {
  return INSPECTION_STATUS[code] ?? { label: code.replace(/_/g, ' '), variant: 'outline' as const };
}
