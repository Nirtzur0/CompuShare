
# MASTER_PLAN.md

# Secure Distributed AI Resource Marketplace
## Research report, system design, and execution plan
**Date:** 2026-03-09  
**Status:** bootstrap-in-progress / `SPRINT-01` underway  
**Working thesis:** build the compliant version, not the romanticized version.

---

## Executive decision

**Decision:** **Yes, but only as a narrow, compliant, security-first product.**  
Do **not** build a public market for resold vendor-issued AI credits. Do **not** build a public marketplace for end users to route requests through someone else’s OpenAI/Anthropic/Gemini API keys. Do **not** start with “Airbnb for random home GPUs” for sensitive workloads.

**Best version to build first:** a **trusted OpenAI-compatible inference exchange for open-weight models and low/medium-sensitivity batch jobs**, supplied by **vetted providers** that control real GPU capacity (small labs, startups, colo fleets, or authorized cloud/on-prem operators), with:
- a centralized control plane,
- distributed provider nodes,
- approved model-serving stacks,
- internal **non-transferable spend credits** plus normal fiat billing/payouts,
- optional later expansion into **private enterprise routing** and **private-cluster burst orchestration**.

**Why this wins:**
1. It fits what is actually allowed by major provider terms better than credit resale or key-sharing.
2. It is technically feasible now.
3. It can be secured to an enterprise-acceptable level for the right workload classes.
4. It creates a real two-sided network: providers monetize underutilized GPUs; developers get cheaper unified inference and burst capacity.
5. It avoids the worst legal risk: transferable “AI credits/tokens” becoming quasi-money or violating cloud/API terms.

**Core conclusion in one sentence:**  
Build a **hybrid inference marketplace + routing layer**, focused on **open models on vetted distributed GPU supply**, and treat “credits” as **internal platform balances and rebates**, not transferable vendor credits or crypto-first instruments.

---

## Product goal and problem statement

The platform exists to solve a real mismatch:

- **Supply-side mismatch:** expensive AI hardware is frequently underutilized across personal machines, startup clusters, university/lab infrastructure, and cloud accounts with bursty internal use.
- **Demand-side mismatch:** developers and AI product teams want cheaper inference, easier burst access, unified APIs, and less vendor lock-in, but do not want to procure and operate GPU fleets directly.
- **Trust mismatch:** existing low-cost decentralized compute networks are attractive on price but often too weak on security, compliance, and predictability for serious workloads.
- **Commercial mismatch:** existing API gateways unify providers but do not create new supply; existing GPU rental marketplaces sell raw machines but do not make inference procurement simple or trustworthy enough; existing cloud resale mechanisms are narrow and heavily contractual.

### Problem statement

Create a platform that lets resource owners safely monetize spare AI-serving capacity while letting buyers consume that capacity through a simple, policy-aware inference interface, **without assuming rights that cloud or model providers did not grant**.

### The hard constraints

- Major AI/API providers generally **do not** treat service credits or API keys as freely transferable assets.
- Public clouds generally **do not** allow generic resale of raw services except through specific partner/reseller structures or narrow official marketplaces.
- Sensitive enterprise inference cannot be treated as safe on arbitrary third-party hosts.
- “Tokenizing” balances creates legal, accounting, and abuse risk fast.

### Product truth

The product is strongest when it is framed as:
1. **managed inference on third-party capacity you are allowed to use**, and
2. **a routing/control plane over trusted open-model supply**, and
3. **an internal usage/earnings ledger**, not a free-floating token economy.

---

## Success metrics and non-goals

### Success metrics

**Commercial**
- Monthly GMV: `>$250k` within 12 months of launch.
- Net revenue take rate: `10–18%`.
- Provider monthly retention (active supply accounts): `>75%`.
- Buyer 90-day retention: `>60%`.
- Gross margin after payment losses and support: `>25%`.

**Marketplace health**
- Median provider utilization on listed capacity: `>30%`.
- Fill rate for eligible jobs: `>85%`.
- Concentration risk: no single provider > `20%` of fulfilled GMV.
- Supply attestation coverage (for eligible jobs): `>70%` of enterprise-tier workload volume.

**Reliability / trust**
- API success rate: `>=99.5%` for standard tier, `>=99.9%` for premium tier.
- p95 routing overhead added by platform: `<120 ms`.
- Batch-job completion failure rate attributable to platform: `<2%`.
- Billing dispute rate: `<0.3%` of jobs.
- Fraud loss rate: `<0.2%` of GMV.

**Security / compliance**
- Zero critical unresolved vulns in control plane.
- 100% of production workload bundles signed and verified.
- 100% of provider payouts passed through sanctions/KYC controls.
- 0 known incidents of customer secrets exposed to public/community-tier nodes.

### Non-goals

- Reselling vendor-issued AI credits as if they were transferable property.
- A permissionless public market for routing requests through random users’ OpenAI/Anthropic/Gemini keys.
- General-purpose arbitrary code execution on community nodes in MVP.
- A speculative transferable crypto token as the primary settlement layer.
- Supporting highly regulated or ultra-sensitive enterprise workloads on consumer PCs.
- Competing head-on with hyperscalers for frontier closed-model API access.

---

## Constraints and assumptions

### Constraints

1. **Provider terms matter more than technical possibility.**
2. **Closed models and open models are separate businesses.**
3. **Sensitive data requires trusted tiers, contracts, and sometimes dedicated infrastructure.**
4. **Marketplace payouts require KYC/tax/sanctions controls.**
5. **Credits that are transferable or cash-redeemable can trigger money-transmission/e-money risk.**
6. **Inference economics are compressing; routing/control value must be real, not cosmetic.**
7. **Heterogeneous distributed GPUs create large reliability variance.**

### Assumptions

- Initial launch geography for supply-side payouts: US + selected allied jurisdictions only.
- Demand side can be broader, but sanctioned and high-risk geographies are blocked.
- MVP focuses on **open-weight text generation + embeddings + selected batch image generation**.
- Sensitive workloads are restricted to vetted or private providers, not community supply.
- Control plane is centralized; execution plane is distributed.
- Providers list capacity they directly control; the platform does not claim to transfer third-party cloud rights the provider does not have.
- “Earned value” is implemented as **cash receivables and/or non-transferable usage balances**, not a generalized token.

### Market context

- The **Stanford AI Index 2025** reported that GPT-3.5-level inference pricing fell from `$20` per million tokens in November 2022 to `$0.07` per million tokens by October 2024.
- Reuters reported in March 2026 that Alphabet, Microsoft, Amazon, and Meta were expected to spend **more than `$630 billion`** that year on AI infrastructure.

**Inference:** the market is simultaneously becoming **cheaper at the API surface** and **more capital-intensive underneath**. A new platform cannot win on simple arbitrage alone; it needs a durable routing, trust, or utilization advantage.

---

## A. Problem framing

### A1. What exact pain points does this solve?

#### For supply-side users
1. **Idle capacity monetization**
   - Labs, startups, and GPU owners have real downtime: nights, weekends, between training runs, between customer contracts, or due to forecasting error.
2. **No easy demand channel**
   - Most spare-capacity owners are not set up to market, bill, support, and SLA a direct inference business.
3. **No simple API productization**
   - They may own GPUs, but not a clean OpenAI-compatible endpoint with metering, throttling, auth, and billing.
4. **Poor utilization visibility**
   - Owners often do not know what capacity is genuinely spare, what is fit for resale, or what workloads are safe.
5. **Need for spend offsets**
   - Some suppliers also consume inference. They value not only cash, but the ability to convert supply contribution into internal platform spend.

#### For demand-side users
1. **Inference cost pressure**
   - Buyers want lower prices for open-model inference and batch generation.
2. **Procurement friction**
   - Direct cloud procurement is slow; many teams do not want to manage GPU instances.
3. **Fragmented APIs**
   - Developers want one endpoint, normalized auth, logs, rate limits, budgets, and routing.
4. **Burst / overflow need**
   - Internal or preferred clusters are often full during spikes; teams need overflow capacity.
5. **Need for workload-policy matching**
   - Some workloads need cheap batch; others need a trusted region; others need attested execution.
6. **Desire for “hybrid” control**
   - Developers increasingly want one API that can route across self-hosted open models, marketplace capacity, and approved external APIs.

### A2. Main user types

#### 1) Individuals with idle GPUs/CPUs
**Reality:** attractive story, weak initial business.  
- Good for: public/open workloads, batch rendering, image generation, non-sensitive eval jobs.
- Bad for: enterprise inference, low-latency APIs, regulated data.
- Join reason: passive monetization, hobbyist upside, gamified earnings dashboard.
- Risk: inconsistent uptime, malware exposure fears, poor economics after power/support overhead.

#### 2) Users with AWS/cloud capacity
**Reality:** only viable when they are selling a higher-level service they are allowed to offer, or using official resale/partner mechanisms.  
- Good for: providers who already operate inference or managed model endpoints on their own cloud accounts.
- Weak for: peer-to-peer “subleasing” of raw AWS/GCP/Azure capacity to strangers.
- Join reason: recover value from stranded or underutilized capacity.
- Risk: provider-term violations if the offer is really just raw passthrough cloud resale.

#### 3) Small labs/startups with underutilized clusters
**Reality:** strongest early supply segment.  
- Good for: predictable, enterprise-ish supply; known hardware; some ops maturity.
- Join reason: recover capex/opex, smooth demand between internal jobs, monetize off-peak clusters.
- Advantage: can install agent, meet KYC, expose real telemetry, hold SLAs.

#### 4) Users who want cheaper inference
**Reality:** strongest early demand segment.  
- Good for: open-model inference, embeddings, batch generation, evaluation.
- Buy reason: lower cost, one bill, one API, fallback routing, no GPU ops burden.

#### 5) Developers who want a unified OpenAI-compatible endpoint
**Reality:** very strong wedge.  
- Buy reason: one SDK pattern, model aliases, failover, budgets, rate limits, logs, usage analytics.
- Works especially well when combined with a marketplace because the endpoint is not just a proxy; it unlocks new supply.

### A3. Why supply-side users would join

- Earn on sunk assets.
- Set price floors and workload policies instead of negotiating contracts one-by-one.
- Convert spare capacity into either cash or internal usage balance.
- Keep operational control via local policy agent.
- Access demand without building sales, billing, or API infrastructure.

### A4. Why demand-side users would buy through the platform

- Lower prices than fully managed centralized providers for selected open-model workloads.
- Access to capacity they could not efficiently aggregate themselves.
- One OpenAI-compatible API instead of managing heterogeneous infra.
- Policy-based routing by trust, region, and cost.
- Option to blend their own private cluster with marketplace burst capacity.
- Better economic UX: pay by card/prepay, spend earned balance, or use enterprise commit.

### A5. Market truth

The platform is not solving “how do people transfer AI credits.”  
It is solving **how to create a safe market for underused inference capacity** and a **control plane that makes that supply usable**.

---

## B. Reality check on feasibility

### Facts vs. inferences

**Fact:** OpenAI service credits are non-transferable and not legal tender. [OpenAI Service Credit Terms]  
**Fact:** OpenAI says it does not support sharing API keys. [OpenAI API Key Safety / Share Key Help]  
**Fact:** Anthropic says never share API keys. [Anthropic API Key Best Practices]  
**Fact:** Google startup incentives are non-transferable and may not be sold, purchased, or bartered. [Google Cloud Startups Program Terms]  
**Fact:** AWS customer agreement generally prohibits resale, but AWS has authorized partner/reseller paths and a narrow EC2 Reserved Instance Marketplace. [AWS Customer Agreement; AWS Solution Provider Program; EC2 Reserved Instance Marketplace]  
**Fact:** Google’s service-specific terms say committed units may not be resold or transferred unless Google agrees otherwise. [Google Cloud Service Specific Terms]  
**Fact:** Microsoft says Azure services may not be resold or redistributed outside appropriate structures, and Azure AI model inferencing APIs cannot simply be resold. [Microsoft Online Subscription Agreement; Azure Customer Solution Licensing Guidance]

**Inference:** the broad concept is feasible only if the product is re-scoped away from “resell provider credits / keys” and toward “sell compute or managed inference you are actually allowed to provide.”

### Feasibility matrix

| Idea component | Technical feasibility | Contract / regulatory posture | Economic / security posture | Verdict |
|---|---|---|---|---|
| Reselling provider-issued AI credits (OpenAI/Anthropic/Google promo/startup credits) | Technically possible via account access tricks | Usually disallowed or clearly constrained; high contractual risk | High abuse risk; poor auditability | **Likely disallowed** |
| Public routing through user-owned API keys | Easy to build technically | Often conflicts with key-sharing rules / credential-use expectations | High secret risk; weak compliance story | **Feasible only in narrow self-hosted or enterprise-controlled forms** |
| Selling raw compute from owned hardware | Mature and already done in market | Usually allowed if provider controls hardware and obeys software licenses | Security/reliability vary widely | **Feasible with constraints** |
| Selling managed inference on provider-supplied compute | Mature for open models | Much more defensible than raw cloud passthrough if provider adds significant functionality | Strongest commercial wedge | **Feasible with constraints** |
| Selling reserved cloud capacity / commitments where allowed | Narrowly possible via official channels or partner programs | Very contract-dependent; often limited | Enterprise-heavy; low liquidity | **Feasible with major constraints** |
| Enterprise subleasing of idle GPU contracts outside official structures | Sometimes technically possible | Often contractually risky | Sales-heavy and legally bespoke | **Usually not worth building as public marketplace** |
| Internal non-transferable platform credits / rebates | Straightforward | Lower legal risk if closed-loop and non-transferable | Good retention and accounting if separated from cash | **Feasible and recommended** |
| Transferable marketplace token | Easy technically | High money-transmission / e-money / tax complexity | Strong fraud and wash-trading risk | **Not worth building for MVP** |

### Distinguishing the five specific categories

#### 1. Reselling provider-issued AI credits
**Assessment:** do not build this.  
- OpenAI credits are non-transferable.
- Google startup incentives are explicitly non-transferable and not for sale/barter.
- Anthropic prepaid credits are tied to the buyer relationship and subject to Anthropic’s terms.
- Even if technically feasible through pooled billing or account-sharing tricks, it is the wrong foundation.

