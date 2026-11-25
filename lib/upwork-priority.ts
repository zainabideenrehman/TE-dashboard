const criteria = [
  ["Service / Capability Score (30)", "Service fit", 30, 27],
  ["Relevant Proof Score (20)", "Relevant proof", 20, 10],
  ["Client Credibility Score (15)", "Client credibility", 15, 30],
  ["Budget / Scope Score (15)", "Budget and scope", 15, 19],
  ["Commercial Potential Score (10)", "Commercial potential", 10, 11],
  ["Timing / Competition Score (10)", "Timing and competition", 10, 3],
] as const;

export function upworkBidFit(fields: Record<string, string>) {
  const parts = criteria.map(([field, label, maximum, weight]) => {
    const raw = fields[field]?.trim();
    const value = raw && /^\d+(?:\.\d+)?$/.test(raw) ? Number(raw) : undefined;
    return {
      label,
      weight,
      points: value === undefined || value > maximum ? undefined : value / maximum * weight,
    };
  });
  const score = parts.every(part => part.points !== undefined)
    ? Math.round(parts.reduce((sum, part) => sum + (part.points ?? 0), 0) * 10) / 10
    : undefined;
  return { score, parts };
}
