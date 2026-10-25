The scariest thing about a compromised VPS is not the break-in. It is the silence after. A skilled attacker who reaches root on your server treats invisibility as the main feature, not a side effect. Your site keeps serving, your metrics look boring, your uptime is a perfect 100 percent, and somewhere in that machine, someone else has been root for months.

Here is how they get in, how they stay hidden, and how to catch them.

## How they get in

**They knock on every door on the internet, constantly.** Bots scan the entire IPv4 address space around the clock, probing for SSH on port 22, Redis on 6379, Docker's API on 2375, database ports and admin panels. Campaigns like GoBruteforcer exist purely to brute-force credentials on exposed Linux servers at scale. If your VPS has a public IP, it is not a question of whether it gets scanned. It is happening right now, several times a minute.

**They walk through weak credentials and reused passwords.** The most common root compromise in the real world is not a zero day. It is a password from an old leak, reused on a root account, brute-forced by a botnet while the owner sleeps. Password authentication on SSH is the front door most attackers actually use.

**They abuse exposed services that were never meant to face the internet.** Redis with no authentication, Docker daemons listening on a public interface, database panels, forgotten development servers. Cryptojacking campaigns like RedisRaider weaponize a few Redis configuration commands to achieve code execution and hijack servers silently. An exposed Docker API is even worse: the daemon talks to the kernel as root, so anyone who can reach it already owns the machine.

**They ride known vulnerabilities you have not patched yet.** Once an exploit is public, the window between "patch available" and "you actually patched" is where most infections happen. Yesterday's post about [PHP2Shell in the core PHP engine](https://blog.daminicodesphere.org/post/php2shell-php-vulnerability) is a live example: unauthenticated remote code execution, exploited in the wild before it was even announced.

## What they do in the first ten minutes

The moment an attacker lands a shell, the goal shifts from access to persistence, and every move is designed to look like nothing.

**They turn off the paper trail.** History is disabled, login records get trimmed, and useful lines quietly vanish from the logs.

**They add a key to authorized_keys.** A single new line in root's SSH config means they no longer care whether you change the password. Some bots even prefix the key with a fake username so a lazy skim of the file reads like leftover noise.

**They sometimes mint a brand new root user.** One extra line in /etc/passwd with UID 0, and there is now a second root account on your box that blends into the crowd.

**They schedule themselves.** A short cron entry re-downloads and re-runs the implant every few minutes, so even if you delete what you found, the machine re-infects itself while you are patting yourself on the back.

## How they stay root without you noticing

This is the part people underestimate. Modern Linux rootkits do not hide in darkness, they hide inside the kernel and the toolchain you use to inspect it.

**Userland rootkits hook the very tools you would use to find them.** By injecting a library through LD_PRELOAD or /etc/ld.so.preload, an attacker can make ps, top and ss lie to you. The miner process is there, burning your CPU and earning them money. It just is not in the list.

**Kernel rootkits go further.** Loadable kernel modules and newer eBPF-based rootkits can hide processes, files and network connections from the entire system, because the kernel itself is answering your queries with false results. Tools like unhide and Volatility exist precisely because normal tooling cannot be trusted on an owned machine.

**They disguise the load.** Cryptojacking malware commonly watches for logins and drops its CPU usage while you are on the box, then ramps back up the moment you disconnect. Your "average load" looks fine because you only ever look while connected.

**They manipulate timestamps and clean up after themselves.** File modification times get backdated, logs rotated a little too aggressively, and any binary they replaced keeps its original size and date. A checksum audit of system binaries is often the only honest witness left.

## How to check your VPS right now

Run these on any server you are not 100 percent sure about:

- `last -a` and `lastb` for logins from places you do not recognize
- `grep -E ':0$' /etc/passwd` to list every account with root privileges (there should be exactly one)
- `cat ~/.ssh/authorized_keys` for keys you did not add
- `crontab -l` plus `ls /etc/cron.*` for scheduled jobs you do not recognize
- `cat /etc/ld.so.preload` which should not exist on a healthy system
- `lsattr` on binaries to find files made immutable with chattr +i, a common tamper mark
- `debsums -c` or `rpm -Va` to detect system binaries whose checksums no longer match
- `ss -tulpn` for listening services you cannot explain

If you find any of these, assume the machine is owned and rebuild it from a clean image, rotating every credential that ever touched it. Cleaning in place against a root-level attacker is a losing game.

## How to make root hard to reach

**Kill password SSH entirely.** Keys only, `PermitRootLogin` off, and log in through a normal user with sudo. This single change removes the most common real-world path to root.

**Close every port you do not need.** A firewall rule is cheaper than an incident. Redis, Docker, databases and management panels belong on localhost or a private network, never on a public interface.

**Patch fast and often.** Unpatched runtimes are unpatched runtimes, as PHP2Shell just demonstrated to the entire web.

**Watch for changes, not just uptime.** Uptime monitoring will happily report 100 percent on a machine someone else owns. File integrity monitoring, login alerts and load baselines actually tell you something is wrong.

**Use least privilege everywhere.** Nothing on your server genuinely needs root for daily work, so do not let it have it.

A VPS is a machine on the open internet that you alone defend. The quiet compromise is the default outcome of forgetting that. Assume you are being scanned, verify what you run, and make root a place no stranger can reach.

And if you want to watch what AI can do on the other side of this fight, from spotting anomalies to auditing your stack at machine speed, [join the DANI waitlist](https://dani.daminicodesphere.org).