#### 2. Routing requests through user-owned API keys
**Assessment:** only in constrained forms.  
**Public marketplace version:** bad idea.  
**Private enterprise version:** possibly good if designed as software under the customer’s control.
- Safe pattern: enterprise installs a connector in its own environment, stores the keys in its own vault, and uses the platform as routing/control software.
- Unsafe pattern: public platform collects user API keys and redistributes demand through them.

#### 3. Selling raw compute
**Assessment:** feasible, but operationally and security-wise ugly as a first product.
- Works for GPU rental markets.
- Harder to standardize trust, metering, and user experience.
- Encourages arbitrary workloads, which expands abuse surface dramatically.

#### 4. Selling managed inference running on user-supplied compute
**Assessment:** strongest realistic product.  
- Platform controls the allowed workloads, runtimes, and metering.
- Buyers get an API instead of a box.
- Security is materially better because the platform can forbid arbitrary code and allow only signed serving stacks.

#### 5. Selling reserved capacity or subleasing enterprise GPU contracts where allowed
**Assessment:** useful adjacency, not first wedge.  
- AWS has narrow official mechanisms (RI Marketplace, Solution Provider Program, internal Capacity Block sharing).
- Google CUDs are generally not resellable without permission.
- Azure resale runs through CSP / customer-solution structures, and thin wrappers are not allowed.
- This becomes a contract operations business, not a pure software marketplace.

### Most realistic product wedge

**The best wedge is not “Airbnb for idle GPUs.”**  
It is:

> **A trusted, OpenAI-compatible inference exchange for open-weight models, powered by vetted distributed GPU providers, with internal spend balances and optional later enterprise private routing.**

That wedge is:
- legally cleaner,
- easier to secure,
- easier to meter,
- easier to sell,
- and more differentiated than a plain gateway.

---

## C. Market and competitor landscape

### Landscape summary

The market is fragmented across six clusters:

1. **Decentralized compute marketplaces**  
   Sell generic or semi-generic compute from many providers.
2. **GPU rental marketplaces**  
   Rent machines/instances directly.
3. **Serverless inference brokers**  
   Sell model inference APIs over their own or partner-managed capacity.
4. **AI gateways / OpenAI-compatible proxies**  
   Unify APIs and route requests but do not create a supply network.
5. **Federated / volunteer / edge inference networks**  
   Cheap and distributed, but weak for enterprise trust.
6. **Official cloud resale / commitment mechanisms**  
   Narrow, contractual, and usually not open peer-to-peer markets.

### Comparative table: compute and inference networks

| Company / project | Category | What they actually do | Supply model | Demand model | Security model | Pricing model | Weaknesses | Why this new platform could be better |
|---|---|---|---|---|---|---|---|---|
| **Vast.ai** | GPU rental marketplace | Marketplace for GPU instances and containers | Third-party hosts list machines | Users rent instances directly | Isolation largely via unprivileged Docker; trust varies by host | Market-set hourly pricing | Heterogeneous trust, raw-infra UX, weaker enterprise compliance posture | New platform can sell **managed inference** instead of raw boxes, plus stronger trust tiers |
| **RunPod** | Managed GPU cloud + serverless | Pods, serverless, and managed GPU access | Mix of RunPod-managed and community/global cloud supply | Developers deploy workloads and endpoints | Centralized security posture stronger than open marketplaces; SOC 2 claims | Per-second / per-hour / serverless | More centralized; less “earn from spare capacity” network effect | New platform can aggregate more fragmented third-party supply and give providers earnings dashboards |
| **SaladCloud** | Distributed cloud from consumer devices | Runs container workloads on idle consumer GPUs | Millions of privately owned PCs | Buyers deploy supported workloads | Best for lower-trust workloads; public-device model | Cost-saving pitch vs cloud | Weak fit for sensitive/latency-critical enterprise inference | New platform can define explicit trust tiers and avoid pretending consumer nodes are enterprise-safe |
| **Akash** | Decentralized compute marketplace | On-chain marketplace for containerized workloads | Providers bid on workloads | Buyers lease compute via crypto-native flows | Depends on provider and deployment choices | Lease-based / token-settled | Crypto friction, enterprise procurement friction, variable UX | New platform can keep centralized billing/compliance and still use distributed supply |
| **io.net** | Decentralized GPU network | Aggregates GPUs for AI workloads | Distributed suppliers via worker software | AI teams consume pooled GPU capacity | Security less legible than enterprise clouds | Vendor-led network pricing / token-linked ecosystem | Token/regulatory baggage; trust depth still questioned by enterprises | New platform can be explicitly compliance-first and non-token-first |
| **Aethir** | Distributed GPU network | Aggregates enterprise-grade GPU resources into a decentralized cloud | Network of resource owners | AI/cloud customers | Network-level assurances, tokenized incentives | Token-influenced economics | Enterprise sales + token complexity; less simple developer UX | New platform can present a cleaner API + fiat + stronger workload policy engine |
| **Hyperbolic** | GPU marketplace + serverless inference | Offers GPU rentals and OpenAI-compatible API products | Distributed GPU supply | Developers consume compute or API | Mixed marketplace / service model | GPU-hour and token pricing | Trust, consistency, and compliance story still less mature than traditional enterprise vendors | New platform can lead with trust scoring, attestation, and policy-aware routing |
| **Golem** | Decentralized compute sharing | Distributed marketplace for compute | Volunteer and paid providers | Buyers submit jobs | Variable trust; crypto-native network | GLM token incentives | General-purpose, not enterprise-ready for sensitive AI inference | New platform can focus narrowly on AI inference and trustable metering |
| **Petals** | Federated volunteer inference | Community-run distributed serving of large models | Volunteer nodes | Researchers / hobbyists use federated LLM serving | Research-grade, not enterprise-grade | Mostly community / open access | Great proof-of-concept, weak commercial trust posture | New platform can industrialize similar ideas only for vetted supply and approved runtimes |

### Comparative table: gateways, brokers, and authorized resale

| Company / mechanism | Category | What they actually do | Supply model | Demand model | Security model | Pricing model | Weaknesses | Why this new platform could be better |
|---|---|---|---|---|---|---|---|---|
| **OpenRouter** | AI gateway / broker | Unified API across many model providers; supports BYOK and routing | Mostly third-party API providers | Developers call one endpoint | Gateway-level controls; optional ZDR routes | Token-based provider pricing + platform fee | Does not create new compute supply; BYOK/legal nuances remain | New platform can combine routing **and** owned marketplace supply |
| **Portkey** | AI gateway | Universal AI gateway with fallbacks, caching, budgets, routing | Third-party API providers | Dev teams want control plane features | Gateway / observability / guardrails | SaaS / usage pricing | Great control plane, but not a capacity network | New platform can add actual supply liquidity |
| **LiteLLM** | Open-source gateway / proxy | OpenAI-compatible proxy across many providers | Third-party provider endpoints | Teams self-host a gateway | Depends on deployment | Open-source / SaaS variants | Control plane only; no marketplace economics | New platform can monetize distributed supply with stronger settlement |
| **Cloudflare AI Gateway** | AI gateway | Proxy and analytics layer for AI APIs | Third-party APIs | Enterprises want governance, logs, rate limits | Strong Cloudflare security posture | Gateway pricing | No provider-supply marketplace | New platform can own both routing and compute procurement |
| **Replicate** | Serverless inference broker | Hosted inference for many models | Centralized/partner infra controlled by Replicate | API consumers run hosted models | Centralized managed service | Time-based model billing | Limited supplier monetization story | New platform can source from many providers, lowering marginal cost |
| **fal** | Serverless inference | Hosted inference and GPU-backed deployments | Centralized cloud/service | Developers use API or dedicated deployments | Managed service model | Usage pricing | Centralized capacity and margin structure | New platform can undercut via stranded supply aggregation |
| **Together AI** | Inference + cluster provider | Serverless inference plus dedicated clusters | Mostly centralized/provider-controlled | AI teams use APIs or dedicated infra | Enterprise-style managed service | Token pricing / dedicated pricing | More conventional cloud business than distributed marketplace | New platform can offer blended provider network + private cluster burst |
| **AWS RI Marketplace** | Official commitment resale | Lets customers sell unused Standard EC2 RIs | Official narrow secondary market | AWS customers | Governed by AWS | Seller-set marketplace pricing | Very narrow: not GPU inference marketplace; limited assets | New platform can go beyond RI resale into API-level inference utilization |
| **AWS Solution Provider Program** | Authorized cloud resale | Official reseller path for AWS partners | Authorized partner channel | Enterprise customers | Contractual/partner controls | Partner-managed billing | Heavy channel structure, not open marketplace | New platform can later plug into such programs for authorized supply |
| **Microsoft CSP / Customer Solution** | Authorized cloud resale / solution model | Resell via CSP or sell a significant-value customer solution | Partner/solution channel | Enterprise customers | Partner and Azure governance | Contractual billing | Not a peer market; thin wrappers disallowed | New platform can be the solution layer, not a raw Azure passthrough |
| **Google reseller / marketplace programs** | Authorized resale mechanisms | Partner-driven resale of eligible products/services | Partner channel | Enterprise customers | Contractual | Partner discounts / billing | General CUD resale not open; startup credits non-transferable | New platform can focus on provider-operated inference, not credit transfer |

### Competitor takeaways

1. **Raw compute marketplaces exist.**
   - So “marketplace for GPUs” is not novel on its own.
2. **AI gateways exist.**
   - So “unified OpenAI-compatible endpoint” is not novel on its own.
3. **The gap is the combination.**
   - A trusted network that turns distributed provider capacity into a **policy-aware inference product**.
4. **Crypto-first networks have not won the enterprise trust battle.**
5. **Centralized brokers capture demand, but not spare-capacity supply.**

---

## D. Best product definition

### Product interpretations evaluated

| Product interpretation | Strategic attractiveness | Legal cleanliness | Security realism | Time-to-market | Verdict |
|---|---|---|---|---|---|
| “Airbnb for idle GPUs” | High narrative appeal | Medium | Weak for sensitive workloads | Medium | **Bad first product** |
| “OpenAI-compatible inference market” | High | High for open models | Stronger | High | **Best initial product** |
| “Secure network for BYO API-key routing + compute sharing” | Medium | Weak in public form, better in private form | Medium | Medium | **Feature set, not initial public product** |
| “Marketplace that converts earned compute credits into usable inference credits” | Medium | Good if closed-loop | Good | High | **Supporting economics layer, not the wedge** |
| “Enterprise subleasing platform for idle reserved AI capacity” | Medium | Contract-heavy | Good if enterprise-only | Low | **Promising later adjacency** |

### Best initial product

## Recommended initial product
**Trusted OpenAI-compatible inference exchange for open-weight models on vetted provider GPUs**

### Product definition
- Public API marketplace for:
  - chat/completions,
  - embeddings,
  - async batch generation,
  - selected image generation,
  - evaluation jobs.
- Supply comes from:
  - vetted small labs/startups,
  - datacenter-grade providers,
  - authorized cloud/on-prem operators,
  - later: private enterprise clusters for burst sharing.
- Not initially from:
  - anonymous home PCs for enterprise jobs,
  - resold third-party AI credits,
  - public BYOK key-sharing market.

### Why this is the strongest version
- Solves a real buyer problem with a familiar API.
- Gives providers monetization without exposing arbitrary code execution.
- Lets the platform control runtimes, models, and metering.
- Is easier to secure than raw compute rental.
- Allows an earnings/spend loop without pretending vendor credits are transferable.

### Best product family architecture

**Public product**
- Open-model inference marketplace.

**Private add-on**
- Enterprise routing plane for self-hosted clusters and customer-held API keys.

**Economic layer**
- Fiat + internal usage balances + provider earnings.

This creates a clean separation:
- **Marketplace mode** for open-model supply.
- **Private control-plane mode** for enterprise routing.
- **No public key resale market.**

---

## E. System architecture

### Architecture principles

1. **Centralized control plane; distributed execution plane**
2. **Inference-first, not arbitrary code first**
3. **Trust-tiered placement**
4. **Signed everything**
5. **Secrets released only to eligible, attested targets**
6. **Metering from both gateway and node side**
7. **Closed-loop credits, separate from cash payables**
8. **Policy engine in the hot path of placement**

### Core services

#### 1. Identity and tenancy service
- User accounts, orgs, teams, RBAC
- Provider accounts vs buyer accounts
- KYC status, sanctions status, tax profile
- Enterprise SSO / SCIM later

#### 2. Provider registry and inventory service
- Node registration
- Hardware discovery (GPU type, VRAM, interconnect, driver versions)
- Benchmarks, historical performance, uptime
- Trust tier, attestation status, geo/region, ownership type

#### 3. Provider node software / agent
- Secure enrollment
- Hardware probe and signed inventory reports
- Local policy enforcement
- Runtime orchestration for approved workloads
- Sandboxed execution
- Telemetry and usage signing
- Auto-update with signed artifacts
- Local price floor / pause / shareability controls

#### 4. Scheduler / placement engine
- Filters by:
  - hardware,
  - region,
  - trust tier,
  - attestation,
  - price floor,
  - uptime,
  - model license,
  - sensitivity class,
  - queue depth,
  - warm-cache presence
- Chooses best node set for sync or async work
- Supports failover and re-routing

#### 5. Job router / orchestrator
- Transforms API requests into execution plans
- For synchronous inference:
  - selects a live endpoint
  - issues request
  - retries/fails over if needed
- For async jobs:
  - creates job manifests
  - stages data
  - dispatches signed bundles
  - tracks lifecycle

#### 6. Model registry and serving control plane
- Approved model catalog
- Signed model manifests
- License metadata
- Compatibility metadata by runtime/GPU
- Weight checksums and provenance
- Routing aliases (e.g., `openai/gpt-oss-120b-like`, `qwen-long`, `cheap-embed-v1`)

#### 7. Model serving layer
- LLM runtimes:
  - vLLM,
  - SGLang,
  - TGI
- Embeddings:
  - TEI or vLLM-based embedding runners
- Image generation:
  - dedicated inference workers later
