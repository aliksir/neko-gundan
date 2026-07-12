# Post-Change Verification

> Companion rule for completion gate #3. Ensures config/infra changes actually achieve the goal.
> Introduced 2026-06-21 after 4 incidents: schtasks detection miss, cron not executing, httpd config not applied, DNS propagation unchecked.

## Principle

### 1. Define success from the goal (Plan-Time)

At planning time, derive **end-user-visible success states** from the task goal. Write them as acceptance criteria.

**"Config is in place" is not success. "Expected result is produced" is success.**

The distinction matters because config can be correct yet non-functional (wrong timing, service not reloaded, network blocked, dependency missing). Confirming the config only proves the means; confirming the result proves the goal.

| Task | Means confirmation (wrong) | Goal confirmation (right) |
|------|---------------------------|--------------------------|
| Set up a cron job | `crontab -l` shows the entry | Output file/log appears after execution time |
| Deploy a web app | Config file updated, service restarted | The page loads in a browser at the expected URL |
| Register a scheduled task | Task shows "Ready" in the scheduler | The task's output is produced at the scheduled time |
| Add a firewall rule | Rule appears in the security group list | External client can connect on the opened port |
| Install an SSL certificate | Certificate tool reports success | Browser shows lock icon with correct domain, no warnings |

Write acceptance criteria using the **right column**, not the left:

```markdown
## Acceptance Criteria
| # | Goal | Success State | Verification |
|---|------|---------------|-------------|
| 1 | Nightly batch job | Logs generated after scheduled time, data in DB | Log dir exists + SELECT count |
| 2 | Admin panel access | Login page loads in browser at expected URL | Browser check or curl 200 |
| 3 | Scheduled report | output/YYYYMMDD.md generated next morning | File existence |
```

If the "Success State" column reads like "config is entered" / "setting applied" / "command ran successfully", push back in plan review: **"That confirms the means, not the goal. What result does the user actually see?"**

### 2. Verify results after implementation (Post-Change)

After implementation, confirm the planned success states. If immediate verification isn't possible, report as "pending verification" (not "complete") and record the check schedule in handover.

## Verification reference

These are **means** for checking success states. Pick the right tool after defining what success looks like — don't work backwards from these.

| Category | Example verification |
|----------|---------------------|
| Scheduled jobs | Check output logs/files after execution time |
| Web access | Open the page in a browser, or curl for status |
| DNS | nslookup for expected IP |
| SSL | Browser lock icon, certificate domain match |
| File migration | Run the migrated script on the target |
| Service startup | Use the service's functionality from outside |

## Delayed verification

| Case | When to check | How to handle |
|------|--------------|---------------|
| Cron jobs | After next execution time | Record in handover as "pending verification" |
| DNS propagation | 5-60 min after change | Re-run nslookup, clear browser DNS cache |
| SSL auto-renewal | After renewal date | `certbot certificates` |

## History

- 2026-06-21 v1.0 Created (4 verification failures: schtasks/cron/httpd/DNS)
