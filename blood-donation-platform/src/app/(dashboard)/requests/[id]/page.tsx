"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { formatDate } from "@/lib/format";
import SharePanel from "@/components/request/SharePanel";
import ChatPanel from "@/components/request/ChatPanel";
import ReportForm from "@/components/request/ReportForm";

interface RequestData {
  id: string;
  shareCode: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgency: string;
  hospitalName: string;
  city: string;
  status: string;
  note: string | null;
  createdAt: string;
  patientName: string | null;
  contactPhone: string | null;
  requester: { id: string; name: string };
  acceptedCount: number;
  confirmedCount: number;
  viewerRole: "requester" | "admin" | "accepted_donor" | "other";
  myResponse: "accepted" | "declined" | null;
  iDonated: boolean;
  acceptedDonors: { id: string; name: string; confirmed: boolean }[] | null;
}

export default function RequestPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const [data, setData] = useState<RequestData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [chatWith, setChatWith] = useState<{ id: string; name: string } | null>(null);
  const [reportTarget, setReportTarget] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/requests/${params.id}`);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || "Could not load this request");
      return;
    }
    setData(json);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  // A donor who accepted chats with the requester automatically
  useEffect(() => {
    if (data?.viewerRole === "accepted_donor") setChatWith(data.requester);
  }, [data]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setNotice("");
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setNotice(json.error || "Something went wrong");
    else await load();
    return res.ok;
  }

  if (error) return <main className="mx-auto max-w-2xl px-4 py-8 text-red-600">{error}</main>;
  if (!data) return <main className="mx-auto max-w-2xl px-4 py-8 text-gray-500">Loading...</main>;

  const open = data.status === "open" || data.status === "matched";
  const isRequester = data.viewerRole === "requester";
  const isDonorView = data.viewerRole === "accepted_donor";
  const canAct = session ? !(session.user.role === "admin") : false;

  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 py-8">
      {/* Summary */}
      <section className="space-y-3 rounded-lg bg-white p-5 shadow">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
            {data.bloodGroup}
          </span>
          <div>
            <h1 className="text-xl font-bold">
              {data.unitsNeeded} {data.unitsNeeded === 1 ? "unit" : "units"} needed
            </h1>
            <p className="text-gray-600">
              {data.hospitalName}, {data.city}
            </p>
            <p className="text-xs text-gray-500">
              Urgency: {data.urgency} · Status: <span className="capitalize">{data.status}</span> · Posted {formatDate(data.createdAt)}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-700">
          Requested by <strong>{data.requester.name}</strong> · {data.acceptedCount} accepted · {data.confirmedCount}/{data.unitsNeeded} donated
        </p>
        {data.note && <p className="rounded bg-gray-50 p-3 text-sm">{data.note}</p>}
        {data.patientName && (
          <p className="text-sm">
            Patient: <strong>{data.patientName}</strong>
            {data.contactPhone && (
              <>
                {" "}
                · Phone:{" "}
                <a className="text-brand-600 underline" href={`tel:${data.contactPhone}`}>
                  {data.contactPhone}
                </a>
              </>
            )}
          </p>
        )}
        {data.status === "flagged" && (
          <p className="rounded bg-yellow-50 p-3 text-sm text-yellow-800">This request was frozen by an admin after a report.</p>
        )}
      </section>

      {notice && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{notice}</p>}

      {/* Donor actions */}
      {!isRequester && canAct && open && !data.iDonated && (
        <section className="space-y-3 rounded-lg bg-white p-5 shadow">
          {data.myResponse === "accepted" ? (
            <p className="text-sm text-green-700">You accepted this request. Please contact the family and go to the hospital.</p>
          ) : (
            <p className="text-sm text-gray-700">Can you donate {data.bloodGroup} blood for this patient?</p>
          )}
          <div className="flex gap-2">
            {data.myResponse !== "accepted" && (
              <button disabled={busy} onClick={() => post(`/api/requests/${data.id}/respond`, { action: "accept" })} className="rounded bg-brand-600 px-4 py-2 text-sm text-white hover:bg-brand-700 disabled:opacity-50">
                I can donate
              </button>
            )}
            {data.myResponse !== "declined" && (
              <button disabled={busy} onClick={() => post(`/api/requests/${data.id}/respond`, { action: "decline" })} className="rounded border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">
                {data.myResponse === "accepted" ? "Withdraw" : "Not available"}
              </button>
            )}
          </div>
        </section>
      )}
      {data.iDonated && (
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">Your donation was confirmed. Thank you for saving a life.</p>
      )}

      {/* Requester: accepted donors */}
      {(isRequester || data.viewerRole === "admin") && (
        <section className="space-y-3 rounded-lg bg-white p-5 shadow">
          <h2 className="font-semibold">Donors who accepted</h2>
          {data.acceptedDonors?.length ? (
            <ul className="divide-y">
              {data.acceptedDonors.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-2">
                  <span className="mr-auto font-medium">{d.name}</span>
                  {d.confirmed ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">Donated</span>
                  ) : (
                    isRequester && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (confirm(`Confirm that ${d.name} has donated blood? This cannot be undone.`))
                            post(`/api/requests/${data.id}/confirm-donation`, { donorId: d.id });
                        }}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Confirm donated
                      </button>
                    )
                  )}
                  {isRequester && (
                    <>
                      <button onClick={() => setChatWith({ id: d.id, name: d.name })} className="rounded border px-3 py-1 text-xs hover:bg-gray-50">
                        Message
                      </button>
                      <button onClick={() => setReportTarget({ id: d.id, name: d.name })} className="rounded border border-red-300 px-3 py-1 text-xs text-red-600 hover:bg-red-50">
                        Report
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No one has accepted yet.</p>
          )}
        </section>
      )}

      {/* Donor: report the requester */}
      {isDonorView && (
        <p className="text-sm text-gray-600">
          Something wrong with this request?{" "}
          <button onClick={() => setReportTarget(data.requester)} className="text-red-600 underline">
            Report {data.requester.name}
          </button>
        </p>
      )}

      {/* Chat */}
      {chatWith && (
        <ChatPanel
          key={chatWith.id}
          requestId={data.id}
          peerId={chatWith.id}
          peerName={chatWith.name}
          canSend
        />
      )}

      {/* Share */}
      {open && (
        <SharePanel
          requestId={data.id}
          shareCode={data.shareCode}
          bloodGroup={data.bloodGroup}
          hospitalName={data.hospitalName}
          city={data.city}
        />
      )}

      {reportTarget && (
        <ReportForm
          requestId={data.id}
          reportedUserId={reportTarget.id}
          reportedName={reportTarget.name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </main>
  );
}