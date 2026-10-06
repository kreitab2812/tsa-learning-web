import type { ImgHTMLAttributes } from "react";

/** Admin previews may use arbitrary external URLs. Keep browser-only loading;
 * no server image proxy, paid transformation, or remote fetch from our server. */
export default function ContentImage(props: ImgHTMLAttributes<HTMLImageElement>) {
  // eslint-disable-next-line @next/next/no-img-element -- Deliberate browser-only preview of admin-provided URLs.
  return <img {...props} alt={props.alt ?? ""} loading="lazy" decoding="async" referrerPolicy="no-referrer" />;
}
