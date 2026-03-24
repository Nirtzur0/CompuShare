# Technical and Organizational Measures

## Access control

- Role-based organization access controls for owners, admins, developers, and finance users.
- Scoped organization API keys and runtime admission controls for machine access.
- Private connector execution grants with short expiry and explicit environment scoping.

## Security of processing

- Signed workload bundles and signed private execution grants for critical execution paths.
- Structured audit logging for dashboard access, private execution, payouts, and compliance export generation.
- Deterministic validation of control-plane input, route auth, and environment scope.

## Integrity and availability

- Postgres-backed control-plane state with explicit schema initialization.
- Health and trust state modeling for provider nodes and private connectors.
- Explicit no-fallback routing semantics for private connector execution.

## Confidentiality

- No platform-stored customer BYOK secrets in private connector mode.
- Secrets are kept out of source control and required from runtime environment configuration.
- Compliance exports are generated from repo-tracked legal markdown plus typed registry/config data only.

## Monitoring and incident handling

- Structured logs and audit events for security-relevant feature access.
- Deterministic export generation and repo-tracked legal sources to reduce undocumented drift.
- Control-plane startup validation for required compliance configuration.
