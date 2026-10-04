import { permanentRedirect } from "next/navigation";

/** The example report is a real, measured repository; this address is kept for old links. */
export default function SamplePage() {
  permanentRedirect("/repo/OpenPrinting/cups");
}
