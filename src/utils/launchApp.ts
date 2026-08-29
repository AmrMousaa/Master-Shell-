import type { Pulse_apps } from '../generated/models/Pulse_appsModel';
import { recordAppUsage } from '../services/usageTracking';
import { withHiddenNavbar } from './url';

const USAGE_RECORD_TIMEOUT_MS = 300;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function launchApp(app: Pulse_apps): Promise<void> {
  if (!app.pulse_appurl) return;
  const url = withHiddenNavbar(app.pulse_appurl);
  // window.location.href triggers a same-tab navigation, which cancels any
  // in-flight requests once the browser starts unloading this page. Give
  // recordAppUsage a brief, capped head start so its writes actually reach
  // the server before that happens, without noticeably delaying the launch.
  await Promise.race([recordAppUsage(app.pulse_appid), delay(USAGE_RECORD_TIMEOUT_MS)]);
  window.location.href = url;
}
