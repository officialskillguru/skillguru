export function trackPageView(path: string, title: string) {
  window.dispatchEvent(new CustomEvent("skill-guru:page-view", { detail: { path, title } }));
}
