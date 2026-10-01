import { ROLES } from "./Participant.js";

export function canControlPlayback(role) {
  return (
    role === ROLES.HOST ||
    role === ROLES.MODERATOR
  );
}

export function canAssignModerator(role) {
  return role === ROLES.HOST;
}

export function canRemoveParticipant(role) {
  return role === ROLES.HOST;
}

export function canApproveRequest(role) {
  return (
    role === ROLES.HOST ||
    role === ROLES.MODERATOR
  );
}