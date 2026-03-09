# AGENTS.md
This project optimizes for correctness, clarity, maintainability, observability, and measurable product outcomes. Favor durable system design over rapid partial delivery. Do not ship work that only appears to work.

## Order of priorities

1. Correctness
2. Architecture quality
3. Deterministic safety boundaries and evaluation
4. Operational visibility
5. Performance
6. Delivery speed

## Source-of-truth files

- `MASTER_PLAN.md` — current product, architecture, story, KPI, risk, and implementation-spec source of truth.
- `AGENTS.md` — repository operating contract and planning rules.
- `docs/adr/` — architecture decision records once exported from the ADR index in `MASTER_PLAN.md`.
- `README.md` — setup and high-level repository overview once the bootstrap stories create it.
- the canonical service-local `src/` and `tests/` trees defined by `MASTER_PLAN.md` — executable source of truth once implementation begins.
- The autonomy matrix, promotion ladder, runtime state machine, policy-resolution rules, skill registry contract, evaluator contract, and memory policy in `MASTER_PLAN.md` are binding implementation constraints until exported into code and ADRs.

If plan, code, and docs disagree, reconcile them immediately. Never leave drift behind.

## Non-negotiables

- Write thoughtful, modular, object-oriented code.
- Write the minimum intentional code needed for the task. Prefer established libraries, framework primitives, and existing repository utilities over custom implementations.
- The default product mode is autonomous execution with human supervision through mission control.
- UI work should prefer oversight, replay, exception handling, policy control, kill switches, and auditability over manual operational forms.
- Merchant-facing self-serve, white-label platformization, and external-tenant administration are not in v1 unless `MASTER_PLAN.md` changes.
- No fallbacks, no stubs, no demo paths, no placeholder implementations, no monkey patches, and no silent degradation in production code.
- Every feature must ship with repository-standard automated coverage and explicit numerical KPIs.
- Every task must be tracked in `MASTER_PLAN.md` under an epic, a story, and a sprint.
- Do not mark work done until code, tests, docs, observability, and review evidence all exist.
- Prefer redesign over band-aids.
- Do not invent requirements. Record ambiguity in `MASTER_PLAN.md` and resolve it before implementation.

## What "thoughtful modular OOP" means here

- Model stable domain concepts as classes. Keep orchestration, policies, and infrastructure separated.
- Prefer composition over inheritance.
- Every class should have one clear reason to change.
- Depend on interfaces, protocols, or ABCs at boundaries; inject concrete implementations.
- Keep side effects at the edges. Core domain logic and safety-critical invariants should be deterministic and easy to unit test, while open-ended planning, recommendation, and selection logic may remain heuristic in bounded agent layers.
- Constructors must not perform hidden I/O, network access, or irreversible side effects.
- Avoid global state, circular imports, god objects, and hidden singletons.
- Use typed value objects for identifiers, limits, money, timestamps, config, and other domain primitives where it improves clarity.
- Keep modules small, cohesive, and navigable.
- Public APIs and external contracts must be explicit and versioned.
- Model agent skills, evaluators, and planners as first-class interfaces when the problem is judgment-heavy rather than purely algorithmic.

## What "no fallbacks / no stubs / no patches" means

- **No fallback** means no hidden alternate path that returns degraded, stale, guessed, default, or fake behavior in order to mask an incomplete implementation.
- **No stub** means no production code that pretends a feature exists when it does not.
- **No patch** means no local workaround that hides the root cause instead of fixing it.
- Legitimate resilience patterns like retries, circuit breakers, queues, or staged rollouts are allowed only when they are first-class design choices, fully tested, observable, documented, and tracked in `MASTER_PLAN.md` plus an ADR when significant.
- Never merge code that depends on “we will replace this later”.

## Architecture rules

### Required layering

Use a structure close to this unless the repository already has an intentionally different architecture:

```text
src/
  domain/          # entities, value objects, invariants, pure business rules
  application/     # use cases, services, workflows, policies
  infrastructure/  # db, cache, queue, files, external APIs, telemetry
  interfaces/      # HTTP, CLI, workers, schedulers, events
  config/          # typed settings and environment wiring
tests/
  unit/
  integration/
  contract/
  e2e/
docs/
  adr/
```

For this repository, apply that layered `src/` or `tests/` structure inside the canonical backend service defined in `MASTER_PLAN.md`, while keeping cross-surface end-to-end tests at the repository level.

### Architectural constraints

