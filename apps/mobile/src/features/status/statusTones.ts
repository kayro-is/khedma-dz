import type { ProposalStatus, RequestUrgency, ServiceRequestStatus } from '@khedma/types';

import type { BadgeTone } from '@/components/ui/Badge';

export const REQUEST_STATUS_TONE: Record<ServiceRequestStatus, BadgeTone> = {
  OPEN: 'primary',
  ASSIGNED: 'accent',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  DISPUTED: 'error',
};

export const PROPOSAL_STATUS_TONE: Record<ProposalStatus, BadgeTone> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'error',
  WITHDRAWN: 'neutral',
};

export const URGENCY_TONE: Record<RequestUrgency, BadgeTone> = {
  LOW: 'neutral',
  NORMAL: 'primary',
  URGENT: 'error',
};
