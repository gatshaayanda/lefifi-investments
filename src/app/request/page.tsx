import { redirect } from "next/navigation";
export const metadata = { title: "Enquire with Lefifi", description: "Send Lefifi an event or equipment hire enquiry." };
export default function RequestPage(){redirect("/#request");}
