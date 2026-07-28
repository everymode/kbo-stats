export function getKboPagerEventName(page: number) {
  if (!Number.isInteger(page) || page < 2) {
    throw new Error("KBO pager page must be an integer greater than 1.");
  }

  const pageSlot = ((page - 1) % 5) + 1;
  return pageSlot === 1 ? "btnNext" : `btnNo${pageSlot}`;
}

export function getKboPagerEventTarget(prefix: string, page: number) {
  return `${prefix}${getKboPagerEventName(page)}`;
}