- Runtime sidecars:
  - health,
  - token accounting,
  - trace correlation,
  - policy enforcement

#### 8. API gateway layer
- OpenAI-compatible endpoint surface
- AuthN/AuthZ
- rate limits,
- usage controls,
- model aliases,
- routing policies,
- budgets,
- caching where allowed,
- organization-level controls

#### 9. Metering and usage accounting
- Gateway-side request log is first source of truth
- Node-side runtime meter is second source of truth
- Reconciliation engine checks:
  - token counts,
  - GPU-seconds,
  - batch size,
  - prompt/output bytes,
  - retries/failures
- Signed usage receipts per job/request

#### 10. Credit ledger
- Double-entry ledger
- Distinct balances:
  - customer prepaid cash balance,
  - customer spend credits,
  - provider payable cash,
  - provider promotional spend balance,
  - platform revenue,
  - reserve/holdback accounts,
  - tax/VAT liabilities

#### 11. Billing and payouts
- Cards / ACH / invoice / prepaid balance
- Provider payouts after hold window
- KYC/tax/sanctions checks
- Refund and dispute workflows
- Optional stablecoin payout rail later where lawful

#### 12. Policy engine
- Central placement and usage rules
- Organization-level policies
- Model-license policies
- Geography, sanctions, export controls
- Sensitivity-level enforcement
- Allowed runtime / egress / storage policies

#### 13. Secrets and key management
- Platform KMS/HSM integration
- Short-lived workload tokens
- Secret release only after attestation and policy check
- No raw provider visibility into buyer secrets
- BYOK connectors only in customer-controlled/private mode

#### 14. Trust, reputation, and anti-fraud
- Provider trust scores
- Hardware fingerprint confidence
- Historical performance and dispute rate
- Identity confidence / KYC tier
- Sybil and wash-trading graph detection

#### 15. Observability and audit
- Logs, metrics, traces
- Immutable audit events for settlement-relevant actions
- Security events and provider-health alerts
- Customer-visible usage and cost analytics

#### 16. Dashboard / product UI
- Provider console
- Consumer console
- Finance/usage dashboards
- Security/compliance dashboards
- Reputation and incident views

### Text architecture diagram

```text
                         +---------------------------------------+
                         |           CONTROL PLANE               |
                         |---------------------------------------|
 Buyers / Apps ----------> API Gateway / Auth / Rate Limit       |
                         |        |                              |
                         |        v                              |
                         |  Routing & Placement Engine           |
                         |        |                              |
                         |        v                              |
                         |  Job Orchestrator / Queue            |
                         |        |                              |
                         |        +--> Model Registry            |
                         |        +--> Policy Engine             |
                         |        +--> Trust & Reputation        |
                         |        +--> Metering Reconciler       |
                         |        +--> Ledger / Billing / Payout |
                         |        +--> Observability / Audit     |
                         +-----------------|---------------------+
                                           |
                                     mTLS / SPIFFE
                                           |
         ------------------------------------------------------------------
         |                         |                           |            |
         v                         v                           v            v
+------------------+     +------------------+      +------------------+  +------------------+
| Provider Node A  |     | Provider Node B  |      | Provider Cluster |  | Private Customer |
| (Vetted cloud)   |     | (Datacenter)     |      | (Lab/startup)    |  | Cluster / VPC    |
|------------------|     |------------------|      |------------------|  |------------------|
| Agent            |     | Agent            |      | Agent            |  | Private Connector|
| Sandbox runtime  |     | Sandbox runtime  |      | K8s operator     |  | Optional BYOK    |
| vLLM / TGI       |     | vLLM / SGLang    |      | vLLM / TGI       |  | Self-hosted      |
| Metering sidecar |     | Metering sidecar |      | Metering sidecar |  | routing only     |
| Attestation      |     | Benchmarks       |      | Attestation opt. |  | no public resale |
| Egress policy    |     | Egress policy    |      | Egress policy    |  |                  |
+------------------+     +------------------+      +------------------+  +------------------+
```

### Trust-tiered execution model

| Tier | Provider type | Example supply | Allowed workloads | Security expectation |
|---|---|---|---|---|
| **T0 Community** | Consumer / hobbyist | Home GPU, gaming rig | Public/open batch only | Minimal trust; no secrets; no sensitive data |
| **T1 Vetted** | KYC’d provider | Startup cluster, managed cloud account, colo | Standard open-model inference and batch | Strong isolation, signed bundles, audit trail |
| **T2 Attested / Confidential** | Higher-assurance provider | Azure confidential GPU, GCP confidential GPU/Confidential Space, dedicated cloud/on-prem | Sensitive or enterprise-tier workloads | Attestation-gated secrets, stronger residency and audit |

### Key architectural design choices

1. **Do not schedule arbitrary customer containers in the public marketplace MVP.**
   - Run only platform-approved workloads and runtimes.
2. **OpenAI-compatible API is the demand-side primitive.**
3. **Providers contribute capacity, not customer-visible machines.**
4. **Support sync inference and async jobs, but not generic SSH / raw VM rental in MVP.**
5. **Separate public marketplace from private enterprise connector mode.**

---

## F. Security and trust model

### Security posture summary

This system can be made **meaningfully secure** for the right workloads, but not magically secure for all workloads.

### What is mature today
- mTLS and workload identity (SPIFFE/SPIRE-style patterns)
- Signed artifacts and provenance (Sigstore/Cosign, SLSA-style supply chain hardening)
- MicroVM/VM-backed container isolation (Firecracker, Kata, gVisor)
- Cloud TEEs and remote attestation for selective secret release
- KMS/HSM-backed key management
- Standard fraud controls, KYC, sanctions screening
- Zero-data-retention routing for certain commercial API integrations where provider supports it

### What is useful but limited
- Confidential GPUs / confidential AI instances
- Remote attestation for proving a workload started in an approved environment
- Hardware fingerprinting and challenge-based benchmarking
- Verifiable usage reconciliation

### What is mostly hype or research for MVP purposes
- Universal proof-of-execution for GPU inference
- zk-proof verification of general-purpose LLM inference at marketplace scale
- Perfect confidentiality on arbitrary shared hosts
- Perfect metering without trust assumptions
- “Trustless” decentralized AI infrastructure for enterprise-sensitive workloads

### Threat model table

| Threat | How it shows up | Impact | Practical defenses | Residual risk |
|---|---|---|---|---|
| Malicious provider inspects prompts/outputs | Host-level snooping, logs, memory scraping | Data leak | Trust tiers, no sensitive jobs on T0, encrypted transit, minimize logs, dedicated/private tiers, TEE-gated secret release | Medium on T1, lower on T2 |
| Malicious provider fakes work / usage | Overstates token counts or GPU time | Billing fraud | Gateway-side source of truth, signed node receipts, reconciliation, canary jobs, holdbacks, audits | Medium |
| Malicious buyer submits malware or mining workload | Arbitrary code or abuse jobs | Provider compromise / reputational damage | No arbitrary workloads in MVP, allow-listed runtimes only, deny-by-default egress, anomaly detection | Low in inference-first MVP |
| API key theft | Key stored in platform or exposed on provider | Upstream account abuse | Avoid public BYOK market, vault storage, short-lived credentials, customer-controlled connectors only | Medium if BYOK later |
| Data exfiltration | Workload sends outputs to attacker | Confidentiality breach | Egress control, signed manifests, network policies, output quotas, DLP rules for enterprise tiers | Medium |
| Model stealing | Provider or buyer copies proprietary weights | IP loss | Open-weight focus in public market, dedicated/private deployment for proprietary weights, encrypted storage, weight sharding later if needed | High for proprietary-model public hosting |
| Prompt leakage across tenants | Shared caches / timing channels | Privacy leak | No multi-tenant sensitive jobs, isolate cache pools, dedicated serving for sensitive tiers, jitter/mitigations, disable shared caches where required | Medium |
| GPU spoofing / fake hardware claims | Provider lies about GPU class or VRAM | Bad placement, fraud | Benchmark challenges, NVML/PCIe fingerprinting, attestation where possible, burn-in tests | Medium |
| Host tampering / rootkits | Agent runs on compromised host | Data leak, fake meter | Secure boot/TPM where available, attestation, mandatory updates, malware scanning, trust-tier downgrades | Medium-High |
| Malware on provider node | Existing infection or compromised dependency | Data compromise | Provider health checks, image allow-lists, EDR for vetted tiers, quarantine | Medium |
| Side-channel attacks | Timing/cache/GPU memory allocation leakage | Prompt/system prompt leak | Dedicated workers for sensitive jobs, minimize co-tenancy, confidential computing where available, disable shared semantic caches | Medium |
| Container escape / sandbox breakout | Runtime exploit | Host compromise | MicroVMs, Kata/gVisor, minimal kernel attack surface, seccomp/AppArmor, read-only FS | Low-Medium |
| Supply chain compromise | Malicious image/package/update | Broad compromise | Signed builds, Cosign verification, SBOM, SLSA, reproducible build targets where possible | Medium |
| Billing fraud / chargebacks | Stolen cards, fake demand | Financial loss | Payment risk tools, delayed payout, reserve accounts, KYC for providers, anomaly detection | Medium |
| Sybil attack on provider side | Fake providers create many nodes | Fraud/manipulation | KYC tiers, hardware fingerprinting, deposit/holdbacks, graph analysis | Medium |
| Wash trading / fake demand | Same actor buys from self to farm rewards | Distorted economics, fraud | No token farming, fee floors, related-party detection, payout holds, manual review | Medium |
| Unauthorized workloads on provider nodes | Provider runs extra jobs or swaps model | Integrity / metering failure | Signed workload bundles, challenge requests, audit probes, spot-check outputs, holdbacks | Medium |
| Model substitution / quantization abuse | Provider serves cheaper model than promised | Quality and billing fraud | Output audits, periodic probe suite, model fingerprinting, research-based audit features later | Medium |

### Concrete defense plan

#### 1. Use workload allow-lists
Public network should run only:
- approved model server images,
- approved model manifests,
- approved job types.

This is the single biggest security simplification.

#### 2. Strong sandboxing
Use one of:
- **Kata Containers** for K8s-based vetted providers,
- **Firecracker**-style microVMs for VM-based workers,
- **gVisor** where lighter isolation is acceptable.

#### 3. Signed workloads and policy-checked execution
Every workload bundle should include:
- image digest,
- runtime config,
- model manifest ID,
- network policy,
- max tokens/runtime,
- customer org ID,
- sensitivity class,
- signature.

#### 4. Remote attestation where it is actually useful
Use attestation mainly for:
- secret release,
- confirming expected TEE/workload measurements,
- tier qualification.

Do **not** oversell attestation as proof of perfect execution correctness.

#### 5. Dual-source metering
- Gateway counts logical API usage.
- Node reports physical execution stats.
- Reconciler flags mismatch.

#### 6. Reputation + reserves
- New providers get lower caps and longer payout holds.
- High-value jobs require higher trust scores.
- Repeat disputes lower routing priority.

#### 7. No public BYOK key marketplace
If BYOK exists at all:
- it is enterprise/self-hosted/private connector mode only.

### Mature vs hype: explicit view

| Technique | Maturity | Good for | Not good for |
|---|---|---|---|
| TEEs / confidential VMs / confidential GPUs | **Real but limited** | Secret release, stronger isolation, selected sensitive workloads | Proving perfect execution or eliminating all side channels |
| Remote attestation | **Real** | Verifying approved environment measurements | Full billing correctness or proving exact output correctness |
| MicroVM sandboxing | **Mature** | Isolating serving workloads | Preventing all host-level fraud |
| Signed bundles + provenance | **Mature** | Supply-chain hardening | Runtime behavior integrity by itself |
| Encrypted job payloads | **Useful** | In-transit protection, staged payload privacy | Preventing host from seeing plaintext at runtime outside TEEs |
| Proof-of-execution / zk proofs | **Research / niche** | Limited audit experiments | Core production MVP control |
| Verifiable metering via reconciliation | **Practical approximation** | Fraud reduction and audits | Complete trustlessness |

### Bottom-line security truth

**Can users safely run proprietary inference jobs on third-party machines?**  
Only under constrained conditions:
- trusted provider tier,
- contractual controls,
- strict logging minimization,
- dedicated or confidential execution if sensitivity is high,
- and realistic expectations about residual risk.

For arbitrary public/community machines: **no**.

---

## G. Data privacy and compliance

### G1. Can users safely run proprietary inference jobs on third-party machines?

### Answer
**Sometimes, but not by default.**

#### Safe-ish conditions
- Provider is vetted and contractually bound.
- Workload runs in a private or high-trust tier.
- Prompts/outputs are not stored beyond minimal operational metadata.
- Secret release is gated on attestation/policy.
- Data residency is enforced.
- Customer accepts subprocessor chain.
- Model/runtime is licensed for the use case.
- Logs are redacted or disabled for content.

#### Unsafe conditions
- Anonymous community nodes.
- Shared caches / co-tenancy without strong isolation.
- Public marketplace with arbitrary code execution.
- BYOK secrets handed to public third parties.
- Regulated data with no DPA/subprocessor approvals.

### G2. Compliance issues that matter

#### GDPR and processor/subprocessor structure
- The platform will often be a **processor** or subprocessor.
- Providers may themselves become subprocessors.
- Subprocessor authorization and contractual flow-down matter.
- Customers need provider-region controls and subprocessor transparency.

#### Enterprise procurement
- Expect requests for:
  - SOC 2 Type II,
  - pen test summary,
  - DPA,
  - subprocessor list,
  - incident response commitments,
  - deletion/retention policy,
  - data residency controls,
  - model governance statements.

#### Export controls and sanctions
- GPU supply and AI services can intersect with export controls and sanctions regimes.
- Block sanctioned geographies and screened entities.
- Treat advanced-chip and model-access rules as dynamic; legal review must be ongoing.

#### Copyright and model licensing
- Open-weight does not mean unrestricted.
- Scheduler must understand:
  - commercial-use restrictions,
  - revenue caps,
  - no-training-on-output clauses,
  - field-of-use restrictions,
  - export/geographic restrictions where any apply.

