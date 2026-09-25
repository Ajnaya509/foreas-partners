/** Existing app passage only. Its opaque key never grants a portal session or role. */
export function appPassageLink(value:unknown):string|null {
  if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))return null;
  return `foreas://ajnaya?handoff=${encodeURIComponent(value)}`;
}
