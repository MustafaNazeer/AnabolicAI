export function shouldSendPr(settings: {
  notif_master: boolean;
  notif_pr: boolean;
}): boolean {
  return settings.notif_master && settings.notif_pr;
}