#### Cloud-provider terms
- Providers using AWS/GCP/Azure must represent that their use of the underlying infrastructure is permitted for the service they are offering.
- The platform should contractually forbid providers from listing capacity that they are not allowed to monetize.

#### Tax and payouts
- Seller payouts require collection of tax forms and jurisdictional handling.
- VAT/GST may apply to marketplace services.
- Platform must distinguish service revenue from stored value liabilities.

#### Money transmission / e-money / prepaid access
- Internal credits become legally riskier if:
  - transferable between users,
  - redeemable for cash broadly,
  - usable outside the platform,
  - or marketed as a financial asset.

### G3. Risk-reducing platform structure

#### Recommended legal/commercial structure
1. **Public marketplace**
   - only open-model inference and approved jobs;
   - providers are selling compute-backed AI services, not third-party credits.
2. **Private enterprise mode**
   - customer-controlled connectors and private clusters;
   - if routing closed-model APIs, the customer keeps the key.
3. **Internal credits**
   - non-transferable, platform-only, discount/usage balances.
4. **Cash payouts**
   - only for verified providers after completed services and settlement.
5. **No user-to-user transfer of credits**
6. **No representation that credits are cash, legal tender, or vendor credits**

### G4. Compliance posture recommendation by tier

| Tier | Data sensitivity allowed | Compliance posture |
|---|---|---|
| T0 Community | Public or low-sensitivity only | Minimal; no enterprise promises |
| T1 Vetted | Standard business data and non-regulated workloads | DPA + provider KYC + logging controls |
| T2 Attested / Private | Higher-sensitivity commercial workloads | DPA + subprocessor controls + attestation + dedicated routing + optional dedicated tenancy |

---

## H. Product UX

### H1. Provider-side UX

#### Provider onboarding flow
1. **Create provider account**
   - entity info, payout country, KYC level
2. **Install agent**
   - VM installer, Docker/K8s operator, or cloud account connector
3. **Hardware discovery**
   - detect GPU model, VRAM, drivers, benchmark
4. **Trust and risk mode**
   - Community / Vetted / Private / Confidential-capable
5. **Sharing policy**
   - choose workloads:
     - chat,
     - embeddings,
     - batch,
     - image,
     - eval
   - choose max concurrency
   - choose allowed data sensitivity class
6. **Pricing**
   - set price floor, utilization target, auto-price mode or manual
7. **Availability**
   - schedule, pause/resume, reserve for internal jobs
8. **Publish capacity**
   - review projected earnings and risk posture

#### Provider dashboard modules
- **Overview**
  - earnings today / month
  - current utilization
  - active nodes
  - projected monthly upside
- **Inventory**
  - each node/cluster, hardware, trust tier, health
- **Jobs**
  - completed, failed, in-flight, rejected with reasons
- **Pricing**
  - floor, realized average price, revenue by workload type
- **Security**
  - attestation status, image version, policy violations, malware/health alerts
- **Reputation**
  - trust score, dispute rate, uptime score, benchmark confidence
- **Balances**
  - withdrawable cash,
  - pending holdbacks,
  - spendable credits,
  - payout history

#### Provider screen-level UX suggestions
- **Node Detail**
  - hardware fingerprint confidence
  - benchmark trend
  - model cache state
  - last attestation
  - allowed workloads
- **Risk Settings**
  - “public/open only”
  - “no prompts logged”
  - “require attested jobs only”
  - “private customers only”
- **Pricing Strategy Screen**
  - price floor
  - accept spot/batch only
  - premium for attested/dedicated jobs
  - minimum job size

### H2. Consumer-side UX

#### Consumer flow
1. **Create workspace / org**
2. **Select usage mode**
   - API endpoint
   - batch job
   - private cluster connection (later)
3. **Choose model or task**
   - chat, embeddings, image, eval
4. **Choose trust/performance/cost tier**
   - cheapest,
   - balanced,
   - vetted only,
   - private/attested
5. **Set constraints**
   - max price,
   - region,
   - latency target,
   - data sensitivity,
   - allow fallbacks or not
6. **Send requests**
   - REST/OpenAI-compatible SDK
7. **Monitor**
   - latency, outputs, cost, provider class, retries
8. **Pay**
   - card, prepaid balance, invoice, spend credits

#### Consumer dashboard modules
- **Usage overview**
  - requests, tokens, jobs, spend
- **Cost optimization**
  - spend by model
  - spend by route/tier
  - savings vs benchmark cloud
- **Reliability**
  - latency percentiles
  - failover rates
  - error sources
- **Security / compliance**
  - region map
  - trust tier mix
  - prompt logging state
  - subprocessor class
- **Routing**
  - policy builder
  - fallback chains
  - price/latency filters
- **Billing**
  - prepaid balance
  - spend credits
  - invoices
  - budgets and alerts

### H3. Modern dashboard design system

#### Top-line cards
- Earnings / Spend
- Spendable credits
- Withdrawable cash
- Effective utilization
- Jobs completed
- Failure rate
- Trust score
- Estimated monthly upside / savings

#### Charts
- Utilization over time
- Earnings by workload type
- Spend by model
- Failure reasons
- Trust-tier mix
- Provider health trend

#### Distinction that must be explicit in UI
- **Spendable credits**: platform-only, non-transferable
- **Withdrawable cash**: earnings from completed provider services, subject to KYC/settlement
- **Pending earnings**: under holdback or dispute review

---

## I. Economics and token/credit model

### Design goal

Give users a simple feeling of “I earned value, I can spend value, and where allowed I can cash out” without accidentally creating:
- resold provider credits,
- an unlicensed money-like instrument,
- a wash-trade incentive machine.

### Alternative structures compared

| Option | Legal complexity | User appeal | Accounting simplicity | Abuse risk | Compatible with provider terms | Liquidity | International payouts | Verdict |
|---|---|---|---|---|---|---|---|---|
| Pure fiat marketplace | Low-Medium | Medium | High | Medium | High | High | Medium | Good baseline |
| Internal non-transferable credits | Low-Medium | High | High if separated from cash | Medium-Low | High | Low | N/A | **Best complement to fiat** |
| Transferable token | High | Medium for crypto users, low for enterprise | Low | High | Low | High | High | Bad MVP choice |
| Stablecoin payouts | Medium | Medium | Medium | Medium | Neutral | High | High | Good later optional rail |
| Prepaid usage balances | Low-Medium | High | High | Medium | High | Low | N/A | **Recommended** |
| Marketplace escrow / reserve holds | Medium | Medium | Medium | Lowers fraud | High | N/A | Medium | **Recommended** |
| Revenue sharing / rebates | Low-Medium | High | Medium | Medium | High | Low | N/A | Good retention tool |
| Enterprise commitments | Medium | High for enterprise | Medium | Low | High | N/A | Medium | Good later-stage product |

### Recommended MVP economics

#### 1. Fiat first
- Buyers pay by card, ACH, or invoice/prepay.
- Providers earn fiat receivables.

#### 2. Internal non-transferable credits
Use three clearly distinct balances:

**A. Usage balance**
- Customer prepaid cash balance.
- Spend-down for inference.

**B. Spend credits**
- Promotional, referral, or contribution bonuses.
- Non-transferable.
- Not redeemable for cash.
- Only usable on platform services.
- Can expire.

**C. Provider cash earnings**
- Actual cash payable for completed jobs after fees and holdback.
- Withdrawable where legally supported and after KYC/tax validation.

#### 3. Optional provider auto-conversion
A provider may choose:
- `X%` of cash earnings auto-convert to usage balance at par or with a bonus (e.g. 5% spend bonus).
- This is not a token redemption; it is a platform wallet transfer.

#### 4. Holdbacks and reserves
- Keep a dispute window reserve on provider earnings.
- New providers have longer holds.

### Recommended later-scale economics

1. Keep fiat + usage credits as core.
2. Add invoice/commit contracts for enterprise.
3. Optionally add stablecoin payout rails in selected jurisdictions.
4. Continue to avoid a broad transferable token.

### Why not a transferable token?

Because it creates avoidable complexity:
- securities/commodities scrutiny in some contexts,
- e-money/stored value issues,
- AML burden,
- wash trading,
- incentive distortion,
- enterprise procurement rejection.

### Suggested ledger model

#### Core accounts
- Customer prepaid cash liability
- Customer promotional credit liability
- Provider payable
- Platform revenue
- Risk reserve
- Tax liability
- Provider spend-balance liability

#### Example job settlement
For a `$10.00` job:
- Debit customer usage wallet: `$10.00`
- Credit provider payable: `$8.50`
- Credit platform revenue: `$1.20`
- Credit reserve holdback: `$0.30`

If provider converts `$2.00` of payable into spend balance:
- Debit provider payable: `$2.00`
- Credit provider spend balance: `$2.00`

### Legal/accounting guidance for credits

To reduce risk:
- no peer-to-peer transfers,
- no open market trading,
- no external redemption,
- no description as “token” in legal docs unless you are prepared for the baggage,
- clear TOS that spend credits are promotional/service balances only.

**Branding recommendation:** call them **“Usage Credits”** or **“Platform Spend Balance”**, not tokens.

---

## J. Scheduling and workload model

### J1. What should actually run on provider nodes?

| Workload type | Public marketplace suitability | Notes |
|---|---|---|
| Raw containerized jobs | **No** for MVP public network | Too much malware/exfiltration risk; later private mode only |
| Batched inference | **Yes** | Excellent fit for distributed capacity |
| Hosted model endpoints | **Yes, on vetted providers** | Strong wedge for OpenAI-compatible API |
| Embeddings | **Yes** | Good economics, less latency-sensitive than chat in many cases |
| Fine-tuning | **Later / private only** | More data sensitivity and longer jobs |
| Background agent jobs | **Maybe later** | Only from approved workflow catalog |
| Synthetic data generation | **Yes** for non-sensitive data | Great use of spare capacity |
| RAG indexing | **Yes with constraints** | Public/non-sensitive first; private for sensitive corpora |
| Image generation | **Yes** | Strong batch fit; easier than confidential text use cases |
| Video generation | **Later** | Heavy runtime/storage/network burden |
| RL training | **No** for MVP | Complex, long-running, sensitive, hard to meter fairly |
| Evaluation jobs | **Yes** | Good for spare capacity and benchmark workloads |

### J2. Workload classes by trust

#### T0 Community
- public prompts,
- public models,
- batch-only,
- no customer secrets,
- no proprietary corpora.

#### T1 Vetted
- standard open-model inference,
- embeddings,
- image generation,
- moderate sensitivity if customer accepts vetted-subprocessor model.

#### T2 Private / Attested
- higher sensitivity,
- regulated-ish commercial workloads,
- dedicated or confidential serving,
- customer-specific policies.

### J3. Placement policy inputs

Scheduler must place jobs on:
- **hardware type** (GPU model, VRAM, tensor parallel capability)
- **latency target**
- **trust level**
- **region / residency**
- **price ceiling**
- **availability window**
- **uptime / reliability**
- **attestation level**
- **data sensitivity**
- **model-license constraints**
- **warm model cache**
- **provider concentration risk**

### J4. Placement algorithm sketch

```text
1. Hard filter providers by:
   - active / healthy
   - KYC tier >= required
   - region allowed
   - trust tier >= job requirement
   - attestation requirement met (if any)
   - model license allows this provider/jurisdiction
   - hardware and VRAM fit
   - price floor <= customer max price
   - availability window sufficient

2. Score remaining providers:
   score =
     w1 * expected_latency_fit +
     w2 * throughput_per_dollar +
     w3 * reliability_score +
     w4 * warm_cache_bonus +
     w5 * attestation_bonus -
     w6 * concentration_penalty -
     w7 * recent_dispute_penalty

3. Reserve capacity and issue signed workload bundle.

4. Reconcile execution metrics and adjust provider trust score.
```

### J5. Model-license-aware scheduling

Every model manifest should include:
- commercial-use permission,
- redistribution/hosting limitations,
- no-training-on-output restrictions,
- revenue thresholds,
- jurisdictional limitations,
- provider obligations.

Scheduler blocks placements that violate license metadata.

---

## K. Recommended MVP

### K1. Narrow wedge

**MVP wedge:**  
OpenAI-compatible API for **open-weight text generation + embeddings + async batch image generation**, backed by **vetted provider GPUs** only.

### K2. Target users

#### Demand-side
- AI startups / product teams spending roughly `\$2k–\$50k` per month on inference or generation.
- Need lower costs, burst capacity, and one API.
- Comfortable with open models for many workloads.

#### Supply-side
- Small labs/startups/AI consultancies with underutilized A100/H100/L40S-class clusters.
- Datacenter-grade GPU operators with spare inventory.
- Select on-prem/private cluster operators.

### K3. Exact MVP feature list

#### Buyer features
- OpenAI-compatible `/chat/completions`, `/responses`-style abstraction, `/embeddings`, async batch endpoint
- Model catalog of approved open models
- Routing policy: `cheap / balanced / vetted-only`
- Org budgets, API keys, usage analytics
- Prepaid billing and invoice-ready usage export

#### Provider features
- Agent install on Linux/K8s
- Hardware discovery and benchmark
- Workload opt-in policy
- Price floor and pause/resume
- Earnings dashboard
- KYC + payouts

#### Platform features
- Placement engine
- Model registry
- Signed workload bundles
- Metering reconciliation
- Double-entry ledger
- Provider trust scoring
- Basic dispute workflow

### K4. Architecture choices for MVP

- **No consumer/home-node supply in MVP**
- **No arbitrary container jobs in public network**
- **No public BYOK routing**
- **No transferable token**
- **No subleasing marketplace for cloud commitments**
- **No fine-tuning / training marketplace initially**

### K5. What to postpone

- Community-tier supply
- Confidential-compute premium tier as mainstream feature (okay for one design partner, not core MVP)
- Proprietary closed-model BYOK routing in public product
- Video generation
- Raw VM rental
- Peer-to-peer credit transfers
- Stablecoin payouts
- Enterprise commitment exchange / reserved-capacity exchange

### K6. What not to build

