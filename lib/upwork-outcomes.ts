import type { UpworkProposal } from "./domain";

export function agencyInterview(proposal: UpworkProposal, asOf: string) {
  return proposal.flags?.interviewed === true ||
    (proposal.interviewDate ? proposal.interviewDate <= asOf : proposal.stage === "Interview");
}

export function agencyHire(proposal: UpworkProposal, asOf: string) {
  if (proposal.stage === "Lost" || proposal.flags?.hired === false) return false;
  // A positive Hired marking can also mean that the client hired someone else.
  return proposal.wonDate ? proposal.wonDate <= asOf : proposal.stage === "Won";
}
