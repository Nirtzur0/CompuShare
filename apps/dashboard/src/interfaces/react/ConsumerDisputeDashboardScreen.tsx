"use client";

import React, { useState } from "react";
import {
  ConsumerDisputeDashboard,
  type ConsumerDisputeDashboardSnapshot,
} from "../../domain/consumer/ConsumerDisputeDashboard.js";
import { ControlPlaneDashboardClient } from "../../infrastructure/controlPlane/ControlPlaneDashboardClient.js";

interface DisputeFormState {
  disputeType: "settlement" | "chargeback";
  providerOrganizationId: string;
  paymentReference: string;
  jobReference: string;
  disputedAmountUsd: string;
  reasonCode: string;
  summary: string;
  evidenceLabel: string;
  evidenceValue: string;
}

interface AllocationFormState {
  providerOrganizationId: string;
  amountUsd: string;
}

type DisputeStatus =
  | "open"
  | "under_review"
  | "won"
  | "lost"
  | "recovered"
  | "canceled";

const initialDisputeFormState: DisputeFormState = {
  disputeType: "settlement",
  providerOrganizationId: "",
  paymentReference: "",
  jobReference: "",
  disputedAmountUsd: "",
  reasonCode: "",
  summary: "",
  evidenceLabel: "",
  evidenceValue: "",
};

const initialAllocationFormState: AllocationFormState = {
  providerOrganizationId: "",
  amountUsd: "",
};

export interface ConsumerDisputeDashboardScreenProps {
  controlPlaneBaseUrl: string;
  organizationId: string;
  actorUserId: string;
  initialSnapshot: ConsumerDisputeDashboardSnapshot;
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "Not resolved";
  }

  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  });
}

