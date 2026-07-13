import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  Edit3,
  FilePenLine,
  Table2,
  UserCircle2,
  XCircle
} from "lucide-react";
import {
  approveCorrectionRequest,
  createVoterCorrectionRequest,
  getAdminByUsername,
  getCorrectionRequests,
  getVoterByCard,
  getVoters,
  rejectCorrectionRequest,
  updateAdminProfile,
  updateVoterProfile
} from "../utils/localRegistry";

function formatDateTime(value) {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

function initials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function ProfileMenu({ authSession, onSessionUpdate, onStatus }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState("");
  const [version, setVersion] = useState(0);
  const [editForm, setEditForm] = useState({});
  const [requestForm, setRequestForm] = useState({
    requestedVoterCard: "",
    requestedDateOfBirth: "",
    reason: ""
  });

  const isVoter = authSession.role === "user";

  const profile = useMemo(() => {
    if (isVoter) {
      return getVoterByCard(authSession.voterCard || authSession.id);
    }

    return getAdminByUsername(authSession.username || authSession.id);
  }, [authSession, isVoter, version]);

  const voters = useMemo(() => getVoters(), [version]);
  const requests = useMemo(() => getCorrectionRequests(), [version]);

  function refreshLocal() {
    setVersion((current) => current + 1);
  }

  function openEditProfile() {
    if (!profile) return;
    setOpen(false);
    setModal("edit");
    setEditForm(
      isVoter
        ? {
            name: profile.name,
            phone: profile.phone,
            email: profile.email
          }
        : {
            phone: profile.phone,
            email: profile.email,
            password: ""
          }
    );
  }

  function saveProfile(event) {
    event.preventDefault();

    try {
      if (isVoter) {
        const updated = updateVoterProfile(profile.voterCard, editForm);
        onSessionUpdate({
          ...authSession,
          displayName: updated.name,
          voterCard: updated.voterCard,
          id: updated.voterCard,
          photo: updated.photo
        });
        onStatus("Voter profile updated successfully.", "success");
      } else {
        updateAdminProfile(profile.username, editForm);
        onStatus("Administrator profile updated successfully.", "success");
      }

      refreshLocal();
      setModal("view");
    } catch (error) {
      onStatus(error.message, "error");
    }
  }

  function submitCorrectionRequest(event) {
    event.preventDefault();

    try {
      createVoterCorrectionRequest(profile.voterCard, requestForm);
      setRequestForm({ requestedVoterCard: "", requestedDateOfBirth: "", reason: "" });
      refreshLocal();
      onStatus("Correction request sent to administrator.", "success");
    } catch (error) {
      onStatus(error.message, "error");
    }
  }

  function handleApprove(requestId) {
    try {
      approveCorrectionRequest(requestId);
      refreshLocal();
      onStatus("Voter correction request approved.", "success");
    } catch (error) {
      onStatus(error.message, "error");
    }
  }

  function handleReject(requestId) {
    try {
      rejectCorrectionRequest(requestId);
      refreshLocal();
      onStatus("Voter correction request rejected.", "info");
    } catch (error) {
      onStatus(error.message, "error");
    }
  }

  const displayName = isVoter ? profile?.name || authSession.displayName : "Administrator";
  const avatar = isVoter ? profile?.photo || authSession.photo : "";

  return (
    <div className="relative">
      <button
        className="focus-ring grid h-12 w-12 place-items-center overflow-hidden rounded-full border border-line bg-white text-sm font-bold text-brand shadow-sm"
        type="button"
        onClick={() => setOpen((current) => !current)}
        title="Profile menu"
      >
        {avatar ? (
          <img className="h-full w-full object-cover" src={avatar} alt={displayName} />
        ) : isVoter ? (
          initials(displayName)
        ) : (
          <UserCircle2 size={26} />
        )}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 grid w-64 gap-1 rounded-lg border border-line bg-white p-2 shadow-2xl">
          <div className="border-b border-line px-3 py-2">
            <p className="text-sm font-bold">{displayName}</p>
            <p className="text-xs text-slate-500">
              {isVoter ? profile?.voterCard || "Voter" : profile?.username || "Admin"}
            </p>
          </div>
          <button
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
            type="button"
            onClick={() => {
              setOpen(false);
              setModal("view");
            }}
          >
            <UserCircle2 size={16} />
            View Profile
          </button>
          <button
            className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
            type="button"
            onClick={openEditProfile}
          >
            <Edit3 size={16} />
            Edit Profile
          </button>
          {!isVoter ? (
            <button
              className="flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold hover:bg-slate-50"
              type="button"
              onClick={() => {
                setOpen(false);
                setModal("voters");
              }}
            >
              <Table2 size={16} />
              Voter Details
            </button>
          ) : null}
        </div>
      ) : null}

      {modal === "view" && profile ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-4">
          <section className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-brand">Profile Details</p>
                <h2 className="text-2xl font-bold">{displayName}</h2>
              </div>
              <button className="rounded-md border border-line px-3 py-1" onClick={() => setModal("")}>
                Close
              </button>
            </div>

            {isVoter && avatar ? (
              <img
                className="mb-4 h-28 w-28 rounded-full border border-line object-cover"
                src={avatar}
                alt={displayName}
              />
            ) : null}

            <dl className="grid gap-3 text-sm">
              {isVoter ? (
                <>
                  <Detail label="Name" value={profile.name} />
                  <Detail label="Voter Card" value={profile.voterCard} />
                  <Detail label="Date of Birth" value={profile.dateOfBirth} />
                  <Detail label="Phone" value={profile.phone || "Not provided"} />
                  <Detail label="Email" value={profile.email || "Not provided"} />
                  <Detail label="Registered At" value={formatDateTime(profile.registeredAt)} />
                </>
              ) : (
                <>
                  <Detail label="Administrator ID" value={profile.username} />
                  <Detail label="Phone" value={profile.phone} />
                  <Detail label="Email" value={profile.email} />
                  <Detail label="Registered At" value={formatDateTime(profile.registeredAt)} />
                </>
              )}
            </dl>
          </section>
        </div>
        </ModalPortal>
      ) : null}

      {modal === "edit" && profile ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/50 px-4 py-6">
          <section className="w-full max-w-xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-brand">Edit Profile</p>
                <h2 className="text-2xl font-bold">{displayName}</h2>
              </div>
              <button className="rounded-md border border-line px-3 py-1" onClick={() => setModal("")}>
                Close
              </button>
            </div>

            <form className="grid gap-3" onSubmit={saveProfile}>
              {isVoter ? (
                <>
                  <label className="text-sm font-bold" htmlFor="edit-name">
                    Name
                  </label>
                  <input
                    className="focus-ring rounded-md border border-line px-3 py-2"
                    id="edit-name"
                    value={editForm.name || ""}
                    onChange={(event) => setEditForm((form) => ({ ...form, name: event.target.value }))}
                    required
                  />
                  <ReadOnlyField label="Voter Card" value={profile.voterCard} />
                  <ReadOnlyField label="Date of Birth" value={profile.dateOfBirth} />
                </>
              ) : (
                <>
                  <ReadOnlyField label="Administrator ID" value={profile.username} />
                  <label className="text-sm font-bold" htmlFor="edit-password">
                    New Password
                  </label>
                  <input
                    className="focus-ring rounded-md border border-line px-3 py-2"
                    id="edit-password"
                    placeholder="Leave blank to keep current password"
                    type="password"
                    value={editForm.password || ""}
                    onChange={(event) =>
                      setEditForm((form) => ({ ...form, password: event.target.value }))
                    }
                  />
                </>
              )}

              <label className="text-sm font-bold" htmlFor="edit-phone">
                Phone Number
              </label>
              <input
                className="focus-ring rounded-md border border-line px-3 py-2"
                id="edit-phone"
                value={editForm.phone || ""}
                onChange={(event) => setEditForm((form) => ({ ...form, phone: event.target.value }))}
              />
              <label className="text-sm font-bold" htmlFor="edit-email">
                Email ID
              </label>
              <input
                className="focus-ring rounded-md border border-line px-3 py-2"
                id="edit-email"
                type="email"
                value={editForm.email || ""}
                onChange={(event) => setEditForm((form) => ({ ...form, email: event.target.value }))}
              />

              <button className="focus-ring mt-2 rounded-md bg-brand px-4 py-2 font-bold text-white">
                Save Profile
              </button>
            </form>

            {isVoter ? (
              <form className="mt-6 grid gap-3 border-t border-line pt-5" onSubmit={submitCorrectionRequest}>
                <div>
                  <p className="font-bold">Request Admin Correction</p>
                  <p className="text-sm text-slate-500">
                    Voter card and date of birth can be changed only by administrator approval.
                  </p>
                </div>
                <input
                  className="focus-ring rounded-md border border-line px-3 py-2 uppercase"
                  maxLength={10}
                  placeholder="Requested voter card, for example ABC1234567"
                  value={requestForm.requestedVoterCard}
                  onChange={(event) =>
                    setRequestForm((form) => ({
                      ...form,
                      requestedVoterCard: event.target.value.toUpperCase()
                    }))
                  }
                />
                <input
                  className="focus-ring rounded-md border border-line px-3 py-2"
                  type="date"
                  value={requestForm.requestedDateOfBirth}
                  onChange={(event) =>
                    setRequestForm((form) => ({
                      ...form,
                      requestedDateOfBirth: event.target.value
                    }))
                  }
                />
                <textarea
                  className="focus-ring min-h-20 rounded-md border border-line px-3 py-2"
                  placeholder="Reason for correction"
                  value={requestForm.reason}
                  onChange={(event) =>
                    setRequestForm((form) => ({ ...form, reason: event.target.value }))
                  }
                />
                <button className="focus-ring inline-flex w-max items-center gap-2 rounded-md bg-ink px-4 py-2 font-bold text-white">
                  <FilePenLine size={16} />
                  Send Request
                </button>
              </form>
            ) : null}
          </section>
        </div>
        </ModalPortal>
      ) : null}

      {modal === "voters" && !isVoter ? (
        <ModalPortal>
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 px-4 py-6">
          <section className="w-full max-w-6xl rounded-lg bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase text-brand">Voter Register</p>
                <h2 className="text-2xl font-bold">Excel Style Voter Details</h2>
              </div>
              <button className="rounded-md border border-line px-3 py-1" onClick={() => setModal("")}>
                Close
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    {[
                      "Name",
                      "Voter Card",
                      "Date of Birth",
                      "Phone",
                      "Email",
                      "Registered Time",
                      "Correction Request",
                      "Action"
                    ].map((heading) => (
                      <th className="border border-slate-300 px-3 py-2 text-left" key={heading}>
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {voters.map((voter) => {
                    const pendingRequest = requests.find(
                      (request) =>
                        request.voterCard === voter.voterCard && request.status === "Pending"
                    );

                    return (
                      <tr className="even:bg-slate-50" key={`${voter.voterCard}-${voter.name}`}>
                        <td className="border border-slate-300 px-3 py-2">{voter.name}</td>
                        <td className="border border-slate-300 px-3 py-2 font-mono">
                          {voter.voterCard}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">{voter.dateOfBirth}</td>
                        <td className="border border-slate-300 px-3 py-2">{voter.phone}</td>
                        <td className="border border-slate-300 px-3 py-2">{voter.email}</td>
                        <td className="border border-slate-300 px-3 py-2">
                          {formatDateTime(voter.registeredAt)}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          {pendingRequest ? (
                            <div className="grid gap-1">
                              <span>Card: {pendingRequest.requestedVoterCard || "No change"}</span>
                              <span>DOB: {pendingRequest.requestedDateOfBirth || "No change"}</span>
                              <span className="text-xs text-slate-500">{pendingRequest.reason}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">None</span>
                          )}
                        </td>
                        <td className="border border-slate-300 px-3 py-2">
                          {pendingRequest ? (
                            <div className="flex gap-2">
                              <button
                                className="inline-flex items-center gap-1 rounded-md bg-green-700 px-2 py-1 text-xs font-bold text-white"
                                type="button"
                                onClick={() => handleApprove(pendingRequest.id)}
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </button>
                              <button
                                className="inline-flex items-center gap-1 rounded-md bg-red-700 px-2 py-1 text-xs font-bold text-white"
                                type="button"
                                onClick={() => handleReject(pendingRequest.id)}
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">No action</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
        </ModalPortal>
      ) : null}
    </div>
  );
}

function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

function Detail({ label, value }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 rounded-md border border-line px-3 py-2">
      <dt className="font-bold text-slate-600">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ReadOnlyField({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
      <strong className="block text-slate-600">{label}</strong>
      <span>{value}</span>
    </div>
  );
}