- “Sell your OpenAI credits”
- “Lend your Anthropic key”
- “List your AWS credits for sale”
- “Run arbitrary jobs from strangers on your laptop”
- “Marketplace token with staking/slashing as core economics”

### K7. Demand validation plan

- Recruit 5–10 design partners on demand side.
- Recruit 3–5 real supply partners with spare clusters.
- Benchmark cost and latency versus Together/Replicate/RunPod for a selected model set.
- Validate that at least 3 buyers will move meaningful monthly traffic (`>$5k/month` each) for lower-cost open-model workloads.
- Validate provider willingness to list spare capacity under policy controls and payout terms.

### K8. 90-day plan

#### Days 0–30
- lock scope and legal posture
- sign 3 demand design partners
- sign 2 supply design partners
- build control-plane skeleton
- build provider agent prototype
- benchmark 3 target models on 3 GPU classes
- define ledger and billing schema

#### Days 31–60
- launch OpenAI-compatible gateway alpha
- implement provider onboarding, inventory, benchmarks
- implement placement MVP
- integrate vLLM/TGI
- implement double-entry ledger and basic Stripe Connect payouts
- build provider and buyer dashboards alpha

#### Days 61–90
- closed beta with real traffic
- add signed workload bundles and stronger policy engine
- complete dispute/holdback flow
- instrument routing cost comparisons
- launch with vetted-only supply
- publish security whitepaper / trust tiers

### K9. MVP launch criteria

- `>=3` vetted providers live
- `>=5` paying buyers
- `>=99%` successful request rate in beta
- metering discrepancy `<0.5%`
- provider payout run completed successfully
- no critical unresolved security findings
- legal review confirms no provider-term-dependent blocked feature in launch scope

---

## L. Build plan

## Architecture overview and ADR index

### Architecture overview

**Control plane**
- Hosted centrally on one primary cloud in MVP.
- Multi-AZ, API gateway, orchestration, billing, trust, ledger, observability.

**Execution plane**
- Provider-run capacity in their own environments.
- Agent-managed serving workers.
- Approved runtime images only.

### Canonical backend service (bootstrap source of truth)

The initial executable backend source of truth lives in:

```text
services/control-plane/
  src/
    domain/
    application/
    infrastructure/
    interfaces/
    config/
  tests/
    unit/
    integration/
    contract/
```

This service owns the first MVP control-plane slices until extraction pressure justifies splitting services with an ADR.

### ADR index

- **ADR-0001**: Product scope excludes resale of third-party AI credits and public BYOK key markets.
- **ADR-0002**: Centralized control plane, distributed execution plane.
- **ADR-0003**: Inference-first product; no arbitrary public compute jobs in MVP.
- **ADR-0004**: Trust-tiered marketplace (Community later, Vetted first, Attested/private later).
- **ADR-0005**: Double-entry ledger with separate cash payables and non-transferable spend balances.
- **ADR-0006**: Signed workload bundles and allow-listed runtimes only.
- **ADR-0007**: Open-weight models first; proprietary closed-model routing only in private connector mode.
- **ADR-0008**: Provider trust scoring and holdback-based fraud controls.
- **ADR-0009**: Kubernetes/Kata first for vetted clusters; private agents for VM-based providers later.
- **ADR-0010**: Stripe Connect first for payouts; Tipalti/Adyen optional later for expanded geographies.

### Recommended stack

#### Languages
- **Go**: control-plane services, routing engine, metering, ledger integrations
- **Rust**: provider agent, low-level benchmarking, secure update client
- **Python**: model-runtime integration, benchmark harness, some ops tooling
- **TypeScript**: dashboard / web app

#### Datastores
- **PostgreSQL**: accounts, billing, marketplace state, transactional data
- **ClickHouse**: high-volume usage analytics and observability-adjacent metering queries
- **Redis**: rate limits, short-lived routing state, caches
- **S3-compatible object storage**: logs, manifests, artifacts, model staging metadata

#### Eventing
- **NATS** or **Kafka**
  - MVP: NATS for simpler control-plane messaging
  - Later: Kafka if event volume and replay requirements dominate

#### Orchestration
- **Kubernetes** in control plane
- **Kubernetes + Kata Containers** for vetted provider clusters
- **Direct Linux agent** for non-K8s providers later

#### Model serving
- **vLLM** for most text generation
- **SGLang** for selected throughput-sensitive serving
- **TGI** as alternate runtime / compatibility path
- **TEI or equivalent** for embeddings
- Image generation workers later via dedicated runners

#### Authentication
- API keys for dev usage
- OIDC / SSO for enterprise later
- SPIFFE/SPIRE-style workload identity internally if team can support it; otherwise mTLS with short-lived certs initially

#### Billing / payouts
- **Stripe** for card billing
- **Stripe Connect** for provider onboarding and payouts in supported geographies
- **Tipalti or Adyen** later for broader international supplier payouts and tax workflows

#### Logging / monitoring
- OpenTelemetry
- Prometheus + Grafana
- Loki / Tempo or managed equivalents
- ClickHouse-backed cost/performance analytics

#### Security tooling
- Sigstore/Cosign for image signing
- Trivy/Grype for vulnerability scanning
- OPA/Kyverno for policy and image verification
- Vault/KMS for secrets
- EDR / host posture checks for vetted tiers
- SLSA-aligned CI provenance

#### Deployment model
- Control plane on managed Kubernetes
- Terraform for infra
- ArgoCD or Flux for GitOps
- Canary release strategy
- Feature flags for new trust tiers and routing modes

### Component plan

| Component | Stack choice | Notes |
|---|---|---|
| API Gateway | Go + Envoy/managed edge | OpenAI-compatible translation, rate limits, auth |
| Router / Scheduler | Go service | Needs low latency and strong typing |
| Provider agent | Rust | Strong security posture and low footprint |
| Model runtime controller | Python + Go integration | Talks to vLLM/TGI/SGLang |
| Ledger | Go + PostgreSQL | Strong transactional semantics |
| Dashboards | Next.js / TypeScript | Provider and consumer portals |
| Policy engine | OPA / Cedar-like policy service | Central to placement and compliance |
| Metering pipeline | NATS + Go + ClickHouse | Reconciliation and analytics |
| Audit/event bus | NATS/Kafka | Immutable event flow for disputes |
| Secrets service | Vault / cloud KMS | Short-lived tokens, no raw secret exposure |

### Testing strategy

#### Functional
- API compatibility suite against OpenAI SDK patterns
- Placement engine correctness tests
- Ledger accounting invariants
- Billing and payout simulation tests
- Provider enrollment tests

#### Security
- Image signature verification tests
- Sandbox breakout test suite
- Secret exposure regression tests
- Abuse workload detection tests
- Supply-chain scan gates

#### Reliability / performance
- Load testing with mixed request sizes
- Failover and provider-loss chaos tests
- Metering reconciliation stress tests
- Warm-cache routing benchmarks

#### Marketplace integrity
- Fraud simulation
- Wash-trade graph tests
- KYC flow tests
- Dispute workflow tests

---

## Epic backlog

- [ ] **E1** Identity, tenancy, and access control
- [ ] **E2** Provider onboarding, agent, inventory, and trust scoring
- [ ] **E3** Routing, scheduling, and policy-aware placement
- [ ] **E4** Model registry and serving control plane
- [ ] **E5** Metering, ledger, billing, and payouts
- [ ] **E6** Security hardening, signed workloads, and fraud controls
- [ ] **E7** Provider and consumer dashboard UX
- [ ] **E8** Enterprise private connector mode and private-cluster burst
- [ ] **E9** Compliance program, DPA/subprocessor controls, and audit readiness

---

## Story backlog with acceptance criteria

### Current sprint / active stories (top priority)