- `domain/` must not depend on frameworks, transports, or infrastructure details.
- `application/` coordinates use cases and depends inward on domain abstractions.
- `infrastructure/` implements boundaries and adapters, but does not own business rules.
- `interfaces/` translate external requests/events into application use cases.
- Significant architecture changes require an ADR in `docs/adr/`; until that directory exists, record the decision in the ADR index inside `MASTER_PLAN.md` and export it during the bootstrap stories.
- Any breaking change to an external contract requires:
  - an ADR,
  - an explicit migration plan,
  - compatibility tests,
  - release notes,
  - the correct semantic version bump.

### Design standards

- Explicitly model invariants instead of spreading validation across controllers, handlers, and SQL.
- Put heuristic and agentic behavior in bounded application-layer planners, routers, evaluators, and skill interfaces instead of encoding judgment tasks as sprawling deterministic rule trees.
- Prefer configuration and composition of mature libraries over handwritten infrastructure, parsers, validators, clients, or helpers.
- Do not wrap third-party libraries behind thin local abstractions unless the wrapper creates a real boundary, simplifies testing, or protects a stable domain contract.
- Invent new code only for domain-specific rules, orchestration, or boundary contracts that the existing stack cannot express cleanly.
- Prefer pure functions inside methods for business rules when they simplify reasoning.
- Keep I/O boundaries narrow and obvious.
- Make time, randomness, and external calls injectable so safety boundaries can be tested deterministically and heuristic behavior can be evaluated repeatably.
- Avoid metaprogramming and “magic” unless it creates clear, durable leverage.
- Avoid “util” dumping grounds. Name modules by domain or responsibility.
- Do not create parallel competing abstractions. Consolidate around one coherent model.

## Planning and execution

All work must exist in the root `MASTER_PLAN.md`.

### Required sections in `MASTER_PLAN.md`

- Product goal and problem statement
- Success metrics and non-goals
- Constraints and assumptions
- Architecture overview and ADR index
- Epic backlog
- Story backlog with acceptance criteria
- Sprint plan(s)
- KPI dashboard
- Risk register
- Open questions
- Release checklist
- Evidence links: PRs, CI runs, benchmarks, dashboards, docs

### Planning rules

- Every epic, story, sprint, risk, and ADR must have a stable ID.
  - Examples: `E1`, `E1-S3`, `SPRINT-02`, `RISK-04`, `ADR-0007`
- Use Markdown checkboxes for epics, stories, sprint tasks, and release gates.
- Do not implement untracked scope. Add it to `MASTER_PLAN.md` first.
- Keep current sprint and active stories near the top of the file.
- Every active story and every story entering the current sprint must include:
  - acceptance criteria,
  - numerical KPIs,
  - dependencies,
  - evidence links,
  - explicit done criteria.
- Future stories may remain outlined in sprint plans, but they must be promoted into the full story template before implementation starts.
- When requirements change, update `MASTER_PLAN.md` before updating code.
- Every heuristic or agentic story must explicitly define its action class, autonomy stage, evaluator datasets, freshness requirements, rollback path, and memory or retention class before implementation starts.
- When a KPI fails, leave the story unchecked and add a failure analysis subsection.

## Story template

Use this pattern inside `MASTER_PLAN.md`:

- [ ] `E?-S?` Story title
  - **Epic:** `E?`
  - **Sprint:** `SPRINT-??`
  - **Owner:** agent/human name
  - **Depends on:** story IDs, ADR IDs, or `none`
  - **Acceptance criteria:**
    - [ ] User-visible outcome 1
    - [ ] System behavior 2
    - [ ] Operational requirement 3
  - **KPIs:**
    - correctness: `100%` acceptance tests pass
    - changed-code coverage: `>= 90%`
    - critical-path coverage: `>= 95%`
    - type-check errors: `0`
    - lint/format violations: `0`
    - flaky reruns: `0 / 20`
    - p95 latency: feature-specific budget
    - error rate: feature-specific budget
    - memory budget: feature-specific budget
  - **Evidence:**
    - PR:
    - CI:
    - Benchmark:
    - Dashboard:
    - ADR:
  - **Failure analysis (only if needed):**
    - root cause:
    - redesign decision:
    - next action:

## Implementation workflow

1. Open `MASTER_PLAN.md` and select the current story.
2. Review relevant ADRs, constraints, and existing module boundaries.
3. Define or refine acceptance criteria and KPI budgets before writing code.
4. For heuristic work, lock the action class, autonomy stage, policy-resolution rules, freshness requirements, rollback path, skill contracts, evaluator datasets, and retention rules before designing code.
5. Design interfaces, domain objects, and data flow.
6. Implement the smallest complete vertical slice that satisfies the story.
7. Add or update tests alongside the implementation.
8. Run all required local quality gates.
9. Update docs, ADRs, and `MASTER_PLAN.md`.
10. Open or update the PR with evidence.
11. Only mark the story done after every gate passes.

## Testing policy

### Test strategy

