"use client";

import { FormEvent, useState } from "react";
import { AdminRider, CreateRiderPayload } from "@/types/admin";

interface RiderManagementTableProps {
  riders: AdminRider[];
  isLoading: boolean;
  isBusy: boolean;
  onAddRider: (payload: CreateRiderPayload) => Promise<void>;
  onToggleRider: (userId: string) => void;
  onRemoveRider: (userId: string) => void;
}

const initialForm: CreateRiderPayload = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  isActive: true,
};

export function RiderManagementTable({
  riders,
  isLoading,
  isBusy,
  onAddRider,
  onToggleRider,
  onRemoveRider,
}: RiderManagementTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formValues, setFormValues] = useState<CreateRiderPayload>(initialForm);

  const closeModal = () => {
    setIsModalOpen(false);
    setFormValues(initialForm);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onAddRider(formValues);
    closeModal();
  };

  return (
    <section id="riders" className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Rider Management</h2>
          <p className="text-sm text-muted-foreground">
            Add, remove, and toggle rider status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Add rider
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading riders...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {riders.map((rider) => (
                <tr key={rider._id} className="border-b last:border-0">
                  <td className="px-3 py-2">{rider.name}</td>
                  <td className="px-3 py-2">{rider.phoneNumber || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full border px-2 py-1 text-xs font-semibold">
                      {rider.isActive ? "active" : "inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onToggleRider(rider._id)}
                        className="rounded-lg border px-2 py-1 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Toggle status
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => onRemoveRider(rider._id)}
                        className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Add Rider</h3>
            <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
              <input
                required
                placeholder="Full name"
                value={formValues.name}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    name: event.target.value,
                  }))
                }
                className="w-full rounded-xl border px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={formValues.email}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    email: event.target.value,
                  }))
                }
                className="w-full rounded-xl border px-3 py-2"
              />
              <input
                required
                type="password"
                placeholder="Password"
                value={formValues.password}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    password: event.target.value,
                  }))
                }
                className="w-full rounded-xl border px-3 py-2"
              />
              <input
                required
                placeholder="Phone number"
                value={formValues.phoneNumber}
                onChange={(event) =>
                  setFormValues((state) => ({
                    ...state,
                    phoneNumber: event.target.value,
                  }))
                }
                className="w-full rounded-xl border px-3 py-2"
              />

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(formValues.isActive)}
                  onChange={(event) =>
                    setFormValues((state) => ({
                      ...state,
                      isActive: event.target.checked,
                    }))
                  }
                />
                Active rider
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Create rider
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