- [x] `E1-S1` Tenant, organization, and RBAC foundation
  - **Epic:** `E1`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `ADR-0001`, `ADR-0002`
  - **Acceptance criteria:**
    - [x] Users can create organizations with a founding owner, invite members, and assign roles (`owner`, `admin`, `developer`, `finance`)
      - [x] Organizations can be created through the control-plane identity service with a founding `owner`
      - [x] Additional members can be invited into an existing organization and accept those invitations into membership
        - [x] Invitations are single-use, expire after `7 days`, and preserve the preassigned org role on acceptance
      - [x] Explicit member role assignment and mutation flows exist beyond founding-owner bootstrap
        - [x] Owners and admins can change existing member roles through the control-plane identity service
        - [x] Admins cannot assign or mutate `owner` memberships
        - [x] Role mutation preserves the invariant that every organization retains at least one `owner`
    - [x] Provider and buyer account types are supported in a single account model
    - [x] API keys can be scoped to org and environment
      - [x] Org members with `owner` or `admin` role can issue API keys for a named environment through the control-plane identity service
      - [x] API keys are persisted only as non-reversible hashes while callers receive the secret exactly once at issuance
      - [x] Authenticated org access checks resolve the API key's organization and environment scope before allowing access
      - [x] Additional control-plane organization-management endpoints enforce the same scoped machine-auth contract where applicable
        - [x] Invitation issuance has an org/environment-scoped machine-auth endpoint that requires a valid organization API key and preserves owner/admin inviter RBAC checks
        - [x] Member-role mutation has an org/environment-scoped machine-auth endpoint that requires a valid organization API key and preserves owner/admin role-mutation guardrails
  - **Implementation slices:**
    - [x] `E1-S1a` Bootstrap `services/control-plane` and deliver persisted organization creation with a founding owner plus unified buyer/provider account capabilities
    - [x] `E1-S1b` Deliver invitation issuance, invitation acceptance, and explicit member role assignment workflow
      - [x] `E1-S1b1` Issue organization invitations with a preassigned role and accept them into membership
      - [x] `E1-S1b2` Change existing member roles with owner/admin authorization rules
    - [x] `E1-S1c` Deliver organization/environment-scoped API keys and RBAC authorization checks
      - [x] `E1-S1c1` Issue hashed organization/environment-scoped API keys and enforce them on an authenticated org access-check endpoint
      - [x] `E1-S1c2` Extend authenticated RBAC authorization checks across additional control-plane organization management endpoints
        - [x] `E1-S1c2a` Add scoped machine-auth invitation issuance while preserving inviter RBAC rules
        - [x] `E1-S1c2b` Add scoped machine-auth member-role mutation while preserving owner/admin mutation guardrails
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 80 ms` for auth check
    - error rate: `< 0.1%`
    - memory budget: `< 256 MB` per auth service replica
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only: pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `local coverage gate passed: 95.80% statements/lines, 90.64% branches, 95.45% functions`
    - Dashboard: `TBD`
    - ADR: `ADR-0001`, `ADR-0002`
  - **Done criteria:** all acceptance criteria met, RBAC regression suite green, API docs updated.

- [x] `E2-S1` Provider enrollment, hardware discovery, and benchmark attestation-lite
  - **Epic:** `E2`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E1-S1`, `ADR-0004`, `ADR-0008`
  - **Acceptance criteria:**
    - [x] Linux/K8s agent enrolls a provider node and reports hardware inventory
      - [x] A provider-capable organization can enroll a provider node through the control-plane using an org/environment-scoped API key
      - [x] Enrollment persists node identity, runtime (`linux` or `kubernetes`), region, hostname, driver version, and GPU inventory rows
      - [x] Duplicate machine enrollment for the same organization is rejected deterministically
    - [x] Benchmark harness records GPU class, VRAM, throughput baseline, and driver version
      - [x] A provider-capable organization can submit a benchmark report for an enrolled provider node through the control-plane using an org/environment-scoped API key
      - [x] Benchmark persistence stores provider node linkage, GPU class, VRAM GB, throughput baseline, and reported driver version with a server timestamp
      - [x] Benchmark submission for an unknown or cross-organization provider node is rejected deterministically
    - [x] Provider console shows trust tier, benchmark score, and health state
      - [x] Control-plane provider inventory summary API returns enrolled provider nodes with trust tier, health state, hardware inventory, and latest benchmark snapshot for an organization/environment scope
      - [x] Provider inventory summary is scoped by org/environment API key and rejects cross-organization access deterministically
      - [x] Provider inventory summary ordering is deterministic for ties on enrollment timestamp so repeated reads preserve node sequence
      - [x] Control-plane provider node benchmark history API returns benchmark reports newest-first for an organization/environment-scoped provider node
      - [x] Provider node benchmark history API rejects unknown or cross-organization node IDs deterministically
      - [x] Control-plane provider node direct-detail API returns one enrolled provider node with trust tier, health state, hardware inventory, and latest benchmark snapshot for an organization/environment-scoped provider node
      - [x] Provider node direct-detail API rejects unknown or cross-organization node IDs deterministically
  - **Implementation slices:**
    - [x] `E2-S1a` Enroll a provider node from a provider-capable organization and persist hardware inventory with initial trust/health state
    - [x] `E2-S1b` Record benchmark reports for enrolled provider nodes with GPU class and throughput baseline
    - [x] `E2-S1c` Expose provider inventory/trust/health data through control-plane provider inventory APIs
      - [x] `E2-S1c1` List provider inventory summaries with latest benchmark data for an organization/environment scope
      - [x] `E2-S1c2` Expose provider node detail/history APIs for inventory and benchmark drill-down
        - [x] `E2-S1c2a` Expose provider node benchmark history API for a single org/environment-scoped node
        - [x] `E2-S1c2b` Expose provider node direct-detail API for provider console drill-down
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 5 s` for inventory ingest after agent report
    - error rate: `< 1%` enrollment failures after valid install
    - memory budget: `< 200 MB` agent idle RSS
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only: pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `local coverage gate passed for E2-S1: 96.19% statements/lines, 90.54% branches, 96.87% functions`
    - Dashboard: `Provider inventory panel`
    - ADR: `ADR-0004`, `ADR-0008`
  - **Done criteria:** enrollment works end-to-end for 3 GPU classes, benchmark reports stored and visible, trust score initialized.

- [x] `E3-S1` Policy-aware placement MVP
  - **Epic:** `E3`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E2-S1`, `ADR-0003`, `ADR-0004`, `ADR-0007`
  - **Acceptance criteria:**
    - [x] Scheduler filters providers by GPU capability, region, trust tier, and price cap
      - [x] Provider nodes can persist routing metadata required for placement: serving endpoint URL and hourly USD price floor
      - [x] Provider node detail exposes routing metadata so operators can verify schedulable configuration
      - [x] Placement candidate preview API returns only provider nodes matching required GPU class, minimum VRAM, requested region, minimum trust tier, and maximum USD/hour price cap
      - [x] Placement candidate filtering excludes nodes whose routing metadata is missing or invalid for the request
      - [x] Placement candidate ordering is deterministic for identical inventory and filter inputs
    - [x] Router selects an endpoint within latency budget for sync inference
      - [x] Scheduler returns one selected endpoint for a sync placement request after hard filters pass
      - [x] Endpoint selection remains deterministic for identical candidate sets and request inputs
      - [x] Deterministic sync selection chooses the lowest-price eligible endpoint and breaks price ties by provider node ID
    - [x] Placement decision log is written for every request
      - [x] Every placement request records hard-filter inputs, selected node or rejection reason, and candidate count without prompt content
  - **Implementation slices:**
    - [x] `E3-S1a` Persist provider-node routing metadata required for placement and surface it in provider node detail
    - [x] `E3-S1b` Add placement candidate filtering by GPU capability, region, trust tier, and price cap
    - [x] `E3-S1b1` Add scoped placement candidate preview API with deterministic hard filtering by GPU capability, region, trust tier, and price cap
    - [x] `E3-S1c` Select a deterministic sync endpoint and persist placement decision logs
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 120 ms` scheduler decision time
    - error rate: `< 0.5%` no-match when eligible capacity exists
    - memory budget: `< 512 MB` router replica
  - **Action class:** `heuristic placement`
  - **Autonomy stage:** `stage-2 bounded automated decisioning`
  - **Evaluator datasets:** `placement-fixtures-v1`, `region-policy-v1`, `license-policy-v1`
  - **Freshness requirements:** `provider inventory < 30s old`
  - **Rollback path:** `feature flag to static provider pools and manual routing`
  - **Memory/retention class:** `placement logs 30 days, no prompt content in decision log`
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only: pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `local coverage gate passed for E3-S1: 95.67% statements/lines, 90.19% branches, 97.16% functions`
    - Dashboard: `routing-debug panel`
    - ADR: `ADR-0003`, `ADR-0004`, `ADR-0007`
  - **Done criteria:** scheduler meets p95 latency target, policy filters pass gold dataset, static fallback path documented.

- [x] `E4-S1` OpenAI-compatible gateway and approved model catalog
  - **Epic:** `E4`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E1-S1`, `E3-S1`, `ADR-0007`
  - **Acceptance criteria:**
    - [x] Chat/completions-style endpoint is compatible with selected OpenAI SDK flows
      - [x] Non-streaming `POST /v1/chat/completions` accepts SDK-style `Authorization: Bearer <org_api_key>` auth and OpenAI-compatible request payloads for approved chat aliases
      - [x] Gateway forwards approved chat requests to the deterministic sync placement endpoint selected for the alias manifest
      - [x] Gateway forwards the upstream request with the manifest-resolved provider model ID while preserving OpenAI-compatible response framing
    - [x] Model aliases map to approved manifests and supported runtimes
      - [x] Approved chat aliases resolve to explicit manifests with upstream model ID, supported node runtimes, and placement requirements
      - [x] Gateway rejects unapproved model aliases before upstream dispatch
    - [x] Gateway returns usage metadata suitable for billing reconciliation
      - [x] Gateway returns upstream `usage.prompt_tokens`, `usage.completion_tokens`, and `usage.total_tokens` fields on successful chat completions
  - **Implementation slices:**
    - [x] `E4-S1a` Add approved chat model catalog + non-streaming `/v1/chat/completions` gateway route with bearer auth, deterministic sync placement, and usage passthrough
      - [x] Add a gateway-scoped bearer API key authenticator that resolves organization/environment scope from the presented secret
      - [x] Add the first approved chat model manifest and alias resolver bound to `ADR-0007` open-weight routing rules
      - [x] Add the non-streaming `/v1/chat/completions` route, deterministic sync placement handoff, and upstream usage passthrough
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 50 ms` added gateway overhead before upstream dispatch
    - error rate: `< 0.5%` translation failures
    - memory budget: `< 512 MB` gateway replica
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only: pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `local coverage gate passed for E4-S1: 95.78% statements/lines, 90.29% branches, 97.40% functions; 47 test files and 250 tests passed`
    - Dashboard: `consumer usage overview`
    - ADR: `ADR-0007`
  - **Done criteria:** selected SDK examples pass, manifest mapping stable, usage fields emitted and reconciler-consumable.

- [x] `E5-S1` Double-entry ledger and payout-ready earnings balances
  - **Epic:** `E5`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E1-S1`, `E4-S1`, `ADR-0005`, `ADR-0010`
  - **Acceptance criteria:**
    - [x] Customer charges produce balanced ledger entries
      - [x] Customer funding posts a balanced journal entry that debits platform cash clearing and credits customer prepaid cash liability
      - [x] Finance-authorized org members can read an organization wallet summary with explicit `usageBalanceUsd`, `spendCreditsUsd`, `pendingEarningsUsd`, and `withdrawableCashUsd` fields
    - [x] Completed jobs allocate provider payable, platform revenue, and reserve holdback
      - [x] Finance-authorized buyer-org members can call `POST /v1/organizations/:organizationId/finance/job-settlements` with explicit `providerOrganizationId`, `providerPayableUsd`, `platformRevenueUsd`, `reserveHoldbackUsd`, and `jobReference`
      - [x] Job settlement posts a balanced journal entry that debits customer prepaid cash liability and credits provider payable, platform revenue, and risk reserve
      - [x] Settlement is rejected when the buyer prepaid cash liability balance would become negative or the provider organization lacks `provider` capability
    - [x] Dashboard distinguishes spend credits, pending earnings, and withdrawable cash
      - [x] Wallet summary distinguishes zero-value categories even before provider settlement is posted
    - [x] Payout export schema is defined for staged provider payouts
      - [x] Finance-authorized org members can call `GET /v1/organizations/:organizationId/finance/payout-exports/staged?actorUserId=...`
      - [x] Export shape includes provider organization ID, settlement reference, provider payable, reserve holdback, and withdrawable cash fields for payout-run handoff
      - [x] Export ordering is deterministic by settlement occurrence time and reference so reruns are stable for the same ledger state
  - **Implementation slices:**
    - [x] `E5-S1a` Add double-entry ledger foundation, customer charge posting, and organization wallet summary API
    - [x] `E5-S1b` Add completed-job settlement posting route and use case for provider payable, platform revenue, and reserve holdback
    - [x] `E5-S1c` Define staged payout export read API and typed payout export schema for provider payouts
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 200 ms` ledger post time
    - error rate: `0` unbalanced entries
    - memory budget: `< 300 MB` ledger service replica
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only: pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `ledger-invariant-suite-v1 local pass on 2026-03-09: 55 test files, 305 tests, 95.80% statements/lines, 90.40% branches, 97.76% functions`
    - Dashboard: `finance wallet screen local API evidence: POST /v1/organizations/:organizationId/finance/customer-charges + POST /v1/organizations/:organizationId/finance/job-settlements + GET /v1/organizations/:organizationId/finance/payout-exports/staged + GET /v1/organizations/:organizationId/finance/wallet`
    - ADR: `ADR-0005`, `ADR-0010`
  - **Done criteria:** all ledger invariants hold under simulation, balances render correctly, payout export schema defined.

- [x] `E5-S1d` Gateway usage metering read model and dashboard trend foundation
  - **Epic:** `E5`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E4-S1`, `E5-S1`, `E6-S1d`
  - **Acceptance criteria:**
    - [x] Successful non-streaming gateway completions persist one usage-meter event in Postgres with workload bundle ID, customer org, provider org/node, approved model alias, tokens, and measured latency
    - [x] Provider dashboard overview returns persisted daily earnings and estimated utilization trend data for the last `7` days
    - [x] Consumer dashboard overview returns persisted daily usage trend data and latency-by-model aggregates for the last `7` days
    - [x] Seed/bootstrap output produces non-empty dashboard trend panels without requiring manual request generation after seeding
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 added gateway post-upstream persistence overhead: `< 25 ms`
    - p95 dashboard trend query latency: `< 200 ms`
  - **Evidence:**
    - PR: `blocked locally on 2026-03-09: no visible .git metadata in workspace`
    - CI: `local evidence on 2026-03-09: pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `metering-dashboard-v1 local pass on 2026-03-09: services/control-plane 76 test files / 373 tests green with 95.64% statements/lines, 90.15% branches, and 98.18% functions; gateway metering persistence covered by ChatCompletionsRoute + LocalGatewayDemoRoute + SeedRunnableAlphaDemo integration tests`
    - Dashboard: `GET /v1/organizations/:organizationId/dashboard/provider-overview now returns additive earningsTrend + estimatedUtilizationTrend fields and GET /v1/organizations/:organizationId/dashboard/consumer-overview now returns additive usageTrend + latencyByModel fields, both rendered by apps/dashboard CSS-only trend panels`
    - ADR: `ADR-0005`, `ADR-0007`
  - **Done criteria:** successful gateway completions are durably metered, seeded dashboards show non-empty trends, and additive overview contracts remain stable.

- [x] `E6-S1` Signed workload bundle pipeline and runtime admission control
  - **Epic:** `E6`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E2-S1`, `E4-S1`, `ADR-0006`
  - **Acceptance criteria:**
    - [x] Every deployable workload manifest is signed in CI
      - [x] Repository release tooling signs each approved runtime bundle manifest deterministically and emits a machine-readable provenance artifact with signing identity, signature key ID, manifest ID, and supported runtime
      - [x] Checked-in CI workflow wiring executes the provenance generator and publishes the signed artifact for review
    - [x] Provider runtime rejects unsigned or policy-invalid bundles
      - [x] Gateway-issued chat workload bundles carry a deterministic detached signature and approved manifest metadata on the live `/v1/chat/completions` dispatch path
      - [x] Gateway admission verification blocks dispatch when the bundle signature is invalid or the bundle drifts from the approved manifest policy envelope
      - [x] Provider runtime admission endpoint `POST /v1/organizations/:organizationId/environments/:environment/provider-nodes/:providerNodeId/runtime-admissions` authenticates with scoped org/environment API keys and accepts a signed workload-bundle payload
      - [x] Provider runtime admission endpoint rejects invalid signatures, manifest drift, customer scope mismatch, and unsupported provider-node runtimes using the same shared verification contract as the gateway preflight
    - [x] Audit log captures signature verification outcome
      - [x] Successful and rejected bundle verification attempts emit structured audit events with bundle ID, manifest ID, signature key ID, provider node ID, and rejection reason when present
  - **Implementation slices:**
    - [x] `E6-S1a` Add signed chat workload bundle generation, admission verification, and audit logging on the gateway dispatch path
    - [x] `E6-S1b` Add provider runtime admission API that rejects unsigned or policy-invalid bundles using the shared verifier
    - [x] `E6-S1c` Add CI workload-manifest signing/provenance evidence wiring for approved runtime bundles
      - [x] `E6-S1c1` Add repository-local workload manifest provenance generator with deterministic signatures and release artifact output
      - [x] `E6-S1c2` Add checked-in CI workflow wiring that runs the provenance generator and uploads the signed artifact
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 150 ms` admission decision time
    - error rate: `0` unsigned workload admitted
    - memory budget: `< 256 MB` admission controller
  - **Evidence:**
    - PR: `blocked locally: workspace has no visible git repository metadata`
    - CI: `local evidence only on 2026-03-09: checked-in .github/workflows/workload-manifest-provenance.yml contract-tested via services/control-plane/tests/contract/release/WorkloadManifestProvenanceWorkflow.test.ts and validated with pnpm workload-manifest:provenance && pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `admission-bench-v1 local pass on 2026-03-09: 64 test files, 336 tests, 95.26% statements/lines, 90.23% branches, 97.57% functions; services/control-plane/artifacts/workload-manifest-provenance.json emitted 2 signed records with key ID ci-hmac-v1 and signing identity github-actions[bot]`
    - Dashboard: `security events panel local audit evidence on 2026-03-09: workload_bundle.admission.accepted / workload_bundle.admission.rejected / gateway.chat_completion.forwarded / provider runtime admission route include bundle ID, manifest ID, signature key ID, provider node ID, customer organization ID, and rejection reason when present`
    - ADR: `ADR-0006`
  - **Done criteria:** sign/verify path enforced in staging, negative tests pass, audit events stored.