- Use `Vitest` for unit and integration testing in the planned TypeScript services and `Playwright` for end-to-end and browser/API workflow testing.
- If Python support tooling is introduced later, test that Python code with `pytest`, but Python is not the primary application stack for this repository.
- Favor a healthy test pyramid:
  - many unit tests for core rules,
  - fewer integration tests for boundaries,
  - the smallest possible number of end-to-end tests for critical flows.
- Every feature must have tests at the right levels, not just “a test”.
- For critical logic, add property tests, contract tests, or benchmark tests when appropriate.
- For heuristic agentic logic, add evaluator datasets, skill-routing checks, and policy-boundary tests instead of expecting exact string outputs.
- Test behavior and contracts, not private implementation details.

### Repository test rules

- Use shared fixtures or test helpers for setup, not copy-pasted arrangement code.
- Use table-driven or parametrized tests for multi-case behavior.
- Register and document custom tags, projects, or markers used by the test runner.
- Keep tests deterministic: freeze time, inject randomness, isolate filesystem/network dependencies, and avoid arbitrary sleeps.
- For heuristic systems, make the evaluation harness deterministic even if the model behavior is not; validate schemas, rankings, policy decisions, and escalation behavior.
- Approval-required and bounded-auto paths need rollback tests, evaluator regression checks, and explicit assertions on autonomy-stage enforcement.
- Use real integrations in integration tests where practical.
- Use mocks/fakes only at explicit boundaries.
- No `skip` or `xfail` for unfinished work. The only acceptable exceptions are:
  - environment-specific constraints, or
  - third-party/external defects
  Both require a linked issue, an owner, and a removal date in `MASTER_PLAN.md`.
- If a test flakes once, treat that as a bug.

### Default minimum gates for every story

These are baseline gates. Add stricter feature-specific KPIs where needed.

- Full required test suite pass rate: `100%`
- Changed/new domain logic line coverage: `>= 90%`
- Security-, auth-, permissions-, finance-, serialization-, parser-, migration-, and safety-critical modules coverage: `>= 95%`
- Type-check errors on touched code: `0`
- Lint errors: `0`
- Format drift: `0`
- Flaky reruns for async/concurrency/timing/network-sensitive tests: `0 / 20`
- High or critical security findings in changed scope: `0`
- Performance regression on existing budgets: `<= 5%`
- Memory regression on existing budgets: `<= 5%`
- User-facing errors in acceptance environment: within explicit story budget

### When KPIs fail

If any acceptance test fails or any KPI is missed:

1. Stop adding surface-level fixes.
2. Re-evaluate the entire feature:
   - problem framing,
   - assumptions,
   - architecture,
   - data model,
   - interface design,
   - algorithmic choices,
   - failure modes,
   - observability,
   - test design.
3. Update `MASTER_PLAN.md` with failure analysis.
4. Write or update an ADR if the design needs to change.
5. Re-implement cleanly. Do not stack patches on top of a flawed design.

## Type safety and code quality

- Use strict typing on all new and modified TypeScript code.
- If Python support tooling is introduced, type that Python code as well.
- Touched modules should move toward stricter type checking, not away from it.
- Prefer precise types over `any` or untyped dictionaries.
- Public methods and functions must declare input and output types.
- Use typed settings objects for configuration.
- Define typed contracts for agent plans, skill inputs and outputs, evaluator results, and boundary-review decisions.
- Use domain-specific exceptions instead of generic catch-all errors where possible.
- Expose clear contracts in docstrings for public APIs.
- Remove dead code instead of leaving “for later” branches behind.
- Prefer explicit enums and value objects over magic strings and unvalidated dictionaries.

## Tooling baseline

If bootstrapping this repository according to `MASTER_PLAN.md`, standardize on:

- Node.js `20+`
- `TypeScript`
- `pnpm` or the repository-selected workspace package manager
- `Vitest` for unit and integration tests
- `Playwright` for end-to-end and browser/API workflow tests
- `ESLint` for linting
- `Prettier` for formatting
- `tsc --noEmit` for static typing

If the repository already has an established toolchain, follow the repository standard unless an ADR changes it.

### Suggested local gates

