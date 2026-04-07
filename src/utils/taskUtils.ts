export const getProgressColor = (progress: number) => {
  if (progress <= 30) return "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]";
  if (progress <= 70) return "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.4)]";
  return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]";
};