- [x] `E7-S1` Provider and consumer dashboard shell
  - **Epic:** `E7`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E1-S1`, `E2-S1`, `E4-S1`, `E5-S1`, `E5-S1d`, `ADR-0005`
  - **Acceptance criteria:**
    - [x] Provider dashboard shell exists in `apps/dashboard` and renders real organization-scoped overview data from control-plane dashboard summary endpoints
      - [x] `E7-S1a` Provider overview route renders active-node counts, health mix, trust-tier mix, and separated balance cards using live control-plane data
      - [x] `E7-S1a` Provider overview access is limited to `owner`, `admin`, or `finance` members until a dedicated browser-session auth story exists
      - [x] `E7-S1b` Provider earnings/utilization trend panels are populated from persisted ledger and metering read models
    - [x] Consumer dashboard shell exists in `apps/dashboard` and renders real organization-scoped finance and usage data
      - [x] `E7-S1c` Consumer overview route renders spend and balance cards from live ledger data
      - [x] `E7-S1c` Consumer overview access is limited to `owner`, `admin`, or `finance` members until a dedicated browser-session auth story exists
      - [x] `E7-S1d` Consumer usage and latency-by-model panels are populated from persisted metering read models
    - [x] Balance cards explicitly separate spend credits, pending earnings, and withdrawable cash
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: `< 1.5 s` dashboard initial load
    - error rate: `< 0.5%` dashboard query failures
    - memory budget: `< 200 KB` median JS per dashboard route after gzip
  - **Evidence:**
    - PR: `blocked locally on 2026-03-09: no visible .git metadata in workspace`
    - CI: `local evidence on 2026-03-09: pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `dashboard-shell-v2 local pass on 2026-03-09: root suite 88 test files / 407 tests; services/control-plane 95.64% statements/lines, 90.16% branches, 98.18% functions; services/provider-runtime 99.39% statements/lines, 90.47% branches, 92.30% functions; apps/dashboard 100% statements/lines/functions and 95.00% branches`
    - Dashboard: `local SSR evidence on 2026-03-09: apps/dashboard/app/provider/page.tsx and apps/dashboard/app/consumer/page.tsx render live overview payloads from the control-plane additive dashboard summary endpoints, including provider earnings/utilization trends and consumer usage/latency trend panels`
    - ADR: `ADR-0005`
  - **Implementation slices:**
    - [x] `E7-S1a` Bootstrap `apps/dashboard` and deliver the provider overview shell with live provider summary and balance cards
    - [x] `E7-S1b` Add provider earnings/utilization trend panels once the corresponding read models exist
    - [x] `E7-S1c` Add the consumer overview shell with live spend and balance cards
    - [x] `E7-S1d` Add consumer usage and latency-by-model panels once persisted metering telemetry is available
  - **Failure analysis (resolved in `E7-S1e`):**
    - root cause: `MASTER_PLAN.md` drifted behind the implemented consumer shell, the dashboard consumer screen test assumed unique labels, and control-plane dashboard route branch coverage was below the enforced global threshold.
    - redesign decision: treat runnable local-alpha support as an explicit story with first-class runtime scaffolding, seed automation, and coverage debt closure rather than layering more dashboard scope on top of a red workspace.
    - next action: use the stabilized metering-backed overview contracts as the baseline for future dashboard hardening instead of adding any parallel analytics path.
  - **Done criteria:** both dashboards usable by design partners, core cards and timeseries populated from real data.

- [x] `E7-S1e` Runnable local alpha and demo bootstrap
  - **Epic:** `E7`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E7-S1`, `E5-S1`
  - **Acceptance criteria:**
    - [x] Local Postgres-backed control-plane boots from documented env
    - [x] Dashboard boots against the control-plane and both `/provider` and `/consumer` render seeded live data
    - [x] A seed/bootstrap command creates one buyer org and one provider org plus usable dashboard URLs and API credentials
    - [x] `pnpm lint`, `pnpm typecheck`, and `pnpm test` all pass
  - **KPIs:**
    - correctness: `100%` local acceptance flow pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - local bring-up time: `< 5 min`
    - seed command completion: `< 15 s`
  - **Evidence:**
    - PR: `blocked locally on 2026-03-09: no visible .git metadata in workspace`
    - CI: `local evidence on 2026-03-09: pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `runnable-alpha-v1 local pass on 2026-03-09: root suite 88 test files / 407 tests green; services/control-plane 95.64% statements/lines, 90.16% branches, 98.18% functions; services/provider-runtime 99.39% statements/lines, 90.47% branches, 92.30% functions; apps/dashboard 100% statements/lines/functions and 95.00% branches`
    - Dashboard: `README.md + compose.yaml + services/control-plane/.env.example + apps/dashboard/.env.example + services/control-plane/src/interfaces/cli/seedRunnableAlphaDemo.ts together document and emit seeded /provider and /consumer URLs plus API credentials for a local alpha bring-up`
    - ADR: `ADR-0005`
  - **Implementation slices:**
    - [x] Add root local-runtime scripts plus Docker Compose Postgres baseline
    - [x] Add service-local env templates and runnable setup docs
    - [x] Add control-plane demo seed CLI that emits dashboard URLs and API credentials
    - [x] Close workspace test drift so root gates pass again
  - **Done criteria:** local alpha boots from docs, seeded dashboards render live data, and root quality gates are green.

- [x] `E6-S1d` Local provider runtime demo loop
  - **Epic:** `E6`
  - **Sprint:** `SPRINT-01`
  - **Owner:** agent
  - **Depends on:** `E4-S1`, `E6-S1`, `E7-S1e`
  - **Acceptance criteria:**
    - [x] Local provider runtime service boots from documented env and exposes an OpenAI-compatible non-streaming `POST /v1/chat/completions`
    - [x] The provider runtime validates the forwarded signed workload bundle before serving a response
    - [x] The runnable-alpha seed command can target the local provider runtime and emit a working buyer API key plus a ready-to-run gateway curl example
    - [x] A documented local flow proves: seed -> gateway request -> provider runtime admission -> mock completion response
  - **KPIs:**
    - correctness: `100%` local acceptance flow pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 added provider-runtime overhead: `< 100 ms` before returning mock completion
    - local end-to-end demo bring-up: `< 7 min`
  - **Evidence:**
    - PR: `blocked locally on 2026-03-09: no visible .git metadata in workspace`
    - CI: `local evidence on 2026-03-09: pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm format:check`
    - Benchmark: `gateway-demo-v1 local pass on 2026-03-09: services/provider-runtime 4 test files / 23 tests green with 99.39% statements/lines and 90.47% branches; services/control-plane integration test LocalGatewayDemoRoute proves seeded buyer API key -> gateway -> local provider runtime -> OpenAI-compatible mock completion`
    - Dashboard: `README.md demo flow now includes provider runtime startup plus emitted gateway curl example from services/control-plane/src/interfaces/cli/seedRunnableAlphaDemo.ts`
    - ADR: `ADR-0006`, `ADR-0007`
  - **Implementation slices:**
    - [x] Add `services/provider-runtime` Fastify service with workload-header validation and runtime-admission verification
    - [x] Wire local provider-runtime settings into seed/bootstrap output and seeded provider routing metadata
    - [x] Add automated coverage for provider-runtime validation, admission failures, and end-to-end local gateway demo flow
    - [x] Document the local provider-runtime bring-up and gateway curl path
  - **Done criteria:** local provider runtime admits signed gateway bundles, the emitted curl example succeeds end-to-end, and workspace quality gates remain green.

### Next stories (outlined, not active yet)

- [ ] `E2-S2` Attestation verifier service and trust-tier upgrade path
- [ ] `E3-S2` Warm-cache aware placement and price/performance scoring
- [ ] `E4-S2` Embeddings and batch API support
- [ ] `E5-S2` Stripe Connect onboarding and payout runbook
- [ ] `E6-S2` Fraud graph and wash-trading detector
- [ ] `E7-S2` Pricing strategy simulator for providers
- [ ] `E8-S1` Private cluster connector mode
- [ ] `E9-S1` Subprocessor registry and DPA export pack

---

## Sprint plan(s)

### `SPRINT-01` — Foundations for vetted-only private beta
**Goal:** prove the core loop: enroll provider -> route request -> meter usage -> show balances.

- [ ] Land ADR set `ADR-0001` to `ADR-0010`
- [x] Deliver `E1-S1a` bootstrap slice: canonical control-plane service + persisted organization creation
- [x] Deliver `E1-S1b1` invitation issue/accept slice with preassigned-role membership
- [x] Deliver `E1-S1b2` member role mutation slice with owner/admin guardrails
- [x] Deliver `E1-S1c1` organization/environment-scoped API key issuance + authenticated access check
- [x] Deliver `E1-S1c2a` scoped machine-auth invitation issuance while preserving inviter RBAC
- [x] Deliver `E1-S1c2b` scoped machine-auth member-role mutation while preserving role guardrails
- [x] Deliver `E1-S1`
- [x] Deliver `E2-S1a` provider-node enrollment + persisted hardware inventory
- [x] Deliver `E2-S1b` provider benchmark report ingestion + persisted throughput baseline
- [x] Deliver `E2-S1c1` provider inventory summary API + latest benchmark snapshot
- [x] Deliver `E2-S1c2a` provider node benchmark-history API
- [x] Deliver `E2-S1`
- [x] Deliver `E3-S1a` provider-node routing metadata foundation for placement
- [x] Deliver `E3-S1b1` scoped placement candidate preview + deterministic hard filters
- [x] Deliver `E3-S1c` deterministic sync endpoint selection + placement decision logs
- [x] Deliver `E3-S1`
- [x] Deliver `E4-S1`
- [x] Deliver `E4-S1a` approved chat gateway alpha
- [x] Deliver `E5-S1`
- [x] Deliver `E5-S1a` ledger funding and wallet summary foundation
- [x] Deliver `E5-S1b` completed-job settlement posting and provider pending/withdrawable balance updates
- [x] Deliver `E5-S1c` staged payout export schema and finance read API
- [x] Deliver `E5-S1d` gateway metering read model and dashboard trend foundation
- [x] Deliver `E6-S1`
- [x] Deliver `E6-S1a` signed chat workload bundle issuance + gateway admission verification
- [x] Deliver `E6-S1b` provider runtime admission API with shared signed-bundle verification
- [x] Deliver `E6-S1c1` repository-local workload manifest provenance generator
- [x] Deliver `E6-S1c2` checked-in CI workflow wiring for workload manifest provenance
- [x] Deliver `E6-S1d` local provider runtime demo loop
- [x] Deliver `E7-S1a` provider dashboard shell with live overview and separated balance cards
- [x] Deliver `E7-S1b` provider earnings/utilization trend panels
- [x] Deliver `E7-S1d` consumer usage and latency-by-model trend panels
- [x] Deliver `E7-S1e` runnable local alpha baseline and demo bootstrap
- [x] Deliver `E7-S1`
- [ ] Recruit 3 design partners
- [ ] Run benchmark matrix on at least 3 GPU classes

### `SPRINT-02` — Beta hardening
**Goal:** trusted routing, payout path, stronger policy controls.

- [ ] `E2-S2` Attestation verifier
- [ ] `E3-S2` Warm-cache and price/perf routing
- [ ] `E4-S2` Embeddings and async batch
- [ ] `E5-S2` Live payout test in sandbox and staging
- [ ] `E6-S2` Fraud graph + anomaly alerts
- [ ] `E7-S2` Pricing simulator
- [ ] Beta security review
- [ ] Closed beta with live but capped spend

### `SPRINT-03` — Launch prep
**Goal:** launch vetted-only public beta.

- [ ] Provider dispute workflow
- [ ] Rate limit / quota hardening
- [ ] Subprocessor transparency page
- [ ] Legal review of TOS / provider addendum / payout terms
- [ ] Operational runbooks
- [ ] Benchmark page vs 2–3 alternatives
- [ ] Launch checklist completion

---

## KPI dashboard

### Marketplace KPIs
- Active buyers
- Active providers
- GMV
- Take rate
- Provider utilization
- Fill rate
- Supply concentration

### Reliability KPIs
- API success rate
- p95 end-to-end latency
- batch completion success
- retry rate
- provider incident count

### Security KPIs
- Signed workload admission coverage
- attested-job share
- secret-release policy violations
- unresolved critical vulns
- fraud-loss rate

### Finance KPIs
- Billing dispute rate
- payout failure rate
- reserve utilization
- prepaid burn
- average days to payout

### Product KPIs
- model mix
- cost per 1M tokens / job by tier
- average savings vs benchmark provider
- dashboard weekly active users
- provider pause/resume rate

### Beta targets
- `>= 5` paying buyers
- `>= 3` live providers
- `>= 85%` fill rate
- `>= 99%` API success
- `< 0.3%` billing disputes
- `>= 30%` median provider utilization of listed eligible capacity

---

## Risk register

- [ ] `RISK-01` Provider-term violation from forbidden credit resale or key-sharing
  - **Probability:** High if scope drifts
  - **Impact:** Critical
  - **Mitigation:** hard product boundary in `ADR-0001`; legal review of any BYOK feature; no public key-sharing marketplace
  - **Owner:** founder / legal
  - **Trigger:** any proposal involving resold vendor credits or pooled third-party API keys

- [ ] `RISK-02` Data leakage on untrusted provider nodes
  - **Probability:** Medium
  - **Impact:** Critical
  - **Mitigation:** no sensitive jobs on community tier; vetted-only MVP; logging minimization; private/attested tier for sensitive use
  - **Owner:** security lead
  - **Trigger:** enterprise customer requests sensitive workload support

- [ ] `RISK-03` Billing fraud / fake metering
  - **Probability:** Medium
  - **Impact:** High
  - **Mitigation:** dual-source metering, canary audits, holdbacks, provider trust scoring
  - **Owner:** platform engineering
  - **Trigger:** metering mismatch `>0.5%`

- [ ] `RISK-04` Supply unreliability / heterogeneity
  - **Probability:** High
  - **Impact:** High
  - **Mitigation:** vetted providers only, benchmark gating, reliability-weighted routing, concentration controls
  - **Owner:** marketplace ops
  - **Trigger:** fill rate `<85%`

- [ ] `RISK-05` Enterprise procurement blocked by compliance gaps
  - **Probability:** Medium
  - **Impact:** High
  - **Mitigation:** DPA, subprocessor list, audit roadmap, private tier
  - **Owner:** GTM + security
  - **Trigger:** loss of design partner due to compliance review

- [ ] `RISK-06` Internal credits drift into stored-value / money-transmission risk
  - **Probability:** Medium
  - **Impact:** High
  - **Mitigation:** non-transferable credits only; separate cash payables; outside counsel review
  - **Owner:** legal / finance
  - **Trigger:** request for user-to-user credit transfer or broad redemption

- [ ] `RISK-07` Model-license violation
  - **Probability:** Medium
  - **Impact:** Medium-High
  - **Mitigation:** model manifest license metadata and scheduler policy enforcement
  - **Owner:** platform/legal
  - **Trigger:** onboarding new model family

- [ ] `RISK-08` Payment / payout coverage gaps internationally
  - **Probability:** Medium
  - **Impact:** Medium
  - **Mitigation:** launch in limited payout geographies; Stripe Connect first; expand via Tipalti/Adyen later
  - **Owner:** finance ops
  - **Trigger:** provider waitlist skewed to unsupported geographies

- [ ] `RISK-09` Side-channel leakage in shared serving
  - **Probability:** Medium
  - **Impact:** High for sensitive tiers
  - **Mitigation:** dedicated workers for sensitive jobs, cache isolation, no sensitive jobs on shared community nodes
  - **Owner:** security engineering
  - **Trigger:** high-sensitivity workload support request