Run repository-specific equivalents as needed:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm format --check
pnpm typecheck
pnpm test
pnpm exec playwright test
```

## CI/CD and repository hygiene

- Main branches must be protected.
- No direct pushes to protected branches.
- Pull requests must require:
  - passing status checks,
  - at least one approving review,
  - resolved conversations.
- Use small, reviewable PRs linked to a story ID.
- Commit dependency lockfiles with dependency changes.
- Do not merge with red CI, skipped quality gates, or undocumented risk.
- Keep dev/staging/prod behavior as similar as practical.
- Do not rely on “latest” floating dependencies in critical systems.
- Produce reproducible builds where the pipeline supports them.
- Generate provenance, SBOMs, or other supply-chain evidence where available.

## Versioning and change history

- Use Semantic Versioning for externally consumed APIs, packages, and services.
- Use Conventional Commits for commit messages.
- Breaking changes must be explicit in both code and release notes.
- Every externally visible change must link back to a story and, when relevant, an ADR.

## Observability and operations

- Instrument production paths with traces, metrics, and structured logs.
- Define SLIs/SLOs for user-critical paths.
- No new production feature is complete without success and failure telemetry.
- Correlate logs with request, job, or trace identifiers.
- Record version/build metadata in deployable artifacts where practical.
- Dashboards and alerts must exist for critical services before declaring the feature done.
- Never log secrets, tokens, or sensitive personal data.
- Heuristic systems must emit plan traces, skill selections, evaluator results, escalation reasons, and policy-boundary outcomes.
- Heuristic systems must also emit autonomy-stage changes, boundary-review queue age, budget-guardrail failures, and context-snapshot retention events.

## Security and data handling

- Apply secure-by-design thinking during architecture, not only at test time.
- Use OWASP ASVS as a verification baseline for web-facing systems.
- Threat-model new external surfaces: auth, payments, uploads, webhooks, admin flows, background workers, data export, and cross-service communication.
- Validate all external input.
- Use least privilege for credentials, roles, and service accounts.
- Keep secrets out of source control.
- Use parameterized queries and safe serializers/parsers.
- Review authorization separately from authentication.
- Document data retention, deletion, and audit requirements when applicable.

## Documentation rules

- Until `README.md` exists, keep setup, runtime behavior, and public-interface guidance in `MASTER_PLAN.md`; once `README.md` exists, update it whenever those surfaces change.
- Create or update ADRs for significant design choices. If `docs/adr/` does not exist yet, record the decision in the ADR index in `MASTER_PLAN.md` and export it during the bootstrap stories.
- Keep `MASTER_PLAN.md` current at all times.
- Public modules and APIs should have clear documentation.
- Architecture diagrams are encouraged when they reduce ambiguity.
- Export autonomy policy, skill registry, evaluator, and retention contracts from `MASTER_PLAN.md` into versioned code or docs before treating the bootstrap phase as complete.

## Definition of Done

A story is done only when all of the following are true:

- The story exists in `MASTER_PLAN.md` and is fully described.
- The implementation is complete with no fallbacks, stubs, or patches.
- Acceptance criteria are satisfied.
- Required repository-standard automated tests exist and pass.
- KPI thresholds are met and recorded.
- Type checks, linting, and formatting are clean.
- Observability is in place.
- Heuristic features have evaluator coverage, skill-level telemetry, and bounded-autonomy policies recorded.
- Security requirements have been reviewed.
- Documentation is updated.
- ADRs are updated where needed.
- PR review is approved.
- Required CI checks are green.
- Evidence links are recorded in `MASTER_PLAN.md`.

## Redesign trigger

Immediately redesign instead of patching when any of the following is true:

- The feature only passes by adding a special-case workaround.
- The implementation violates an established module boundary.
- Tests are hard to write because the design is too coupled.
- The feature introduces flaky behavior.
- Performance misses the agreed budget.
- Error handling is hiding unknown states instead of modeling them.

## ADR template

Use this structure for `docs/adr/ADR-XXXX-title.md`:

```md
# ADR-XXXX: Title

## Status
Proposed | Accepted | Superseded

## Context
What problem are we solving? What constraints matter?

## Decision
What architecture decision are we making?

## Consequences
What do we gain, what do we trade off, and what changes next?

## Alternatives considered
What did we reject and why?
```

## Reference standards behind this file

These are the primary references that inform this operating model:

- [AGENTS.md format and usage](https://agents.md/)
- [OpenAI Codex `AGENTS.md` guidance](https://developers.openai.com/codex/guides/agents-md/)
- [`Vitest` documentation](https://vitest.dev/)
- [`Playwright` documentation](https://playwright.dev/)
- [Martin Fowler: The Practical Test Pyramid](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Google Testing Blog: Flaky Tests at Google and How We Mitigate Them](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [Scrum Guide](https://scrumguides.org/scrum-guide.html)
- [Architecture Decision Records (ADR) practice](https://github.com/joelparkerhenderson/architecture-decision-record)
- [OpenTelemetry observability guidance](https://opentelemetry.io/docs/)
- [TypeScript handbook](https://www.typescriptlang.org/docs/)
- [Semantic Versioning](https://semver.org/)
- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)
- [SLSA / supply-chain hardening](https://slsa.dev/)

When repository-specific instructions are missing, choose the option that best preserves correctness, clarity, and evidence.
