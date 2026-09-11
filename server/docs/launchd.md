# Running job-agent-server at Mac login (launchd)

This guide installs the job-agent-server as a per-user launchd agent so it starts
automatically when you log into your Mac and is restarted by launchd if it
crashes.

## 1. Prerequisites

- macOS (launchd is the native init system; this does not apply to Linux).
- Python 3.12+ and this project installed into a virtualenv, e.g.
  `~/code/job-agent-server/.venv`.
- You know the absolute path to the `job-agent-server` console script inside
  that venv (typically `~/code/job-agent-server/.venv/bin/job-agent-server`).

Confirm the entry point exists:

```bash
ls -l ~/code/job-agent-server/.venv/bin/job-agent-server
```

## 2. Create the log directory

launchd will not create parent directories for `StandardOutPath` /
`StandardErrorPath`. Create them once:

```bash
mkdir -p ~/Library/Logs/jobagent
```

Log files this agent will write:

- `~/Library/Logs/jobagent/stdout.log` — structured JSON logs from the app.
- `~/Library/Logs/jobagent/stderr.log` — uncaught tracebacks and launchd
  spawn errors.

Rotate these with `newsyslog` or `logrotate` if they grow; launchd itself
does not rotate.

## 3. Write the plist

Save the file below to
`~/Library/LaunchAgents/com.pranav.jobagent.plist`. Replace `USERNAME` and
the two absolute paths with your own values. Keep the `Label` identical to
the filename stem (`com.pranav.jobagent`).

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.pranav.jobagent</string>

    <key>ProgramArguments</key>
    <array>
        <string>/Users/USERNAME/code/job-agent-server/.venv/bin/job-agent-server</string>
    </array>

    <key>WorkingDirectory</key>
    <string>/Users/USERNAME/code/job-agent-server</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/Users/USERNAME/code/job-agent-server/.venv/bin:/usr/local/bin:/usr/bin:/bin</string>
        <key>JOBAGENT_CONFIG</key>
        <string>/Users/USERNAME/.config/jobagent/config.toml</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>KeepAlive</key>
    <dict>
        <key>SuccessfulExit</key>
        <false/>
        <key>Crashed</key>
        <true/>
    </dict>

    <key>ThrottleInterval</key>
    <integer>10</integer>

    <key>StandardOutPath</key>
    <string>/Users/USERNAME/Library/Logs/jobagent/stdout.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/USERNAME/Library/Logs/jobagent/stderr.log</string>

    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
```

Notes on the keys:

- `RunAtLoad=true` starts the agent as soon as it is loaded (i.e. at login).
- `KeepAlive.Crashed=true` restarts it on non-zero exit but not after a clean
  shutdown you triggered yourself.
- `ThrottleInterval=10` prevents a crash-loop from hammering the CPU.
- Secrets belong in the Keychain or a file referenced by `JOBAGENT_CONFIG`,
  never inline in the plist (it is world-readable inside your home dir).

## 4. Validate the plist

Syntax-check before loading — a malformed plist fails silently under
`launchctl load`:

```bash
plutil -lint ~/Library/LaunchAgents/com.pranav.jobagent.plist
```

Expected output: `...plist: OK`.

## 5. Load the agent

Modern macOS (10.11+) uses the `bootstrap` / `bootout` subcommands. The
legacy `load` / `unload` commands still work and are shown for reference.

```bash
# Preferred (per-user domain, GUI session):
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pranav.jobagent.plist

# Legacy equivalent:
launchctl load -w ~/Library/LaunchAgents/com.pranav.jobagent.plist
```

`-w` on the legacy form persists the "enabled" state so the agent is
re-launched on subsequent logins.

Kick off a run immediately without waiting for the next login:

```bash
launchctl kickstart -k gui/$(id -u)/com.pranav.jobagent
```

## 6. Check status

```bash
# List and see last exit code / PID:
launchctl print gui/$(id -u)/com.pranav.jobagent | less

# Legacy quick view:
launchctl list | grep com.pranav.jobagent
```

Columns from `launchctl list` are: `PID  LastExitStatus  Label`. A PID of
`-` means it is not currently running; a non-zero `LastExitStatus` means the
last run failed — check `stderr.log`.

Tail logs:

```bash
tail -f ~/Library/Logs/jobagent/stdout.log ~/Library/Logs/jobagent/stderr.log
```

## 7. Unload / stop the agent

```bash
# Preferred:
launchctl bootout gui/$(id -u)/com.pranav.jobagent

# Legacy equivalent:
launchctl unload -w ~/Library/LaunchAgents/com.pranav.jobagent.plist
```

`bootout` both stops the running process and removes it from the
per-user domain, so it will not restart at the next login until you
`bootstrap` it again.

## 8. Updating the plist

After editing `com.pranav.jobagent.plist`, launchd does **not** pick up
changes automatically. Bounce it:

```bash
launchctl bootout  gui/$(id -u)/com.pranav.jobagent
plutil  -lint      ~/Library/LaunchAgents/com.pranav.jobagent.plist
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.pranav.jobagent.plist
```

## 9. Uninstall

```bash
launchctl bootout gui/$(id -u)/com.pranav.jobagent
rm ~/Library/LaunchAgents/com.pranav.jobagent.plist
rm -rf ~/Library/Logs/jobagent   # optional: drop the logs too
```

## 10. Troubleshooting

- **Agent never starts:** run `plutil -lint` on the plist and check
  `~/Library/Logs/jobagent/stderr.log`. A missing `ProgramArguments` path
  or a non-executable target is the usual cause.
- **`Load failed: 5: Input/output error`:** the plist is already loaded.
  Run `launchctl bootout gui/$(id -u)/com.pranav.jobagent` first.
- **Process exits immediately with status 78:** `ProgramArguments[0]` is
  not executable — check permissions and that the venv path is correct.
- **Empty stdout.log:** the app is buffering. Ensure the entry point
  configures line-buffered / unbuffered stdout, or set
  `PYTHONUNBUFFERED=1` in `EnvironmentVariables`.
- **Runs under the wrong `PATH`:** launchd starts agents with a minimal
  environment. Always set `PATH` explicitly in `EnvironmentVariables` as
  shown above.
