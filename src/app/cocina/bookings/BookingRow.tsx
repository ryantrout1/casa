"use client";

import { useRouter } from "next/navigation";

type Props = {
  id: string;
  received: string;
  pkg: string;
  name: string;
  eventDate: string;
  guests: string;
  est: string;
  status: string;
  emailed: boolean;
};

export default function BookingRow({
  id,
  received,
  pkg,
  name,
  eventDate,
  guests,
  est,
  status,
  emailed,
}: Props) {
  const router = useRouter();
  const href = `/cocina/bookings/${id}`;
  const go = () => router.push(href);

  return (
    <tr
      className="row-link"
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      }}
      tabIndex={0}
      role="link"
      aria-label={`Open booking for ${name}`}
    >
      <td>{received}</td>
      <td>{pkg}</td>
      <td>{name}</td>
      <td>{eventDate}</td>
      <td>{guests}</td>
      <td>{est}</td>
      <td>
        {status === "new" ? <strong>new</strong> : status}
        {!emailed ? <span className="muted"> · ✉︎ not sent</span> : null}
      </td>
    </tr>
  );
}