export function ConsumerDisputeDashboardScreen(
  props: ConsumerDisputeDashboardScreenProps,
) {
  const [snapshot, setSnapshot] = useState(props.initialSnapshot);
  const [formState, setFormState] = useState<DisputeFormState>(
    initialDisputeFormState,
  );
  const [allocationForms, setAllocationForms] = useState<
    Record<string, AllocationFormState>
  >({});
  const [statusSelections, setStatusSelections] = useState<
    Record<string, DisputeStatus>
  >({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const dashboard = ConsumerDisputeDashboard.create(snapshot);
  const client = new ControlPlaneDashboardClient(props.controlPlaneBaseUrl);

  async function refreshDashboard(): Promise<void> {
    const refreshed = await client.getConsumerDisputeDashboard({
      organizationId: props.organizationId,
      actorUserId: props.actorUserId,
    });
    setSnapshot(refreshed.toSnapshot());
  }

  async function handleCreateDispute(
    event: React.SyntheticEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      await client.createProviderDispute({
        organizationId: props.organizationId,
        actorUserId: props.actorUserId,
        disputeType: formState.disputeType,
        disputedAmountUsd: formState.disputedAmountUsd,
        reasonCode: formState.reasonCode,
        summary: formState.summary,
        evidenceEntries: [
          {
            label: formState.evidenceLabel,
            value: formState.evidenceValue,
          },
        ],
        ...(formState.disputeType === "settlement"
          ? {
              providerOrganizationId: formState.providerOrganizationId,
              jobReference: formState.jobReference,
            }
          : {
              paymentReference: formState.paymentReference,
            }),
      });
      setFormState(initialDisputeFormState);
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to create dispute.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAllocate(disputeId: string): Promise<void> {
    const form = allocationForms[disputeId] ?? initialAllocationFormState;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await client.recordProviderDisputeAllocations({
        organizationId: props.organizationId,
        actorUserId: props.actorUserId,
        disputeId,
        allocations: [
          {
            providerOrganizationId: form.providerOrganizationId,
            amountUsd: form.amountUsd,
          },
        ],
      });
      setAllocationForms((current) => ({
        ...current,
        [disputeId]: initialAllocationFormState,
      }));
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to record allocation.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(disputeId: string): Promise<void> {
    const nextStatus = statusSelections[disputeId];

    if (nextStatus === undefined) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await client.updateProviderDisputeStatus({
        organizationId: props.organizationId,
        actorUserId: props.actorUserId,
        disputeId,
        nextStatus,
      });
      await refreshDashboard();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update dispute status.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Consumer disputes</p>
          <h1>{dashboard.title}</h1>
          <p className="hero-copy">
            Buyer finance controls settlement disputes and chargeback
            allocations. Provider payout holds stay explicit, separate from the
            wallet summary, and update from structured finance actions only.
          </p>
        </div>
        <div className="hero-meta">
          <span className="pill">Role: {dashboard.actorRole}</span>
          <span className="pill">
            Active disputes: {dashboard.activeDisputeCount}
          </span>
          <span className="pill">
            Active hold: ${dashboard.activeDisputeHoldUsd}
          </span>
        </div>
      </section>

      <section className="card-grid">
        <article className="card warning">
          <p className="card-label">Active disputes</p>
          <p className="card-value">{dashboard.activeDisputeCount}</p>
          <p className="card-caption">
            Open, under-review, and lost disputes stay payout-relevant.
          </p>
        </article>
        <article className="card neutral">
          <p className="card-label">Active hold</p>
          <p className="card-value">${dashboard.activeDisputeHoldUsd}</p>
          <p className="card-caption">
            Allocated chargebacks and settlement disputes deduct payout
            eligibility.
          </p>
        </article>
      </section>

      <section className="inventory-panel private-connector-form-panel">
        <div className="inventory-header private-connector-header">
          <div>
            <p className="eyebrow">Create dispute</p>
            <h2>Manual settlement or chargeback intake</h2>
          </div>
          <p className="inventory-note">
            Evidence is structured fields only. Chargebacks stay buyer-only
            until provider allocations are recorded.
          </p>
        </div>

        <form className="private-connector-form" onSubmit={(event) => {
          void handleCreateDispute(event);
        }}>
          <label className="pricing-input">
            <span className="card-label">Dispute type</span>
            <select
              aria-label="Dispute type"
              value={formState.disputeType}
              onChange={(event) => {
                const disputeType =
                  event.currentTarget.value as DisputeFormState["disputeType"];
                setFormState((current) => ({
                  ...current,
                  disputeType,
                }));
              }}
            >
              <option value="settlement">settlement</option>
              <option value="chargeback">chargeback</option>
            </select>
          </label>

          {formState.disputeType === "settlement" ? (
            <>
              <label className="pricing-input">
                <span className="card-label">Provider organization ID</span>
                <input
                  aria-label="Provider organization ID"
                  value={formState.providerOrganizationId}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((current) => ({
                      ...current,
                      providerOrganizationId: value,
                    }));
                  }}
                  required
                />
              </label>
              <label className="pricing-input">
                <span className="card-label">Job reference</span>
                <input
                  aria-label="Job reference"
                  value={formState.jobReference}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setFormState((current) => ({
                      ...current,
                      jobReference: value,
                    }));
                  }}
                  required
                />
              </label>
            </>
          ) : (
            <label className="pricing-input">
              <span className="card-label">Payment reference</span>
              <input
                aria-label="Payment reference"
                value={formState.paymentReference}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setFormState((current) => ({
                    ...current,
                    paymentReference: value,
                  }));
                }}
                required
              />
            </label>
          )}

          <label className="pricing-input">
            <span className="card-label">Disputed amount (USD)</span>
            <input
              aria-label="Disputed amount"
              value={formState.disputedAmountUsd}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  disputedAmountUsd: value,
                }));
              }}
              required
            />
          </label>

          <label className="pricing-input">
            <span className="card-label">Reason code</span>
            <input
              aria-label="Reason code"
              value={formState.reasonCode}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  reasonCode: value,
                }));
              }}
              required
            />
          </label>

          <label className="pricing-input private-connector-form-span">
            <span className="card-label">Summary</span>
            <textarea
              aria-label="Dispute summary"
              value={formState.summary}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  summary: value,
                }));
              }}
              required
            />
          </label>

          <label className="pricing-input">
            <span className="card-label">Evidence label</span>
            <input
              aria-label="Evidence label"
              value={formState.evidenceLabel}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  evidenceLabel: value,
                }));
              }}
              required
            />
          </label>

          <label className="pricing-input private-connector-form-span">
            <span className="card-label">Evidence value</span>
            <textarea
              aria-label="Evidence value"
              value={formState.evidenceValue}
              onChange={(event) => {
                const value = event.currentTarget.value;
                setFormState((current) => ({
                  ...current,
                  evidenceValue: value,
                }));
              }}
              required
            />
          </label>

          {errorMessage === null ? null : (
            <p className="private-connector-error">{errorMessage}</p>
          )}

          <div className="private-connector-actions">
            <button disabled={submitting} type="submit">
              {submitting ? "Submitting..." : "Create dispute"}
            </button>
          </div>
        </form>
      </section>

      <section className="inventory-panel">
        <div className="inventory-header">
          <div>
            <p className="eyebrow">Dispute queue</p>
            <h2>Buyer finance workflow</h2>
          </div>
          <p className="inventory-note">
            Chargebacks can stay unallocated until buyer finance assigns the
            provider impact.
          </p>
        </div>

        <div className="dispute-list">
          {dashboard.disputes.map((dispute) => (
            <article className="dispute-card" key={dispute.id}>
              <div className="dispute-card-header">
                <div>
                  <p className="eyebrow">
                    {dispute.disputeType} · {dispute.source}
                  </p>
                  <h3>{dispute.reasonCode}</h3>
                </div>
                <span className={`status status-${dispute.status}`}>
                  {dispute.status}
                </span>
              </div>
              <p className="inventory-note">{dispute.summary}</p>
              <div className="card-grid">
                <article className="card neutral">
                  <p className="card-label">Disputed</p>
                  <p className="card-value">${dispute.disputedAmountUsd}</p>
                  <p className="card-caption">
                    {dispute.paymentReference ?? dispute.jobReference ?? "No external reference"}
                  </p>
                </article>
                <article className="card warning">
                  <p className="card-label">Allocated</p>
                  <p className="card-value">${dispute.allocatedAmountUsd}</p>
                  <p className="card-caption">
                    Active hold ${dispute.activeHoldUsd}
                  </p>
                </article>
              </div>

              <div className="dispute-metadata-grid">
                <div>
                  <strong>Evidence</strong>
                  <ul>
                    {dispute.evidenceEntries.map((entry) => (
                      <li key={`${dispute.id}:${entry.label}`}>
                        {entry.label}: {entry.value}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <strong>Stripe</strong>
                  <ul>
                    <li>Dispute ID: {dispute.stripeDisputeId ?? "N/A"}</li>
                    <li>Charge ID: {dispute.stripeChargeId ?? "N/A"}</li>
                    <li>Reason: {dispute.stripeReason ?? "N/A"}</li>
                    <li>Status: {dispute.stripeStatus ?? "N/A"}</li>
                  </ul>
                </div>
                <div>
                  <strong>Timestamps</strong>
                  <ul>
                    <li>Created: {formatDateTime(dispute.createdAt)}</li>
                    <li>Updated: {formatDateTime(dispute.updatedAt)}</li>
                    <li>Resolved: {formatDateTime(dispute.resolvedAt)}</li>
                  </ul>
                </div>
              </div>

              {dispute.disputeType === "chargeback" ? (
                <div className="dispute-inline-form">
                  <label className="pricing-input">
                    <span className="card-label">Provider organization ID</span>
                    <input
                      aria-label={`Allocation provider ${dispute.id}`}
                      value={allocationForms[dispute.id]?.providerOrganizationId ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setAllocationForms((current) => ({
                          ...current,
                          [dispute.id]: {
                            ...(current[dispute.id] ?? initialAllocationFormState),
                            providerOrganizationId: value,
                          },
                        }));
                      }}
                    />
                  </label>
                  <label className="pricing-input">
                    <span className="card-label">Allocation amount (USD)</span>
                    <input
                      aria-label={`Allocation amount ${dispute.id}`}
                      value={allocationForms[dispute.id]?.amountUsd ?? ""}
                      onChange={(event) => {
                        const value = event.currentTarget.value;
                        setAllocationForms((current) => ({
                          ...current,
                          [dispute.id]: {
                            ...(current[dispute.id] ?? initialAllocationFormState),
                            amountUsd: value,
                          },
                        }));
                      }}
                    />
                  </label>
                  <button
                    disabled={submitting}
                    type="button"
                    onClick={() => {
                      void handleAllocate(dispute.id);
                    }}
                  >
                    Record allocation
                  </button>
                </div>
              ) : null}

              <div className="dispute-inline-form">
                <label className="pricing-input">
                  <span className="card-label">Next status</span>
                  <select
                    aria-label={`Next status ${dispute.id}`}
                    value={statusSelections[dispute.id] ?? dispute.status}
                    onChange={(event) => {
                      const value =
                        event.currentTarget.value as DisputeStatus;
                      setStatusSelections((current) => ({
                        ...current,
                        [dispute.id]: value,
                      }));
                    }}
                  >
                    <option value="open">open</option>
                    <option value="under_review">under_review</option>
                    <option value="won">won</option>
                    <option value="lost">lost</option>
                    <option value="recovered">recovered</option>
                    <option value="canceled">canceled</option>
                  </select>
                </label>
                <button
                  disabled={submitting}
                  type="button"
                  onClick={() => {
                    void handleStatusChange(dispute.id);
                  }}
                >
                  Update status
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