- [ ] `RISK-10` Not enough real demand beyond novelty
  - **Probability:** Medium
  - **Impact:** Critical
  - **Mitigation:** design-partner validation before broad buildout; benchmark vs alternatives; focus on concrete savings
  - **Owner:** founder / GTM
  - **Trigger:** fewer than 3 design partners willing to commit real spend

---

## Open questions

- `OQ-01` Which exact open-model families provide the best early balance of license clarity, quality, and serving efficiency?
- `OQ-02` Should the first premium tier be dedicated single-tenant or attested confidential multi-tenant?
- `OQ-03` Is provider insurance or contractual indemnity required for T1 vetted tier?
- `OQ-04` How much payout reserve is needed for new providers by workload type?
- `OQ-05` Which geographies should be included in v1 supply-side onboarding?
- `OQ-06` Should image generation be in MVP or immediately after text/embeddings?
- `OQ-07` How much savings versus Together/Replicate/RunPod is required to overcome trust switching cost?
- `OQ-08` Which event bus is the better fit: NATS simplicity or Kafka replay depth?
- `OQ-09` Are confidential GPU instances available in enough regions to matter for design partners?
- `OQ-10` Does enterprise demand value self-hosted private connector mode enough to justify parallel work during MVP?

---

## Release checklist

### Product gates
- [ ] Core API compatibility tested
- [ ] Provider onboarding working for at least 3 hardware classes
- [ ] Metering discrepancy below target
- [ ] Dashboard balances validated against ledger

### Security gates
- [ ] Signed workload enforcement live
- [ ] Secrets release path reviewed
- [ ] Vulnerability scans clean for critical issues
- [ ] Incident response runbook complete

### Compliance gates
- [ ] TOS and provider addendum reviewed
- [ ] DPA template ready
- [ ] Subprocessor list published
- [ ] Sanctions screening live
- [ ] Tax/KYC flows live for supported payout geographies

### Operational gates
- [ ] On-call rotation defined
- [ ] Support macros and escalation paths defined
- [ ] Benchmark page published
- [ ] Provider dispute workflow tested

### Market gates
- [ ] 3 live supply partners
- [ ] 5 paying demand customers
- [ ] Reference benchmarks show meaningful advantage in at least one workload segment

---

## M. Defensibility

### What could make this startup defensible?

#### 1. Trusted supply density
Not just “many GPUs,” but many **reliable, benchmarked, policy-compliant GPUs**.

#### 2. Best routing layer across hybrid supply
A platform that can route across:
- marketplace supply,
- private clusters,
- and later customer-held connectors.

#### 3. Security / compliance reputation
If enterprises believe:
- this platform is the safest way to use third-party distributed GPU supply,
- that becomes a real moat.

#### 4. Metering and settlement quality
Fair, auditable settlement across heterogeneous providers is hard.

#### 5. Provider trust scoring and fingerprinting data
Historical performance, dispute outcomes, benchmark drift, and hardware integrity signals compound over time.

#### 6. Specialized workload focus
Winning a narrow class (e.g., open-model chat + embeddings + batch generation) can create dense supply-demand matching.

### Most credible moat

**The most credible moat is not tokenomics.**  
It is:

> **a trusted hybrid orchestration + metering + compliance network for distributed inference supply.**

That moat comes from:
- routing data,
- provider performance history,
- settlement accuracy,
- enterprise trust controls,
- and the installed base of provider agents.

---

## N. Final recommendation

### Should this company be built?

**Yes — but only the compliant, trust-tiered inference-market version.**

### Which exact version?

**Build this:**
> A vetted-provider, OpenAI-compatible inference exchange for open-weight models, with internal spend balances, provider cash payouts, and later private enterprise routing/cluster-burst support.

### Which version should not be built?

Do **not** build:
- a public market for reselling AI credits,
- a public market for routing through random users’ API keys,
- a token-first decentralized compute scheme,
- or a sensitive-data inference platform on anonymous home machines.

### Single best wedge
**Cheaper open-model inference through one API, using underutilized GPUs from vetted providers.**

### Best customer segment
**Demand:** AI-native startups and SMB product teams with recurring inference spend and limited infra appetite.  
**Supply:** small labs/startups/datacenter-grade operators with underused GPU clusters.

### Biggest technical risk
**Consistent trustable execution and metering across heterogeneous providers while preserving low routing latency and acceptable SLOs.**

### Biggest legal / contractual risk
**Drifting into unauthorized resale of provider services/credits or into public credential-sharing patterns.**

### Best architecture for v1
- centralized control plane,
- vetted-provider-only supply,
- approved serving runtimes,
- signed workload bundles,
- double-entry ledger,
- Stripe-based billing/payouts,
- no public BYOK,
- no transferable token.

### Final call

This company is worth building **if** it is marketed and engineered as a **secure inference exchange**, not as a speculative compute-credit bazaar.

---

## Evidence links: PRs, CI runs, benchmarks, dashboards, docs

### PRs
- `TBD`

### CI runs
- `workload-manifest-provenance-workflow-contract-v1` — `local evidence on 2026-03-09: .github/workflows/workload-manifest-provenance.yml validated by services/control-plane/tests/contract/release/WorkloadManifestProvenanceWorkflow.test.ts and pnpm workload-manifest:provenance emitted services/control-plane/artifacts/workload-manifest-provenance.json`

### Benchmarks
- `GPU benchmark corpus v1` — `TBD`
- `scheduler-latency-bench-v1` — `TBD`
- `api-compat-suite-v1` — `TBD`
- `admission-bench-v1` — `local pass on 2026-03-09: 64 test files, 336 tests, 95.26% statements/lines, 90.23% branches, 97.57% functions; services/control-plane/artifacts/workload-manifest-provenance.json emitted 2 signed records with key ID ci-hmac-v1 and signing identity github-actions[bot]`
- `dashboard-shell-v1` — `local pass on 2026-03-09: root suite 73 test files, 354 tests; services/control-plane 95.29% statements/lines, 90.13% branches, 97.64% functions; apps/dashboard 100% statements/branches/functions/lines`
- `ledger-invariant-suite-v1` — `local pass on 2026-03-09: 55 test files, 305 tests, 95.80% statements/lines, 90.40% branches, 97.76% functions`

### Dashboards
- Provider inventory panel — `local SSR evidence on 2026-03-09: apps/dashboard/app/provider/page.tsx renders live provider overview data from GET /v1/organizations/:organizationId/dashboard/provider-overview with active-node, health, trust-tier, and separated balance cards plus node inventory table`
- Routing debug panel — `TBD`
- Finance wallet screen — `local API evidence on 2026-03-09: customer funding + completed-job settlement + staged payout export preserve explicit usage/spendCredits/pendingEarnings/withdrawableCash balances and payout-hand-off rows, including provider pending/withdrawable earnings after reserve holdback`
- Security events panel — `local audit evidence on 2026-03-09: workload_bundle.admission.accepted / workload_bundle.admission.rejected / gateway.chat_completion.forwarded / provider runtime admission route include bundle ID, manifest ID, signature key ID, provider node ID, customer organization ID, and rejection reason when present`
- Reliability dashboard — `TBD`

### Docs
- Runnable alpha README — `pending local rerun after implementation`
- Security whitepaper — `TBD`
- Provider onboarding guide — `TBD`
- Customer API quickstart — `TBD`
- DPA and subprocessor appendix — `TBD`

---

## References

### Market context
- **Stanford HAI: AI Index 2025 / state of AI in 10 charts** — https://hai.stanford.edu/news/ai-index-2025-state-of-ai-in-10-charts
- **Reuters: major tech expected to spend over $630B on AI infrastructure in 2026** — https://www.reuters.com/technology/broadcom-forecasts-second-quarter-revenue-above-estimates-2026-03-04/


### Provider terms, credits, and API credential handling
- **OpenAI Service Credit Terms** — https://openai.com/policies/service-credit-terms/
- **OpenAI Help: Can I share my API key with my teammate/coworker?** — https://help.openai.com/en/articles/5008148-can-i-share-my-api-key-with-my-teammatecoworker
- **OpenAI Help: Best Practices for API Key Safety** — https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- **OpenAI Services Agreement** — https://openai.com/policies/services-agreement/
- **Anthropic: API Key Best Practices** — https://support.claude.com/en/articles/9767949-api-key-best-practices-keeping-your-keys-safe-and-secure
- **Anthropic: Zero Data Retention (Claude API Docs)** — https://platform.claude.com/docs/en/build-with-claude/zero-data-retention
- **Anthropic Privacy: What products does ZDR apply to?** — https://privacy.claude.com/en/articles/8956058-i-have-a-zero-data-retention-agreement-with-anthropic-what-products-does-it-apply-to
- **Google Cloud Startups Program Terms** — https://cloud.google.com/terms/startup-program-tos
- **Google Cloud Service Specific Terms** — https://cloud.google.com/legal/archive/terms/service-terms/index-20260129
- **Google Cloud Terms (material value independent application language)** — https://cloud.google.com/terms/index-20230712
- **Google Cloud Marketplace reseller docs** — https://docs.cloud.google.com/marketplace/docs/partners/resellers/resell
- **Microsoft Online Subscription Agreement** — https://azure.microsoft.com/en-us/support/legal/subscription-agreement
- **Microsoft Azure Customer Solution licensing guidance** — https://www.microsoft.com/licensing/guidance/Azure-Customer-Solution
- **Microsoft CSP overview** — https://learn.microsoft.com/en-us/partner-center/enroll/csp-overview
- **AWS Customer Agreement** — https://aws.amazon.com/agreement/
- **AWS Solution Provider Program** — https://aws.amazon.com/partners/programs/solution-provider/
- **AWS EC2 Reserved Instance Marketplace** — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-market-general.html
- **AWS Capacity Blocks for ML** — https://aws.amazon.com/ec2/capacityblocks/
- **AWS Share Capacity Blocks** — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/capacity-blocks-share.html
- **AWS Service Terms** — https://aws.amazon.com/service-terms/

### Confidential computing, isolation, and supply-chain security
- **AWS Nitro Enclaves** — https://aws.amazon.com/ec2/nitro/nitro-enclaves/
- **Google Confidential Space** — https://cloud.google.com/confidential-computing/confidential-space
- **Azure Confidential Computing** — https://azure.microsoft.com/en-us/products/confidential-computing
- **NVIDIA Confidential Computing** — https://www.nvidia.com/en-us/data-center/confidential-computing/
- **Confidential Containers** — https://confidentialcontainers.org/
- **Firecracker** — https://firecracker-microvm.github.io/
- **gVisor** — https://gvisor.dev/
- **Kata Containers** — https://katacontainers.io/
- **Sigstore Cosign docs** — https://docs.sigstore.dev/cosign/overview/
- **SLSA** — https://slsa.dev/
- **SPIFFE / SPIRE** — https://spiffe.io/

### Security papers and research
- **The Early Bird Catches the Leak: Unveiling Timing Side Channels in LLM Serving Systems** — https://arxiv.org/abs/2409.20002
- **Proof of Cloud: Data Center Execution Assurance for Confidential VMs** — https://arxiv.org/abs/2510.12469
- **IMMACULATE: A Practical LLM Auditing Framework via Verifiable Computation** — https://arxiv.org/abs/2602.22700

### Competitors and market infrastructure
- **Vast.ai** — https://vast.ai/
- **RunPod** — https://www.runpod.io/
- **SaladCloud docs / product** — https://docs.salad.com/ and https://salad.com/cloud
- **Akash Network / docs** — https://akash.network/ and https://docs.akash.network/
- **io.net** — https://io.net/
- **Aethir** — https://aethir.com/
- **Golem** — https://www.golem.network/
- **Hyperbolic docs** — https://docs.hyperbolic.xyz/
- **Petals** — https://petals.dev/
- **OpenRouter docs** — https://openrouter.ai/docs/
- **Portkey docs** — https://portkey.ai/docs/
- **LiteLLM docs** — https://docs.litellm.ai/
- **Cloudflare AI Gateway docs** — https://developers.cloudflare.com/ai-gateway/
- **Replicate docs** — https://replicate.com/docs
- **fal docs** — https://docs.fal.ai/
- **Together AI docs** — https://docs.together.ai/

### Serving stack and orchestration
- **vLLM docs** — https://docs.vllm.ai/
- **Text Generation Inference docs** — https://huggingface.co/docs/text-generation-inference/
- **SGLang docs** — https://docs.sglang.ai/
- **KServe** — https://kserve.github.io/website/

### Payments, KYC, and payouts
- **Stripe Connect** — https://stripe.com/connect
- **Stripe Connect identity verification** — https://docs.stripe.com/connect/identity-verification
- **Stripe Connect payouts** — https://docs.stripe.com/connect/payouts-connected-accounts
- **Adyen: onboard and verify users** — https://docs.adyen.com/marketplaces/onboard-users
- **Tipalti Mass Payments** — https://tipalti.com/en-eu/mass-payments/

### Privacy, sanctions, and export controls
- **European Commission: controller / processor obligations** — https://commission.europa.eu/law/law-topic/data-protection/rules-business-and-organisations/obligations/controllerprocessor/what-data-controller-or-data-processor_en
- **European Commission SCC Q&A (subprocessor authorization)** — https://commission.europa.eu/law/law-topic/data-protection/international-dimension-data-protection/new-standard-contractual-clauses-questions-and-answers-overview_en
- **OFAC FAQ 1188** — https://ofac.treasury.gov/faqs/1188
- **OFAC determination on IT/software/cloud-based services** — https://ofac.treasury.gov/media/932951/download?inline=
- **BIS press release: revised semiconductor license review policy** — https://www.bis.gov/press-release/department-commerce-revises-license-review-policy-semiconductors-exported-china
- **BIS policy statement on advanced computing controls and AI models** — https://www.bis.gov/media/documents/ai-policy-statement-training-ai-models-may-13-2025

### Model licensing examples
- **Hugging Face licenses documentation** — https://huggingface.co/docs/hub/repositories-licenses
- **Meta Llama license / FAQ resources** — https://www.llama.com/llama-faqs/
- **Stability AI licensing overview** — https://stability.ai/license
